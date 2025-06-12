// src/services/supabaseUsageService.ts
import { supabase } from '../supabase/config';
import { getCurrentUser, getIdToken } from './supabaseAuthService';
import { 
  UsageDetails, 
  UsageCosts, 
  MonthlyUsage,
  SupabaseDailyUsageEntry,
  calculateCosts, 
  estimateTokens,
  getTodayDateString,
  getMonthlyPeriod,
  creditsToTokens,
  tokensToCredits,
  convertToDailyUsageEntry,
  convertToUsageDetails
} from '../types/usage';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '../types/subscription';

// Import at the top level
import { shouldUseMockData, logDataSource } from '../utils/dataMode';

// Import API URL from the api.ts file
const API_URL = 'http://192.168.86.241:8004'; // Update to match your API_URL in api.ts

// Function to get subscription tier without causing circular dependency
const getSubscriptionTier = async (): Promise<{ tier: SubscriptionTier }> => {
  try {
    // Try to dynamically import to avoid circular dependency
    const { getCurrentSubscription } = await import('./revenueCatService');
    return await getCurrentSubscription();
  } catch (error) {
    console.error('Error getting subscription tier:', error);
    // Default to free tier if there's an error
    return { tier: 'free' };
  }
};

/**
 * Initialize monthly usage tracking for a user
 */
export const initializeMonthlyUsage = async (userId: string): Promise<MonthlyUsage> => {
  try {
    // Get user's subscription
    const { tier } = await getSubscriptionTier();
    
    // Find the plan to get credit limit
    const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
    const creditLimit = plan?.monthlyCredits || 0;
    
    // Get billing period
    const { start, end } = getMonthlyPeriod();
    
    // Initialize with empty usage
    const emptyUsage: UsageDetails = {
      transcriptionMinutes: 0,
      llmInputTokens: 0, 
      llmOutputTokens: 0,
      ttsCharacters: 0
    };
    
    const costs = calculateCosts(emptyUsage);
    
    // Initial daily usage (empty object - consistent with Supabase format)
    const emptyDailyUsage = {};
    
    // Initial monthly usage object
    const monthlyUsage: MonthlyUsage = {
      currentPeriodStart: start,
      currentPeriodEnd: end,
      usageDetails: emptyUsage,
      calculatedCosts: costs,
      creditLimit,
      tokenLimit: plan?.monthlyTokens || 0, // Use monthlyTokens from the subscription plan
      percentageUsed: 0,
      dailyUsage: emptyDailyUsage,
      subscriptionTier: tier
    };
    
    // Create a record in Supabase using snake_case field names
    const tokenLimit = plan?.monthlyTokens || 0; // Use the correct token value from subscription plan
    const { error } = await supabase
      .from('usage')
      .insert([{
        user_id: userId,
        current_period_start: start,
        current_period_end: end,
        transcription_minutes: 0,
        llm_input_tokens: 0,
        llm_output_tokens: 0,
        tts_characters: 0,
        transcription_cost: 0,
        llm_input_cost: 0,
        llm_output_cost: 0,
        tts_cost: 0,
        total_cost: 0,
        credit_limit: creditLimit,
        token_limit: tokenLimit, // This is now plan?.monthlyTokens
        percentage_used: 0,
        daily_usage: JSON.stringify(emptyDailyUsage),
        subscription_tier: tier
      }]);
    
    if (error) throw error;
    
    return monthlyUsage;
  } catch (error) {
    console.error('Error initializing usage:', error);
    throw error;
  }
};

/**
 * Get the current usage for a user
 */
