// src/services/supabaseUsageService.normalized.ts
import { supabase } from '../supabase/config';
import { getCurrentUser, getIdToken } from './supabaseAuthService';
import { getCurrentSubscription } from './revenueCatService';
import { 
  UsageDetails, 
  UsageCosts, 
  MonthlyUsage,
  NormalizedDailyUsageEntry,
  calculateCosts, 
  calculatePercentageUsed,
  estimateTokens,
  getTodayDateString,
  getMonthlyPeriod,
  creditsToTokens,
  tokensToCredits,
  convertToDailyUsageEntry,
  convertToUsageDetails
} from '../types/usage.normalized';
import { SUBSCRIPTION_PLANS } from '../types/subscription';

// Import API URL from the api.ts file
const API_URL = 'http://192.168.86.241:8004'; // Update to match your API_URL in api.ts

/**
 * Initialize monthly usage tracking for a user
 */
export const initializeMonthlyUsage = async (userId: string): Promise<MonthlyUsage> => {
  try {
    // Get user's subscription
    const { tier } = await getCurrentSubscription();
    
    // Find the plan to get credit limit
    const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
    const creditLimit = plan?.monthlyCredits || 0;
    
    // Get billing period
    const { start, end } = getMonthlyPeriod();
    
    // Initialize with empty usage
    const emptyUsage: UsageDetails = {
      whisperMinutes: 0,
      claudeInputTokens: 0, 
      claudeOutputTokens: 0,
      ttsCharacters: 0
    };
    
    const costs = calculateCosts(emptyUsage);
    const percentageUsed = calculatePercentageUsed(costs.totalCost, creditLimit);
    
    // Initial daily usage (empty object - normalized schema)
    const emptyDailyUsage = {};
    
    // Initial monthly usage object
    const monthlyUsage: MonthlyUsage = {
      currentPeriodStart: start,
      currentPeriodEnd: end,
      usageDetails: emptyUsage,
      calculatedCosts: costs,
      creditLimit,
      tokenLimit: creditsToTokens(creditLimit),
      percentageUsed,
      dailyUsage: emptyDailyUsage,
      subscriptionTier: tier
    };
    
    // First create or update the user record with subscription info
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        user_id: userId,
        subscription_tier: tier,
        subscription_start: Date.now(),
        billing_cycle_start: start,
        billing_cycle_end: end,
        credit_limit: creditLimit
      });
    
    if (userError) throw userError;
    
    // Then create a usage record in Supabase with normalized schema
    const { error } = await supabase
      .from('usage')
      .insert([{
        user_id: userId,
        current_period_start: start,
        current_period_end: end,
        whisper_minutes: 0,
        claude_input_tokens: 0,
        claude_output_tokens: 0,
        tts_characters: 0,
        daily_usage: JSON.stringify(emptyDailyUsage)
      }]);
    
    if (error) throw error;
    
    return monthlyUsage;
  } catch (error) {
    console.error('Error initializing usage:', error);
    throw error;
  }
};

