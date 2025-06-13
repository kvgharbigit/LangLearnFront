import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import colors from '../styles/colors';

interface Props {
  tempo: number;
  setTempo: (tempo: number) => void;
}

const TempoSlider: React.FC<Props> = ({ tempo, setTempo }) => {
  // Helper function to get descriptive text based on tempo value
  const getTempoDescription = (value: number): string => {
    if (value <= 0.65) return 'Very Slow';
    if (value <= 0.8) return 'Slow';
    if (value <= 0.95) return 'Normal';
    if (value <= 1.05) return 'Fast';
    if (value <= 1.15) return 'Very Fast';
    return 'Super Fast';
  };

  return (
    <View style={styles.container}>
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0.6}
          maximumValue={1.2}
          step={0.05}
          value={tempo}
          onValueChange={(value) => {
            // Ensure value is at least 0.6
            const validValue = Math.max(0.6, value);
            setTempo(validValue);
          }}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.gray300}
          thumbTintColor={colors.primary}
        />
      </View>

      {/* Speed label indicators */}
      <View style={styles.labelsContainer}>
        <Text style={styles.speedLabel}>Slower</Text>
        <Text style={[styles.speedValue, { color: colors.primary }]}>
          {getTempoDescription(tempo)} ({Math.round(tempo * 100)}%)
        </Text>
        <Text style={styles.speedLabel}>Faster</Text>
      </View>

      {/* Speed ticks */}
      <View style={styles.ticksContainer}>
        <View style={styles.tick} />
        <View style={styles.tick} />
        <View style={styles.tick} />
        <View style={styles.tick} />
        <View style={styles.tick} />
        <View style={styles.tick} />
        <View style={styles.tick} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  sliderContainer: {
    width: '100%',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -8,
    paddingHorizontal: 8,
  },
  speedLabel: {
    fontSize: 12,
    color: colors.gray600,
    fontWeight: '500',
  },
  speedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  ticksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 4,
  },
  tick: {
    width: 1,
    height: 4,
    backgroundColor: colors.gray400,
  }
});

export default TempoSlider;