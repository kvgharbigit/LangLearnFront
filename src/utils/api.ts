import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { ConversationMode } from '../components/ConversationModeSelector';

// Update this to your actual API URL
const API_URL = 'https://language-tutor-984417336702.asia-east1.run.app';
//const API_URL = 'http://192.168.86.26:8004';
//const API_URL = 'http://192.168.86.241:8004';
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

/**
 * Send a text message to the language tutor API
 */
export const sendTextMessage = async (
  message: string,
  conversationId: string | null = null,
  tempo: number = 0.75,
  difficulty: string = 'beginner',
  nativeLanguage: string = 'en',
  targetLanguage: string = 'es',
  learningObjective: string = '',
  isMuted: boolean = false,
  conversationMode: ConversationMode = 'language_lesson'
) => {
  try {
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
    console.log("🔍 Debug - API sendTextMessage params:", JSON.stringify(params, null, 2));
    console.log("🔍 Debug - conversation_mode value:", conversationMode);

    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Add message_index for the latest assistant message to use with streaming
    if (data.has_audio && data.history && data.history.length > 0) {
      // Find the index of the last assistant message
      const lastAssistantIndex = data.history.length - 1;
      data.message_index = lastAssistantIndex;
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Add a new helper function to get the streaming audio URL
export const getAudioStreamUrl = (
  conversationId: string,
  messageIndex: number = -1,
  tempo: number = 0.75,
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
  tempo = 0.75,
  difficulty = 'beginner',
  nativeLanguage = 'en',
  targetLanguage = 'es',
  learningObjective = '',
  isMuted = false,
  conversationMode = 'language_lesson'
}: VoiceParams) => {
  try {
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

    const response = await fetch(`${API_URL}/voice-input`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Downloads an audio file from the API server with improved error handling and format support
 */
export const downloadAudio = async (audioUrl: string): Promise<string> => {
  try {
    const fullUrl = audioUrl.startsWith('http')
      ? audioUrl
      : `${API_URL}${audioUrl.startsWith('/') ? audioUrl : '/' + audioUrl}`;

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

    // First check if the URL is accessible
    try {
      const headResponse = await fetch(fullUrl, { method: 'HEAD' });
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
      }
    };

    // Download the file
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
    return fileUri;
  } catch (error) {
    console.error('Audio download error:', error);
    throw error;
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
    // Create request body
    const requestBody = {
      difficulty,
      native_language: nativeLanguage,
      target_language: targetLanguage,
      learning_objective: learningObjective || '',
      conversation_mode: conversationMode,
      tempo: tempo || 0.75,
      is_muted: isMuted
    };

    // Add debug logging
    console.log("🔍 Debug - createConversation request body:", JSON.stringify(requestBody, null, 2));
    console.log("🔍 Debug - conversation_mode value:", conversationMode);

    const response = await fetch(`${API_URL}/create-conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error creating conversation:', errorData);
      throw new Error(errorData.detail || 'Failed to create conversation');
    }

    return await response.json();
  } catch (error) {
    console.error('Create conversation error:', error);
    throw error;
  }
};

export default {
  sendTextMessage,
  sendVoiceRecording,
  downloadAudio,
  createConversation,
  getAudioStreamUrl
};