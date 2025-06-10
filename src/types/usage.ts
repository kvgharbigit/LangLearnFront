// src/types/usage.ts
import { PRICING } from './subscription';

// Application interfaces with updated field names
export interface UsageDetails {
  transcriptionMinutes: number;
  llmInputTokens: number;
  llmOutputTokens: number;
  ttsCharacters: number;
}

export interface UsageCosts {
  transcriptionCost: number;
  llmInputCost: number;
  llmOutputCost: number;
  ttsCost: number;
  totalCost: number;
}

// Interface matching Supabase structure for daily usage entries
export interface SupabaseDailyUsageEntry {
  date: string; // ISO date string (YYYY-MM-DD)
  transcription_minutes: number;
  llm_input_tokens: number;
  llm_output_tokens: number;
  tts_characters: number;
  transcription_cost: number;
  llm_input_cost: number;
  llm_output_cost: number;
  tts_cost: number;
  total_cost: number;
}

// Monthly usage interface
export interface MonthlyUsage {
  currentPeriodStart: number; // timestamp
  currentPeriodEnd: number; // timestamp
  usageDetails: UsageDetails;
  calculatedCosts: UsageCosts;
  creditLimit: number;
  tokenLimit: number;
  percentageUsed: number;
  dailyUsage: Record<string, SupabaseDailyUsageEntry>;
  subscriptionTier: string;
}

// Helper functions to calculate costs
export const calculateCosts = (usage: UsageDetails): UsageCosts => {
  const transcriptionCost = usage.transcriptionMinutes * PRICING.TRANSCRIPTION_PER_MINUTE;
  const llmInputCost = (usage.llmInputTokens / 1000000) * PRICING.LLM_INPUT_PER_MILLION;
  const llmOutputCost = (usage.llmOutputTokens / 1000000) * PRICING.LLM_OUTPUT_PER_MILLION;
  const ttsCost = (usage.ttsCharacters / 1000000) * PRICING.TTS_PER_MILLION;
  
  const totalCost = transcriptionCost + llmInputCost + llmOutputCost + ttsCost;
  
  return {
    transcriptionCost,
    llmInputCost,
    llmOutputCost,
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
    transcription_minutes: usageDetails.transcriptionMinutes,
    llm_input_tokens: usageDetails.llmInputTokens,
    llm_output_tokens: usageDetails.llmOutputTokens,
    tts_characters: usageDetails.ttsCharacters,
    transcription_cost: costs.transcriptionCost,
    llm_input_cost: costs.llmInputCost,
    llm_output_cost: costs.llmOutputCost,
    tts_cost: costs.ttsCost,
    total_cost: costs.totalCost
  };
};

// Helper function to convert from DB format to UsageDetails
export const convertToUsageDetails = (entry: SupabaseDailyUsageEntry): UsageDetails => {
  return {
    transcriptionMinutes: entry.transcription_minutes || 0,
    llmInputTokens: entry.llm_input_tokens || 0,
    llmOutputTokens: entry.llm_output_tokens || 0,
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