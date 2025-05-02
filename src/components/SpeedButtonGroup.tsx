// src/components/SpeedButtonGroup.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../styles/colors';

interface Props {
  tempo: number;
  setTempo: (tempo: number) => void;
}

// Speed options with their labels and values
const speedOptions = [
  { label: 'Slow', value: 0.5 },
  { label: 'Normal', value: 0.75 },
  { label: 'Fast', value: 1.0 },
  { label: 'Very Fast', value: 1.2 },
];

const SpeedButtonGroup: React.FC<Props> = ({ tempo, setTempo }) => {
  // Helper function to determine if this option is the active one
  const isActive = (value: number): boolean => {
    // Allow small tolerance for floating point comparison
    return Math.abs(tempo - value) < 0.05;
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonsRow}>
        {speedOptions.map((option) => (
          <TouchableOpacity
            key={option.label}
            style={[
              styles.speedButton,
              isActive(option.value) && styles.activeSpeedButton
            ]}
            onPress={() => setTempo(option.value)}
          >
            <Text
              style={[
                styles.speedButtonText,
                isActive(option.value) && styles.activeSpeedButtonText
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.percentageText}>
        {Math.round(tempo * 100)}% Speed
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    // Remove marginVertical to reduce the gap
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2, // Reduce from 4 to 2
  },
  speedButton: {
    backgroundColor: colors.gray100,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray300,
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  activeSpeedButton: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  speedButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray700,
  },
  activeSpeedButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  percentageText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 2, // Changed from marginTop: 2 to reduce gap
  }
});

export default SpeedButtonGroup;