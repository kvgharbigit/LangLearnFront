// diagnose_usage_error.js
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://hkanndmudvnjrvkisklp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYW5uZG11ZHZuanJ2a2lza2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2Mjc0MDMsImV4cCI6MjA2MjIwMzQwM30.OsnzQS5EBT31LYeloAvc80yaxJ70AVsTEC3atNjWn4o';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseUsageError() {
  console.log('\n=== DIAGNOSING USAGE SERVICE ERROR ===\n');

  try {
    // Step 1: Check for user accounts
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (usersError) {
      console.error('❌ Error accessing users table:', usersError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('⚠️ No users found in database');
      return;
    }

    console.log(`✅ Found ${users.length} users in database`);
    console.log('Sample user IDs:');
    users.forEach((user, i) => console.log(`  ${i+1}. ${user.user_id}`));

    // Use the first user ID for testing
    const testUserId = users[0].user_id;
    console.log(`\nUsing user ID for testing: ${testUserId}`);

    // Step 2: Check usage record structure
    const { data: usage, error: usageError } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    if (usageError) {
      console.error('❌ Error accessing usage record:', usageError.message);
      return;
    }

    if (!usage) {
      console.log('⚠️ No usage record found for this user');
      return;
    }

    console.log('✅ Found usage record');
    
    // Step 3: Examine specific fields
    console.log('\n📋 EXAMINING RECORD STRUCTURE');
    
    // Check whisper_minutes field
    if ('whisper_minutes' in usage) {
      console.log(`✅ whisper_minutes exists with value: ${usage.whisper_minutes} (type: ${typeof usage.whisper_minutes})`);
    } else {
      console.log('❌ whisper_minutes field is MISSING from the record');
    }
    
    // Check usageDetails construction
    console.log('\n📋 SIMULATING USAGE DETAILS CONSTRUCTION');
    
    const usageDetails = {
      whisperMinutes: usage.whisper_minutes,
      claudeInputTokens: usage.claude_input_tokens,
      claudeOutputTokens: usage.claude_output_tokens,
      ttsCharacters: usage.tts_characters
    };
    
    // Log usageDetails object and check for undefined values
    console.log('Constructed usageDetails object:');
    console.log(JSON.stringify(usageDetails, null, 2));
    
    // Check if any values are undefined
    Object.entries(usageDetails).forEach(([key, value]) => {
      console.log(`${key}: ${value !== undefined ? value : 'UNDEFINED'}`);
    });
    
    // Step 4: Test daily_usage parsing
    console.log('\n📋 EXAMINING DAILY_USAGE FORMAT');
    
    if (!usage.daily_usage) {
      console.log('⚠️ daily_usage is null or undefined');
    } else {
      const dailyUsageType = typeof usage.daily_usage;
      console.log(`daily_usage is of type: ${dailyUsageType}`);
      
      if (dailyUsageType === 'string') {
        console.log('daily_usage is stored as a string, attempting to parse...');
        try {
          const parsed = JSON.parse(usage.daily_usage);
          console.log('✅ Successfully parsed daily_usage JSON');
          console.log(`Contains ${Object.keys(parsed).length} date entries`);
          
          // If we have entries, check their structure
          const dateKeys = Object.keys(parsed);
          if (dateKeys.length > 0) {
            const sampleDate = dateKeys[0];
            const sampleEntry = parsed[sampleDate];
            
            console.log(`Sample entry for date: ${sampleDate}`);
            console.log(JSON.stringify(sampleEntry, null, 2));
            
            // Check if the entry has the expected structure
            if (sampleEntry.usageDetails) {
              console.log('✅ Entry contains usageDetails object');
            } else {
              console.log('❌ Entry missing usageDetails object');
            }
          }
        } catch (error) {
          console.error('❌ Error parsing daily_usage JSON:', error.message);
          console.log('Raw daily_usage content:', usage.daily_usage);
        }
      } else if (dailyUsageType === 'object') {
        console.log('daily_usage is stored as an object');
        console.log(`Contains ${Object.keys(usage.daily_usage).length} date entries`);
      }
    }
    
    // Step 5: Trace the error
    console.log('\n📋 ERROR DIAGNOSIS');
    console.log('Based on analysis, the most likely causes of:');
    console.log('TypeError: Cannot read property \'whisperMinutes\' of undefined');
    console.log('are:');
    
    // Check if whisper_minutes exists but is null
    if ('whisper_minutes' in usage && usage.whisper_minutes === null) {
      console.log('1. ⚠️ whisper_minutes exists in database but is NULL');
    }
    
    // Check if usageDetails would be undefined
    if (usageDetails.whisperMinutes === undefined) {
      console.log('2. ⚠️ whisperMinutes is undefined after mapping from whisper_minutes');
    }
    
    // Check if daily_usage could be causing issues
    if (typeof usage.daily_usage === 'string') {
      try {
        const parsed = JSON.parse(usage.daily_usage);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!parsed[today]) {
          console.log(`3. ⚠️ No entry for today (${today}) in daily_usage`);
        } else if (!parsed[today].usageDetails) {
          console.log(`4. ⚠️ Entry for today exists but missing usageDetails object`);
        }
      } catch (error) {
        console.log('5. ⚠️ daily_usage contains invalid JSON');
      }
    } else if (!usage.daily_usage) {
      console.log('6. ⚠️ daily_usage is null or undefined');
    }
    
    console.log('\n📋 CONCLUSION');
    console.log('The most likely explanation is that when trying to update usage,');
    console.log('the code is attempting to access currentUsage.usageDetails.whisperMinutes');
    console.log('but currentUsage.usageDetails is undefined.');
    
    console.log('\nThis could be caused by:');
    console.log('- Missing initialization for empty/new records');
    console.log('- Incorrect field mapping between database and local objects');
    console.log('- A JSON parsing error when handling daily_usage');
    console.log('- Null values in the database that need to be handled');

  } catch (error) {
    console.error('Unexpected error during diagnosis:', error);
  }
  
  console.log('\n=== DIAGNOSIS COMPLETE ===\n');
}

// Run the diagnostic function
diagnoseUsageError();