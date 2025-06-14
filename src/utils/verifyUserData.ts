// src/utils/verifyUserData.ts
import { supabase } from '../supabase/config';
import { getDetailedDeviceInfo } from './deviceInfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureDiagnostics, DiagnosticType } from './diagnostics';
import { localInitializeUserData } from './localInitializeUserData';

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
      .select('user_id, subscription_tier')
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
        tier: userData.subscription_tier
      };
    }
    
    // Check usage table with normalized schema (no tokens_used column)
    logVerify('info', 'USAGE', 'Checking usage table record');
    const { data: usageData, error: usageError } = await supabase
      .from('usage')
      .select('user_id, transcription_minutes, llm_input_tokens, llm_output_tokens, tts_characters')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (usageError) {
      // If error is specifically about tokens_used column not existing, it's the schema change
      const isSchemaChangeError = 
        usageError.message?.includes("column") && 
        usageError.message?.includes("does not exist") &&
        usageError.message?.includes("tokens_used");
      
      if (isSchemaChangeError) {
        // This is a known issue with the schema change, treat as success
        logVerify('info', 'SCHEMA', 'Detected normalized schema (missing tokens_used column is expected)');
        
        // Re-run the query without the problematic column
        const { data: basicUsageData, error: basicError } = await supabase
          .from('usage')
          .select('user_id, transcription_minutes, llm_input_tokens, llm_output_tokens, tts_characters')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (basicError) {
          logVerify('error', 'USAGE', 'Error checking usage table even without tokens_used', {
            error: basicError.message,
            code: basicError.code,
            details: basicError.details
          });
          
          await captureDiagnostics(
            DiagnosticType.VERIFY_FAILURE, 
            userId,
            {
              table: 'usage',
              error: basicError
            }
          );
          
          // Even if this check fails, we'll handle it in the later missing data section
          // which will trigger local initialization
        }
        
        // If we found the user_id, consider it success
        if (basicUsageData && basicUsageData.user_id) {
          verificationResults.usageTable.success = true;
          
          // Import pricing constants
          const { PRICING, calculateTranscriptionCost, calculateLLMInputCost, calculateLLMOutputCost, calculateTTSCost } = require('../constants/pricing');
          
          const transcriptionCost = calculateTranscriptionCost(basicUsageData.transcription_minutes || 0);
          const llmInputCost = calculateLLMInputCost(basicUsageData.llm_input_tokens || 0);
          const llmOutputCost = calculateLLMOutputCost(basicUsageData.llm_output_tokens || 0);
          const ttsCost = calculateTTSCost(basicUsageData.tts_characters || 0);
          const totalCost = transcriptionCost + llmInputCost + llmOutputCost + ttsCost;
          const tokensUsed = Math.round(totalCost * 100); // 1 credit = 100 tokens
          
          verificationResults.usageTable.data = {
            userId: basicUsageData.user_id,
            tokensUsed: tokensUsed
          };
          
          // When using normalized DB schema, verify is complete if we found records in both tables
          if (verificationResults.usersTable.success) {
            return true;
          }
        }
      } else {
        // Regular error (not schema related)
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
    }
    
    verificationResults.usageTable.success = !!usageData;
    if (usageData) {
      // Import pricing constants
      const { PRICING, calculateTranscriptionCost, calculateLLMInputCost, calculateLLMOutputCost, calculateTTSCost } = require('../constants/pricing');
      
      const transcriptionCost = calculateTranscriptionCost(usageData.transcription_minutes || 0);
      const llmInputCost = calculateLLMInputCost(usageData.llm_input_tokens || 0);
      const llmOutputCost = calculateLLMOutputCost(usageData.llm_output_tokens || 0);
      const ttsCost = calculateTTSCost(usageData.tts_characters || 0);
      const totalCost = transcriptionCost + llmInputCost + llmOutputCost + ttsCost;
      const tokensUsed = Math.round(totalCost * 100); // 1 credit = 100 tokens
      
      verificationResults.usageTable.data = {
        userId: usageData.user_id,
        tokensUsed: tokensUsed
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
      logVerify('info', 'DETAIL', `Usage record exists with calculated tokens used: ${verificationResults.usageTable.data?.tokensUsed || 0}`);
    }
    
    if (!userExists || !usageExists) {
      // User is authenticated but missing data in database
      // We will only use the backend endpoint for initialization
      
      // Import the initialization function
      const { initializeUserData } = require('./initializeUserData');
      
      logVerify('info', 'INIT_ATTEMPT', 'Using backend initialization for authenticated user with missing data');
      
      // Record the initialization attempt
      await recordVerificationIssue('init_attempt', {
        userId,
        timestamp: new Date().toISOString(),
        missing: {
          user: !userExists,
          usage: !usageExists
        }
      });
      
      // Try to initialize using the backend only
      try {
        // Special handling for partial initialization (user exists but usage doesn't)
        if (userExists && !usageExists) {
          logVerify('info', 'PARTIAL_INIT', 'User exists but usage record is missing, using direct local initialization for usage only');
          
          try {
            // Get today's date in YYYY-MM-DD format
            const today = new Date().toISOString().split('T')[0];
            
            // Initial daily usage (empty for the current day)
            const dailyUsage = {
              [today]: {
                date: today,
                transcription_minutes: 0,
                llm_input_tokens: 0,
                llm_output_tokens: 0,
                tts_characters: 0
              }
            };
            
            // Get current billing cycle
            const currentTime = Date.now();
            const { getMonthlyPeriod } = require('../types/usage');
            const { start, end } = getMonthlyPeriod();
            
            // Create just the usage record
            const { error: usageError } = await supabase.from('usage').upsert({
              user_id: userId,
              current_period_start: start,
              current_period_end: end,
              transcription_minutes: 0,
              llm_input_tokens: 0,
              llm_output_tokens: 0,
              tts_characters: 0,
              daily_usage: JSON.stringify(dailyUsage),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
            if (usageError) {
              logVerify('error', 'USAGE_INIT_ERROR', `Error creating usage record: ${usageError.message}`);
              throw new Error(`Usage record creation failed: ${usageError.message}`);
            }
            
            logVerify('info', 'USAGE_INIT_SUCCESS', 'Successfully created missing usage record directly');
            
            // Record success
            await recordVerificationIssue('usage_init_success', {
              userId,
              timestamp: new Date().toISOString()
            });
            
            // Clear any previous verification errors
            await AsyncStorage.removeItem('@confluency:verification_issues');
            
            // Return true to indicate successful initialization
            return true;
          } catch (usageInitError) {
            logVerify('error', 'USAGE_INIT_ERROR', `Error during usage initialization: ${usageInitError instanceof Error ? usageInitError.message : String(usageInitError)}`);
            // Fall back to regular initialization
          }
        }
        
        // Standard initialization flow for both tables
        const backendInitResult = await initializeUserData(userId);
        
        if (backendInitResult) {
          // Backend initialization succeeded
          logVerify('info', 'BACKEND_INIT', 'Successfully initialized user data through backend');
          
          // Record success
          await recordVerificationIssue('backend_init_success', {
            userId,
            timestamp: new Date().toISOString()
          });
          
          // Clear any previous verification errors
          await AsyncStorage.removeItem('@confluency:verification_issues');
          
          // Return true to indicate successful initialization
          return true;
        }
      } catch (error) {
        // Error in initialization process
        logVerify('error', 'INIT_ERROR', `Error during initialization: ${error instanceof Error ? error.message : String(error)}`);
        
        // No fallback to local initialization - we only want to use the backend
      }
      
      // If backend initialization failed, continue with normal error handling
      if (!userExists && !usageExists) {
        logVerify('info', 'MISSING', 'User data is completely missing - local initialization failed');
        
        // Record complete missing data for diagnostics
        await recordVerificationIssue('all_data_missing', {
          userId,
          timestamp: new Date().toISOString(),
          localInitFailed: true
        });
        
        // Also use new diagnostics system
        await captureDiagnostics(
          DiagnosticType.VERIFY_FAILURE, 
          userId,
          {
            issue: 'all_data_missing',
            tables: ['users', 'usage'],
            localInitFailed: true
          }
        );
      } else if (!userExists) {
        logVerify('warn', 'PARTIAL', 'User record is missing but usage record exists - local initialization failed');
        await recordVerificationIssue('users_missing', {
          userId,
          usageData: verificationResults.usageTable.data,
          timestamp: new Date().toISOString(),
          localInitFailed: true
        });
        
        // Also use new diagnostics system
        await captureDiagnostics(
          DiagnosticType.VERIFY_FAILURE, 
          userId,
          {
            issue: 'partial_data_missing',
            missingTable: 'users',
            existingTable: 'usage',
            usageData: verificationResults.usageTable.data,
            localInitFailed: true
          }
        );
      } else if (!usageExists) {
        logVerify('warn', 'PARTIAL', 'Usage record is missing but user record exists - local initialization failed');
        await recordVerificationIssue('usage_missing', {
          userId,
          userData: verificationResults.usersTable.data,
          timestamp: new Date().toISOString(),
          localInitFailed: true
        });
        
        // Also use new diagnostics system
        await captureDiagnostics(
          DiagnosticType.VERIFY_FAILURE, 
          userId,
          {
            issue: 'partial_data_missing',
            missingTable: 'usage',
            existingTable: 'users',
            userData: verificationResults.usersTable.data,
            localInitFailed: true
          }
        );
      }
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