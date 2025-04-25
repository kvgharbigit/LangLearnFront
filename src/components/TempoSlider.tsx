import React from 'react';
import { View, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import colors from '../styles/colors';

interface Props {
  tempo: number;
  setTempo: (tempo: number) => void;
}

const TempoSlider: React.FC<Props> = ({ tempo, setTempo }) => {
  return (
    <View style={styles.container}>
      <Slider
        style={styles.slider}
        minimumValue={0.5}
        maximumValue={1.0}
        step={0.05}
        value={tempo}
        onValueChange={setTempo}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.gray300}
        thumbTintColor={colors.primary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

export default TempoSlider;