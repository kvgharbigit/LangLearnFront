/**
 * Safe subscription tier update wrapper with retry logic
 * Provides additional protection against race conditions and network failures
 */

import { updateSubscriptionTier } from './supabaseUsageService';

/**
 * Update subscription tier with automatic retry logic
 * Handles network failures and race conditions gracefully
 */
export const updateSubscriptionTierSafe = async (
  newTier: string, 
  maxRetries: number = 3
): Promise<void> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await updateSubscriptionTier(newTier);
      console.log(`✅ Subscription tier updated to ${newTier} successfully`);
      return; // Success!
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      
      if (isLastAttempt) {
        console.error(`❌ Failed to update subscription tier after ${maxRetries} attempts:`, error);
        throw error; // Re-throw on final attempt
      }
      
      // Calculate exponential backoff delay
      const delay = 100 * Math.pow(2, attempt); // 100ms, 200ms, 400ms
      console.warn(`⚠️ Subscription update attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Batch update subscription tiers for multiple operations
 * Useful for complex subscription flows that need multiple updates
 */
export const updateSubscriptionTierBatch = async (
  updates: Array<{ userId?: string; newTier: string }>,
  maxRetries: number = 3
): Promise<void> => {
  for (const update of updates) {
    await updateSubscriptionTierSafe(update.newTier, maxRetries);
    // Small delay between updates to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};

export default {
  updateSubscriptionTierSafe,
  updateSubscriptionTierBatch
};