export const getUserUsage = async (userId?: string): Promise<MonthlyUsage | null> => {
  try {
    // If using mock data, return mock usage data
    if (shouldUseMockData()) {
      logDataSource('UsageService', true);
      console.warn('⚠️ Returning mock usage data (real data preferred)');
      
      // Return mock usage data for development
      return {
        currentPeriodStart: Date.now() - (15 * 24 * 60 * 60 * 1000), // 15 days ago
        currentPeriodEnd: Date.now() + (15 * 24 * 60 * 60 * 1000),  // 15 days from now
        usageDetails: {
          transcriptionMinutes: 10.5,
          llmInputTokens: 5000,
          llmOutputTokens: 7500,
          ttsCharacters: 15000
        },
        calculatedCosts: {
          transcriptionCost: 0.063,
          llmInputCost: 0.00125,
          llmOutputCost: 0.009375,
          ttsCost: 0.06,
          totalCost: 0.133625
        },
        creditLimit: 1.5, // Free tier credit limit
        tokenLimit: 150, // Free tier: 1.5 credits * 100
        percentageUsed: 4.45,
        dailyUsage: {},
        subscriptionTier: 'free' // Mock data should use free tier
      };
    }
    
    logDataSource('UsageService', false);
    
    // If no userId provided, try to get the current user
    if (!userId) {
      const user = getCurrentUser();
      if (!user) return null;
      userId = user.id;
    }
    
    // Get usage from Supabase
    const { data, error } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      // Initialize usage if not exists
      return await initializeMonthlyUsage(userId);
    }
    
    // Parse the usage data from Supabase format to our MonthlyUsage format
    // First safely parse the daily_usage JSON string
    let parsedDailyUsage = {};
    try {
      if (typeof data.daily_usage === 'string' && data.daily_usage) {
        parsedDailyUsage = JSON.parse(data.daily_usage);
      } else if (typeof data.daily_usage === 'object') {
        parsedDailyUsage = data.daily_usage || {};
      }
    } catch (parseError) {
      console.warn('Error parsing daily_usage JSON:', parseError);
    }
    
    // Convert snake_case database fields to camelCase application fields
    const usageDetails: UsageDetails = {
      transcriptionMinutes: data.transcription_minutes || 0,
      llmInputTokens: data.llm_input_tokens || 0,
      llmOutputTokens: data.llm_output_tokens || 0,
      ttsCharacters: data.tts_characters || 0
    };
    
    const usage: MonthlyUsage = {
      currentPeriodStart: data.current_period_start,
      currentPeriodEnd: data.current_period_end,
      usageDetails: usageDetails,
      calculatedCosts: calculateCosts(usageDetails),
      creditLimit: data.credit_limit || 0,
      tokenLimit: data.token_limit || 0,
      percentageUsed: data.percentage_used || 0,
      dailyUsage: parsedDailyUsage,
      subscriptionTier: data.subscription_tier || 'free'
    };
    
    // Check if billing period has expired and needs to be reset
    const now = Date.now();
    if (now > usage.currentPeriodEnd) {
      // If period has expired, reset usage for new period
      return await resetMonthlyUsage(userId);
    }
    
    return usage;
  } catch (error) {
    console.error('Error getting user usage:', error);
    throw error;
  }
};

/**
 * Reset monthly usage for a new billing period
 */
