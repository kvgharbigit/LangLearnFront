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

// Import centralized pricing constants
import { PRICING } from '../constants/pricing';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free_tier',
    name: 'Free',
    tier: 'free',
    price: 0,
    monthlyCredits: 0.50, // $0.50 worth of usage
    monthlyTokens: 50, // 0.50 credit * 100
    features: [
      '50 Confluency Tokens per month'
    ]
  },
  {
    id: 'basic_tier',
    name: 'Basic',
    tier: 'basic',
    price: 4.99,
    monthlyCredits: 2.50, // $2.50 worth of usage
    monthlyTokens: 250, // 2.50 credits * 100
    features: [
      '250 Confluency Tokens per month'
    ]
  },
  {
    id: 'premium_tier',
    name: 'Premium',
    tier: 'premium',
    price: 9.99,
    monthlyCredits: 7.50, // $7.50 worth of usage
    monthlyTokens: 750, // 7.50 credits * 100
    isPopular: true,
    features: [
      '750 Confluency Tokens per month'
    ]
  },
  {
    id: 'gold_tier',
    name: 'Gold',
    tier: 'gold',
    price: 18.99,
    monthlyCredits: 15.00, // $15.00 worth of usage
    monthlyTokens: 1500, // 15.00 credits * 100
    features: [
      '1,500 Confluency Tokens per month'
    ]
  }
];

/**
 * Gets the credit limit for a given subscription tier
 * Centralizing this logic allows easier changes to subscription plans
 */
export const getCreditLimitForTier = (tier: SubscriptionTier): number => {
  const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
  return plan?.monthlyCredits || 0.50; // Default to free tier
};

/**
 * Gets the token limit for a given subscription tier
 */
export const getTokenLimitForTier = (tier: SubscriptionTier): number => {
  const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
  return plan?.monthlyTokens || 50; // Default to free tier
};