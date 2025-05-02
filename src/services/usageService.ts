// src/services/usageService.ts
import { doc, getDoc, setDoc, updateDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getCurrentUser, getIdToken } from './authService';
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
const API_URL = 'https://language-tutor-984417336702.asia-east1.run.app';

// Collection paths
const USAGE_COLLECTION = 'usage';

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
    
    // Create a document for the user
    const userDocRef = doc(db, USAGE_COLLECTION, userId);
    await setDoc(userDocRef, monthlyUsage);
    
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
    // If no userId provided, try to get the current user
    if (!userId) {
      const user = getCurrentUser();
      if (!user) return null;
      userId = user.uid;
    }
    
    const userDocRef = doc(db, USAGE_COLLECTION, userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // Initialize usage if not exists
      return await initializeMonthlyUsage(userId);
    }
    
    const usage = userDoc.data() as MonthlyUsage;
    
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
    
    // Update user document
    const userDocRef = doc(db, USAGE_COLLECTION, userId);
    await setDoc(userDocRef, updatedUsage);
    
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
      userId = user.uid;
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
    
    // Update user document in Firestore
    const userDocRef = doc(db, USAGE_COLLECTION, userId);
    await updateDoc(userDocRef, currentUsage);
    
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
    
    const usage = await getUserUsage(user.uid);
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
    const user = getCurrentUser();
    if (!user) return false;
    
    // First check with local data
    const usage = await getUserUsage(user.uid);
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
    
    // Use AsyncStorage instead of localStorage in React Native
    try {
      // In Expo Go development mode, skip server verification
      if (__DEV__) {
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
      const response = await fetch(`${API_URL}/verify-subscription?user_id=${user.uid}`, {
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
    
    // Get current usage
    const usage = await getUserUsage(user.uid);
    if (!usage) return;
    
    // Update percentage used to 100%
    usage.percentageUsed = 100;
    
    // Update the usage document
    const userDocRef = doc(db, USAGE_COLLECTION, user.uid);
    await updateDoc(userDocRef, { percentageUsed: 100 });
    
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
    const response = await fetch(`${API_URL}/verify-subscription?user_id=${user.uid}`, {
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