// Import at the top level
import { shouldUseMockData, logDataSource } from '../utils/dataMode';

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
          whisperMinutes: 10.5,
          claudeInputTokens: 5000,
          claudeOutputTokens: 7500,
          ttsCharacters: 15000
        },
        calculatedCosts: {
          whisperCost: 0.063,
          claudeInputCost: 0.00125,
          claudeOutputCost: 0.009375,
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
    
    // Get user info from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (userError || !userData) {
      console.warn('User not found, will initialize new user data');
      return await initializeMonthlyUsage(userId);
    }
    
    // Get usage data from usage table
    const { data, error } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      // Initialize usage if not exists
      return await initializeMonthlyUsage(userId);
    }
    
    // Parse the usage data from normalized schema
    // Safely parse the daily_usage JSON string
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
      whisperMinutes: data.whisper_minutes || 0,
      claudeInputTokens: data.claude_input_tokens || 0,
      claudeOutputTokens: data.claude_output_tokens || 0,
      ttsCharacters: data.tts_characters || 0
    };
    
    // Calculate costs from raw usage metrics (not stored in DB)
    const calculatedCosts = calculateCosts(usageDetails);
    
    // Calculate percentage used (not stored in DB)
    const percentageUsed = calculatePercentageUsed(
      calculatedCosts.totalCost, 
      userData.credit_limit
    );
    
    // Construct the full usage object with derived values
    const usage: MonthlyUsage = {
      currentPeriodStart: data.current_period_start,
      currentPeriodEnd: data.current_period_end,
      usageDetails: usageDetails,
      calculatedCosts: calculatedCosts, // Calculated, not stored
      creditLimit: userData.credit_limit || 0, // From users table
      tokenLimit: creditsToTokens(userData.credit_limit || 0), // Calculated from credit limit
      percentageUsed: percentageUsed, // Calculated, not stored
      dailyUsage: parsedDailyUsage,
      subscriptionTier: userData.subscription_tier || 'free' // From users table
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
    const { tier } = await getCurrentSubscription();
    
    // Find the plan to get credit limit
    const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
    const creditLimit = plan?.monthlyCredits || 0;
    
    // Get new billing period
    const { start, end } = getMonthlyPeriod();
    
    // Reset usage but keep history of daily usage
    const emptyUsage: UsageDetails = {
      whisperMinutes: 0,
      claudeInputTokens: 0,
      claudeOutputTokens: 0,
      ttsCharacters: 0
    };
    
    const costs = calculateCosts(emptyUsage);
    const percentageUsed = calculatePercentageUsed(costs.totalCost, creditLimit);
    
    // Updated monthly usage
    const updatedUsage: MonthlyUsage = {
      currentPeriodStart: start,
      currentPeriodEnd: end,
      usageDetails: emptyUsage,
      calculatedCosts: costs,
      creditLimit,
      tokenLimit: creditsToTokens(creditLimit),
      percentageUsed,
      dailyUsage: {}, // Reset daily usage for new period
      subscriptionTier: tier
    };
    
    // Update user record in users table
    const { error: userError } = await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        billing_cycle_start: start,
        billing_cycle_end: end,
        credit_limit: creditLimit
      })
      .eq('user_id', userId);
    
    if (userError) throw userError;
    
    // Update usage record in usage table
    const { error } = await supabase
      .from('usage')
      .update({
        // Period fields
        current_period_start: start,
        current_period_end: end,
        
        // Reset usage metrics
        whisper_minutes: 0,
        claude_input_tokens: 0,
        claude_output_tokens: 0,
        tts_characters: 0,
        
        // Reset daily usage
        daily_usage: '{}'
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
    
    // Initialize today's usage if not exists using normalized schema
    if (!currentUsage.dailyUsage[today]) {
      currentUsage.dailyUsage[today] = {
        date: today,
        whisper_minutes: 0,
        claude_input_tokens: 0,
        claude_output_tokens: 0,
        tts_characters: 0
      };
    }
    
    // Get daily usage entry
    const dailyUsage = currentUsage.dailyUsage[today] as NormalizedDailyUsageEntry;
    
    // Update daily usage with normalized structure
    dailyUsage.whisper_minutes += usageToAdd.whisperMinutes || 0;
    dailyUsage.claude_input_tokens += usageToAdd.claudeInputTokens || 0;
    dailyUsage.claude_output_tokens += usageToAdd.claudeOutputTokens || 0;
    dailyUsage.tts_characters += usageToAdd.ttsCharacters || 0;
    
    // Update the monthly totals in the usageDetails object
    const monthlyUsage = currentUsage.usageDetails;
    monthlyUsage.whisperMinutes += usageToAdd.whisperMinutes || 0;
    monthlyUsage.claudeInputTokens += usageToAdd.claudeInputTokens || 0;
    monthlyUsage.claudeOutputTokens += usageToAdd.claudeOutputTokens || 0;
    monthlyUsage.ttsCharacters += usageToAdd.ttsCharacters || 0;
    
    // Calculate costs from scratch using the raw metrics
    currentUsage.calculatedCosts = calculateCosts(monthlyUsage);
    
    // Calculate percentage used
    currentUsage.percentageUsed = calculatePercentageUsed(
      currentUsage.calculatedCosts.totalCost,
      currentUsage.creditLimit
    );
    
    // Update usage record in Supabase with normalized fields
    const { error } = await supabase
      .from('usage')
      .update({
        // Only update raw usage metrics
        whisper_minutes: monthlyUsage.whisperMinutes,
        claude_input_tokens: monthlyUsage.claudeInputTokens,
        claude_output_tokens: monthlyUsage.claudeOutputTokens,
        tts_characters: monthlyUsage.ttsCharacters,
        
        // Update daily usage JSON
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
 * Track WhisperAI usage
 */
export const trackWhisperUsage = async (audioDurationSeconds: number): Promise<void> => {
  const minutes = audioDurationSeconds / 60;
  await trackApiUsage({ whisperMinutes: minutes });
};

/**
 * Track Claude API usage
 */
export const trackClaudeUsage = async (
  inputText: string, 
  outputText: string
): Promise<void> => {
  const inputTokens = estimateTokens(inputText);
  const outputTokens = estimateTokens(outputText);
  
  await trackApiUsage({ 
    claudeInputTokens: inputTokens,
    claudeOutputTokens: outputTokens
  });
};

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
    
    // Calculate used tokens based on total cost (derived value)
    const usedTokens = creditsToTokens(usage.calculatedCosts.totalCost);
    
    return {
      usedTokens: Math.round(usedTokens),
      tokenLimit: creditsToTokens(usage.creditLimit),
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
    // This is now calculated on-the-fly, not stored
    const localQuotaAvailable = usage.percentageUsed < 100;
    
    // If local quota check fails, no need to check server
    if (!localQuotaAvailable) {
      return false;
    }
    
    // Optionally verify with server (every 5 minutes)
    // This helps sync local usage data with server data
    try {
      const { isExpoGo, isDevelopment } = require('../utils/deviceInfo');
      
      // Skip server verification only in development environment
      if (isDevelopment() || isExpoGo()) {
        // For development environment, check subscription tier and set appropriate quota
        const { tier } = await getCurrentSubscription();
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
    
    // Get the current usage
    const usage = await getUserUsage(user.id);
    if (!usage) return;
    
    // Instead of directly updating percentage_used (which doesn't exist in DB anymore),
    // we'll add enough usage to max out the quota
    const remainingCredit = usage.creditLimit - usage.calculatedCosts.totalCost;
    
    if (remainingCredit > 0) {
      // Add enough tokens to max out the credit limit
      await trackApiUsage({
        claudeOutputTokens: Math.ceil((remainingCredit / 0.0000075) * 1000000)
      });
    }
    
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
 * Update the user's subscription tier and adjust token limits accordingly
 * Called when a user upgrades or downgrades their subscription
 */
export const updateSubscriptionTier = async (newTier: string): Promise<void> => {
  try {
    const user = getCurrentUser();
    if (!user) return;
    
    // Find the plan to get new credit limit
    const plan = SUBSCRIPTION_PLANS.find(p => p.tier === newTier);
    if (!plan) return;
    
    const creditLimit = plan.monthlyCredits;
    
    // Update only users table (normalized schema)
    const { error } = await supabase
      .from('users')
      .update({
        subscription_tier: newTier,
        credit_limit: creditLimit
      })
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    console.log(`Subscription updated to ${newTier} tier with ${creditLimit} credit limit`);
  } catch (error) {
    console.error('Error updating subscription tier:', error);
  }
};

export default {
  getUserUsage,
  getUserUsageInTokens,
  trackApiUsage,
  trackWhisperUsage,
  trackClaudeUsage,
  trackTTSUsage,
  hasAvailableQuota,
  forceQuotaExceeded,
  verifySubscriptionWithServer,
  updateSubscriptionTier
};