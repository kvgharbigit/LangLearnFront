// src/components/ChatInput.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
  Keyboard,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { getLanguageInfo } from '../constants/languages';
import LanguageKeyboardHelper from './LanguageKeyboardHelper';

interface Props {
  onSubmit: (message: string) => void;
  disabled: boolean;
  isPlaying: boolean;
  targetLanguage: string;
}

const ChatInput: React.FC<Props> = ({ onSubmit, disabled, isPlaying, targetLanguage }) => {
  const [message, setMessage] = useState<string>('');
  const [showSpecialChars, setShowSpecialChars] = useState<boolean>(false);
  const inputRef = useRef<TextInput>(null);
  const lastKeyPressTime = useRef<number>(0);
  const shiftKeyPressed = useRef<boolean>(false);
  
  // Force-clear input field on submit
  const clearInputField = () => {
    // Clear React state
    setMessage('');
    
    // Directly manipulate the native component if possible
    if (inputRef.current) {
      // Using various methods to ensure clearing works across platforms
      inputRef.current.clear?.();
      inputRef.current.setNativeProps?.({ text: '' });
      
      // For Android/iOS specific issues
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.clear?.();
          // Another attempt with a delay
          inputRef.current.setNativeProps?.({ text: '' });
        }
      }, 50);
    }
  };
  
  // This effect ensures the input field is properly cleared when needed
  useEffect(() => {
    if (message === '' && inputRef.current) {
      // Double check that the input is really cleared
      inputRef.current.clear?.();
      inputRef.current.setNativeProps?.({ text: '' });
    }
  }, [message]);

  const handleSubmit = () => {
    // Check if audio is playing - show alert if it is
    if (isPlaying) {
      Keyboard.dismiss();
      // Show a toast or alert to inform the user
      Alert.alert(
        "Audio is playing",
        "Please wait for the audio to finish before sending a message.",
        [{ text: "OK" }]
      );
      return;
    }

    // Check if message is empty or only whitespace
    if (!message.trim()) {
      return;
    }

    // Store the message in a local variable
    const messageToSubmit = message;
    
    // Clear the input field immediately and thoroughly
    clearInputField();

    // Then submit the message
    onSubmit(messageToSubmit);
    
    // Blur the input to hide keyboard on iOS
    if (Platform.OS === 'ios') {
      inputRef.current?.blur();
    } else {
      // On Android, dismiss the keyboard
      Keyboard.dismiss();
    }
  };
  
  // Enhanced text change handler to detect Enter key press
  const handleTextChange = (text: string) => {
    // Detect if Enter was just pressed (message ends with newline)
    const endsWithNewline = 
      text.endsWith('\n') && 
      !message.endsWith('\n') &&
      text.length === message.length + 1;
      
    // Check if it's a very recent keystroke to prevent duplicate submits
    const now = Date.now();
    const isRecentKeystroke = now - lastKeyPressTime.current < 300;
    lastKeyPressTime.current = now;
    
    if (endsWithNewline && !isRecentKeystroke && !shiftKeyPressed.current) {
      // Remove the newline character
      const textWithoutNewline = text.slice(0, -1);
      
      // If valid message, submit it and clear immediately
      if (textWithoutNewline.trim() && !disabled && !isPlaying) {
        console.log('Enter key detected, clearing input and submitting message');
        
        // Store message to submit
        const messageToSend = textWithoutNewline;
        
        // Clear the input field immediately
        setMessage('');
        
        // Process the message
        requestAnimationFrame(() => {
          onSubmit(messageToSend);
        });
        
        // Return early to prevent further processing
        return;
      } else {
        // Set the message without the newline if not submitting
        setMessage(textWithoutNewline);
      }
    } else {
      // Normal text change
      setMessage(text);
    }
  };

  // Handle inserting special characters
  const handleCharSelect = (char: string) => {
    setMessage((prevMessage) => prevMessage + char);
    // Focus the input after inserting character
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Toggle special characters keyboard
  const toggleSpecialChars = () => {
    setShowSpecialChars(!showSpecialChars);
  };

  // Get language name from language code
  const getPlaceholderText = () => {
    const languageInfo = getLanguageInfo(targetLanguage);
    return `Type in ${languageInfo.name}...`;
  };

  // Check if language needs special character support
  const hasSpecialChars = targetLanguage !== 'en';

  return (
    <View>
      {showSpecialChars && hasSpecialChars && (
        <LanguageKeyboardHelper
          language={targetLanguage}
          onCharSelect={handleCharSelect}
        />
      )}

      <View style={styles.container}>
        {hasSpecialChars && (
          <TouchableOpacity
            style={[
              styles.charButton,
              showSpecialChars && styles.activeCharButton
            ]}
            onPress={toggleSpecialChars}
          >
            <Text style={styles.charButtonText}>Å</Text>
          </TouchableOpacity>
        )}

        <TextInput
          ref={inputRef}
          style={[styles.input, !hasSpecialChars && styles.inputWithoutCharButton]}
          value={message}
          onChangeText={handleTextChange}
          placeholder={getPlaceholderText()}
          placeholderTextColor={colors.gray500}
          returnKeyType="send"
          onSubmitEditing={() => {
            console.log('onSubmitEditing triggered');
            if (message.trim() && !disabled && !isPlaying) {
              const messageToSend = message.trim();
              // Clear the input immediately and thoroughly
              clearInputField();
              // Submit the message
              requestAnimationFrame(() => {
                onSubmit(messageToSend);
              });
            }
          }}
          editable={!disabled} // User can still type when audio is playing, but can't when processing
          multiline
          blurOnSubmit={false}
          // Track key down events for shift key detection
          onKeyDown={(e) => {
            if (e.nativeEvent.key === 'Shift') {
              shiftKeyPressed.current = true;
            }
          }}
          // Track key up events to detect when shift is released
          onKeyUp={(e) => {
            if (e.nativeEvent.key === 'Shift') {
              shiftKeyPressed.current = false;
            }
          }}
          // This handler for all environments
          onKeyPress={(e) => {
            // Check for Enter key
            if (e.nativeEvent.key === 'Enter') {
              console.log('Enter key pressed in onKeyPress');
              
              // Check if shift key is pressed (for new line)
              const isShiftPressed = e.nativeEvent.shiftKey || shiftKeyPressed.current;
              
              // If not pressing shift and not disabled/playing, submit
              if (!isShiftPressed && !disabled && !isPlaying && message.trim()) {
                console.log('Processing Enter key submission');
                
                // Prevent default behavior
                e.preventDefault?.(); // Prevent default behavior if supported
                
                // Store message to submit
                const textToSubmit = message.trim();
                
                // Clear input immediately and thoroughly
                requestAnimationFrame(() => {
                  clearInputField();
                });
                
                // Submit the stored message with slight delay
                setTimeout(() => {
                  onSubmit(textToSubmit);
                }, 20);
              }
            }
          }}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!message.trim() || disabled || isPlaying) && styles.disabledButton
          ]}
          onPress={handleSubmit}
          disabled={!message.trim() || disabled || isPlaying} // Disable button when audio is playing
        >
          {isPlaying ? (
            <Text style={styles.sendButtonIcon}>🔊</Text> // Show audio icon when playing
          ) : (
            <Ionicons name="send" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 16,
    maxHeight: 100,
    color: colors.gray800,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  inputWithoutCharButton: {
    marginLeft: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: colors.gray400,
    opacity: 0.7,
  },
  sendButtonIcon: {
    fontSize: 16,
  },
  charButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activeCharButton: {
    backgroundColor: colors.primary,
  },
  charButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  }
});

export default ChatInput;