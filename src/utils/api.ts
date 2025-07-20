import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { ConversationMode } from '../components/ConversationModeSelector';
import { Message } from '../types/messages';
import supabaseUsageService from '../services/usageService'; // Changed to use normalized service
import { getCurrentUser, getIdToken } from '../services/supabaseAuthService';
import { fetchWithRetry, classifyApiError, parseErrorResponse } from './apiHelpers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import offlineAssets from './offlineAssets';
import { supabase } from '../supabase/config';
import { estimateTokens } from '../constants/pricing';
import userPreferences from './userPreferences';

// Update this to your actual API URL
export const API_URL = 'https://language-tutor-984417336702.us-central1.run.app';
//const API_URL =  "http://172.20.10.2:8004" //iphone hotspot eduroam
//export const API_URL ="http://10.0.0.116:8004" //desktop
//export const API_URL = "http://192.168.86.247:8004"



// Helper to get user auth headers for API requests
const getUserAuthHeaders = async () => {
  const user = getCurrentUser();
  if (!user) return {};
  
  try {
    const token = await getIdToken(user, true);
    return {
      'Authorization': `Bearer ${token}`,
      'X-User-ID': user.id  // Note: Supabase user ID is in user.id
    };
  } catch (error) {
    console.error('Error getting auth token:', error);
    return { 'X-User-ID': user.id };
  }
};

// Warm up the API connection
let warmupPromise: Promise<void> | null = null;
export const preconnectToAPI = async (): Promise<void> => {
  if (warmupPromise) return warmupPromise;
  
  warmupPromise = new Promise<void>(async (resolve) => {
    try {
      console.log("🔌 Preconnecting to API server...");
      
      // Get network state
      const networkState = await import('@react-native-community/netinfo')
        .then(module => module.default.fetch());
      
      if (!networkState.isConnected || networkState.isInternetReachable === false) {
        console.log("⚠️ Network unavailable, skipping API preconnection");
        resolve();
        return;
      }
      
      // Try to check server connectivity using the ping endpoint
      try {
        // Check if the server is up by connecting to the ping endpoint
        const connectionTest = await fetch(`${API_URL}/ping`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        console.log(`🔌 API connection test ${connectionTest.ok ? 'successful' : 'responded with'} (${connectionTest.status})`);
      } catch (connError) {
        // Log but don't fail the app startup if the server is unreachable
        console.log("⚠️ API server may be unreachable:", connError);
      }
      
      // Always resolve even if connection fails - this allows the app to work offline
      resolve();
    } catch (error) {
      console.log("⚠️ API preconnection error:", error);
      resolve(); // Resolve anyway to not block the app
    }
  });
  
  return warmupPromise;
};

// Update the ChatParams interface to include isMuted, conversationMode, and history
interface ChatParams {
  message: string;
  conversation_id?: string | null;
  tempo: number;
  difficulty: string;
  native_language: string;
  target_language: string;
  learning_objective?: string;
  is_muted?: boolean;
  conversation_mode?: ConversationMode;
  history?: Message[]; // Add conversation history for stateless backend
}

// Update the VoiceParams interface to include isMuted, conversationMode, and history
interface VoiceParams {
  audioUri: string;
  conversationId?: string | null;
  tempo: number;
  difficulty: string;
  nativeLanguage: string;
  targetLanguage: string;
  learningObjective?: string;
  isMuted?: boolean;
  conversationMode?: ConversationMode;
  history?: Message[]; // Add conversation history for stateless backend
}

// Key for the offline message queue
const OFFLINE_MESSAGE_QUEUE_KEY = '@confluency:offline_message_queue';

// Interface for queued messages
interface QueuedMessage {
  id: string;
  type: 'text' | 'voice';
  params: any;
  timestamp: number;
  attempts: number;
}

/**
 * Queue a message for sending when back online
 */
export const queueOfflineMessage = async (
  type: 'text' | 'voice',
  params: any
): Promise<string> => {
  try {
    // Generate a unique ID for this message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the queued message object
    const queuedMessage: QueuedMessage = {
      id: messageId,
      type,
      params,
      timestamp: Date.now(),
      attempts: 0
    };
    
    // Get existing queue
    const queueString = await AsyncStorage.getItem(OFFLINE_MESSAGE_QUEUE_KEY);
    const queue: QueuedMessage[] = queueString ? JSON.parse(queueString) : [];
    
    // Add new message to queue
    queue.push(queuedMessage);
    
    // Save updated queue
    await AsyncStorage.setItem(OFFLINE_MESSAGE_QUEUE_KEY, JSON.stringify(queue));
    
    return messageId;
  } catch (error) {
    console.error('Error queuing offline message:', error);
    throw error;
  }
};

/**
 * Get all queued offline messages
 */
export const getOfflineMessageQueue = async (): Promise<QueuedMessage[]> => {
  try {
    const queueString = await AsyncStorage.getItem(OFFLINE_MESSAGE_QUEUE_KEY);
    return queueString ? JSON.parse(queueString) : [];
  } catch (error) {
    console.error('Error getting offline message queue:', error);
    return [];
  }
};

/**
 * Remove a message from the offline queue
 */
export const removeFromOfflineQueue = async (messageId: string): Promise<void> => {
  try {
    const queue = await getOfflineMessageQueue();
    const updatedQueue = queue.filter(msg => msg.id !== messageId);
    await AsyncStorage.setItem(OFFLINE_MESSAGE_QUEUE_KEY, JSON.stringify(updatedQueue));
  } catch (error) {
    console.error('Error removing message from offline queue:', error);
  }
};

/**
 * Update a message in the offline queue
 */
export const updateOfflineQueueItem = async (
  messageId: string, 
  updates: Partial<QueuedMessage>
): Promise<void> => {
  try {
    const queue = await getOfflineMessageQueue();
    const updatedQueue = queue.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    );
    await AsyncStorage.setItem(OFFLINE_MESSAGE_QUEUE_KEY, JSON.stringify(updatedQueue));
  } catch (error) {
    console.error('Error updating offline queue item:', error);
  }
};

