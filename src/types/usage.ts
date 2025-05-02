// src/types/usage.ts
import { PRICING } from './subscription';

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

export interface DailyUsage {
  date: string; // ISO date string (YYYY-MM-DD)
  usageDetails: UsageDetails;
  calculatedCosts: UsageCosts;
}

export interface MonthlyUsage {
  currentPeriodStart: number; // timestamp
  currentPeriodEnd: number; // timestamp
  usageDetails: UsageDetails;
  calculatedCosts: UsageCosts;
  creditLimit: number;
  percentageUsed: number;
  dailyUsage: Record<string, DailyUsage>; // Keyed by date string
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