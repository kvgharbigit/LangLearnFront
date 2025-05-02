import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { ConversationMode } from '../components/ConversationModeSelector';
import usageService from '../services/usageService';
import { getCurrentUser, getIdToken } from '../services/authService';
import { fetchWithRetry, classifyApiError, parseErrorResponse } from './apiHelpers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import offlineAssets from './offlineAssets';

// Update this to your actual API URL
//const API_URL = 'https://language-tutor-984417336702.asia-east1.run.app';
const API_URL = 'http://192.168.86.241:8004'; // Desktop WiFi IP address
//const API_URL = 'http://172.29.224.1:8004'; // WSL adapter IP
//const API_URL = 'http://192.168.86.26:8004'; // Previous IP
//const API_URL = 'https://a84f-128-250-0-218.ngrok-free.app'; //work

// Helper to get user auth headers for API requests
const getUserAuthHeaders = async () => {
  const user = getCurrentUser();
  if (!user) return {};
  
  try {
    const token = await getIdToken(user, true);
    return {
      'Authorization': `Bearer ${token}`,
      'X-User-ID': user.uid
    };
  } catch (error) {
    console.error('Error getting auth token:', error);
    return { 'X-User-ID': user.uid };
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
      
      // Send a lightweight request to establish connection
      const response = await fetch(`${API_URL}/ping`, {
        method: 'HEAD',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log(`🔌 API preconnection ${response.ok ? 'successful' : 'failed'} (${response.status})`);
      resolve();
    } catch (error) {
      console.log("⚠️ API preconnection error:", error);
      resolve(); // Resolve anyway to not block the app
    }
  });
  
  return warmupPromise;
};

// Update the ChatParams interface to include isMuted and conversationMode
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
}

// Update the VoiceParams interface to include isMuted and conversationMode
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
  tempo: number = 0.9, // Default to 90% speed
  difficulty: string = 'beginner',
  nativeLanguage: string = 'en',
  targetLanguage: string = 'es',
  learningObjective: string = '',
  isMuted: boolean = false,
  conversationMode: ConversationMode = 'language_lesson'
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
        const hasQuota = await usageService.hasAvailableQuota();
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
      conversation_mode: conversationMode
    };

    // Add debug logging
    if (__DEV__) {
      console.log("🔍 Debug - API sendTextMessage params:", JSON.stringify(params, null, 2));
      console.log("🔍 Debug - conversation_mode value:", conversationMode);
    }

    // Use fetchWithRetry instead of fetch
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
        await usageService.forceQuotaExceeded();
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
        // Track input (user message) and output (assistant reply)
        await usageService.trackClaudeUsage(message, lastMessage.content);
        
        // Track TTS usage if audio is generated
        if (data.has_audio && !isMuted) {
          await usageService.trackTTSUsage(lastMessage.content);
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
  tempo: number = 0.9, // Default to 90% speed
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
  tempo = 0.9, // Default to 90% speed
  difficulty = 'beginner',
  nativeLanguage = 'en',
  targetLanguage = 'es',
  learningObjective = '',
  isMuted = false,
  conversationMode = 'language_lesson'
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
        const hasQuota = await usageService.hasAvailableQuota();
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
    formData.append('conversation_mode', conversationMode);

    // Add auth headers to formData for user identification
    const userId = authHeaders['X-User-ID'];
    if (userId) {
      formData.append('user_id', userId);
    }

    // Use fetchWithRetry, but we need to handle form data differently
    // since fetchWithRetry uses regular fetch under the hood
    let response;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        response = await fetch(`${API_URL}/voice-input`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
            ...authHeaders
          },
        });
        
        // If successful, break the loop
        break;
      } catch (error: any) {
        retryCount++;
        
        // Only retry network errors
        if (error.message.includes('network') || error.message.includes('connection')) {
          if (retryCount >= maxRetries) {
            throw error;
          }
          
          // Exponential backoff
          const delay = 1000 * Math.pow(2, retryCount - 1) + Math.random() * 1000;
          console.log(`Retrying voice upload (${retryCount}/${maxRetries}) after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Non-network errors should not be retried
          throw error;
        }
      }
    }

    if (!response || !response.ok) {
      // Special handling for quota exceeded (403)
      if (response && response.status === 403) {
        // Force local quota check to sync with server
        await usageService.forceQuotaExceeded();
        throw new Error('Usage quota exceeded. Please upgrade your subscription to continue.');
      }
      
      const errorMsg = response 
        ? `Server error: ${response.status}` 
        : 'Failed to send voice recording after multiple retries';
      throw new Error(errorMsg);
    }

    const data = await response.json();
    
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
    
    // Track Whisper usage locally (estimate audio duration from file size)
    // Audio files are typically ~16KB per second of audio at standard quality
    const audioDurationEstimateSeconds = Math.max(1, Math.ceil(fileInfo.size / 16000));
    await usageService.trackWhisperUsage(audioDurationEstimateSeconds);
    
    // Track Claude API usage locally (if there's a response)
    if (data.history && data.history.length > 0) {
      // Get the transcribed text and the last assistant message
      const transcription = data.transcript || "";
      const lastMessage = data.history[data.history.length - 1];
      
      if (lastMessage && lastMessage.content) {
        // Track input (transcribed text) and output (assistant reply)
        await usageService.trackClaudeUsage(transcription, lastMessage.content);
        
        // Track TTS usage if audio is generated
        if (data.has_audio && !isMuted) {
          await usageService.trackTTSUsage(lastMessage.content);
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
  conversationMode = 'language_lesson',
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
        const hasQuota = await usageService.hasAvailableQuota();
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
      tempo: tempo ?? 0.9, // Use 0.9 (90%) as default if tempo is undefined
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
        await usageService.forceQuotaExceeded();
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
        
        // Track usage locally
        await usageService.trackClaudeUsage(contextInput, welcomeMessage.content);
        
        // Track TTS usage if audio is generated
        if (data.has_audio && !isMuted) {
          await usageService.trackTTSUsage(welcomeMessage.content);
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

export default {
  sendTextMessage,
  sendVoiceRecording,
  downloadAudio,
  createConversation,
  preconnectToAPI,
  getAudioStreamUrl,
  preconnectToAPI
};