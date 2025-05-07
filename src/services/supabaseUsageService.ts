// src/services/supabaseUsageService.ts
import { supabase } from '../supabase/config';
import { getCurrentUser, getIdToken } from './supabaseAuthService';
import { getCurrentSubscription } from './revenueCatService';
import { 
  UsageDetails, 
  UsageCosts, 
  MonthlyUsage, 
  calculateCosts, 
  estimateTokens,
  getTodayDateString,
  getMonthlyPeriod,
  creditsToTokens,
  tokensToCredits
} from '../types/usage';
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
    
    // Initial monthly usage object
    const monthlyUsage: MonthlyUsage = {
      currentPeriodStart: start,
      currentPeriodEnd: end,
      usageDetails: emptyUsage,
      calculatedCosts: costs,
      creditLimit,
      tokenLimit: creditsToTokens(creditLimit), // Convert credits to tokens
      percentageUsed: 0,
      dailyUsage: {},
      subscriptionTier: tier
    };
    
    // Create a record in Supabase
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
        credit_limit: creditLimit,
        token_limit: creditsToTokens(creditLimit),
        percentage_used: 0,
        daily_usage: JSON.stringify({}),
        subscription_tier: tier
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
        creditLimit: 3.0,
        tokenLimit: 300000,
        percentageUsed: 4.45,
        dailyUsage: {},
        subscriptionTier: 'basic'
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
    const usage: MonthlyUsage = {
      currentPeriodStart: data.current_period_start,
      currentPeriodEnd: data.current_period_end,
      usageDetails: {
        whisperMinutes: data.whisper_minutes,
        claudeInputTokens: data.claude_input_tokens,
        claudeOutputTokens: data.claude_output_tokens,
        ttsCharacters: data.tts_characters
      },
      calculatedCosts: calculateCosts({
        whisperMinutes: data.whisper_minutes,
        claudeInputTokens: data.claude_input_tokens,
        claudeOutputTokens: data.claude_output_tokens,
        ttsCharacters: data.tts_characters
      }),
      creditLimit: data.credit_limit,
      tokenLimit: data.token_limit,
      percentageUsed: data.percentage_used,
      dailyUsage: typeof data.daily_usage === 'string' 
        ? JSON.parse(data.daily_usage) 
        : (data.daily_usage || {}),
      subscriptionTier: data.subscription_tier
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
    
    // Updated monthly usage
    const updatedUsage: MonthlyUsage = {
      currentPeriodStart: start,
      currentPeriodEnd: end,
      usageDetails: emptyUsage,
      calculatedCosts: costs,
      creditLimit,
      tokenLimit: creditsToTokens(creditLimit), // Convert credits to tokens
      percentageUsed: 0,
      dailyUsage: {}, // Reset daily usage for new period
      subscriptionTier: tier
    };
    
    // Update user record in Supabase
    const { error } = await supabase
      .from('usage')
      .update({
        current_period_start: start,
        current_period_end: end,
        whisper_minutes: 0,
        claude_input_tokens: 0,
        claude_output_tokens: 0,
        tts_characters: 0,
        credit_limit: creditLimit,
        token_limit: creditsToTokens(creditLimit),
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
    
    // Initialize today's usage if not exists
    if (!currentUsage.dailyUsage[today]) {
      currentUsage.dailyUsage[today] = {
        date: today,
        usageDetails: {
          whisperMinutes: 0,
          claudeInputTokens: 0,
          claudeOutputTokens: 0,
          ttsCharacters: 0
        },
        calculatedCosts: {
          whisperCost: 0,
          claudeInputCost: 0,
          claudeOutputCost: 0,
          ttsCost: 0,
          totalCost: 0
        }
      };
    }
    
    // Update daily usage
    const dailyUsage = currentUsage.dailyUsage[today];
    dailyUsage.usageDetails.whisperMinutes += usageToAdd.whisperMinutes || 0;
    dailyUsage.usageDetails.claudeInputTokens += usageToAdd.claudeInputTokens || 0;
    dailyUsage.usageDetails.claudeOutputTokens += usageToAdd.claudeOutputTokens || 0;
    dailyUsage.usageDetails.ttsCharacters += usageToAdd.ttsCharacters || 0;
    
    // Calculate costs for daily usage
    dailyUsage.calculatedCosts = calculateCosts(dailyUsage.usageDetails);
    
    // Update monthly totals
    const monthlyUsage = currentUsage.usageDetails;
    monthlyUsage.whisperMinutes += usageToAdd.whisperMinutes || 0;
    monthlyUsage.claudeInputTokens += usageToAdd.claudeInputTokens || 0;
    monthlyUsage.claudeOutputTokens += usageToAdd.claudeOutputTokens || 0;
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
    
    // Update user record in Supabase
    const { error } = await supabase
      .from('usage')
      .update({
        whisper_minutes: monthlyUsage.whisperMinutes,
        claude_input_tokens: monthlyUsage.claudeInputTokens,
        claude_output_tokens: monthlyUsage.claudeOutputTokens,
        tts_characters: monthlyUsage.ttsCharacters,
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
    
    // Calculate used tokens (costs * 100)
    const usedTokens = creditsToTokens(usage.calculatedCosts.totalCost);
    
    return {
      usedTokens: Math.round(usedTokens),
      tokenLimit: usage.tokenLimit || creditsToTokens(usage.creditLimit),
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
    
    // Update percentage used to 100% in Supabase
    const { error } = await supabase
      .from('usage')
      .update({ percentage_used: 100 })
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

export default {
  getUserUsage,
  getUserUsageInTokens,
  trackApiUsage,
  trackWhisperUsage,
  trackClaudeUsage,
  trackTTSUsage,
  hasAvailableQuota,
  forceQuotaExceeded,
  verifySubscriptionWithServer
};