export const resetMonthlyUsage = async (userId: string): Promise<MonthlyUsage> => {
  try {
    // Get user's subscription
    const { tier } = await getSubscriptionTier();
    
    // Find the plan to get credit limit
    const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
    const creditLimit = plan?.monthlyCredits || 0;
    
    // Get new billing period
    const { start, end } = getMonthlyPeriod();
    
    // Reset usage but keep history of daily usage
    const emptyUsage: UsageDetails = {
      transcriptionMinutes: 0,
      llmInputTokens: 0,
      llmOutputTokens: 0,
      ttsCharacters: 0
    };
    
    const costs = calculateCosts(emptyUsage);
    
    // Updated monthly usage
    const updatedUsage: MonthlyUsage = {
      currentPeriodStart: start,
      currentPeriodEnd: end,
      usageDetails: emptyUsage,
      calculatedCosts: costs,
      creditLimit,
      tokenLimit: plan?.monthlyTokens || 0, // Use monthlyTokens from the subscription plan
      percentageUsed: 0,
      dailyUsage: {}, // Reset daily usage for new period
      subscriptionTier: tier
    };
    
    // Update user record in Supabase with all fields in snake_case format
    const tokenLimit = plan?.monthlyTokens || 0; // Use the correct token value from subscription plan
    const { error } = await supabase
      .from('usage')
      .update({
        // Period fields
        current_period_start: start,
        current_period_end: end,
        
        // Reset usage metrics
        transcription_minutes: 0,
        llm_input_tokens: 0,
        llm_output_tokens: 0,
        tts_characters: 0,
        
        // Reset cost fields
        transcription_cost: 0,
        llm_input_cost: 0,
        llm_output_cost: 0,
        tts_cost: 0,
        total_cost: 0,
        
        // Other fields
        credit_limit: creditLimit,
        token_limit: tokenLimit, // This is now plan?.monthlyTokens
        percentage_used: 0,
        daily_usage: '{}',
        subscription_tier: tier
      })
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return updatedUsage;
  } catch (error) {
    console.error('Error resetting monthly usage:', error);
    throw error;
  }
};

/**
 * Track API usage and update user's usage metrics
 */
export const trackApiUsage = async (
  usageToAdd: Partial<UsageDetails>, 
  userId?: string
): Promise<MonthlyUsage | null> => {
  try {
    // If no userId provided, try to get the current user
    if (!userId) {
      const user = getCurrentUser();
      if (!user) return null;
      userId = user.id;
    }
    
    // Get current usage
    const currentUsage = await getUserUsage(userId);
    if (!currentUsage) return null;
    
    // Get today's date string
    const today = getTodayDateString();
    
    // Initialize today's usage if not exists using Supabase structure
    if (!currentUsage.dailyUsage[today]) {
      currentUsage.dailyUsage[today] = {
        date: today,
        transcription_minutes: 0,
        llm_input_tokens: 0,
        llm_output_tokens: 0,
        tts_characters: 0,
        transcription_cost: 0,
        llm_input_cost: 0,
        llm_output_cost: 0,
        tts_cost: 0,
        total_cost: 0
      };
    }

    // Get daily usage entry
    const dailyUsage = currentUsage.dailyUsage[today];
    
    // Update daily usage with flat structure matching Supabase
    dailyUsage.transcription_minutes += usageToAdd.transcriptionMinutes || 0;
    dailyUsage.llm_input_tokens += usageToAdd.llmInputTokens || 0;
    dailyUsage.llm_output_tokens += usageToAdd.llmOutputTokens || 0;
    dailyUsage.tts_characters += usageToAdd.ttsCharacters || 0;
    
    // Calculate costs for daily usage
    const dailyUsageDetails = convertToUsageDetails(dailyUsage);
    const costs = calculateCosts(dailyUsageDetails);
    
    // Update cost fields in the flat structure
    dailyUsage.transcription_cost = costs.transcriptionCost;
    dailyUsage.llm_input_cost = costs.llmInputCost;
    dailyUsage.llm_output_cost = costs.llmOutputCost;
    dailyUsage.tts_cost = costs.ttsCost;
    dailyUsage.total_cost = costs.totalCost;
    
    // Update the monthly totals in the usageDetails object
    const monthlyUsage = currentUsage.usageDetails;
    monthlyUsage.transcriptionMinutes += usageToAdd.transcriptionMinutes || 0;
    monthlyUsage.llmInputTokens += usageToAdd.llmInputTokens || 0;
    monthlyUsage.llmOutputTokens += usageToAdd.llmOutputTokens || 0;
    monthlyUsage.ttsCharacters += usageToAdd.ttsCharacters || 0;
    
    // Calculate costs for monthly usage
    currentUsage.calculatedCosts = calculateCosts(monthlyUsage);
    
    // Calculate percentage used
    if (currentUsage.creditLimit > 0) {
      currentUsage.percentageUsed = Math.min(
        (currentUsage.calculatedCosts.totalCost / currentUsage.creditLimit) * 100, 
        100
      );
    } else {
      currentUsage.percentageUsed = 100; // If no credit limit, mark as 100% used
    }
    
    // Update user record in Supabase - use snake_case field names
    const { error } = await supabase
      .from('usage')
      .update({
        // Usage fields (snake_case for database)
        transcription_minutes: monthlyUsage.transcriptionMinutes,
        llm_input_tokens: monthlyUsage.llmInputTokens,
        llm_output_tokens: monthlyUsage.llmOutputTokens,
        tts_characters: monthlyUsage.ttsCharacters,
        
        // Cost fields (calculated based on current usage)
        transcription_cost: currentUsage.calculatedCosts.transcriptionCost,
        llm_input_cost: currentUsage.calculatedCosts.llmInputCost,
        llm_output_cost: currentUsage.calculatedCosts.llmOutputCost,
        tts_cost: currentUsage.calculatedCosts.ttsCost,
        total_cost: currentUsage.calculatedCosts.totalCost,
        
        // Other fields
        percentage_used: currentUsage.percentageUsed,
        daily_usage: JSON.stringify(currentUsage.dailyUsage)
      })
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return currentUsage;
  } catch (error) {
    console.error('Error tracking API usage:', error);
    throw error;
  }
};

