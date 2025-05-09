// src/types/subscription.ts
export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'gold';

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  price: number;
  monthlyCredits: number;
  monthlyTokens: number; // New field for tokens (credits * 100)
  features: string[];
  isPopular?: boolean;
}

// Pricing model constants for usage calculation
export const PRICING = {
  WHISPER_PER_MINUTE: 0.006,    // $0.006 per minute of audio
  CLAUDE_INPUT_PER_MILLION: 0.25,   // $0.25 per million input tokens
  CLAUDE_OUTPUT_PER_MILLION: 1.25,  // $1.25 per million output tokens
  TTS_PER_MILLION: 4.0,         // $4.00 per million characters
  TOKENS_PER_CHAR: 1/3,         // 1 token = 3 characters of text
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free_tier',
    name: 'Free',
    tier: 'free',
    price: 0,
    monthlyCredits: 1, // $1.00 worth of usage
    monthlyTokens: 100, // 1 credit * 100
    features: [
      '100 Conversation Tokens per month',
      'Basic language learning tools',
      'Text-to-speech capabilities',
      'Access to 5 languages'
    ]
  },
  {
    id: 'basic_tier',
    name: 'Basic',
    tier: 'basic',
    price: 4.00,
    monthlyCredits: 3, // $3 worth of usage
    monthlyTokens: 300, // 3 credits * 100
    features: [
      'All Free features',
      '300 Conversation Tokens per month',
      'Advanced grammar corrections',
      'Access to 10 languages',
      'Priority support'
    ]
  },
  {
    id: 'premium_tier',
    name: 'Premium',
    tier: 'premium',
    price: 11.00,
    monthlyCredits: 8, // $8 worth of usage
    monthlyTokens: 800, // 8 credits * 100
    isPopular: true,
    features: [
      'All Basic features',
      '800 Conversation Tokens per month',
      'Conversation mode options',
      'Instant voice recognition',
      'Personalized learning paths',
      'Access to all languages'
    ]
  },
  {
    id: 'gold_tier',
    name: 'Gold',
    tier: 'gold',
    price: 20.00,
    monthlyCredits: 16, // $16 worth of usage
    monthlyTokens: 1600, // 16 credits * 100
    features: [
      'All Premium features',
      '1,600 Conversation Tokens per month',
      'Expert language tutoring',
      'Custom vocabulary sets',
      'Progress analytics',
      'Priority customer support'
    ]
  }
];