// src/components/ReplayButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';

interface ReplayButtonProps {
  onPress: () => void;
  isPlaying: boolean;
  isMuted: boolean;
  disabled: boolean;
}

const ReplayButton: React.FC<ReplayButtonProps> = ({
  onPress,
  isPlaying,
  isMuted,
  disabled
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.replayButton,
        isPlaying && styles.playingButton,
        (disabled || isMuted) && styles.disabledButton
      ]}
      onPress={onPress}
      disabled={disabled || isMuted || isPlaying}
    >
      {isPlaying ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <>
          <Ionicons
            name="play-circle"
            size={18}
            color={disabled || isMuted ? colors.gray500 : 'white'}
          />
          <Text style={[
            styles.replayText,
            (disabled || isMuted) && styles.disabledText
          ]}>
            Replay Last Message
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
    gap: 8,
    marginBottom: 12,
  },
  playingButton: {
    backgroundColor: colors.gray600,
  },
  disabledButton: {
    backgroundColor: colors.gray300,
  },
  replayText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledText: {
    color: colors.gray500,
  }
});

export default ReplayButton;