/**
 * Track transcription usage
 */
export const trackTranscriptionUsage = async (audioDurationSeconds: number): Promise<void> => {
  const minutes = audioDurationSeconds / 60;
  await trackApiUsage({ 
    transcriptionMinutes: minutes
  });
};

// Keep the old function name as an alias for backwards compatibility
export const trackWhisperUsage = trackTranscriptionUsage;

/**
 * Track LLM API usage
 */
export const trackLLMUsage = async (
  inputText: string, 
  outputText: string
): Promise<void> => {
  const inputTokens = estimateTokens(inputText);
  const outputTokens = estimateTokens(outputText);
  
  await trackApiUsage({ 
    llmInputTokens: inputTokens,
    llmOutputTokens: outputTokens
  });
};

// Keep the old function name as an alias for backwards compatibility
export const trackClaudeUsage = trackLLMUsage;

/**
 * Track TTS usage
 */
export const trackTTSUsage = async (text: string): Promise<void> => {
  const characterCount = text.length;
  await trackApiUsage({ ttsCharacters: characterCount });
};

/**
 * Get user's usage information in token format (for display)
 */
export const getUserUsageInTokens = async (): Promise<{
  usedTokens: number;
  tokenLimit: number;
  percentageUsed: number;
} | null> => {
  try {
    const user = getCurrentUser();
    if (!user) return null;
    
    const usage = await getUserUsage(user.id);
    if (!usage) return null;
    
    // Calculate used tokens (costs * 100)
    const usedTokens = creditsToTokens(usage.calculatedCosts.totalCost);
    
    return {
      usedTokens: Math.round(usedTokens),
      tokenLimit: usage.tokenLimit || usage.creditLimit * 100, // Convert credits to tokens properly
      percentageUsed: usage.percentageUsed
    };
  } catch (error) {
    console.error('Error getting usage in tokens:', error);
    return null;
  }
};

/**
 * Check if user has available quota for a new conversation
 */
