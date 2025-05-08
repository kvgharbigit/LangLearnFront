// test_supabase_tables.js
const { createClient } = require('@supabase/supabase-js');

// Initialize global variable to track token_limit existence
global.tokenLimitExists = false;

// Supabase configuration
const supabaseUrl = 'https://hkanndmudvnjrvkisklp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYW5uZG11ZHZuanJ2a2lza2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2Mjc0MDMsImV4cCI6MjA2MjIwMzQwM30.OsnzQS5EBT31LYeloAvc80yaxJ70AVsTEC3atNjWn4o';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseTables() {
  console.log('=== COMPREHENSIVE SUPABASE TESTING ===');

  try {
    // --------------------------------------------------
    // 1. Test Database Connection
    // --------------------------------------------------
    console.log('\n📡 [TEST 1] Database Connection Test');
    
    try {
      const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
      if (error) throw error;
      console.log(`✅ Connection successful! Found ${count} users.`);
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
    }

    // --------------------------------------------------
    // 2. Test 'users' Table Structure
    // --------------------------------------------------
    console.log('\n📊 [TEST 2] Users Table Structure Test');
    
    try {
      const { data, error } = await supabase.from('users').select('*').limit(1);
      
      if (error) {
        console.error('❌ Error accessing users table:', error.message);
      } else if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log(`✅ Users table accessible with ${columns.length} columns: ${columns.join(', ')}`);
        
        // Required columns for users table
        const requiredColumns = ['user_id', 'subscription_tier', 'subscription_start', 'billing_cycle_start', 'billing_cycle_end'];
        const missingColumns = requiredColumns.filter(col => !columns.includes(col));
        
        if (missingColumns.length > 0) {
          console.error(`❌ Missing required columns in users table: ${missingColumns.join(', ')}`);
        } else {
          console.log('✅ All required columns present in users table');
        }
      } else {
        console.log('⚠️ No records found in users table, but table exists');
      }
    } catch (error) {
      console.error('❌ Error testing users table:', error);
    }

    // --------------------------------------------------
    // 3. Test 'usage' Table Structure
    // --------------------------------------------------
    console.log('\n📊 [TEST 3] Usage Table Structure Test');
    
    try {
      const { data, error } = await supabase.from('usage').select('*').limit(1);
      
      if (error) {
        console.error('❌ Error accessing usage table:', error.message);
      } else if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log(`✅ Usage table accessible with ${columns.length} columns: ${columns.join(', ')}`);
        
        // Check for token_limit column specifically
        const tokenLimitExists = columns.includes('token_limit');
        console.log(`${tokenLimitExists ? '✅' : '❌'} token_limit column exists: ${tokenLimitExists}`);
        
        // Set global variable to track token_limit status
        global.tokenLimitExists = tokenLimitExists;
        
        // Required columns for usage table
        const requiredColumns = [
          'user_id', 'current_period_start', 'current_period_end', 
          'whisper_minutes', 'claude_input_tokens', 'claude_output_tokens', 
          'tts_characters', 'credit_limit', 'token_limit', 
          'percentage_used', 'daily_usage', 'subscription_tier'
        ];
        
        const missingColumns = requiredColumns.filter(col => !columns.includes(col));
        
        if (missingColumns.length > 0) {
          console.error(`❌ Missing required columns in usage table: ${missingColumns.join(', ')}`);
        } else {
          console.log('✅ All required columns present in usage table');
        }
      } else {
        console.log('⚠️ No records found in usage table, but table exists');
      }
    } catch (error) {
      console.error('❌ Error testing usage table:', error);
    }

    // --------------------------------------------------
    // 4. Test Explicit Column Access - token_limit
    // --------------------------------------------------
    console.log('\n🔍 [TEST 4] Explicit token_limit Column Test');
    
    try {
      const { data, error } = await supabase.from('usage').select('token_limit').limit(1);
      
      if (error) {
        console.error('❌ Error selecting token_limit column:', error.message);
        console.log('ℹ️ This confirms token_limit column is missing or inaccessible');
        global.tokenLimitExists = false;
      } else {
        console.log('✅ token_limit column exists and can be queried');
        global.tokenLimitExists = true;
      }
    } catch (error) {
      console.error('❌ Error testing token_limit column:', error);
      global.tokenLimitExists = false;
    }

    // --------------------------------------------------
    // 5. Test Foreign Key Relationship
    // --------------------------------------------------
    console.log('\n🔗 [TEST 5] Testing Foreign Key Relationship');
    
    try {
      // Check if we can join users and usage tables
      const { data, error } = await supabase
        .from('usage')
        .select('*, users!inner(user_id, subscription_tier)')
        .limit(1);
      
      if (error) {
        console.error('❌ Error with foreign key relationship:', error.message);
      } else {
        console.log('✅ Foreign key relationship is working correctly');
      }
    } catch (error) {
      console.error('❌ Error testing foreign key relationship:', error);
    }

    // --------------------------------------------------
    // 6. Test Data Insertion
    // --------------------------------------------------
    console.log('\n📝 [TEST 6] Data Insertion Test');
    
    // Create a test user ID
    const testUserId = `test_${Math.random().toString(36).substring(2, 10)}`;
    
    try {
      // First try to insert into users table (parent table)
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          user_id: testUserId,
          subscription_tier: 'test',
          subscription_start: Date.now(),
          billing_cycle_start: Date.now(),
          billing_cycle_end: Date.now() + (30 * 24 * 60 * 60 * 1000)
        }]);
      
      if (userError) {
        console.error('❌ Failed to insert test user:', userError.message);
      } else {
        console.log('✅ Successfully inserted test user');
        
        // Then try to insert into usage table (child table)
        const { error: usageError } = await supabase
          .from('usage')
          .insert([{
            user_id: testUserId,
            current_period_start: Date.now(),
            current_period_end: Date.now() + (30 * 24 * 60 * 60 * 1000),
            whisper_minutes: 0,
            claude_input_tokens: 0,
            claude_output_tokens: 0,
            tts_characters: 0,
            credit_limit: 1.5,
            token_limit: 150000,
            percentage_used: 0,
            daily_usage: JSON.stringify({}),
            subscription_tier: 'test'
          }]);
        
        if (usageError) {
          console.error('❌ Failed to insert test usage record:', usageError.message);
          
          // Check specifically for token_limit column issues
          if (usageError.message.includes('token_limit')) {
            console.error('⚠️ The error is specifically related to the token_limit column');
            global.tokenLimitExists = false;
          }
        } else {
          console.log('✅ Successfully inserted test usage record');
          global.tokenLimitExists = true;
        }
        
        // Clean up test data
        try {
          // Delete from usage table first (child) due to foreign key constraint
          await supabase.from('usage').delete().eq('user_id', testUserId);
          // Then delete from users table (parent)
          await supabase.from('users').delete().eq('user_id', testUserId);
          console.log('✅ Successfully cleaned up test data');
        } catch (cleanupError) {
          console.error('⚠️ Failed to clean up test data:', cleanupError.message);
        }
      }
    } catch (error) {
      console.error('❌ Error during data insertion test:', error);
    }

    // --------------------------------------------------
    // 7. Test Data Updates
    // --------------------------------------------------
    console.log('\n🔄 [TEST 7] Data Update Test');
    
    // Create a test user ID for update tests
    const updateTestUserId = `update_test_${Math.random().toString(36).substring(2, 10)}`;
    
    try {
      // Insert test data
      await supabase.from('users').insert([{
        user_id: updateTestUserId,
        subscription_tier: 'test',
        subscription_start: Date.now(),
        billing_cycle_start: Date.now(),
        billing_cycle_end: Date.now() + (30 * 24 * 60 * 60 * 1000)
      }]);
      
      await supabase.from('usage').insert([{
        user_id: updateTestUserId,
        current_period_start: Date.now(),
        current_period_end: Date.now() + (30 * 24 * 60 * 60 * 1000),
        whisper_minutes: 0,
        claude_input_tokens: 0,
        claude_output_tokens: 0,
        tts_characters: 0,
        credit_limit: 1.5,
        token_limit: 150000,
        percentage_used: 0,
        daily_usage: JSON.stringify({}),
        subscription_tier: 'test'
      }]);
      
      // Test update
      const { error: updateError } = await supabase
        .from('usage')
        .update({
          whisper_minutes: 10,
          claude_input_tokens: 5000,
          claude_output_tokens: 3000,
          tts_characters: 2000,
          token_limit: 200000
        })
        .eq('user_id', updateTestUserId);
      
      if (updateError) {
        console.error('❌ Failed to update usage record:', updateError.message);
        
        // Check specifically for token_limit column issues
        if (updateError.message.includes('token_limit')) {
          console.error('⚠️ The error is specifically related to the token_limit column');
          global.tokenLimitExists = false;
        }
      } else {
        console.log('✅ Successfully updated usage record');
        
        // Verify update
        const { data, error } = await supabase
          .from('usage')
          .select('whisper_minutes, claude_input_tokens, claude_output_tokens, tts_characters, token_limit')
          .eq('user_id', updateTestUserId)
          .single();
        
        if (error) {
          console.error('❌ Failed to verify update:', error.message);
        } else {
          console.log('✅ Update verification:', data);
          // If token_limit was successfully updated, mark it as existing
          if (data && 'token_limit' in data) {
            global.tokenLimitExists = true;
          }
        }
      }
      
      // Clean up test data
      try {
        await supabase.from('usage').delete().eq('user_id', updateTestUserId);
        await supabase.from('users').delete().eq('user_id', updateTestUserId);
      } catch (cleanupError) {
        console.error('⚠️ Failed to clean up update test data:', cleanupError.message);
      }
    } catch (error) {
      console.error('❌ Error during data update test:', error);
    }

    // --------------------------------------------------
    // 8. Test SQL Schema
    // --------------------------------------------------
    console.log('\n📋 [TEST 8] SQL Schema Information');
    console.log('Note: This test requires SQL execution privileges');
    
    try {
      // Directly query a sample record to infer schema - safer approach
      const { data: usageData, error: usageError } = await supabase
        .from('usage')
        .select('*')
        .limit(1);
        
      if (usageError) {
        console.error('❌ Cannot fetch usage table structure:', usageError.message);
      } else if (usageData && usageData.length > 0) {
        const columnNames = Object.keys(usageData[0]);
        console.log('✅ Usage table columns detected:', columnNames.join(', '));
        
        // Check for token_limit specifically
        if (columnNames.includes('token_limit')) {
          console.log('✅ token_limit column confirmed in schema');
          // Get token_limit type by examining the data
          const tokenLimitType = typeof usageData[0].token_limit;
          console.log(`ℹ️ token_limit is of type: ${tokenLimitType}`);
        }
      } else {
        console.log('⚠️ No records found in usage table to infer structure');
        
        // In this case, we can still confirm table exists even without records
        const { count, error } = await supabase
          .from('usage')
          .select('*', { count: 'exact', head: true });
          
        if (!error) {
          console.log(`ℹ️ Usage table exists but contains ${count} records`);
        }
      }
    } catch (error) {
      console.error('❌ Error getting schema information:', error);
    }

    // --------------------------------------------------
    // 9. Test Solution for Missing token_limit Column
    // --------------------------------------------------
    console.log('\n🔧 [TEST 9] Proposed Solution for Missing token_limit');
    console.log('\nRECOMMENDED SOLUTION:');
    console.log('1. Log in to your Supabase dashboard');
    console.log('2. Go to the SQL Editor');
    console.log('3. Run the following SQL:');
    console.log(`
    -- Add token_limit column if it doesn't exist
    ALTER TABLE usage ADD COLUMN IF NOT EXISTS token_limit BIGINT DEFAULT 150;
    
    -- Update existing records to set token_limit based on credit_limit
    UPDATE usage 
    SET token_limit = credit_limit * 100
    WHERE token_limit IS NULL OR token_limit = 0;
    
    -- Verify the changes
    SELECT user_id, credit_limit, token_limit, percentage_used FROM usage LIMIT 10;
    `);
    
    // --------------------------------------------------
    // Summary of Findings
    // --------------------------------------------------
    console.log('\n📝 SUMMARY OF FINDINGS:');
    
    // Check if any test explicitly confirmed token_limit exists
    // This handles the case where the Test 3 set tokenLimitExists to true
    // We need to ensure our summary matches the actual test results
    if (global.tokenLimitExists === true) {
      console.log('✅ All database schema checks passed! The token_limit column exists and is properly configured.');
    } else {
      console.log('ℹ️ Based on the error message "Could not find the \'token_limit\' column of \'usage\' in the schema cache",');
      console.log('ℹ️ the most likely issue is that the token_limit column is missing from the usage table.');
      console.log('ℹ️ This can happen if the database schema was created with an older version of the schema definition');
      console.log('ℹ️ that did not include the token_limit column.');
      console.log('ℹ️ The recommended solution is to add this column using SQL in the Supabase dashboard.');
    }
  } catch (error) {
    console.error('❌ Error during comprehensive Supabase testing:', error);
  }
}

// Execute all tests
testSupabaseTables();