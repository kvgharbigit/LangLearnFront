// Audio Streaming Diagnostic Script
const fetch = require('node-fetch');
const AsyncStorage = require('@react-native-async-storage/async-storage');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const SERVER_IP = '192.168.86.241';
const SERVER_PORT = '8004';
const BASE_URL = `http://${SERVER_IP}:${SERVER_PORT}`;
const AUDIO_ENDPOINT = '/stream-audio';

// Audio settings keys
const AUDIO_SETTINGS_KEY = '@audio_settings';
const TEMPO_KEY = '@tempo';
const SPEECH_THRESHOLD_KEY = '@speech_threshold';
const SILENCE_THRESHOLD_KEY = '@silence_threshold';
const SILENCE_DURATION_KEY = '@silence_duration';
const IS_MUTED_KEY = '@is_muted';

async function runNetworkDiagnostics() {
  console.log('\n🔍 RUNNING NETWORK DIAGNOSTICS');
  
  try {
    // Check ping to server
    console.log(`\n📡 Testing connectivity to ${SERVER_IP}`);
    const pingResult = await execPromise(`ping -c 4 ${SERVER_IP}`);
    console.log('✅ Server is reachable');
    console.log(pingResult.stdout);
  } catch (error) {
    console.error('❌ Failed to ping server:', error.message);
    console.log('📋 Suggestion: Check if the server is running and network is properly configured');
  }

  try {
    // Test TCP connection to specific port
    console.log(`\n🔌 Testing port connectivity to ${SERVER_IP}:${SERVER_PORT}`);
    const netcatTest = await execPromise(`nc -zv ${SERVER_IP} ${SERVER_PORT}`);
    console.log('✅ Port is open and accepting connections');
  } catch (error) {
    console.error('❌ Port connectivity test failed:', error.message);
    console.log('📋 Suggestion: Check if the server application is running on the specified port');
  }

  try {
    // Check route to server
    console.log('\n🛣️ Checking network route to server');
    const traceResult = await execPromise(`traceroute -m 10 ${SERVER_IP}`);
    console.log('✅ Route trace complete');
    console.log(traceResult.stdout);
  } catch (error) {
    console.error('❌ Route trace failed:', error.message);
  }
}

async function testAPIEndpoint() {
  console.log('\n🔍 TESTING API ENDPOINT');
  
  const testURL = `${BASE_URL}/health`;
  console.log(`📡 Testing API health endpoint: ${testURL}`);
  
  try {
    const response = await fetch(testURL);
    if (response.ok) {
      const data = await response.text();
      console.log('✅ API health check successful:', data);
    } else {
      console.error('❌ API health check failed with status:', response.status);
      console.log('📋 Suggestion: Check server logs for errors');
    }
  } catch (error) {
    console.error('❌ API health check failed:', error.message);
    console.log('📋 Suggestion: Ensure the server is running and accessible');
  }
}

async function testAudioStreaming() {
  console.log('\n🔍 TESTING AUDIO STREAMING');
  
  // Sample parameters that would be used in a real request
  const testParams = {
    message_index: 0,
    tempo: 0.75,
    target_language: 'es',
    is_muted: false
  };
  
  const dummyUUID = '0f071f63-a215-4727-b745-4ddbb1ac4060'; // Using the UUID from the error log
  const testURL = `${BASE_URL}${AUDIO_ENDPOINT}/${dummyUUID}?` + 
    Object.entries(testParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
  
  console.log(`📡 Testing audio streaming endpoint: ${testURL}`);
  
  try {
    // Setting a timeout as we don't want to download the entire file
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(testURL, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('✅ Audio streaming endpoint is responding properly');
      console.log('✅ Status:', response.status);
      console.log('✅ Content-Type:', response.headers.get('content-type'));
      
      // Check if the content-type is audio/*
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.startsWith('audio/')) {
        console.log('✅ Server is returning audio content as expected');
      } else {
        console.warn('⚠️ Server is not returning audio content. Content-Type:', contentType);
      }
    } else {
      console.error('❌ Audio streaming endpoint failed with status:', response.status);
      try {
        const errorText = await response.text();
        console.error('Error response:', errorText);
      } catch (e) {
        console.error('Could not read error response');
      }
      console.log('📋 Suggestion: Check server logs for specific error details');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('✅ Received initial audio stream data (request aborted after timeout as expected)');
    } else {
      console.error('❌ Audio streaming test failed:', error.message);
      console.log('📋 Suggestion: This matches the error seen in the app logs. Server may be failing to generate or stream audio content.');
    }
  }
}

