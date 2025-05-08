// src/types/usage.ts
import { PRICING } from './subscription';

// Original application interfaces
export interface UsageDetails {
  whisperMinutes: number;
  claudeInputTokens: number;
  claudeOutputTokens: number;
  ttsCharacters: number;
}

export interface UsageCosts {
  whisperCost: number;
  claudeInputCost: number;
  claudeOutputCost: number;
  ttsCost: number;
  totalCost: number;
}

// New interface matching Supabase structure for daily usage entries
export interface SupabaseDailyUsageEntry {
  date: string; // ISO date string (YYYY-MM-DD)
  whisper_minutes: number;
  claude_input_tokens: number;
  claude_output_tokens: number;
  tts_characters: number;
  whisper_cost: number;
  claude_input_cost: number;
  claude_output_cost: number;
  tts_cost: number;
  total_cost: number;
}

// Updated monthly usage interface
export interface MonthlyUsage {
  currentPeriodStart: number; // timestamp
  currentPeriodEnd: number; // timestamp
  usageDetails: UsageDetails;
  calculatedCosts: UsageCosts;
  creditLimit: number;
  tokenLimit: number;
  percentageUsed: number;
  dailyUsage: Record<string, SupabaseDailyUsageEntry>; // Updated to use Supabase structure
  subscriptionTier: string;
}

// Helper functions to calculate costs
export const calculateCosts = (usage: UsageDetails): UsageCosts => {
  const whisperCost = usage.whisperMinutes * PRICING.WHISPER_PER_MINUTE;
  const claudeInputCost = (usage.claudeInputTokens / 1000000) * PRICING.CLAUDE_INPUT_PER_MILLION;
  const claudeOutputCost = (usage.claudeOutputTokens / 1000000) * PRICING.CLAUDE_OUTPUT_PER_MILLION;
  const ttsCost = (usage.ttsCharacters / 1000000) * PRICING.TTS_PER_MILLION;
  
  const totalCost = whisperCost + claudeInputCost + claudeOutputCost + ttsCost;
  
  return {
    whisperCost,
    claudeInputCost,
    claudeOutputCost,
    ttsCost,
    totalCost
  };
};

// Helper function to convert from UsageDetails to daily usage DB format
export const convertToDailyUsageEntry = (
  date: string, 
  usageDetails: UsageDetails
): SupabaseDailyUsageEntry => {
  const costs = calculateCosts(usageDetails);
  
  return {
    date,
    whisper_minutes: usageDetails.whisperMinutes,
    claude_input_tokens: usageDetails.claudeInputTokens,
    claude_output_tokens: usageDetails.claudeOutputTokens,
    tts_characters: usageDetails.ttsCharacters,
    whisper_cost: costs.whisperCost,
    claude_input_cost: costs.claudeInputCost,
    claude_output_cost: costs.claudeOutputCost,
    tts_cost: costs.ttsCost,
    total_cost: costs.totalCost
  };
};

// Helper function to convert from DB format to UsageDetails
export const convertToUsageDetails = (entry: SupabaseDailyUsageEntry): UsageDetails => {
  return {
    whisperMinutes: entry.whisper_minutes || 0,
    claudeInputTokens: entry.claude_input_tokens || 0,
    claudeOutputTokens: entry.claude_output_tokens || 0,
    ttsCharacters: entry.tts_characters || 0
  };
};

// Helper to convert text to tokens
export const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length * PRICING.TOKENS_PER_CHAR);
};

// Helper to get today's date string
export const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD
};

// Convert credits to tokens (100x multiplier)
export const creditsToTokens = (credits: number): number => {
  return Math.round(credits * 100); // 1 credit = 100 tokens
};

// Convert tokens to credits (divide by 100)
export const tokensToCredits = (tokens: number): number => {
  return tokens / 100;
};

// Get current monthly period based on user's subscription date
export const getMonthlyPeriod = (subscriptionStartDate: Date = new Date()): { start: number, end: number } => {
  const today = new Date();
  const currentDay = today.getDate();
  const subscriptionDay = subscriptionStartDate.getDate();
  
  // Create start date (either this month or previous month on subscription day)
  const start = new Date();
  start.setDate(subscriptionDay);
  if (currentDay < subscriptionDay) {
    // If today is before subscription day, go back to previous month
    start.setMonth(start.getMonth() - 1);
  }
  start.setHours(0, 0, 0, 0);
  
  // Create end date (next subscription day minus 1 day)
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  
  return {
    start: start.getTime(),
    end: end.getTime()
  };
};