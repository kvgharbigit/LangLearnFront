// src/services/usageService.ts
// This file is now a compatibility layer that re-exports all usage functions
// from the supabaseUsageService to maintain backward compatibility

import {
  UsageDetails,
  UsageCosts,
  MonthlyUsage,
  calculateCosts,
  estimateTokens,
  getTodayDateString,
  getMonthlyPeriod,
  creditsToTokens,
  tokensToCredits
} from '../types/usage';
import { SUBSCRIPTION_PLANS } from '../types/subscription';

// Import API URL from the api.ts file
import { API_URL } from '../utils/api';

// Import all functionality from supabaseUsageService
import supabaseUsageService from './supabaseUsageService';

// Export all the functions from supabaseUsageService
export const {
  initializeMonthlyUsage,
  getUserUsage,
  resetMonthlyUsage,
  trackApiUsage,
  trackWhisperUsage,
  trackClaudeUsage,
  trackTTSUsage,
  getUserUsageInTokens,
  hasAvailableQuota,
  forceQuotaExceeded,
  verifySubscriptionWithServer,
  updateSubscriptionTier
} = supabaseUsageService;

// Export the default object
export default supabaseUsageService;