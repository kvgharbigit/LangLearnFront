import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Directory for offline asset cache
const ASSETS_CACHE_DIR = `${FileSystem.cacheDirectory}offline_assets/`;
// Key for storing the cache manifest
const CACHE_MANIFEST_KEY = '@confluency:offline_cache_manifest';

// Interface for the cache manifest
interface CacheManifest {
  audio: Record<string, { 
    uri: string, 
    timestamp: number,
    size: number,
    conversationId?: string,
    messageIndex?: number
  }>;
  [key: string]: any; // For future asset types
}

// Ensure the cache directory exists
export const ensureCacheDirectory = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(ASSETS_CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(ASSETS_CACHE_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('Error ensuring cache directory:', error);
    throw error;
  }
};

// Load the cache manifest
export const loadCacheManifest = async (): Promise<CacheManifest> => {
  try {
    const manifestString = await AsyncStorage.getItem(CACHE_MANIFEST_KEY);
    if (manifestString) {
      return JSON.parse(manifestString);
    }
    return { audio: {} };
  } catch (error) {
    console.error('Error loading cache manifest:', error);
    return { audio: {} };
  }
};

// Save the cache manifest
export const saveCacheManifest = async (manifest: CacheManifest): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_MANIFEST_KEY, JSON.stringify(manifest));
  } catch (error) {
    console.error('Error saving cache manifest:', error);
  }
};

// Cache an audio file for offline use
export const cacheAudioFile = async (
  url: string, 
  key: string, 
  options?: { 
    conversationId?: string, 
    messageIndex?: number 
  }
): Promise<string> => {
  try {
    await ensureCacheDirectory();
    
    // Construct unique file name based on key
    const fileUri = `${ASSETS_CACHE_DIR}${key.replace(/[^a-z0-9]/gi, '_')}.mp3`;
    
    // Check if file already exists
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    
    // Only download if not already cached
    if (!fileInfo.exists) {
      const downloadResult = await FileSystem.downloadAsync(url, fileUri);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download file: ${downloadResult.status}`);
      }
      
      // Update the cache manifest
      const manifest = await loadCacheManifest();
      manifest.audio[key] = {
        uri: fileUri,
        timestamp: Date.now(),
        size: (await FileSystem.getInfoAsync(fileUri)).size || 0,
        ...(options?.conversationId && { conversationId: options.conversationId }),
        ...(options?.messageIndex !== undefined && { messageIndex: options.messageIndex })
      };
      
      await saveCacheManifest(manifest);
    }
    
    return fileUri;
  } catch (error) {
    console.error('Error caching audio file:', error);
    throw error;
  }
};

// Get a cached audio file if available
export const getCachedAudioFile = async (key: string): Promise<string | null> => {
  try {
    // Load manifest to check if audio exists
    const manifest = await loadCacheManifest();
    const cacheEntry = manifest.audio[key];
    
    if (!cacheEntry) {
      return null;
    }
    
    // Check if the file actually exists
    const fileInfo = await FileSystem.getInfoAsync(cacheEntry.uri);
    if (!fileInfo.exists) {
      // Remove from manifest if file doesn't exist
      delete manifest.audio[key];
      await saveCacheManifest(manifest);
      return null;
    }
    
    return cacheEntry.uri;
  } catch (error) {
    console.error('Error getting cached audio file:', error);
    return null;
  }
};

// Get audio by conversation ID and message index
export const getCachedAudioByConversation = async (
  conversationId: string,
  messageIndex: number
): Promise<string | null> => {
  try {
    const manifest = await loadCacheManifest();
    
    // Find the audio entry for this conversation and message
    const audioKey = Object.keys(manifest.audio).find(key => {
      const entry = manifest.audio[key];
      return entry.conversationId === conversationId && 
             entry.messageIndex === messageIndex;
    });
    
    if (audioKey) {
      return await getCachedAudioFile(audioKey);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached audio by conversation:', error);
    return null;
  }
};

// Clear old cache entries (older than maxAge in milliseconds)
export const pruneCache = async (maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> => {
  try {
    const manifest = await loadCacheManifest();
    const now = Date.now();
    let modified = false;
    
    // Check each audio entry
    for (const key in manifest.audio) {
      const entry = manifest.audio[key];
      
      // Remove if older than maxAge
      if (now - entry.timestamp > maxAge) {
        try {
          await FileSystem.deleteAsync(entry.uri, { idempotent: true });
          delete manifest.audio[key];
          modified = true;
        } catch (error) {
          console.error(`Error deleting cached file: ${entry.uri}`, error);
        }
      }
    }
    
    // Save updated manifest if changes were made
    if (modified) {
      await saveCacheManifest(manifest);
    }
  } catch (error) {
    console.error('Error pruning cache:', error);
  }
};

// Clear the entire offline cache
export const clearOfflineCache = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(ASSETS_CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(ASSETS_CACHE_DIR, { idempotent: true });
      await ensureCacheDirectory(); // Recreate the empty directory
    }
    
    // Clear the manifest
    await AsyncStorage.removeItem(CACHE_MANIFEST_KEY);
  } catch (error) {
    console.error('Error clearing offline cache:', error);
  }
};

// Get cache stats
export const getCacheStats = async (): Promise<{
  audioCount: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
}> => {
  try {
    const manifest = await loadCacheManifest();
    const audioEntries = Object.values(manifest.audio);
    
    if (audioEntries.length === 0) {
      return {
        audioCount: 0,
        totalSize: 0,
        oldestEntry: 0,
        newestEntry: 0
      };
    }
    
    const timestamps = audioEntries.map(entry => entry.timestamp);
    
    return {
      audioCount: audioEntries.length,
      totalSize: audioEntries.reduce((total, entry) => total + (entry.size || 0), 0),
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps)
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      audioCount: 0,
      totalSize: 0,
      oldestEntry: 0,
      newestEntry: 0
    };
  }
};

export default {
  cacheAudioFile,
  getCachedAudioFile,
  getCachedAudioByConversation,
  pruneCache,
  clearOfflineCache,
  getCacheStats
};