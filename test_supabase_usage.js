// test_supabase_usage.js
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://hkanndmudvnjrvkisklp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYW5uZG11ZHZuanJ2a2lza2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2Mjc0MDMsImV4cCI6MjA2MjIwMzQwM30.OsnzQS5EBT31LYeloAvc80yaxJ70AVsTEC3atNjWn4o';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUsageServiceIssue() {
  console.log('\n=== DIAGNOSING SUPABASE USAGE SERVICE ISSUE ===\n');

  try {
    // Phase 1: Check user login and get auth info to access user data
    console.log('📋 PHASE 1: Test User Authentication\n');
    let userId = null;
    
    try {
      // Try to login with test user credentials
      // You may need to update these with valid credentials for your system
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com', 
        password: 'testpassword'
      });
      
      if (authError) {
        console.log('❌ Login failed. Proceeding with anonymous access.');
        console.log('ℹ️ Error:', authError.message);
      } else if (authData && authData.user) {
        userId = authData.user.id;
        console.log('✅ Login successful');
        console.log('ℹ️ User ID:', userId);
      }
    } catch (error) {
      console.log('❌ Login function error:', error.message);
    }
    
    // Phase 2: Check all available users
    console.log('\n📋 PHASE 2: Check Available Users\n');
    
    try {
      // Get all users from the users table
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(5);
      
      if (usersError) {
        console.error('❌ Error retrieving users:', usersError.message);
      } else if (users && users.length > 0) {
        console.log(`✅ Found ${users.length} users in the database`);
        
        // Display the first few users
        console.log('ℹ️ Sample users:');
        users.forEach((user, index) => {
          console.log(`  [${index + 1}] user_id: ${user.user_id}, tier: ${user.subscription_tier}`);
          
          // If no userId from login, use the first user for testing
          if (!userId) {
            userId = user.user_id;
            console.log(`ℹ️ Using user_id ${userId} for further testing`);
          }
        });
      } else {
        console.log('⚠️ No users found in the users table');
      }
    } catch (error) {
      console.error('❌ Error querying users table:', error.message);
    }
    
    // Phase 3: Check for specific user's usage data
    console.log('\n📋 PHASE 3: Check Specific User Usage Data\n');
    
    if (userId) {
      console.log(`ℹ️ Looking up usage data for user_id: ${userId}`);
      
      try {
        const { data: usageData, error: usageError } = await supabase
          .from('usage')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (usageError) {
          console.error('❌ Error retrieving usage data:', usageError.message);
        } else if (usageData) {
          console.log('✅ Found usage record for user');
          
          // Check for the whisperMinutes field specifically
          if ('whisper_minutes' in usageData) {
            console.log(`✅ whisper_minutes field exists with value: ${usageData.whisper_minutes}`);
          } else {
            console.log('❌ whisper_minutes field is MISSING from the usage record');
          }
          
          // Display all fields in the usage record
          console.log('\nℹ️ Complete usage record:');
          console.log(JSON.stringify(usageData, null, 2));
        } else {
          console.log('⚠️ No usage record found for this user');
        }
      } catch (error) {
        console.error('❌ Error querying usage data:', error.message);
      }
    } else {
      console.log('⚠️ No user ID available for testing usage data');
    }
    
    // Phase 4: Test creating a mock usage entry
    console.log('\n📋 PHASE 4: Test Creating Mock Usage\n');
    
    // Only proceed if we have a user ID to work with
    if (userId) {
      // Create a temporary user ID for testing
      const tempUserId = `test_${Math.random().toString(36).substring(2, 10)}`;
      
      console.log(`ℹ️ Creating temporary test user with ID: ${tempUserId}`);
      
      try {
        // Add a test user to users table first (for foreign key constraint)
        const { error: userError } = await supabase
          .from('users')
          .insert([{
            user_id: tempUserId,
            subscription_tier: 'test',
            subscription_start: Date.now(),
            billing_cycle_start: Date.now(),
            billing_cycle_end: Date.now() + (30 * 24 * 60 * 60 * 1000)
          }]);
        
        if (userError) {
          console.error('❌ Error creating test user:', userError.message);
        } else {
          console.log('✅ Test user created successfully');
          
          try {
            // Now try to insert a usage record
            const start = Date.now();
            const end = start + (30 * 24 * 60 * 60 * 1000);
            
            const { error: usageError } = await supabase
              .from('usage')
              .insert([{
                user_id: tempUserId,
                current_period_start: start,
                current_period_end: end,
                whisper_minutes: 5,
                claude_input_tokens: 1000,
                claude_output_tokens: 2000,
                tts_characters: 500,
                credit_limit: 1.5,
                token_limit: 150000,
                percentage_used: 10,
                daily_usage: JSON.stringify({}),
                subscription_tier: 'test'
              }]);
            
            if (usageError) {
              console.error('❌ Error creating usage record:', usageError.message);
            } else {
              console.log('✅ Usage record created successfully');
              
              // Retrieve the created usage record to verify
              const { data, error } = await supabase
                .from('usage')
                .select('*')
                .eq('user_id', tempUserId)
                .single();
              
              if (error) {
                console.error('❌ Error retrieving created usage record:', error.message);
              } else if (data) {
                console.log('✅ Created usage record verified:');
                
                // Check for whisperMinutes field specifically
                if ('whisper_minutes' in data) {
                  console.log(`✅ whisper_minutes field exists with value: ${data.whisper_minutes}`);
                } else {
                  console.log('❌ whisper_minutes field is MISSING from the created record');
                }
                
                console.log('\nℹ️ Fields in the created record:');
                Object.keys(data).forEach(key => {
                  console.log(`  - ${key}: ${typeof data[key]} = ${JSON.stringify(data[key])}`);
                });
              }
            }
          } catch (error) {
            console.error('❌ Error in usage record creation test:', error.message);
          }
          
          // Clean up test data
          try {
            // Delete from usage table first (child) due to foreign key constraint
            await supabase.from('usage').delete().eq('user_id', tempUserId);
            // Then delete from users table (parent)
            await supabase.from('users').delete().eq('user_id', tempUserId);
            console.log('✅ Test data cleaned up successfully');
          } catch (cleanupError) {
            console.error('⚠️ Error cleaning up test data:', cleanupError.message);
          }
        }
      } catch (error) {
        console.error('❌ Error in create test user process:', error.message);
      }
    } else {
      console.log('⚠️ Skipping mock usage creation test (no user ID available)');
    }
    
    // Phase 5: Test dailyUsage parsing
    console.log('\n📋 PHASE 5: Test Daily Usage JSON Parsing\n');
    
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('usage')
          .select('daily_usage')
          .eq('user_id', userId)
          .single();
        
        if (error) {
          console.error('❌ Error retrieving daily usage:', error.message);
        } else if (data) {
          console.log('✅ Retrieved daily_usage field');
          
          try {
            // Examine the daily_usage field
            const dailyUsageType = typeof data.daily_usage;
            console.log(`ℹ️ daily_usage is of type: ${dailyUsageType}`);
            
            if (dailyUsageType === 'string') {
              console.log('ℹ️ daily_usage is stored as a string, attempting to parse...');
              
              try {
                const parsed = JSON.parse(data.daily_usage);
                console.log('✅ Successfully parsed daily_usage JSON');
                console.log(`ℹ️ Parsed data is of type: ${typeof parsed}`);
                console.log(`ℹ️ Contains ${Object.keys(parsed).length} date entries`);
                
                // Display a sample if any entries exist
                const keys = Object.keys(parsed);
                if (keys.length > 0) {
                  console.log('ℹ️ Sample entry:');
                  console.log(JSON.stringify(parsed[keys[0]], null, 2));
                }
              } catch (parseError) {
                console.error('❌ Error parsing daily_usage JSON:', parseError.message);
                console.log('ℹ️ Raw daily_usage content:', data.daily_usage);
              }
            } else if (dailyUsageType === 'object') {
              console.log('ℹ️ daily_usage is already an object');
              console.log(`ℹ️ Contains ${Object.keys(data.daily_usage).length} date entries`);
              
              // Display a sample if any entries exist
              const keys = Object.keys(data.daily_usage);
              if (keys.length > 0) {
                console.log('ℹ️ Sample entry:');
                console.log(JSON.stringify(data.daily_usage[keys[0]], null, 2));
              }
            } else {
              console.log(`❌ Unexpected daily_usage type: ${dailyUsageType}`);
            }
          } catch (analysisError) {
            console.error('❌ Error analyzing daily_usage:', analysisError.message);
          }
        } else {
          console.log('⚠️ No daily usage data found');
        }
      } catch (error) {
        console.error('❌ Error in daily usage test:', error.message);
      }
    } else {
      console.log('⚠️ Skipping daily usage test (no user ID available)');
    }
    
    // Phase 6: Test the specific function that's failing
    console.log('\n📋 PHASE 6: Simulate trackApiUsage Function\n');
    
    if (userId) {
      try {
        console.log(`ℹ️ Simulating trackApiUsage for user_id: ${userId}`);
        
        // First get the current usage data
        const { data: currentUsage, error: currentError } = await supabase
          .from('usage')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (currentError) {
          console.error('❌ Error getting current usage:', currentError.message);
        } else if (!currentUsage) {
          console.log('⚠️ No usage record found, cannot simulate tracking');
        } else {
          console.log('✅ Retrieved current usage data');
          
          // Debug the structure of usageDetails that would be constructed
          const usageDetails = {
            whisperMinutes: currentUsage.whisper_minutes || 0,
            claudeInputTokens: currentUsage.claude_input_tokens || 0,
            claudeOutputTokens: currentUsage.claude_output_tokens || 0,
            ttsCharacters: currentUsage.tts_characters || 0
          };
          
          console.log('\nℹ️ Constructed usageDetails object:');
          console.log(JSON.stringify(usageDetails, null, 2));
          
          // Check each field individually
          console.log('\nℹ️ Field-by-field check:');
          console.log(`whisper_minutes in DB: ${currentUsage.whisper_minutes !== undefined ? currentUsage.whisper_minutes : 'undefined'}`);
          console.log(`whisperMinutes mapped: ${usageDetails.whisperMinutes !== undefined ? usageDetails.whisperMinutes : 'undefined'}`);
          
          console.log(`claude_input_tokens in DB: ${currentUsage.claude_input_tokens !== undefined ? currentUsage.claude_input_tokens : 'undefined'}`);
          console.log(`claudeInputTokens mapped: ${usageDetails.claudeInputTokens !== undefined ? usageDetails.claudeInputTokens : 'undefined'}`);
          
          // Simulate adding some usage
          const usageToAdd = {
            whisperMinutes: 0.5,
            claudeInputTokens: 100,
            claudeOutputTokens: 200,
            ttsCharacters: 50
          };
          
          console.log('\nℹ️ Usage to add:');
          console.log(JSON.stringify(usageToAdd, null, 2));
          
          // Mock the updated values
          const updatedWhisperMinutes = (usageDetails.whisperMinutes || 0) + (usageToAdd.whisperMinutes || 0);
          const updatedClaudeInputTokens = (usageDetails.claudeInputTokens || 0) + (usageToAdd.claudeInputTokens || 0);
          const updatedClaudeOutputTokens = (usageDetails.claudeOutputTokens || 0) + (usageToAdd.claudeOutputTokens || 0);
          const updatedTtsCharacters = (usageDetails.ttsCharacters || 0) + (usageToAdd.ttsCharacters || 0);
          
          console.log('\nℹ️ Updated values that would be saved:');
          console.log(`whisperMinutes: ${updatedWhisperMinutes}`);
          console.log(`claudeInputTokens: ${updatedClaudeInputTokens}`);
          console.log(`claudeOutputTokens: ${updatedClaudeOutputTokens}`);
          console.log(`ttsCharacters: ${updatedTtsCharacters}`);
          
          console.log('\nℹ️ Result: Function simulation completed');
        }
      } catch (error) {
        console.error('❌ Error simulating trackApiUsage:', error.message);
      }
    } else {
      console.log('⚠️ Skipping trackApiUsage simulation (no user ID available)');
    }
    
    // Phase 7: Recommendations based on tests
    console.log('\n📋 PHASE 7: Diagnosis and Recommendations\n');
    
    console.log('Based on the tests performed, here are potential causes and solutions:');
    console.log('ℹ️ Possible causes:');
    console.log('  1. The usage record is not being initialized correctly for new users');
    console.log('  2. The Supabase schema does not match the expected structure in code');
    console.log('  3. The dailyUsage parsing code has an error when handling empty objects');
    console.log('  4. The usageDetails object is being accessed before it\'s properly initialized');
    console.log('  5. There might be null values in the database that aren\'t being handled correctly');
    
    console.log('\nℹ️ Recommended fixes:');
    console.log('  1. Add null checks and default values when accessing usageDetails properties');
    console.log('  2. Verify the database schema column names match exactly what the code expects');
    console.log('  3. Check the initialization of MonthlyUsage objects in supabaseUsageService.ts');
    console.log('  4. Ensure the getUserUsage function properly handles empty or missing records');
    console.log('  5. Add better error handling in trackApiUsage to catch and log specific issues');
    
    console.log('\nℹ️ Example code fix for trackApiUsage:');
    console.log(`
    // Add defensive programming
    const dailyUsage = currentUsage.dailyUsage[today] || {
      date: today,
      usageDetails: {
        whisperMinutes: 0,
        claudeInputTokens: 0,
        claudeOutputTokens: 0,
        ttsCharacters: 0
      },
      calculatedCosts: {
        whisperCost: 0,
        claudeInputCost: 0,
        claudeOutputCost: 0,
        ttsCost: 0,
        totalCost: 0
      }
    };
    
    // Ensure usage details object exists with default values
    const monthlyUsage = currentUsage.usageDetails || {
      whisperMinutes: 0,
      claudeInputTokens: 0,
      claudeOutputTokens: 0,
      ttsCharacters: 0
    };`);
    
  } catch (error) {
    console.error('❌ Unexpected error in test script:', error);
  }
  
  console.log('\n=== DIAGNOSIS COMPLETE ===\n');
}

// Run the test
testUsageServiceIssue();