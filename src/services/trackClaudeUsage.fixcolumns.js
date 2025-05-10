// Patched trackClaudeUsage function for normalized schema
// Save this as a separate file and then import it where needed

import { supabase } from '../supabase/config';
import { estimateTokens } from '../types/usage';
import { getCurrentUser } from './supabaseAuthService';

/**
 * Track Claude API usage (patched for normalized schema)
 * This version only updates the raw metrics, not the calculated costs
 */
export const trackClaudeUsage = async (
  inputText, 
  outputText
) => {
  try {
    const inputTokens = estimateTokens(inputText);
    const outputTokens = estimateTokens(outputText);
    
    // Get the current user
    const user = getCurrentUser();
    if (!user) {
      console.warn('Cannot track Claude usage: No authenticated user');
      return;
    }
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
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
      console.warn('Cannot track Claude usage: No usage data found');
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
        whisper_minutes: 0,
        claude_input_tokens: 0,
        claude_output_tokens: 0,
        tts_characters: 0
      };
    }
    
    // Update daily usage
    dailyUsage[today].claude_input_tokens += inputTokens;
    dailyUsage[today].claude_output_tokens += outputTokens;
    
    // Update total usage
    const newInputTokens = (usageData.claude_input_tokens || 0) + inputTokens;
    const newOutputTokens = (usageData.claude_output_tokens || 0) + outputTokens;
    
    // Update the database - ONLY raw metrics, NOT calculated fields
    const { error: updateError } = await supabase
      .from('usage')
      .update({
        claude_input_tokens: newInputTokens,
        claude_output_tokens: newOutputTokens,
        daily_usage: JSON.stringify(dailyUsage)
      })
      .eq('user_id', user.id);
    
    if (updateError) {
      console.error('Error updating Claude usage:', updateError);
      return;
    }
    
    console.log(`Tracked Claude usage: ${inputTokens} input tokens, ${outputTokens} output tokens`);
  } catch (error) {
    console.error('Error in trackClaudeUsage:', error);
  }
};