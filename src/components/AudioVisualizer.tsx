import React from 'react';
import { View, StyleSheet } from 'react-native';

interface AudioVisualizerProps {
  audioSamples?: number[];
  speechThreshold: number;
  silenceThreshold: number;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioSamples = [],
  speechThreshold,
  silenceThreshold
}) => {
  // Generate an array of 50 bars if no samples are provided
  const samples = audioSamples.length === 0
    ? Array(50).fill(0)
    : audioSamples;

  return (
    <View style={styles.container}>
      {/* Threshold Lines */}
      <View
        style={[
          styles.thresholdLine,
          styles.speechLine,
          { bottom: `${speechThreshold * 100 / 120}%` }
        ]}
      />
      <View
        style={[
          styles.thresholdLine,
          styles.silenceLine,
          { bottom: `${silenceThreshold * 100 / 120}%` }
        ]}
      />

      {/* Audio Bars */}
      <View style={styles.barsContainer}>
        {samples.map((level, index) => {
          // Determine bar color based on audio level
          const barStyle = level > speechThreshold
            ? styles.speechBar
            : level > silenceThreshold
              ? styles.mediumBar
              : styles.lowBar;

          // Calculate height percentage based on audio level, max at 100%
          const heightPercent = Math.min(level * 100 / 120, 100);

          return (
            <View
              key={index}
              style={[
                styles.bar,
                barStyle,
                { height: `${heightPercent}%` }
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 80,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
    marginTop: 8,
  },
  thresholdLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1,
  },
  speechLine: {
    borderTopWidth: 2,
    borderTopColor: '#4caf50',
    borderStyle: 'dashed',
  },
  silenceLine: {
    borderTopWidth: 2,
    borderTopColor: '#ff9800',
    borderStyle: 'dashed',
  },
  barsContainer: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'flex-end',
    padding: 2,
    gap: 1,
  },
  bar: {
    flex: 1,
    minWidth: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  speechBar: {
    backgroundColor: '#4caf50',
  },
  mediumBar: {
    backgroundColor: '#ff9800',
  },
  lowBar: {
    backgroundColor: '#ced4da',
  },
});

export default AudioVisualizer;