/**
 * Send a text message to the language tutor API
 */
export const sendTextMessage = async (
  message: string,
  conversationId: string | null = null,
  tempo: number = 0.75, // Default to 75% speed to match PLAYER_SETTINGS.DEFAULT_TEMPO
  difficulty: string = 'beginner',
  nativeLanguage: string = 'en',
  targetLanguage: string = 'es',
  learningObjective: string = '',
  isMuted: boolean = false,
  conversationMode: ConversationMode = 'free_conversation',
  history: Message[] = [] // Add conversation history parameter
) => {
  try {
    // Check for network connectivity first
    const networkState = await import('@react-native-community/netinfo')
      .then(module => module.default.fetch());
    
    // In development mode, always assume connected
    if (!__DEV__ && (!networkState.isConnected || networkState.isInternetReachable === false)) {
      console.log('No network connection, queuing message for later');
      
      // Queue the message for later sending
      const messageId = await queueOfflineMessage('text', {
        message,
        conversationId,
        tempo,
        difficulty,
        nativeLanguage,
        targetLanguage,
        learningObjective,
        isMuted,
        conversationMode
      });
      
      // Return an offline response with the queued message ID
      throw {
        offline: true,
        queuedMessageId: messageId,
        message: 'Message queued for sending when back online'
      };
    }
    
    // Skip quota check in Expo Go development mode
    if (!__DEV__) {
      // Check if user has available quota before making the request  
      try {
        const hasQuota = await supabaseUsageService.hasAvailableQuota();
        if (!hasQuota) {
          throw new Error('Usage quota exceeded. Please upgrade your subscription to continue.');
        }
      } catch (quotaError) {
        console.log('Error checking quota, proceeding anyway in development mode:', quotaError);
        // In case of quota check error, proceed with the request
      }
    }
    
    // Get user's auth headers
    const authHeaders = await getUserAuthHeaders();
    
    const params: ChatParams = {
      message,
      conversation_id: conversationId,
      tempo,
      difficulty,
      native_language: nativeLanguage,
      target_language: targetLanguage,
      learning_objective: learningObjective,
      is_muted: isMuted,
      conversation_mode: conversationMode,
      history: history // Include conversation history for stateless backend
    };

    // Add minimal debug logging in dev mode
    if (__DEV__) {
      console.log("🔍 Debug - conversation_mode:", params.conversation_mode);
    }
    
    // When we have a conversation_id, we should preserve the original mode
    // to prevent mismatches between welcome message and response
    if (conversationId) {
      try {
        // Check AsyncStorage for the original conversation mode
        const originalMode = await userPreferences.getSingleSetting('CONVERSATION_MODE', 'free_conversation');
        
        if (originalMode && originalMode !== params.conversation_mode) {
          // Only log in dev mode
          if (__DEV__) {
            console.log(`⚠️ Mode corrected: ${params.conversation_mode} → ${originalMode}`);
          }
          
          // Apply the saved mode to ensure consistency
          params.conversation_mode = originalMode as ConversationMode;
        }
      } catch (error) {
        console.error('Error checking saved conversation mode:', error);
      }
    }

    console.log(`🚀 Starting unified conversation request (includes parallel grammar analysis)...`);
    
    // First: Start conversation request
    const response = await fetchWithRetry(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      // Special handling for quota exceeded (403)
      if (response.status === 403) {
        // Force local quota check to sync with server
        await supabaseUsageService.forceQuotaExceeded();
        throw new Error('Usage quota exceeded. Please upgrade your subscription to continue.');
      }
      
      // Get detailed error message from response
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Add message_index for the latest assistant message to use with streaming
    if (data.has_audio && data.history && data.history.length > 0) {
      // Find the index of the last assistant message
      const lastAssistantIndex = data.history.length - 1;
      data.message_index = lastAssistantIndex;
    }

    // Backend now handles both conversation and grammar requests in parallel
    // The response already includes corrected and natural fields
    console.log(`🎯 Request completed - Response includes both conversation and grammar data:`, {
      conversation_id: data.conversation_id,
      corrected: data.corrected,
      natural: data.natural,
      reply: data.reply?.substring(0, 50) + '...'
    });
    
    // Cache audio response if available
    if (data.has_audio && data.audio_url && conversationId) {
      try {
        const cacheKey = `audio_${conversationId}_${data.message_index || 0}`;
        const audioUrl = data.audio_url.startsWith('http') 
          ? data.audio_url 
          : `${API_URL}${data.audio_url.startsWith('/') ? data.audio_url : '/' + data.audio_url}`;
        
        // Cache in background
        offlineAssets.cacheAudioFile(audioUrl, cacheKey, {
          conversationId,
          messageIndex: data.message_index || 0
        }).catch(error => console.log('Background audio caching failed:', error));
      } catch (error) {
        console.log('Error caching audio response:', error);
      }
    }
    
    // Track Claude API usage locally
    if (data.history && data.history.length > 0) {
      // Get the last assistant message for tracking
      const lastMessage = data.history[data.history.length - 1];
      if (lastMessage && lastMessage.content) {
        try {
          // Get the current user
          const user = getCurrentUser();
          if (user) {
            // Use actual token counts from API if available, otherwise estimate
            let inputTokens = 0;
            let outputTokens = 0;
            
            if (data.token_usage) {
              // Backend now provides total token usage for both requests combined
              inputTokens = data.token_usage.input_tokens || 0;
              outputTokens = data.token_usage.output_tokens || 0;
              console.log(`Using total token counts from parallel backend requests: ${inputTokens} input, ${outputTokens} output`);
            } else {
              // Fall back to estimation (this will undercount system prompt tokens)
              inputTokens = estimateTokens(message);
              outputTokens = estimateTokens(lastMessage.content);
              console.log(`Using estimated token counts (not accurate): ${inputTokens} input, ${outputTokens} output`);
            }
            
            // Get today's date
            const today = new Date().toISOString().split('T')[0];
            
            // Get current usage record
            const { data: usageData, error: usageError } = await supabase
              .from('usage')
              .select('*')
              .eq('user_id', user.id)
              .single();
            
            if (!usageError && usageData) {
              // Parse daily usage
              let dailyUsage = {};
              try {
                dailyUsage = typeof usageData.daily_usage === 'string'
                  ? JSON.parse(usageData.daily_usage || '{}')
                  : usageData.daily_usage || {};
              } catch (e) {
                console.warn('Error parsing daily usage:', e);
                dailyUsage = {};
              }
              
              // Initialize today's usage if needed
              if (!dailyUsage[today]) {
                dailyUsage[today] = {
                  date: today,
                  transcription_minutes: 0,
                  llm_input_tokens: 0,
                  llm_output_tokens: 0,
                  tts_characters: 0
                };
              }
              
              // Update daily usage
              dailyUsage[today].llm_input_tokens += inputTokens;
              dailyUsage[today].llm_output_tokens += outputTokens;
              
              // Update total tokens
              const newInputTokens = (usageData.llm_input_tokens || 0) + inputTokens;
              const newOutputTokens = (usageData.llm_output_tokens || 0) + outputTokens;
              
              // Update only the raw metrics
              await supabase
                .from('usage')
                .update({
                  llm_input_tokens: newInputTokens,
                  llm_output_tokens: newOutputTokens,
                  daily_usage: JSON.stringify(dailyUsage)
                })
                .eq('user_id', user.id);
              
              console.log(`Tracked Claude usage: ${inputTokens} input tokens, ${outputTokens} output tokens`);
            }
          }
          
          // Track TTS usage if audio is generated
          if (data.has_audio && !isMuted) {
            await supabaseUsageService.trackTTSUsage(lastMessage.content);
          }
        } catch (trackingError) {
          // Log but don't fail the whole interaction if tracking fails
          console.warn('Usage tracking failed but conversation will continue:', trackingError);
        }
      }
    }

    return data;
  } catch (error: any) {
    // If it's already a structured offline error, just rethrow it
    if (error.offline) {
      throw error;
    }
    
    console.error('API Error:', error);
    
    // Classify and enhance the error
    const classifiedError = classifyApiError(error);
    
    // For network errors, try to queue the message
    if (classifiedError.type === 'network' || classifiedError.type === 'timeout') {
      try {
        const messageId = await queueOfflineMessage('text', {
          message,
          conversationId,
          tempo,
          difficulty,
          nativeLanguage,
          targetLanguage,
          learningObjective,
          isMuted,
          conversationMode
        });
        
        throw {
          offline: true,
          queuedMessageId: messageId,
          message: classifiedError.message,
          type: classifiedError.type
        };
      } catch (queueError) {
        console.error('Failed to queue offline message:', queueError);
      }
    }
    
    throw {
      ...classifiedError,
      originalError: error
    };
  }
};

// Add a new helper function to get the streaming audio URL
export const getAudioStreamUrl = (
  conversationId: string,
  messageIndex: number = -1,
  tempo: number = 0.75, // Default to 75% speed to match PLAYER_SETTINGS.DEFAULT_TEMPO
  targetLanguage: string = 'es',
  isMuted: boolean = false
) => {
  return `${API_URL}/stream-audio/${conversationId}?message_index=${messageIndex}&tempo=${tempo}&target_language=${targetLanguage}&is_muted=${isMuted}`;
};

/**
 * Send a voice recording to the language tutor API
 */
export const sendVoiceRecording = async ({
  audioUri,
  conversationId = null,
  tempo = 0.75, // Default to 75% speed to match PLAYER_SETTINGS.DEFAULT_TEMPO
  difficulty = 'beginner',
  nativeLanguage = 'en',
  targetLanguage = 'es',
  learningObjective = '',
  isMuted = false,
  conversationMode = 'free_conversation',
  history = [] // Add conversation history parameter
}: VoiceParams) => {
  try {
    // Check for network connectivity first
    const networkState = await import('@react-native-community/netinfo')
      .then(module => module.default.fetch());
    
    // In development mode, always assume connected
    if (!__DEV__ && (!networkState.isConnected || networkState.isInternetReachable === false)) {
      console.log('No network connection, queuing voice message for later');
      
      // Queue the message for later sending
      const messageId = await queueOfflineMessage('voice', {
        audioUri,
        conversationId,
        tempo,
        difficulty,
        nativeLanguage,
        targetLanguage,
        learningObjective,
        isMuted,
        conversationMode
      });
      
      // Return an offline response with the queued message ID
      throw {
        offline: true,
        queuedMessageId: messageId,
        message: 'Voice message queued for sending when back online'
      };
    }
    
    // Skip quota check in Expo Go development mode
    if (!__DEV__) {
      // Check if user has available quota before making the request  
      try {
        const hasQuota = await supabaseUsageService.hasAvailableQuota();
        if (!hasQuota) {
          throw new Error('Usage quota exceeded. Please upgrade your subscription to continue.');
        }
      } catch (quotaError) {
        console.log('Error checking quota, proceeding anyway in development mode:', quotaError);
        // In case of quota check error, proceed with the request
      }
    }
    
    // Get user's auth headers
    const authHeaders = await getUserAuthHeaders();
    
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    if (!fileInfo.exists) {
      throw new Error('Audio file does not exist');
    }

    // Create form data
    const formData = new FormData();

    // Add audio file to form data
    formData.append('audio_file', {
      uri: audioUri,
      type: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/webm',
      name: Platform.OS === 'ios' ? 'recording.m4a' : 'recording.webm'
    } as any);

    if (conversationId) {
      formData.append('conversation_id', conversationId);
    }

    formData.append('tempo', tempo.toString());
    formData.append('difficulty', difficulty);
    formData.append('native_language', nativeLanguage);
    formData.append('target_language', targetLanguage);
    formData.append('learning_objective', learningObjective);
    formData.append('is_muted', isMuted.toString());
    
    // When we have a conversation_id, we should preserve the original mode
    // to prevent mismatches between welcome message and response
    let finalConversationMode = conversationMode;
    if (conversationId) {
      try {
        // Check AsyncStorage for the original conversation mode
        const originalMode = await userPreferences.getSingleSetting('CONVERSATION_MODE', 'free_conversation');
        
        if (originalMode && originalMode !== conversationMode) {
          // Only log in dev mode
          if (__DEV__) {
            console.log(`⚠️ Voice message - Mode corrected: ${conversationMode} → ${originalMode}`);
          }
          
          // Apply the saved mode to ensure consistency
          finalConversationMode = originalMode as ConversationMode;
        }
      } catch (error) {
        console.error('Error checking saved conversation mode:', error);
      }
    }
    formData.append('conversation_mode', finalConversationMode);
    
    // Add conversation history for stateless backend
    if (history && history.length > 0) {
      formData.append('history', JSON.stringify(history));
    }

    // Add auth headers to formData for user identification
    const userId = authHeaders['X-User-ID'];
    if (userId) {
      formData.append('user_id', userId);
    }

    // Voice uploads need special handling with longer timeouts but no retries
    console.log("Starting voice upload with extended timeout...");
    const VOICE_API_TIMEOUT = 60000; // 60 seconds for voice API
    
    // Create an abort controller for the timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("Voice upload timeout triggered, aborting");
      controller.abort();
    }, VOICE_API_TIMEOUT);
    
    let response;
    try {
      // Make the fetch request with the abort signal - no retries
      response = await fetch(`${API_URL}/voice-input`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...authHeaders
        },
        signal: controller.signal
      });
      
      console.log(`Voice upload completed with status: ${response.status}`);
    } catch (error: any) {
      console.error("Voice upload error:", error);
      
      // Handle abort/timeout error specifically
      if (error.name === 'AbortError') {
        throw new Error('Voice upload timed out after 60 seconds. Please try again with a shorter recording.');
      }
      
      // For all errors, just throw - no retries
      throw error;
    } finally {
      // Always clear the timeout
      clearTimeout(timeoutId);
    }

    if (!response || !response.ok) {
      // Special handling for quota exceeded (403)
      if (response && response.status === 403) {
        // Force local quota check to sync with server
        await supabaseUsageService.forceQuotaExceeded();
        throw new Error('Usage quota exceeded. Please upgrade your subscription to continue.');
      }
      
      const errorMsg = response 
        ? `Server error: ${response.status}` 
        : 'Failed to send voice recording after multiple retries';
      throw new Error(errorMsg);
    }

    const data = await response.json();
    
    // Backend now handles both voice transcription/conversation and grammar requests in parallel
    // The response already includes corrected and natural fields (unless no speech was detected)
    if (!data.no_speech_detected && data.conversation_id) {
      console.log(`🎯 Voice request completed - Response includes both conversation and grammar data:`, {
        conversation_id: data.conversation_id,
        corrected: data.corrected,
        natural: data.natural,
        transcribed_text: data.transcribed_text
      });
    }
    
    // Cache audio response if available
    if (data.has_audio && data.audio_url && conversationId) {
      try {
        const messageIndex = data.history ? data.history.length - 1 : 0;
        const cacheKey = `audio_${conversationId}_${messageIndex}`;
        const audioUrl = data.audio_url.startsWith('http') 
          ? data.audio_url 
          : `${API_URL}${data.audio_url.startsWith('/') ? data.audio_url : '/' + data.audio_url}`;
        
        // Cache in background
        offlineAssets.cacheAudioFile(audioUrl, cacheKey, {
          conversationId,
          messageIndex
        }).catch(error => console.log('Background audio caching failed:', error));
      } catch (error) {
        console.log('Error caching audio response:', error);
      }
    }
    
    // Track LemonFox usage locally (estimate audio duration from file size)
    // Audio files are typically ~16KB per second of audio at standard quality
    try {
      const audioDurationEstimateSeconds = Math.max(1, Math.ceil(fileInfo.size / 16000));
      // Send actual recording duration for more accurate pricing
      formData.append('audio_duration_seconds', audioDurationEstimateSeconds.toString());
      await supabaseUsageService.trackTranscriptionUsage(audioDurationEstimateSeconds);
    } catch (trackingError) {
      // Log but don't fail the voice conversation if tracking fails
      console.warn('Speech transcription usage tracking failed but will continue:', trackingError);
    }
    
    // Check for special responses from our backend
    if (data.no_speech_detected) {
      // Pass this information back to the caller for handling
      // No usage tracking required as no API calls were made
      console.log("No speech detected in recording");
      return data;
    }
    
    // Check for service unavailability
    if (data.service_unavailable) {
      console.log("Speech recognition service unavailable:", data.error_type);
      // Return the service unavailable response directly to the caller
      return data;
    }
    
    // Track Claude API usage locally (if there's a response)
    if (data.history && data.history.length > 0) {
      // Get the transcribed text and the last assistant message
      const transcription = data.transcript || "";
      const lastMessage = data.history[data.history.length - 1];
      
      if (lastMessage && lastMessage.content) {
        try {
          // Get the current user
          const user = getCurrentUser();
          if (user) {
            // Use actual token counts from API if available, otherwise estimate
            let inputTokens = 0;
            let outputTokens = 0;
            
            if (data.token_usage) {
              // Backend now provides total token usage for both requests combined
              inputTokens = data.token_usage.input_tokens || 0;
              outputTokens = data.token_usage.output_tokens || 0;
              console.log(`Using total token counts from parallel backend requests (voice): ${inputTokens} input, ${outputTokens} output`);
            } else {
              // Fall back to estimation (this will undercount system prompt tokens)
              inputTokens = estimateTokens(transcription);
              outputTokens = estimateTokens(lastMessage.content);
              console.log(`Using estimated token counts (voice - not accurate): ${inputTokens} input, ${outputTokens} output`);
            }
            
            // Get today's date
            const today = new Date().toISOString().split('T')[0];
            
            // Get current usage record
            const { data: usageData, error: usageError } = await supabase
              .from('usage')
              .select('*')
              .eq('user_id', user.id)
              .single();
            
            if (!usageError && usageData) {
              // Parse daily usage
              let dailyUsage = {};
              try {
                dailyUsage = typeof usageData.daily_usage === 'string'
                  ? JSON.parse(usageData.daily_usage || '{}')
                  : usageData.daily_usage || {};
              } catch (e) {
                console.warn('Error parsing daily usage:', e);
                dailyUsage = {};
              }
              
              // Initialize today's usage if needed
              if (!dailyUsage[today]) {
                dailyUsage[today] = {
                  date: today,
                  transcription_minutes: 0,
                  llm_input_tokens: 0,
                  llm_output_tokens: 0,
                  tts_characters: 0
                };
              }
              
              // Update daily usage
              dailyUsage[today].llm_input_tokens += inputTokens;
              dailyUsage[today].llm_output_tokens += outputTokens;
              
              // Update total tokens
              const newInputTokens = (usageData.llm_input_tokens || 0) + inputTokens;
              const newOutputTokens = (usageData.llm_output_tokens || 0) + outputTokens;
              
              // Update only the raw metrics
              await supabase
                .from('usage')
                .update({
                  llm_input_tokens: newInputTokens,
                  llm_output_tokens: newOutputTokens,
                  daily_usage: JSON.stringify(dailyUsage)
                })
                .eq('user_id', user.id);
              
              console.log(`Tracked Claude usage: ${inputTokens} input tokens, ${outputTokens} output tokens`);
            }
          }
          
          // Track TTS usage if audio is generated
          if (data.has_audio && !isMuted) {
            await supabaseUsageService.trackTTSUsage(lastMessage.content);
          }
        } catch (trackingError) {
          // Log but don't fail the voice conversation if tracking fails
          console.warn('Claude/TTS usage tracking failed but will continue:', trackingError);
        }
      }
    }

    return data;
  } catch (error: any) {
    // If it's already a structured offline error, just rethrow it
    if (error.offline) {
      throw error;
    }
    
    console.error('Voice API Error:', error);
    
    // Classify and enhance the error
    const classifiedError = classifyApiError(error);
    
    // For network errors, try to queue the message
    if (classifiedError.type === 'network' || classifiedError.type === 'timeout') {
      try {
        const messageId = await queueOfflineMessage('voice', {
          audioUri,
          conversationId,
          tempo,
          difficulty,
          nativeLanguage,
          targetLanguage,
          learningObjective,
          isMuted,
          conversationMode
        });
        
        throw {
          offline: true,
          queuedMessageId: messageId,
          message: classifiedError.message,
          type: classifiedError.type
        };
      } catch (queueError) {
        console.error('Failed to queue offline voice message:', queueError);
      }
    }
    
    throw {
      ...classifiedError,
      originalError: error
    };
  }
};

