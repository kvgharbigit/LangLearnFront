// src/services/usageService.ts
// This file is now a compatibility layer that re-exports all usage functions
// from the supabaseUsageService.normalized.ts to support the normalized schema

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
} from '../types/usage.normalized';

// Import API URL from the api.ts file
import { API_URL } from '../utils/api';

// Import all functionality from normalized usage service
import supabaseUsageService from './supabaseUsageService.normalized';

// Export all the functions from supabaseUsageService.normalized
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