// src/services/supabaseUsageService.normalized.ts
import { supabase } from '../supabase/config';
import { getCurrentUser, getIdToken } from './supabaseAuthService';
import { getCurrentSubscription } from './revenueCatService';
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
} from '../types/usage.normalized';
import { SUBSCRIPTION_PLANS } from '../types/subscription';

// Import API URL from the api.ts file - single source of truth
import { API_URL } from '../utils/api';

// Import data mode helpers
import { shouldUseMockData, logDataSource } from '../utils/dataMode';

/**
 * Initialize monthly usage tracking for a user - normalized schema
 */
export const initializeMonthlyUsage = async (userId: string): Promise<MonthlyUsage> => {
  try {
    // Get user's subscription
    const { tier } = await getCurrentSubscription();
    
    // Use the helper function to get the credit limit (imported separately to avoid circular dependency)
    const { getCreditLimitForTier } = await import('../types/subscription');
    
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
    
    // Initial daily usage (empty object)
    const emptyDailyUsage = {};
    
    // Get credit limit using helper
    const creditLimit = getCreditLimitForTier(tier);
    
    // Initial monthly usage object
    const monthlyUsage: MonthlyUsage = {
      currentPeriodStart: start,
      currentPeriodEnd: end,
      usageDetails: emptyUsage,
      calculatedCosts: costs,
      creditLimit, // Now derived from tier
      percentageUsed: 0,
      dailyUsage: emptyDailyUsage,
      subscriptionTier: tier
    };
    
    // Create a user record in users table
    const { error: userError } = await supabase
      .from('users')
      .insert([{
        user_id: userId,
        subscription_tier: tier,
        subscription_start: start,
        billing_cycle_start: start,
        billing_cycle_end: end
        // credit_limit is now derived from tier, not stored
      }]);
    
    if (userError) throw userError;
    
    // Create a record in usage table with normalized schema (no cost fields)
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
        daily_usage: JSON.stringify(emptyDailyUsage)
      }]);
    
    if (error) throw error;
    
    return monthlyUsage;
  } catch (error) {
    console.error('Error initializing usage:', error);
    throw error;
  }
};

