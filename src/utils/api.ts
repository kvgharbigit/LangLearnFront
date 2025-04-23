import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Update this to your actual API URL
const API_URL = 'https://language-tutor-984417336702.asia-east1.run.app/chat';

interface ChatParams {
  message: string;
  conversation_id?: string | null;
  tempo: number;
  difficulty: string;
  native_language: string;
  target_language: string;
  learning_objective?: string;
}

interface VoiceParams {
  audioUri: string;
  conversationId?: string | null;
  tempo: number;
  difficulty: string;
  nativeLanguage: string;
  targetLanguage: string;
  learningObjective?: string;
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
  learningObjective: string = ''
) => {
  try {
    const params: ChatParams = {
      message,
      conversation_id: conversationId,
      tempo,
      difficulty,
      native_language: nativeLanguage,
      target_language: targetLanguage,
      learning_objective: learningObjective
    };

    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
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
  learningObjective = ''
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
 * Downloads an audio file from the API server
 */
export const downloadAudio = async (audioUrl: string): Promise<string> => {
  try {
    const fullUrl = audioUrl.startsWith('http')
      ? audioUrl
      : `${API_URL}${audioUrl.startsWith('/') ? audioUrl : '/' + audioUrl}`;

    // Create a unique filename based on timestamp
    const fileName = `audio_${Date.now()}.${audioUrl.endsWith('.mp3') ? 'mp3' : 'wav'}`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    // Download the file
    const downloadResult = await FileSystem.downloadAsync(fullUrl, fileUri);

    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download audio: ${downloadResult.status}`);
    }

    return fileUri;
  } catch (error) {
    console.error('Audio download error:', error);
    throw error;
  }
};

export default {
  sendTextMessage,
  sendVoiceRecording,
  downloadAudio
};