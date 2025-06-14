// src/constants/pricing.ts
// Centralized pricing constants for all API services
// These should match the constants used on the backend in constants.py

export const PRICING = {
  // Speech-to-Text pricing
  TRANSCRIPTION_PER_MINUTE: 0.006,     // $0.006 per minute of audio (Whisper API pricing)
  LEMONFOX_PRICE_PER_MINUTE: 0.00278,  // $0.00278 per minute of audio (Lemonfox pricing)
  
  // LLM pricing
  LLM_INPUT_PER_MILLION: 0.1,          // $0.1 per million input tokens (GPT-4.1 Nano)
  LLM_OUTPUT_PER_MILLION: 0.4,         // $0.4 per million output tokens (GPT-4.1 Nano)
  
  // Text-to-Speech pricing
  TTS_PER_MILLION: 2.75,               // $2.75 per million characters
  
  // Conversion factors
  TOKENS_PER_CHAR: 1/3,                // 1 token = approximately 3 characters of text
};

// Helper functions for usage calculations
export const calculateTranscriptionCost = (minutes: number): number => {
  return minutes * PRICING.TRANSCRIPTION_PER_MINUTE;
};

export const calculateLLMInputCost = (tokens: number): number => {
  return (tokens / 1000000) * PRICING.LLM_INPUT_PER_MILLION;
};

export const calculateLLMOutputCost = (tokens: number): number => {
  return (tokens / 1000000) * PRICING.LLM_OUTPUT_PER_MILLION;
};

export const calculateTTSCost = (characters: number): number => {
  return (characters / 1000000) * PRICING.TTS_PER_MILLION;
};

export const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length * PRICING.TOKENS_PER_CHAR);
};

export default PRICING;