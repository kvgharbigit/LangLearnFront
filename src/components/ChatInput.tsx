// This is the updated ChatInput component with isPlaying prop added
// src/components/ChatInput.tsx

import React, { useState, useRef } from 'react';
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

interface Props {
  onSubmit: (message: string) => void;
  disabled: boolean;
  isPlaying: boolean; // Add isPlaying prop
  targetLanguage: string;
}

const ChatInput: React.FC<Props> = ({ onSubmit, disabled, isPlaying, targetLanguage }) => {
  const [message, setMessage] = useState<string>('');
  const inputRef = useRef<TextInput>(null);

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

    onSubmit(message);
    setMessage('');
    // Blur the input to hide keyboard on iOS
    if (Platform.OS === 'ios') {
      inputRef.current?.blur();
    } else {
      // On Android, dismiss the keyboard
      Keyboard.dismiss();
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder={`Type in ${targetLanguage === 'es' ? 'Spanish' : 
                     targetLanguage === 'fr' ? 'French' : 
                     targetLanguage === 'it' ? 'Italian' : 'English'}...`}
        placeholderTextColor={colors.gray500}
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
        editable={!disabled} // User can still type when audio is playing, but can't when processing
        multiline
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
  }
});

export default ChatInput;