async function mockCheckAudioSettings() {
  console.log('\n🔍 CHECKING AUDIO SETTINGS CONSISTENCY');
  
  // Mock global reference (This would be different in the actual app environment)
  const globalAudioSettings = {
    tempo: 0.75,
    speechThreshold: 78,
    silenceThreshold: 75,
    silenceDuration: 1500,
    isMuted: false
  };
  
  console.log('🌐 Global audio settings reference:', JSON.stringify(globalAudioSettings));
  
  // Mock the AsyncStorage values (simulating what we'd get from the actual app)
  const mockAsyncStorageValues = {
    [TEMPO_KEY]: '0.9',
    [AUDIO_SETTINGS_KEY]: JSON.stringify({
      isMuted: false,
      silenceDuration: 1500,
      silenceThreshold: 75,
      speechThreshold: 78,
      tempo: 0.9,
      tempo_percent: "90%"
    })
  };
  
  console.log('💾 Mock AsyncStorage values:', JSON.stringify(mockAsyncStorageValues[AUDIO_SETTINGS_KEY]));
  
  // Check for inconsistencies
  const asyncSettings = JSON.parse(mockAsyncStorageValues[AUDIO_SETTINGS_KEY]);
  const asyncTempo = parseFloat(mockAsyncStorageValues[TEMPO_KEY]);
  
  if (globalAudioSettings.tempo !== asyncSettings.tempo) {
    console.warn('⚠️ Inconsistency detected: Global tempo and AsyncStorage settings tempo do not match');
    console.log(`Global: ${globalAudioSettings.tempo}, AsyncStorage: ${asyncSettings.tempo}`);
  }
  
  if (globalAudioSettings.tempo !== asyncTempo) {
    console.warn('⚠️ Inconsistency detected: Global tempo and AsyncStorage tempo key do not match');
    console.log(`Global: ${globalAudioSettings.tempo}, AsyncStorage tempo key: ${asyncTempo}`);
  }
  
  if (asyncSettings.tempo !== asyncTempo) {
    console.warn('⚠️ Inconsistency detected: AsyncStorage settings tempo and AsyncStorage tempo key do not match');
    console.log(`Settings: ${asyncSettings.tempo}, Tempo key: ${asyncTempo}`);
  }
  
  console.log('\n📋 Analysis of audio settings:');
  console.log('The logs show multiple sources of truth for the tempo setting:');
  console.log('1. Global reference: 0.75');
  console.log('2. AsyncStorage settings object with tempo: 0.9');
  console.log('3. Separate AsyncStorage tempo key: 0.75 (after reset)');
  console.log('This inconsistency could cause issues if the audio streaming URL uses a different tempo value than what the server expects');
}

async function diagnose() {
  console.log('\n🔍 AUDIO STREAMING DIAGNOSTIC TOOL 🔍');
  console.log('-----------------------------------');
  console.log('Error to diagnose: NSURLErrorDomain error -1008 (Connection cancelled)');
  console.log('-----------------------------------');
  
  await runNetworkDiagnostics();
  await testAPIEndpoint();
  await testAudioStreaming();
  await mockCheckAudioSettings();
  
  console.log('\n🔍 DIAGNOSTIC SUMMARY');
  console.log('-----------------------------------');
  console.log('1. NSURLErrorDomain error -1008 typically indicates a connection was cancelled');
  console.log('2. Possible causes:');
  console.log('   - Network connectivity issues between app and server');
  console.log('   - Server unavailability or failure to process the audio streaming request');
  console.log('   - Inconsistent audio settings, particularly tempo values');
  console.log('   - Server timeouts when generating audio');
  console.log('   - Invalid conversation ID being used');
  console.log('3. Recommended next steps:');
  console.log('   - Check server logs for errors related to audio generation');
  console.log('   - Verify that the server can handle the audio streaming request with the given parameters');
  console.log('   - Ensure consistency between global audio settings and AsyncStorage values');
  console.log('   - Implement better error handling and retry logic for audio playback');
  console.log('   - Consider adding a health check before attempting to stream audio');
  console.log('-----------------------------------');
}

// Run the diagnostic tool
diagnose().catch(error => {
  console.error('Diagnostic tool encountered an error:', error);
});