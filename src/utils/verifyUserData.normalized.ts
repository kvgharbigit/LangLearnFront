// src/utils/verifyUserData.normalized.ts
import { supabase } from '../supabase/config';
import { getDetailedDeviceInfo } from './deviceInfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureDiagnostics, DiagnosticType } from './diagnostics';

/**
 * Checks if a user exists in both 'users' and 'usage' tables.
 * This ensures their data is properly initialized after authentication.
 * 
 * @param userId The Supabase user ID to check
 * @returns A promise resolving to true if user data exists in both tables, false otherwise
 */
/**
 * Helper for structured logging of verification events
 */
const logVerify = (level: 'info' | 'warn' | 'error', stage: string, message: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const logPrefix = `[Verify ${timestamp}][${stage}]`;
  
  if (level === 'info') {
    console.log(`${logPrefix} ${message}`, details !== undefined ? details : '');
  } else if (level === 'warn') {
    console.warn(`${logPrefix} ${message}`, details !== undefined ? details : '');
  } else if (level === 'error') {
    console.error(`${logPrefix} ${message}`, details !== undefined ? details : '');
  }
};

export const verifyUserDataExists = async (userId: string): Promise<boolean> => {
  if (!userId) {
    logVerify('error', 'INIT', 'Cannot verify user data: No user ID provided');
    return false;
  }

  const verifyStartTime = Date.now();
  const deviceInfo = getDetailedDeviceInfo();
  const verificationResults = {
    usersTable: { success: false, error: null, data: null },
    usageTable: { success: false, error: null, data: null }
  };

  try {
    logVerify('info', 'START', `Verifying user data existence for ID: ${userId}`, { 
      verifyStartTime,
      deviceInfo: {
        platform: deviceInfo.platform,
        appVersion: deviceInfo.appVersion
      }
    });
    
    // Check users table
    logVerify('info', 'USERS', 'Checking users table record');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, subscription_tier, credit_limit')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (userError) {
      verificationResults.usersTable.error = {
        message: userError.message,
        code: userError.code,
        details: userError.details
      };
      
      logVerify('error', 'USERS', 'Error checking users table', {
        error: userError.message,
        code: userError.code,
        details: userError.details
      });
      
      // Record as diagnostic data for troubleshooting
      await recordVerificationIssue('users_table_error', {
        userId,
        error: verificationResults.usersTable.error,
        timestamp: new Date().toISOString()
      });
      
      // Also use new diagnostics system
      await captureDiagnostics(
        DiagnosticType.VERIFY_FAILURE, 
        userId,
        {
          table: 'users',
          error: verificationResults.usersTable.error
        }
      );
      
      return false;
    }
    
    verificationResults.usersTable.success = !!userData;
    if (userData) {
      verificationResults.usersTable.data = {
        userId: userData.user_id,
        tier: userData.subscription_tier,
        creditLimit: userData.credit_limit
      };
    }
    
    // Check usage table - normalized schema does not have tokens_used column
    logVerify('info', 'USAGE', 'Checking usage table record');
    const { data: usageData, error: usageError } = await supabase
      .from('usage')
      .select('user_id, transcription_minutes, llm_input_tokens, llm_output_tokens, tts_characters')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (usageError) {
      verificationResults.usageTable.error = {
        message: usageError.message,
        code: usageError.code,
        details: usageError.details  
      };
      
      logVerify('error', 'USAGE', 'Error checking usage table', {
        error: usageError.message,
        code: usageError.code,
        details: usageError.details
      });
      
      // Record as diagnostic data for troubleshooting
      await recordVerificationIssue('usage_table_error', {
        userId,
        error: verificationResults.usageTable.error,
        timestamp: new Date().toISOString()
      });
      
      // Also use new diagnostics system
      await captureDiagnostics(
        DiagnosticType.VERIFY_FAILURE, 
        userId,
        {
          table: 'usage',
          error: verificationResults.usageTable.error
        }
      );
      
      return false;
    }
    
    verificationResults.usageTable.success = !!usageData;
    if (usageData) {
      // Import pricing constants and helpers
      const { 
        PRICING,
        calculateTranscriptionCost,
        calculateLLMInputCost,
        calculateLLMOutputCost,
        calculateTTSCost
      } = require('../constants/pricing');
      
      // Calculate tokens used from raw usage metrics
      const totalCost = 
        calculateTranscriptionCost(usageData.transcription_minutes || 0) + 
        calculateLLMInputCost(usageData.llm_input_tokens || 0) + 
        calculateLLMOutputCost(usageData.llm_output_tokens || 0) + 
        calculateTTSCost(usageData.tts_characters || 0);
        
      // Convert cost to tokens (1 credit = 100 tokens)
      const tokensUsed = Math.round(totalCost * 100);
      
      verificationResults.usageTable.data = {
        userId: usageData.user_id,
        tokensUsed: tokensUsed || 0
      };
    }
    
    // User must exist in both tables to be considered properly initialized
    const userExists = !!userData;
    const usageExists = !!usageData;
    const verificationDuration = Date.now() - verifyStartTime;
    
    logVerify('info', 'RESULT', `User data verification completed in ${verificationDuration}ms`, {
      userExists,
      usageExists,
      duration: verificationDuration
    });
    
    if (userExists) {
      logVerify('info', 'DETAIL', `User record exists with subscription tier: ${userData.subscription_tier}`);
    }
    
    if (usageExists) {
      // Calculate tokens for logging using the on-the-fly method
      const tokensUsed = verificationResults.usageTable.data?.tokensUsed || 0;
      logVerify('info', 'DETAIL', `Usage record exists with calculated tokens used: ${tokensUsed}`);
    }
    
    if (!userExists && !usageExists) {
      logVerify('info', 'MISSING', 'User data is completely missing - needs initialization');
      
      // Record complete missing data for diagnostics
      await recordVerificationIssue('all_data_missing', {
        userId,
        timestamp: new Date().toISOString()
      });
      
      // Also use new diagnostics system
      await captureDiagnostics(
        DiagnosticType.VERIFY_FAILURE, 
        userId,
        {
          issue: 'all_data_missing',
          tables: ['users', 'usage']
        }
      );
    } else if (!userExists) {
      logVerify('warn', 'PARTIAL', 'User record is missing but usage record exists');
      await recordVerificationIssue('users_missing', {
        userId,
        usageData: verificationResults.usageTable.data,
        timestamp: new Date().toISOString()
      });
      
      // Also use new diagnostics system
      await captureDiagnostics(
        DiagnosticType.VERIFY_FAILURE, 
        userId,
        {
          issue: 'partial_data_missing',
          missingTable: 'users',
          existingTable: 'usage',
          usageData: verificationResults.usageTable.data
        }
      );
    } else if (!usageExists) {
      logVerify('warn', 'PARTIAL', 'Usage record is missing but user record exists');
      await recordVerificationIssue('usage_missing', {
        userId,
        userData: verificationResults.usersTable.data,
        timestamp: new Date().toISOString()
      });
      
      // Also use new diagnostics system
      await captureDiagnostics(
        DiagnosticType.VERIFY_FAILURE, 
        userId,
        {
          issue: 'partial_data_missing',
          missingTable: 'usage',
          existingTable: 'users',
          userData: verificationResults.usersTable.data
        }
      );
    }
    
    // If successful, clear any previous verification errors
    if (userExists && usageExists) {
      await AsyncStorage.removeItem('@confluency:verification_issues');
    }
    
    return userExists && usageExists;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'Unknown error type';
    const errorStack = error instanceof Error ? error.stack : null;
    
    logVerify('error', 'UNEXPECTED', 'Unexpected error verifying user data', {
      error: errorMessage,
      type: errorName,
      stack: errorStack
    });
    
    // Record for diagnostic purposes
    await recordVerificationIssue('unexpected_error', {
      userId,
      error: {
        message: errorMessage,
        type: errorName
      },
      timestamp: new Date().toISOString()
    });
    
    // Also use new diagnostics system
    await captureDiagnostics(
      DiagnosticType.VERIFY_FAILURE, 
      userId,
      {
        issue: 'unexpected_error',
        error: {
          message: errorMessage,
          type: errorName
        },
        timestamp: new Date().toISOString()
      }
    );
    
    return false;
  }
};

/**
 * Records verification issues for later diagnostics
 */
const recordVerificationIssue = async (issueType: string, data: any): Promise<void> => {
  try {
    // Get existing issues
    const issuesJson = await AsyncStorage.getItem('@confluency:verification_issues');
    const issues = issuesJson ? JSON.parse(issuesJson) : [];
    
    // Add new issue with timestamp
    issues.unshift({
      type: issueType,
      ...data,
      recordedAt: new Date().toISOString()
    });
    
    // Keep max 5 issues
    if (issues.length > 5) {
      issues.length = 5;
    }
    
    // Save back to storage
    await AsyncStorage.setItem('@confluency:verification_issues', JSON.stringify(issues));
  } catch (e) {
    console.error('Error recording verification issue:', e);
  }
};

export default verifyUserDataExists;