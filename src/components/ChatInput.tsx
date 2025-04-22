import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  targetLanguage?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSubmit,
  disabled = false,
  targetLanguage = 'es'
}) => {
  const [message, setMessage] = useState<string>('');

  const handleSubmit = (): void => {
    if (!message.trim() || disabled) return;

    onSubmit(message);
    setMessage('');
  };

  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.textInput}
        value={message}
        onChangeText={setMessage}
        placeholder={targetLanguage === 'es' ? "Escribe tu mensaje aquí..." : "Type your message here..."}
        editable={!disabled}
        placeholderTextColor="#adb5bd"
        onSubmitEditing={handleSubmit}
        returnKeyType="send"
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          (disabled || !message.trim()) && styles.sendButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={disabled || !message.trim()}
      >
        <Text style={styles.sendButtonText}>
          {targetLanguage === 'es' ? 'Enviar' : 'Send'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#5d6af8',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ced4da',
    opacity: 0.7,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
});

export default ChatInput;