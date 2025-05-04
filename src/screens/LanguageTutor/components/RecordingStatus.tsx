/**
 * RecordingStatus.tsx
 * 
 * Component that displays the current recording status (speech detected, 
 * silence detected, etc.) with appropriate styling and messaging.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../../styles/colors';

interface RecordingStatusProps {
  isRecording: boolean;
  isPreBuffering: boolean;
  hasSpeech: boolean;
  silenceDetected: boolean;
  autoSendEnabled: boolean;
  silenceCountdown: number | null;
}

/**
 * Component that shows the current status during recording
 */
const RecordingStatus: React.FC<RecordingStatusProps> = ({
  isRecording,
  isPreBuffering,
  hasSpeech,
  silenceDetected,
  autoSendEnabled,
  silenceCountdown
}) => {
  // Only show if recording or pre-buffering
  if (!isRecording && !isPreBuffering) {
    return null;
  }
  
  /**
   * Get the appropriate status style based on current state
   */
  const getStatusStyle = () => {
    const baseStyle = [styles.recordingStatus];
    
    if (silenceDetected) {
      baseStyle.push(styles.silenceStatus);
    } else if (hasSpeech) {
      baseStyle.push(styles.speechStatus);
    } else if (isPreBuffering) {
      baseStyle.push(styles.preBufferingStatus);
    } else {
      baseStyle.push(styles.waitingStatus);
    }
    
    return baseStyle;
  };
  
  /**
   * Render the appropriate status content based on current state
   */
  const renderStatusContent = () => {
    if (silenceDetected) {
      return (
        <>
          <Text style={styles.statusIcon}>🔇</Text>
          <Text style={styles.statusText}>
            {autoSendEnabled
              ? `Silence detected - will auto-submit ${silenceCountdown ? `in ${silenceCountdown}s` : 'shortly'}`
              : 'Silence detected - press Stop when finished'}
          </Text>
        </>
      );
    } else if (hasSpeech) {
      return (
        <>
          <Text style={styles.statusIcon}>🎤</Text>
          <Text style={styles.statusText}>Speech detected - recording...</Text>
        </>
      );
    } else if (isPreBuffering) {
      return (
        <>
          <Text style={styles.statusIcon}>👂</Text>
          <Text style={styles.statusText}>Listening for speech...</Text>
        </>
      );
    } else {
      return (
        <>
          <Text style={styles.statusIcon}>🎙️</Text>
          <Text style={styles.statusText}>Recording - waiting for speech...</Text>
        </>
      );
    }
  };
  
  return (
    <View style={getStatusStyle()}>
      {renderStatusContent()}
    </View>
  );
};

/**
 * Styles for the recording status indicators
 */
const styles = StyleSheet.create({
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
    borderWidth: 1,
    minWidth: 280,
  },
  waitingStatus: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray300,
  },
  speechStatus: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  silenceStatus: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  preBufferingStatus: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  statusIcon: {
    fontSize: 16,
  },
  statusText: {
    fontSize: 14,
  },
});

export default RecordingStatus;