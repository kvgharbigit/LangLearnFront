// src/utils/localInitializeUserData.ts
import { supabase } from '../supabase/config';
import { getCurrentSubscription } from '../services/revenueCatService';
import { SUBSCRIPTION_PLANS } from '../types/subscription';
import { getMonthlyPeriod } from '../types/usage';

/**
 * Initialize user data directly in the local Supabase database
 * This is used as a last resort when the API endpoints fail
 * but the user is authenticated
 * 
 * @param userId The Supabase user ID to initialize
 * @returns A boolean indicating success or failure
 */
export const localInitializeUserData = async (userId: string): Promise<boolean> => {
    try {
        console.log(`Attempting local database initialization for user ${userId}...`);
        
        // Get user's subscription tier
        const { tier } = await getCurrentSubscription();
        
        // Find the plan to get credit limit
        const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier) || SUBSCRIPTION_PLANS[0];
        const creditLimit = plan.monthlyCredits || 1.5;
        
        // Calculate billing periods
        const currentTime = Date.now();
        const { start, end } = getMonthlyPeriod();
        
        console.log(`Creating local user record with ${tier} tier...`);
        
        // Step 1: Create user record
        const { error: userError } = await supabase.from('users').upsert({
            user_id: userId,
            subscription_tier: tier,
            subscription_start: currentTime,
            billing_cycle_start: start,
            billing_cycle_end: end,
            credit_limit: creditLimit,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        
        if (userError) {
            console.error(`Error creating user record: ${userError.message}`);
            return false;
        }
        
        console.log(`Creating local usage record...`);
        
        // Step 2: Create usage record
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Initial daily usage (empty for the current day)
        const dailyUsage = {
            [today]: {
                date: today,
                transcription_minutes: 0,
                llm_input_tokens: 0,
                llm_output_tokens: 0,
                tts_characters: 0
            }
        };
        
        const { error: usageError } = await supabase.from('usage').upsert({
            user_id: userId,
            current_period_start: start,
            current_period_end: end,
            transcription_minutes: 0,
            llm_input_tokens: 0,
            llm_output_tokens: 0,
            tts_characters: 0,
            daily_usage: JSON.stringify(dailyUsage),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        
        if (usageError) {
            console.error(`Error creating usage record: ${usageError.message}`);
            return false;
        }
        
        console.log(`✅ Successfully initialized local data for user ${userId}`);
        return true;
        
    } catch (error) {
        console.error(`Error in local initialization: ${error}`);
        return false;
    }
};

export default localInitializeUserData;