export const hasAvailableQuota = async (): Promise<boolean> => {
  try {
    // Only use mock quota if explicitly configured
    if (shouldUseMockData()) {
      logDataSource('QuotaService', true);
      console.warn('⚠️ Using mock quota (unlimited) for development');
      return true;
    }
    
    logDataSource('QuotaService', false);
    
    const user = getCurrentUser();
    if (!user) return false;
    
    // First check with local data
    const usage = await getUserUsage(user.id);
    if (!usage) return false;
    
    // Check if percentage used is less than 100%
    const localQuotaAvailable = usage.percentageUsed < 100;
    
    // If local quota check fails, no need to check server
    if (!localQuotaAvailable) {
      return false;
    }
    
    // Optionally verify with server (every 5 minutes)
    // This helps sync local usage data with server data
    const now = Date.now();
    
    // Import isExpoGo and isDevelopment from deviceInfo.ts
    try {
      const { isExpoGo, isDevelopment } = require('../utils/deviceInfo');
      
      // Skip server verification only in development environment
      if (isDevelopment() || isExpoGo()) {
        // For development environment, check subscription tier and set appropriate quota
        const { tier } = await getSubscriptionTier();
        if (tier !== 'free') {
          return true; // In dev mode, paid tiers always have quota
        } else {
          // In dev mode with free tier, check local percentage
          return usage.percentageUsed < 100;
        }
      }
      
      // Get token for auth (for production)
      const token = await getIdToken(user, true);
      
      // Verify with server
      const response = await fetch(`${API_URL}/verify-subscription?user_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Return server's decision on quota
        return data.has_quota;
      }
    } catch (error) {
      console.error('Error verifying quota with server:', error);
      // Fall back to local decision if server check fails
    }
    
    // Default to local decision
    return localQuotaAvailable;
  } catch (error) {
    console.error('Error checking quota:', error);
    return false;
  }
};

/**
 * Force local quota to be marked as exceeded (used for syncing with server)
 */
export const forceQuotaExceeded = async (): Promise<void> => {
  try {
    const user = getCurrentUser();
    if (!user) return;
    
    // Update percentage used to 100% in Supabase
    const { error } = await supabase
      .from('usage')
      .update({ 
        percentage_used: 100,
        // Also update total_cost to match credit_limit for consistency
        total_cost: 999 // A high value that will ensure quota exceeded
      })
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    console.log('Quota marked as exceeded to sync with server');
  } catch (error) {
    console.error('Error forcing quota exceeded:', error);
  }
};

/**
 * Verify subscription with backend server directly
 */
export const verifySubscriptionWithServer = async (): Promise<boolean> => {
  try {
    const user = getCurrentUser();
    if (!user) return false;
    
    // Get token for auth
    const token = await getIdToken(user, true);
    
    // Verify with server
    const response = await fetch(`${API_URL}/verify-subscription?user_id=${user.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.has_quota;
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying subscription with server:', error);
    return false;
  }
};

/**
 * Update the user's subscription tier
 * Called when a user upgrades or downgrades their subscription
 * Uses the normalized database schema
 */
export const updateSubscriptionTier = async (newTier: string): Promise<void> => {
  try {
    const user = getCurrentUser();
    if (!user) return;
    
    // Find the plan to validate the tier
    const plan = SUBSCRIPTION_PLANS.find(p => p.tier === newTier);
    if (!plan) {
      console.warn(`Invalid subscription tier: ${newTier}`);
      return;
    }
    
    // Update ONLY the users table according to normalized schema
    // Fields: subscription_tier, updated_at (credit_limit is now derived)
    const { error: userError } = await supabase
      .from('users')
      .update({
        subscription_tier: newTier,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);
    
    if (userError) {
      console.error('Error updating subscription tier in users table:', userError);
      throw userError;
    }
    
    console.log(`Subscription updated to ${newTier} tier with ${plan.monthlyCredits} credit limit (derived value)`);
  } catch (error) {
    console.error('Error updating subscription tier:', error);
    throw error;
  }
};

export default {
  getUserUsage,
  getUserUsageInTokens,
  trackApiUsage,
  trackTranscriptionUsage,
  trackWhisperUsage,  // Keeping for backwards compatibility
  trackLLMUsage,
  trackClaudeUsage,   // Keeping for backwards compatibility
  trackTTSUsage,
  hasAvailableQuota,
  forceQuotaExceeded,
  verifySubscriptionWithServer,
  updateSubscriptionTier
};