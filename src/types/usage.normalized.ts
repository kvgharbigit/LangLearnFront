// src/types/usage.normalized.ts
// Normalized types for usage tracking without redundant fields
// The key difference is that cost fields and percentage used is calculated on-the-fly
// rather than being stored in the database

/**
 * Raw usage metrics
 */
export interface UsageDetails {
  whisperMinutes: number;
  claudeInputTokens: number;
  claudeOutputTokens: number;
  ttsCharacters: number;
}

/**
 * Calculated costs based on usage metrics
 */
export interface UsageCosts {
  whisperCost: number;
  claudeInputCost: number;
  claudeOutputCost: number;
  ttsCost: number;
  totalCost: number;
}

/**
 * Interface for daily usage entries in Supabase (raw metrics only)
 */
export interface SupabaseDailyUsageEntry {
  date: string;
  whisper_minutes: number;
  claude_input_tokens: number;
  claude_output_tokens: number;
  tts_characters: number;
}

/**
 * The complete monthly usage object (derived from database tables)
 */
export interface MonthlyUsage {
  currentPeriodStart: number;
  currentPeriodEnd: number;
  usageDetails: UsageDetails;
  calculatedCosts: UsageCosts;
  creditLimit: number;
  percentageUsed: number;
  dailyUsage: Record<string, SupabaseDailyUsageEntry>;
  subscriptionTier: string;
}

// Pricing constants for cost calculations (same as backend)
const PRICING = {
  WHISPER_PER_MINUTE: 0.006,     // $0.006 per minute of audio
  CLAUDE_INPUT_PER_MILLION: 0.25, // $0.25 per million tokens for Claude
  CLAUDE_OUTPUT_PER_MILLION: 1.25,// $1.25 per million tokens for Claude
  OPENAI_INPUT_PER_MILLION: 0.1,  // $0.1 per million tokens for GPT-4.1 Nano
  OPENAI_OUTPUT_PER_MILLION: 0.4, // $0.4 per million tokens for GPT-4.1 Nano
  TTS_PER_MILLION: 4.0,          // $4.00 per million characters
  TOKENS_PER_CHAR: 1/3,           // Estimate: 1 token ~ 3 characters
};

/**
 * Calculate costs based on usage metrics
 * @param usage Usage metrics
 * @param useOpenAIPricing Whether to use OpenAI's pricing instead of Claude's
 */
export function calculateCosts(usage: UsageDetails, useOpenAIPricing: boolean = false): UsageCosts {
  const whisperCost = usage.whisperMinutes * PRICING.WHISPER_PER_MINUTE;
  
  // Use the appropriate pricing based on the current LLM provider
  const inputCostPerMillion = useOpenAIPricing 
    ? PRICING.OPENAI_INPUT_PER_MILLION 
    : PRICING.CLAUDE_INPUT_PER_MILLION;
    
  const outputCostPerMillion = useOpenAIPricing 
    ? PRICING.OPENAI_OUTPUT_PER_MILLION 
    : PRICING.CLAUDE_OUTPUT_PER_MILLION;
  
  const claudeInputCost = (usage.claudeInputTokens / 1000000) * inputCostPerMillion;
  const claudeOutputCost = (usage.claudeOutputTokens / 1000000) * outputCostPerMillion;
  const ttsCost = (usage.ttsCharacters / 1000000) * PRICING.TTS_PER_MILLION;
  const totalCost = whisperCost + claudeInputCost + claudeOutputCost + ttsCost;
  
  return {
    whisperCost,
    claudeInputCost,
    claudeOutputCost,
    ttsCost,
    totalCost
  };
}

/**
 * Calculates percentage used based on total cost and credit limit
 */
export function calculatePercentageUsed(totalCost: number, creditLimit: number): number {
  if (creditLimit <= 0) return 100;
  return Math.min((totalCost / creditLimit) * 100, 100);
}

/**
 * Helper to get today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Helper to get monthly period (start and end timestamps)
 */
export function getMonthlyPeriod(): { start: number, end: number } {
  const now = Date.now();
  // 30 days in milliseconds
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return {
    start: now,
    end: now + thirtyDaysMs
  };
}

/**
 * Convert credits to tokens (1 credit = 100 tokens)
 */
export function creditsToTokens(credits: number): number {
  return credits * 100;
}

/**
 * Convert tokens to credits (100 tokens = 1 credit)
 */
export function tokensToCredits(tokens: number): number {
  return tokens / 100;
}

/**
 * Estimate tokens based on text length
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length * PRICING.TOKENS_PER_CHAR);
}

/**
 * Convert from SupabaseDailyUsageEntry to UsageDetails
 */
export function convertToUsageDetails(entry: SupabaseDailyUsageEntry): UsageDetails {
  return {
    whisperMinutes: entry.whisper_minutes || 0,
    claudeInputTokens: entry.claude_input_tokens || 0,
    claudeOutputTokens: entry.claude_output_tokens || 0,
    ttsCharacters: entry.tts_characters || 0
  };
}

/**
 * Convert from UsageDetails to SupabaseDailyUsageEntry
 */
export function convertToDailyUsageEntry(
  usageDetails: UsageDetails, 
  date: string
): SupabaseDailyUsageEntry {
  return {
    date,
    whisper_minutes: usageDetails.whisperMinutes,
    claude_input_tokens: usageDetails.claudeInputTokens,
    claude_output_tokens: usageDetails.claudeOutputTokens,
    tts_characters: usageDetails.ttsCharacters
  };
}