/**
 * Get the current usage for a user - normalized schema
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
        percentageUsed: 4.45,
        dailyUsage: {},
        subscriptionTier: 'free' // Mock data should use free tier
      };
    }
    
    logDataSource('UsageService', false);
    
    // If no userId provided, try to get the current user
    if (!userId) {
      const user = getCurrentUser();
      if (!user) {
        console.log('📊 USAGE DEBUG: No authenticated user found');
        return null;
      }
      userId = user.id;
      console.log(`📊 USAGE DEBUG: Retrieved user ID: ${userId}`);
    }
    
    console.log(`📊 USAGE DEBUG: Fetching usage data for user ID: ${userId}`);
    
    // First get subscription info from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (userError) {
      console.log(`📊 USAGE DEBUG: Error fetching user data: ${userError.message}`);
      // Initialize user if not exists
      return await initializeMonthlyUsage(userId);
    }
    
    if (!userData) {
      console.log(`📊 USAGE DEBUG: No user data found in Supabase`);
      // Initialize user if not exists
      return await initializeMonthlyUsage(userId);
    }
    
    console.log(`📊 USAGE DEBUG: User data retrieved, subscription tier: ${userData.subscription_tier}`);
    
    // Then get usage data from usage table
    const { data, error } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.log(`📊 USAGE DEBUG: Error fetching usage data: ${error.message}`);
      // Initialize usage if not exists
      return await initializeMonthlyUsage(userId);
    }
    
    if (!data) {
      console.log(`📊 USAGE DEBUG: No usage data found in Supabase`);
      // Initialize usage if not exists
      return await initializeMonthlyUsage(userId);
    }
    
    console.log(`📊 USAGE DEBUG: Raw usage data from Supabase:`, {
      transcription_minutes: data.transcription_minutes,
      llm_input_tokens: data.llm_input_tokens,
      llm_output_tokens: data.llm_output_tokens,
      tts_characters: data.tts_characters
    });
    
    // Log the full raw data object for debugging
    console.log(`📊 USAGE DEBUG: Complete raw Supabase data:`, JSON.stringify(data));
    
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
    
    // Extract raw usage metrics
    const usageDetails: UsageDetails = {
      transcriptionMinutes: data.transcription_minutes || 0,
      llmInputTokens: data.llm_input_tokens || 0,
      llmOutputTokens: data.llm_output_tokens || 0,
      ttsCharacters: data.tts_characters || 0
    };
    
    console.log(`📊 USAGE DEBUG: Normalized usage metrics:`, usageDetails);
    
    // Calculate costs on-the-fly
    const calculatedCosts = calculateCosts(usageDetails);
    console.log(`📊 USAGE DEBUG: Calculated costs:`, calculatedCosts);
    
    // Get credit limit based on subscription tier
    const { getCreditLimitForTier } = await import('../types/subscription');
    const creditLimit = getCreditLimitForTier(userData.subscription_tier || 'free');
    console.log(`📊 USAGE DEBUG: Credit limit for tier ${userData.subscription_tier}: ${creditLimit}`);
    
    // Calculate percentage used
    const totalCost = calculatedCosts.totalCost;
    let percentageUsed = 0;
    
    if (creditLimit <= 0) {
      percentageUsed = 100;
      console.log(`📊 USAGE DEBUG: Credit limit is zero or negative, setting percentage to 100%`);
    } else {
      percentageUsed = Math.min((totalCost / creditLimit) * 100, 100);
      console.log(`📊 USAGE DEBUG: Percentage calculation: (${totalCost} / ${creditLimit}) * 100 = ${percentageUsed.toFixed(2)}%`);
    }
    
    const usage: MonthlyUsage = {
      currentPeriodStart: data.current_period_start,
      currentPeriodEnd: data.current_period_end,
      usageDetails: usageDetails,
      calculatedCosts: calculatedCosts,
      creditLimit: creditLimit,
      percentageUsed: percentageUsed,
      dailyUsage: parsedDailyUsage,
      subscriptionTier: userData.subscription_tier || 'free'
    };
    
    // Check if billing period has expired and needs to be reset
    const now = Date.now();
    if (now > usage.currentPeriodEnd) {
      // If period has expired, reset usage for new period
      return await resetMonthlyUsage(userId);
    }
    
    // Also check if subscription has expired but we still have premium tier data
    if (userData.subscription_tier !== 'free') {
      // Check subscription status from RevenueCat
      try {
        const { getCurrentSubscription } = await import('../services/revenueCatService');
        const subscription = await getCurrentSubscription();
        
        // If subscription indicates free tier but our DB shows premium, reset to free tier
        if (subscription.tier === 'free' && userData.subscription_tier !== 'free') {
          console.log('📊 USAGE DEBUG: Subscription expired, resetting to free tier');
          
          // Update user table with free tier
          await supabase
            .from('users')
            .update({
              subscription_tier: 'free',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
            
          // Reset usage for new period as free tier
          return await resetMonthlyUsage(userId);
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
        // Continue with existing data if check fails
      }
    }
    
    return usage;
  } catch (error) {
    console.error('Error getting user usage:', error);
    throw error;
  }
};

/**
 * Reset monthly usage for a new billing period - normalized schema
 */
