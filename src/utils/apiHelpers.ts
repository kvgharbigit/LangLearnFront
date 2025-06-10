import NetInfo from '@react-native-community/netinfo';

// Constants for API requests
export const REQUEST_TIMEOUT = 30000; // Increase back to 30 seconds for Whisper API
export const MAX_RETRIES = 3; // Increase back to 3 retries
export const BASE_DELAY = 2000; // Increase back to 2 seconds for more reliable backoff

// Helper function to implement timeout for fetch requests
export const fetchWithTimeout = async (url: string, options: RequestInit, timeout = REQUEST_TIMEOUT) => {
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Helper function to check network connectivity
export const checkNetworkConnectivity = async (): Promise<boolean> => {
  const networkState = await NetInfo.fetch();
  return networkState.isConnected === true && networkState.isInternetReachable !== false;
};

// Helper function with optional retries for non-voice APIs only
export const fetchWithRetry = async (
  url: string, 
  options: RequestInit, 
  retries = MAX_RETRIES,
  customTimeout?: number
) => {
  // Don't retry for voice API calls
  const isVoiceAPI = url.includes('/voice-input');
  if (isVoiceAPI) {
    // For voice API, just use a longer timeout but no retries
    const timeoutToUse = 60000; // 60s for voice API
    console.log(`Voice API request to ${url} - using ${timeoutToUse}ms timeout without retries`);
    return await fetchWithTimeout(url, options, timeoutToUse);
  }
  
  // Standard retry logic for non-voice APIs
  let attempt = 0;
  let lastError: Error | null = null;
  
  while (attempt < retries) {
    try {
      // Check connectivity before attempting fetch
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        throw new Error('No network connection');
      }
      
      // Use standard timeout for non-voice APIs
      const timeoutToUse = customTimeout || REQUEST_TIMEOUT;
      
      // Implement timeout to prevent hanging requests
      return await fetchWithTimeout(url, options, timeoutToUse);
    } catch (error: any) {
      lastError = error;
      attempt++;
      
      // Determine if it's a network error or server error
      const isNetworkError = 
        error.message === 'Network request failed' || 
        error.message === 'No network connection' ||
        !navigator.onLine;
      
      // Check if it's a timeout error (AbortError)
      const isTimeoutError = error.name === 'AbortError' || 
                           error.message === 'Network request timed out' ||
                           error.message?.includes('timeout');
      
      // For timeout errors, don't retry at all
      if (isTimeoutError) {
        console.log("🚫 Request timed out - stopping retry attempts");
        break;
      }
      
      // If it's the last attempt or not a network error, don't retry
      if (attempt >= retries || !isNetworkError) {
        break;
      }
      
      // Calculate exponential backoff delay with jitter
      const delay = BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`API retry attempt ${attempt} after ${delay}ms for ${url}`);
      
      // Wait for the backoff delay
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we've exhausted all retries, throw the last error
  throw lastError || new Error('Request failed after maximum retries');
};

// Helper to classify API errors for better user feedback
export const classifyApiError = (error: any): {
  type: 'network' | 'timeout' | 'server' | 'quota' | 'unknown',
  message: string
} => {
  if (!navigator.onLine || error.message === 'Network request failed' || error.message === 'No network connection') {
    return {
      type: 'network',
      message: 'No internet connection. Please check your network settings and try again.'
    };
  } else if (error.name === 'AbortError') {
    return {
      type: 'timeout',
      message: 'Request timed out. The server is taking too long to respond.'
    };
  } else if (error.status >= 500) {
    return {
      type: 'server',
      message: 'Server error. Please try again later.'
    };
  } else if (error.status === 403 || error.message.includes('quota')) {
    return {
      type: 'quota',
      message: 'Usage quota exceeded. Please upgrade your subscription to continue.'
    };
  } else {
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred. Please try again.'
    };
  }
};

// Parse error response to get detailed message
export const parseErrorResponse = async (response: Response): Promise<string> => {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      return errorData.detail || errorData.message || `Error: ${response.status} ${response.statusText}`;
    }
    return `Error: ${response.status} ${response.statusText}`;
  } catch (error) {
    return `Error: ${response.status} ${response.statusText}`;
  }
};