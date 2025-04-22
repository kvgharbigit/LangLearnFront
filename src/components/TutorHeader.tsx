import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Animated,
  Easing,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

// Interface for language info
interface LanguageInfo {
  name: string;
  flag: string;
}

// Toggle Switch Component Props
interface ToggleSwitchProps {
  isOn: boolean;
  onToggle: () => void;
  label?: string;
  disabled?: boolean;
}

// Improved Toggle Switch Component
const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  isOn,
  onToggle,
  label = '',
  disabled = false
}) => {
  return (
    <View style={styles.toggleSwitchComponent}>
      {label ? <Text style={styles.toggleLabel}>{label}</Text> : null}
      <Switch
        value={isOn}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#c4c4c4', true: '#8c95ff' }}
        thumbColor={isOn ? '#5d6af8' : '#f4f3f4'}
        ios_backgroundColor="#c4c4c4"
      />
    </View>
  );
};

// Props for TutorHeader component
interface TutorHeaderProps {
  targetLanguage: string;
  targetInfo: LanguageInfo;
  tempo: number;
  setTempo: (tempo: number) => void;
  voiceInputEnabled: boolean;
  toggleVoiceInput: () => void;
  continuousConversation: boolean;
  setContinuousConversation: (enabled: boolean) => void;
  debugMode: boolean;
  setDebugMode: (enabled: boolean) => void;
  navigation: NativeStackNavigationProp<RootStackParamList, 'SpanishTutor'>;
}

const TutorHeader: React.FC<TutorHeaderProps> = ({
  targetLanguage,
  targetInfo,
  tempo,
  setTempo,
  voiceInputEnabled,
  toggleVoiceInput,
  continuousConversation,
  setContinuousConversation,
  debugMode,
  setDebugMode,
  navigation
}) => {
  const [showControls, setShowControls] = useState<boolean>(false);
  const [spinValue] = useState<Animated.Value>(new Animated.Value(0));

  // Animation for settings button
  const spin = (): void => {
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 800,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => {
      spinValue.setValue(0);
    });
  };

  // Map spin value to rotation
  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleSettingsPress = (): void => {
    spin();
    setShowControls(!showControls);
  };

  const handleBackPress = (): void => {
    navigation.goBack();
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.flag}>{targetInfo.flag}</Text>
          <Text style={styles.title}>{targetInfo.name} Tutor</Text>
        </View>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleSettingsPress}
        >
          <Animated.Text
            style={[styles.settingsIcon, { transform: [{ rotate }] }]}
          >
            ⚙️
          </Animated.Text>
        </TouchableOpacity>
      </View>

      {showControls && (
        <View style={styles.controlsPanel}>
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Speed:</Text>
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                value={tempo}
                onValueChange={setTempo}
                minimumValue={0.5}
                maximumValue={1.5}
                step={0.1}
                minimumTrackTintColor="#5d6af8"
                maximumTrackTintColor="#d3d3d3"
                thumbTintColor="#5d6af8"
              />
              <Text style={styles.sliderValue}>{tempo.toFixed(1)}x</Text>
            </View>
          </View>

          <View style={styles.controlGroup}>
            <ToggleSwitch
              isOn={voiceInputEnabled}
              onToggle={toggleVoiceInput}
              label="Voice"
            />
          </View>

          {voiceInputEnabled && (
            <View style={styles.controlGroup}>
              <ToggleSwitch
                isOn={continuousConversation}
                onToggle={() => setContinuousConversation(!continuousConversation)}
                label="Auto"
                disabled={!voiceInputEnabled}
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.debugButton,
              debugMode && styles.debugButtonActive
            ]}
            onPress={() => setDebugMode(!debugMode)}
          >
            <Text style={[
              styles.debugButtonText,
              debugMode && styles.debugButtonTextActive
            ]}>
              {debugMode ? 'Hide Debug' : 'Debug'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 20,
    color: '#6c757d',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5d6af8',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 20,
  },
  controlsPanel: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 14,
    color: '#495057',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    fontSize: 14,
    color: '#495057',
    width: 40,
    textAlign: 'right',
  },
  toggleSwitchComponent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#495057',
  },
  debugButton: {
    backgroundColor: '#e9ecef',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 4,
  },
  debugButtonActive: {
    backgroundColor: '#5d6af8',
  },
  debugButtonText: {
    color: '#495057',
    fontSize: 12,
    fontWeight: '500',
  },
  debugButtonTextActive: {
    color: 'white',
  },
});

export default TutorHeader;