export const resetMonthlyUsage = async (userId: string): Promise<MonthlyUsage> => {
  try {
    // Get user's subscription
    const { tier } = await getCurrentSubscription();
    
    // Use helper to get credit limit
    const { getCreditLimitForTier } = await import('../types/subscription');
    
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
    
    // Get credit limit using helper
    const creditLimit = getCreditLimitForTier(tier);
    
    // Updated monthly usage
    const updatedUsage: MonthlyUsage = {
      currentPeriodStart: start,
      currentPeriodEnd: end,
      usageDetails: emptyUsage,
      calculatedCosts: costs,
      creditLimit, // Now derived from tier
      percentageUsed: 0,
      dailyUsage: {}, // Reset daily usage for new period
      subscriptionTier: tier
    };
    
    // Update user table with new billing cycle
    const { error: userError } = await supabase
      .from('users')
      .update({
        billing_cycle_start: start,
        billing_cycle_end: end,
        subscription_tier: tier
        // credit_limit is now derived from tier, not stored
      })
      .eq('user_id', userId);
      
    if (userError) throw userError;
    
    // Update usage table with reset metrics
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
 * Track API usage and update user's usage metrics - normalized schema
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
        transcription_minutes: 0,
        llm_input_tokens: 0,
        llm_output_tokens: 0,
        tts_characters: 0
      };
    }
    
    // Get daily usage entry
    const dailyUsage = currentUsage.dailyUsage[today];
    
    // Update daily usage with raw metrics only
    dailyUsage.transcription_minutes += usageToAdd.transcriptionMinutes || 0;
    dailyUsage.llm_input_tokens += usageToAdd.llmInputTokens || 0;
    dailyUsage.llm_output_tokens += usageToAdd.llmOutputTokens || 0;
    dailyUsage.tts_characters += usageToAdd.ttsCharacters || 0;
    
    // Update the monthly totals in the usageDetails object
    const monthlyUsage = currentUsage.usageDetails;
    
    // Update field values
    monthlyUsage.transcriptionMinutes += usageToAdd.transcriptionMinutes || 0;
    monthlyUsage.llmInputTokens += usageToAdd.llmInputTokens || 0;
    monthlyUsage.llmOutputTokens += usageToAdd.llmOutputTokens || 0;
    monthlyUsage.ttsCharacters += usageToAdd.ttsCharacters || 0;
    
    // Calculate costs for monthly usage (on-the-fly, not stored in DB)
    currentUsage.calculatedCosts = calculateCosts(monthlyUsage);
    
    // Calculate percentage used using helper function for tier-based credit limit
    const { getCreditLimitForTier } = await import('../types/subscription');
    const creditLimit = getCreditLimitForTier(currentUsage.subscriptionTier);
    
    if (creditLimit > 0) {
      currentUsage.percentageUsed = Math.min(
        (currentUsage.calculatedCosts.totalCost / creditLimit) * 100, 
        100
      );
    } else {
      currentUsage.percentageUsed = 100; // If no credit limit, mark as 100% used
    }
    
    // Update usage record in Supabase with normalized schema (only raw metrics)
    const { error } = await supabase
      .from('usage')
      .update({
        // Usage fields (only raw metrics)
        transcription_minutes: monthlyUsage.transcriptionMinutes,
        llm_input_tokens: monthlyUsage.llmInputTokens,
        llm_output_tokens: monthlyUsage.llmOutputTokens,
        tts_characters: monthlyUsage.ttsCharacters,
        
        // Daily usage (as JSON string)
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
  await trackApiUsage({ transcriptionMinutes: minutes });
  console.log(`Tracked transcription usage: ${minutes.toFixed(2)} minutes (${audioDurationSeconds}s)`);
};

// Keep the old function name as an alias for backwards compatibility
export const trackWhisperUsage = trackTranscriptionUsage;

/**
 * Track LLM API usage
 * Uses direct DB update to avoid issues with missing cost columns
 */
export const trackLLMUsage = async (
  inputText: string, 
  outputText: string
): Promise<void> => {
  try {
    const inputTokens = estimateTokens(inputText);
    const outputTokens = estimateTokens(outputText);
    
    // Get the current user
    const user = getCurrentUser();
    if (!user) {
      console.warn('Cannot track LLM usage: No authenticated user');
      return;
    }
    
    // Get today's date
    const today = getTodayDateString();
    
    // First get current usage
    const { data: usageData, error: usageError } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (usageError) {
      console.error('Error getting usage data:', usageError);
      return;
    }
    
    if (!usageData) {
      console.warn('Cannot track LLM usage: No usage data found');
      return;
    }
    
    // Parse daily usage or initialize if needed
    let dailyUsage = {};
    try {
      if (typeof usageData.daily_usage === 'string') {
        dailyUsage = JSON.parse(usageData.daily_usage);
      } else if (usageData.daily_usage) {
        dailyUsage = usageData.daily_usage;
      }
    } catch (error) {
      console.warn('Error parsing daily usage:', error);
    }
    
    // Initialize today's usage if not exists
    if (!dailyUsage[today]) {
      dailyUsage[today] = {
        date: today,
        transcription_minutes: 0,
        llm_input_tokens: 0,
        llm_output_tokens: 0,
        tts_characters: 0
      };
    }
    
    // Update daily usage
    dailyUsage[today].llm_input_tokens += inputTokens;
    dailyUsage[today].llm_output_tokens += outputTokens;
    
    // Update total usage
    const newInputTokens = (usageData.llm_input_tokens || 0) + inputTokens;
    const newOutputTokens = (usageData.llm_output_tokens || 0) + outputTokens;
    
    // Update the database - ONLY raw metrics, NOT calculated fields
    const { error: updateError } = await supabase
      .from('usage')
      .update({
        llm_input_tokens: newInputTokens,
        llm_output_tokens: newOutputTokens,
        daily_usage: JSON.stringify(dailyUsage)
      })
      .eq('user_id', user.id);
    
    if (updateError) {
      console.error('Error updating LLM usage:', updateError);
      return;
    }
    
    console.log(`Tracked LLM usage: ${inputTokens} input tokens, ${outputTokens} output tokens`);
  } catch (error) {
    console.error('Error in trackLLMUsage:', error);
  }
};

// Keep the old function name as an alias for backwards compatibility
export const trackClaudeUsage = trackLLMUsage;

/**
 * Track TTS usage
 */
export const trackTTSUsage = async (text: string): Promise<void> => {
  const characterCount = text.length;
  await trackApiUsage({ ttsCharacters: characterCount });
  console.log(`Tracked TTS usage: ${characterCount} characters`);
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
    
    // Get token limit directly using helper function
    const { getTokenLimitForTier } = await import('../types/subscription');
    const tokenLimit = getTokenLimitForTier(usage.subscriptionTier);
    
    return {
      usedTokens: Math.round(usedTokens),
      tokenLimit, // Now derived directly from the tier
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
    if (!user) {
      console.log('📊 QUOTA DEBUG: No authenticated user found');
      return false;
    }
    
    console.log(`📊 QUOTA DEBUG: Checking quota for user ID: ${user.id}`);
    
    // First check with local data
    const usage = await getUserUsage(user.id);
    if (!usage) {
      console.log('📊 QUOTA DEBUG: No usage data returned from getUserUsage');
      return false;
    }
    
    // Detailed usage debug information
    console.log('📊 QUOTA DEBUG: Raw usage metrics from Supabase:', {
      transcriptionMinutes: usage.usageDetails.transcriptionMinutes,
      llmInputTokens: usage.usageDetails.llmInputTokens,
      llmOutputTokens: usage.usageDetails.llmOutputTokens,
      ttsCharacters: usage.usageDetails.ttsCharacters
    });
    
    console.log('📊 QUOTA DEBUG: Calculated costs:', {
      transcriptionCost: usage.calculatedCosts.transcriptionCost,
      llmInputCost: usage.calculatedCosts.llmInputCost,
      llmOutputCost: usage.calculatedCosts.llmOutputCost,
      ttsCost: usage.calculatedCosts.ttsCost,
      totalCost: usage.calculatedCosts.totalCost
    });
    
    // Check if percentage used is less than 100%
    const localQuotaAvailable = usage.percentageUsed < 100;
    console.log(`📊 QUOTA DEBUG: Local quota check - Percentage used: ${usage.percentageUsed.toFixed(2)}%, Available: ${localQuotaAvailable}`);
    
    // If local quota check fails, no need to check server
    if (!localQuotaAvailable) {
      console.log('📊 QUOTA DEBUG: Local quota check indicates quota exceeded');
      return false;
    }
    
    // Log current usage for debugging
    console.log(`📊 QUOTA DEBUG: Usage check - Percentage used: ${usage.percentageUsed.toFixed(2)}%, Tier: ${usage.subscriptionTier}, Credits: ${usage.calculatedCosts.totalCost.toFixed(4)}/${usage.creditLimit}`);
    
    // Import isExpoGo and isDevelopment from deviceInfo.ts
    try {
      const { isExpoGo, isDevelopment } = require('../utils/deviceInfo');
      
      // Check if we're in development or Expo environment
      if (isDevelopment() || isExpoGo()) {
        // Use the subscription tier we already have from Supabase
        const tier = usage.subscriptionTier;
        console.log(`📊 QUOTA DEBUG: Using subscription tier from Supabase: ${tier}`);
        
        if (tier !== 'free') {
          console.log('📊 QUOTA DEBUG: In dev mode with paid tier, returning true');
          return true; // In dev mode, paid tiers always have quota
        } else {
          // In dev mode with free tier, check local percentage
          console.log('📊 QUOTA DEBUG: In dev mode with free tier, checking percentage');
          return usage.percentageUsed < 100;
        }
      } else {
        // Production flow
        console.log("📊 QUOTA DEBUG: In production environment, using local quota check");
        
        // TEMPORARY FIX: Skip server verification and use local data
        // This prevents incorrectly showing quota exceeded
        const tier = usage.subscriptionTier;
        const hasQuota = usage.percentageUsed < 100;
        console.log(`📊 QUOTA DEBUG: Using local subscription data: Tier=${tier}, Has Quota=${hasQuota}`);
        return hasQuota;
        
        /* Temporarily disabled server check
        // Get token for auth (for production)
        const token = await getIdToken(user, true);
        
        // Verify with server
        console.log(`Verifying subscription with server: ${API_URL}/verify-subscription?user_id=${user.id}`);
        const response = await fetch(`${API_URL}/verify-subscription?user_id=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Server response for quota check:`, data);
          // Return server's decision on quota
          return data.has_quota;
        } else {
          console.warn(`Server returned ${response.status} for quota check`);
          // Fall back to local check
          return usage.percentageUsed < 100;
        }
        */
      }
    } catch (error) {
      console.error('Error in quota check:', error);
      // Fall back to local decision if anything fails
      const hasQuota = usage.percentageUsed < 100;
      console.log(`Falling back to local quota check due to error: ${hasQuota}`);
      return hasQuota;
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
 * For normalized schema, this requires adding lots of usage
 */
export const forceQuotaExceeded = async (): Promise<void> => {
  try {
    const user = getCurrentUser();
    if (!user) return;
    
    // Get current usage and credit limit
    const usage = await getUserUsage(user.id);
    if (!usage) return;
    
    // Calculate how much usage to add to exceed quota
    const currentCost = usage.calculatedCosts.totalCost;
    const { getCreditLimitForTier } = await import('../types/subscription');
    const creditLimit = getCreditLimitForTier(usage.subscriptionTier);
    
    // Add enough usage to exceed limit (add usage equivalent to 2x credit limit)
    const tokensToAdd = creditLimit * 1000000 * 2; // large number to ensure quota exceeded
    
    // Update with excessive LLM usage
    await trackApiUsage({
      llmInputTokens: tokensToAdd,
    }, user.id);
    
    console.log('Quota marked as exceeded to sync with server');
  } catch (error) {
    console.error('Error forcing quota exceeded:', error);
  }
};

/**
 * DEPRECATED - This function has been removed as it was faulty and unused.
 * @deprecated This function uses an endpoint that may return incorrect results.
 * Use local Supabase data through getUserUsage() instead.
 */
export const verifySubscriptionWithServer = async (): Promise<boolean> => {
  console.warn(
    'DEPRECATED: verifySubscriptionWithServer() is no longer supported. ' +
    'This function may return incorrect results. ' + 
    'Use local Supabase data through getUserUsage() instead.'
  );
  
  // Return true as a safety measure to prevent false negatives
  return true;
};

/**
 * Update the user's subscription tier in the database
 * Credit limit is now derived from the tier rather than stored
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
    
    // With normalized approach, we only need to update the tier
    const { error } = await supabase
      .from('users')
      .update({
        subscription_tier: newTier,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    console.log(`Subscription updated to ${newTier} tier (with ${plan.monthlyCredits} credit limit)`);
  } catch (error) {
    console.error('Error updating subscription tier:', error);
  }
};

/**
 * Delete all user data from Supabase tables
 * Called when a user deletes their account
 */
export const deleteUserData = async (userId: string): Promise<boolean> => {
  try {
    // Delete user data from all tables that store user information

    // 1. Delete from 'usage' table
    const { error: usageError } = await supabase
      .from('usage')
      .delete()
      .eq('user_id', userId);
    
    if (usageError) {
      console.error('Error deleting user usage data:', usageError);
    }

    // 2. Delete from 'users' table
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId);
    
    if (userError) {
      console.error('Error deleting user profile data:', userError);
    }

    // 3. Delete from 'conversations' table if it exists
    try {
      const { error: conversationsError } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', userId);
      
      if (conversationsError) {
        console.error('Error deleting user conversations:', conversationsError);
      }
    } catch (error) {
      console.warn('Conversations table might not exist:', error);
    }

    // 4. Delete from 'messages' table if it exists
    try {
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', userId);
      
      if (messagesError) {
        console.error('Error deleting user messages:', messagesError);
      }
    } catch (error) {
      console.warn('Messages table might not exist:', error);
    }

    // 5. Delete from 'user_preferences' table if it exists
    try {
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', userId);
      
      if (preferencesError) {
        console.error('Error deleting user preferences:', preferencesError);
      }
    } catch (error) {
      console.warn('User preferences table might not exist:', error);
    }

    console.log('User data deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting user data:', error);
    return false;
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
  updateSubscriptionTier,
  deleteUserData
};