/**
 * Downloads an audio file from the API server with improved error handling and offline support
 */
export const downloadAudio = async (
  audioUrl: string, 
  options?: { conversationId?: string, messageIndex?: number }
): Promise<string> => {
  try {
    const fullUrl = audioUrl.startsWith('http')
      ? audioUrl
      : `${API_URL}${audioUrl.startsWith('/') ? audioUrl : '/' + audioUrl}`;

    // Generate a cache key for this audio file
    const urlHash = fullUrl.split('/').pop() || `audio_${Date.now()}`;
    const cacheKey = options?.conversationId 
      ? `audio_${options.conversationId}_${options.messageIndex || 0}`
      : `audio_${urlHash}`;
    
    // Check if we already have this audio file cached
    const cachedAudio = await offlineAssets.getCachedAudioFile(cacheKey);
    if (cachedAudio) {
      console.log(`Using cached audio: ${cachedAudio}`);
      return cachedAudio;
    }

    // Check network connectivity
    const networkState = await import('@react-native-community/netinfo')
      .then(module => module.default.fetch());
    
    if (!networkState.isConnected || networkState.isInternetReachable === false) {
      throw new Error('Cannot download audio while offline');
    }
    
    console.log("Downloading audio from:", fullUrl);

    // Extract file extension from URL
    const urlParts = fullUrl.split('.');
    const fileExtension = urlParts.length > 1 ? urlParts[urlParts.length - 1].toLowerCase() : 'mp3';

    // Determine content type based on extension
    let contentType;
    switch (fileExtension) {
      case 'mp3':
        contentType = 'audio/mpeg';
        break;
      case 'wav':
        contentType = 'audio/wav';
        break;
      case 'm4a':
        contentType = 'audio/m4a';
        break;
      default:
        contentType = 'audio/mpeg'; // Default to mp3
    }

    // Create a unique filename with proper extension
    const fileName = `audio_${Date.now()}.${fileExtension}`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    // First check if the URL is accessible using fetchWithRetry with timeout
    try {
      const headResponse = await fetchWithRetry(fullUrl, { 
        method: 'HEAD',
        headers: {
          'Accept': contentType,
        }
      }, 2); // 2 retries for HEAD request
      
      if (!headResponse.ok) {
        throw new Error(`Server returned ${headResponse.status} ${headResponse.statusText}`);
      }

      // Get actual content type from server if available
      const serverContentType = headResponse.headers.get('content-type');
      if (serverContentType && serverContentType.includes('audio/')) {
        contentType = serverContentType;
      }
    } catch (headError) {
      console.log("HEAD request failed, proceeding with download anyway:", headError);
    }

    // Download with proper options
    const downloadOptions = {
      headers: {
        'Accept': contentType,
        'Content-Type': contentType,
      },
      // Add options for resumable downloads when Expo supports it
      // Use a different timeout for large files
      timeout: 30000 // 30 seconds timeout for audio files
    };

    // Download the file
    try {
      const downloadResult = await FileSystem.downloadAsync(fullUrl, fileUri, downloadOptions);

      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download audio: ${downloadResult.status}`);
      }

      // Verify the downloaded file exists and has content
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error('Downloaded file is empty or does not exist');
      }

      console.log(`Audio downloaded successfully: ${fileUri} (${fileInfo.size} bytes)`);
      
      // Cache the audio file for offline use
      await offlineAssets.cacheAudioFile(fullUrl, cacheKey, options);
      
      return fileUri;
    } catch (downloadError: any) {
      console.error('Download error:', downloadError);
      
      // For some specific connection errors, we might want to retry automatically
      if (downloadError.message.includes('network') || 
          downloadError.message.includes('timeout') ||
          downloadError.message.includes('connection')) {
        
        // Implement exponential backoff retry logic for downloads
        // This is handled separately from fetchWithRetry since we're using FileSystem.downloadAsync
        throw new Error(`Failed to download audio: ${downloadError.message}`);
      }
      
      throw downloadError;
    }
  } catch (error: any) {
    console.error('Audio download error:', error);
    
    // Classify the error
    const errorInfo = classifyApiError(error);
    
    // Enhanced error with more details
    throw {
      ...errorInfo,
      originalError: error
    };
  }
};

/**
 * Create a new conversation with an AI welcome message that acknowledges the learning objective
 */
export const createConversation = async ({
  difficulty,
  nativeLanguage,
  targetLanguage,
  learningObjective,
  conversationMode = 'free_conversation',
  tempo,
  isMuted = false
}: {
  difficulty: string;
  nativeLanguage: string;
  targetLanguage: string;
  learningObjective?: string;
  conversationMode?: ConversationMode;
  tempo?: number;
  isMuted?: boolean;
}) => {
  try {
    // Check for network connectivity first
    const networkState = await import('@react-native-community/netinfo')
      .then(module => module.default.fetch());
    
    // In development mode, always assume connected
    if (!__DEV__ && (!networkState.isConnected || networkState.isInternetReachable === false)) {
      console.log('No network connection while trying to create conversation');
      throw {
        offline: true,
        message: 'Cannot create a new conversation while offline. Please check your internet connection and try again.'
      };
    }
    
    // Skip quota check in Expo Go development mode
    if (!__DEV__) {
      // Check if user has available quota before creating a new conversation
      try {
        const hasQuota = await supabaseUsageService.hasAvailableQuota();
        if (!hasQuota) {
          throw new Error('Usage quota exceeded. Please upgrade your subscription to continue.');
        }
      } catch (quotaError) {
        console.log('Error checking quota, proceeding anyway in development mode:', quotaError);
        // In case of quota check error, proceed with the request
      }
    }
    
    // Get user's auth headers
    const authHeaders = await getUserAuthHeaders();
    
    // Create request body
    const requestBody = {
      difficulty,
      native_language: nativeLanguage,
      target_language: targetLanguage,
      learning_objective: learningObjective || '',
      conversation_mode: conversationMode,
      tempo: tempo ?? 0.75, // Use 0.75 (75%) as default if tempo is undefined
      is_muted: isMuted
    };

    // Add debug logging
    if (__DEV__) {
      console.log("🔍 Debug - createConversation request body:", JSON.stringify(requestBody, null, 2));
      console.log("🔍 Debug - conversation_mode value:", conversationMode);
    }

    // Use fetchWithRetry instead of fetch
    const response = await fetchWithRetry(`${API_URL}/create-conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      // Special handling for quota exceeded (403)
      if (response.status === 403) {
        // Force local quota check to sync with server
        await supabaseUsageService.forceQuotaExceeded();
        throw new Error('Usage quota exceeded. Please upgrade your subscription to continue.');
      }
      
      // Get detailed error from response
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Cache audio response if available
    if (data.has_audio && data.audio_url && data.conversation_id) {
      try {
        const cacheKey = `audio_${data.conversation_id}_0`;
        const audioUrl = data.audio_url.startsWith('http') 
          ? data.audio_url 
          : `${API_URL}${data.audio_url.startsWith('/') ? data.audio_url : '/' + data.audio_url}`;
        
        // Cache in background
        offlineAssets.cacheAudioFile(audioUrl, cacheKey, {
          conversationId: data.conversation_id,
          messageIndex: 0
        }).catch(error => console.log('Background audio caching failed:', error));
      } catch (error) {
        console.log('Error caching initial conversation audio:', error);
      }
    }
    
    // Track Claude API usage for the welcome message
    if (data.history && data.history.length > 0) {
      const welcomeMessage = data.history[0];
      if (welcomeMessage && welcomeMessage.content) {
        // The input for the welcome message is effectively the conversation context
        const contextInput = `${targetLanguage} conversation with ${difficulty} difficulty${learningObjective ? ` about ${learningObjective}` : ''}`;
        
        // Track usage locally with direct database update
        try {
          // Get the current user
          const user = getCurrentUser();
          if (user) {
            // Use actual token counts from API if available, otherwise estimate
            let inputTokens = 0;
            let outputTokens = 0;
            
            if (data.token_usage) {
              // Backend now provides total token usage for both requests combined  
              inputTokens = data.token_usage.input_tokens || 0;
              outputTokens = data.token_usage.output_tokens || 0;
              console.log(`Using total token counts from parallel backend requests (conversation): ${inputTokens} input, ${outputTokens} output`);
            } else {
              // Fall back to estimation (this will undercount system prompt tokens)
              inputTokens = estimateTokens(contextInput);
              outputTokens = estimateTokens(welcomeMessage.content);
              console.log(`Using estimated token counts (conversation - not accurate): ${inputTokens} input, ${outputTokens} output`);
            }
            
            // Get today's date
            const today = new Date().toISOString().split('T')[0];
            
            // Get current usage record
            const { data: usageData, error: usageError } = await supabase
              .from('usage')
              .select('*')
              .eq('user_id', user.id)
              .single();
            
            if (!usageError && usageData) {
              // Parse daily usage
              let dailyUsage = {};
              try {
                dailyUsage = typeof usageData.daily_usage === 'string'
                  ? JSON.parse(usageData.daily_usage || '{}')
                  : usageData.daily_usage || {};
              } catch (e) {
                console.warn('Error parsing daily usage:', e);
                dailyUsage = {};
              }
              
              // Initialize today's usage if needed
              if (!dailyUsage[today]) {
                dailyUsage[today] = {
                  date: today,
                  transcription_minutes: 0,
                  llm_input_tokens: 0,
                  llm_output_tokens: 0,
                  tts_characters: 0
                };
              }
              
              // Update daily usage
              dailyUsage[today].llm_input_tokens += inputTokens;
              dailyUsage[today].llm_output_tokens += outputTokens;
              
              // Update total tokens
              const newInputTokens = (usageData.llm_input_tokens || 0) + inputTokens;
              const newOutputTokens = (usageData.llm_output_tokens || 0) + outputTokens;
              
              // Update only the raw metrics
              await supabase
                .from('usage')
                .update({
                  llm_input_tokens: newInputTokens,
                  llm_output_tokens: newOutputTokens,
                  daily_usage: JSON.stringify(dailyUsage)
                })
                .eq('user_id', user.id);
              
              console.log(`Tracked Claude usage: ${inputTokens} input tokens, ${outputTokens} output tokens`);
            }
          }
          
          // Track TTS usage if audio is generated
          if (data.has_audio && !isMuted) {
            await supabaseUsageService.trackTTSUsage(welcomeMessage.content);
          }
        } catch (trackingError) {
          // Log but don't fail the conversation creation if tracking fails
          console.warn('Usage tracking error in conversation creation:', trackingError);
        }
      }
    }

    return data;
  } catch (error: any) {
    // If it's already a structured offline error, just rethrow it
    if (error.offline) {
      throw error;
    }
    
    console.error('Create conversation error:', error);
    
    // Classify and enhance the error
    const classifiedError = classifyApiError(error);
    
    throw {
      ...classifiedError,
      originalError: error
    };
  }
};

/**
 * Sync current user's subscription status with RevenueCat
 */
export const syncUserSubscription = async (userId: string): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`[API] Syncing subscription for user: ${userId}`);
    
    const headers = await getUserAuthHeaders();
    
    const response = await fetchWithRetry(`${API_URL}/sync-user-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ user_id: userId })
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[API] Sync result:`, data);
    
    return {
      success: data.success,
      message: data.message
    };
  } catch (error: any) {
    console.error('[API] Sync error:', error);
    
    // Return non-throwing result for graceful handling
    return {
      success: false,
      message: `Sync failed: ${error.message || 'Unknown error'}`
    };
  }
};

/**
 * Get RevenueCat sync service status
 */
export const getSyncStatus = async (): Promise<{ service_available: boolean; status: string }> => {
  try {
    const response = await fetchWithRetry(`${API_URL}/sync-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[API] Sync status check error:', error);
    
    return {
      service_available: false,
      status: 'error'
    };
  }
};

export default {
  sendTextMessage,
  sendVoiceRecording,
  downloadAudio,
  createConversation,
  preconnectToAPI,
  getAudioStreamUrl,
  syncUserSubscription,
  getSyncStatus,
};