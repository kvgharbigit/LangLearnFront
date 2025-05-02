// src/components/TutorHeader.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  ScrollView,
  Platform,
  Pressable,
  Animated,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import colors from '../styles/colors';
import { AUDIO_SETTINGS } from '../constants/settings';
import MicrophoneTest from './MicrophoneTest';
import { getLanguageInfo } from '../constants/languages';
import {
  saveAudioSettings,
  saveUISettings,
  AudioSettings,
  UISettings,
  saveSingleAudioSetting
} from '../utils/userPreferences';

interface Props {
  targetLanguage: string;
  nativeLanguage: string;
  targetInfo: {
    name: string;
    flag: string;
  };
  tempo: number;
  setTempo: (tempo: number) => void;
  voiceInputEnabled: boolean;
  toggleVoiceInput: () => void;
  autoSendEnabled: boolean;
  setAutoSendEnabled: (enabled: boolean) => void;
  autoRecordEnabled: boolean;
  setAutoRecordEnabled: (enabled: boolean) => void;
  debugMode: boolean;
  setDebugMode: (enabled: boolean) => void;
  // Props for audio thresholds and duration
  speechThreshold: number;
  setSpeechThreshold: (value: number) => void;
  silenceThreshold: number;
  setSilenceThreshold: (value: number) => void;
  silenceDuration: number;
  setSilenceDuration: (value: number) => void;
  // Prop for mute functionality
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  navigation: any;
}

const TutorHeader: React.FC<Props> = ({
  targetLanguage,
  nativeLanguage,
  targetInfo,
  tempo,
  setTempo,
  voiceInputEnabled,
  toggleVoiceInput,
  autoSendEnabled,
  setAutoSendEnabled,
  autoRecordEnabled,
  setAutoRecordEnabled,
  debugMode,
  setDebugMode,
  // New props
  speechThreshold,
  setSpeechThreshold,
  silenceThreshold,
  setSilenceThreshold,
  silenceDuration,
  setSilenceDuration,
  // New mute props
  isMuted,
  setIsMuted,
  navigation,
}) => {
  // State
  const [settingsModalVisible, setSettingsModalVisible] = useState<boolean>(false);
  const [helpModalVisible, setHelpModalVisible] = useState<boolean>(false);
  const [audioInfoVisible, setAudioInfoVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'audio' | 'advanced' | 'language'>('audio');
  const [showMicTest, setShowMicTest] = useState<boolean>(false);
  const [settingsChanged, setSettingsChanged] = useState<boolean>(false);

  // State for text input values
  const [speechThresholdText, setSpeechThresholdText] = useState<string>(speechThreshold.toString());
  const [silenceThresholdText, setSilenceThresholdText] = useState<string>(silenceThreshold.toString());
  const [silenceDurationText, setSilenceDurationText] = useState<string>(silenceDuration.toString());

  // Animation
  const [animation] = useState(new Animated.Value(0));

  // Update text input values when props change
  useEffect(() => {
    setSpeechThresholdText(speechThreshold.toString());
    setSilenceThresholdText(silenceThreshold.toString());
    setSilenceDurationText(silenceDuration.toString());
  }, [speechThreshold, silenceThreshold, silenceDuration, settingsModalVisible]);

  // Save settings when they change and modal is closed
  useEffect(() => {
    if (!settingsModalVisible && settingsChanged) {
      saveSettings();
      setSettingsChanged(false);
    }
  }, [settingsModalVisible]);

  // Function to save all settings to persistent storage
  const saveSettings = async () => {
    try {
      // Save audio settings
      await saveAudioSettings({
        speechThreshold,
        silenceThreshold,
        silenceDuration,
        tempo,
        isMuted
      });

      // Save UI settings
      await saveUISettings({
        voiceInputEnabled,
        autoSendEnabled,
        autoRecordEnabled,
        debugMode
      });

      console.log("All settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  // Save specific setting when it changes
  const saveSettingChange = (settingKey: string, value: any) => {
    saveSingleAudioSetting(settingKey as any, value);
    setSettingsChanged(true);
  };

  // Toggle functions
  const toggleSettingsModal = () => {
    if (settingsModalVisible && settingsChanged) {
      saveSettings();
      setSettingsChanged(false);
    }
    setSettingsModalVisible(!settingsModalVisible);
  };

  const toggleHelpModal = () => {
    setHelpModalVisible(!helpModalVisible);
  };

  const toggleAudioInfo = () => {
    if (audioInfoVisible) {
      // Animate out
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setAudioInfoVisible(false);
      });
    } else {
      setAudioInfoVisible(true);
      // Animate in
      Animated.timing(animation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  // Toggle microphone test section
  const toggleMicTest = () => {
    setShowMicTest(!showMicTest);
  };

  // Toggle mute function
  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    // Save this setting immediately
    saveSettingChange('IS_MUTED', newMuteState);
  };

  const goBack = () => {
    // Save settings before navigating away
    saveSettings();
    navigation.goBack();
  };

  // Helper function to ensure numbers are within valid ranges
  const updateSpeechThreshold = (value: string) => {
    setSpeechThresholdText(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      // Ensure speech threshold is always >= silence threshold
      const newValue = Math.max(numValue, silenceThreshold);
      setSpeechThreshold(newValue);
      saveSettingChange('SPEECH_THRESHOLD', newValue);
    }
  };

  const updateSilenceThreshold = (value: string) => {
    setSilenceThresholdText(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      // Ensure silence threshold is always <= speech threshold
      const newValue = Math.min(numValue, speechThreshold);
      setSilenceThreshold(newValue);
      saveSettingChange('SILENCE_THRESHOLD', newValue);
    }
  };

  const updateSilenceDuration = (value: string) => {
    setSilenceDurationText(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 500 && numValue <= 5000) {
      setSilenceDuration(numValue);
      saveSettingChange('SILENCE_DURATION', numValue);
    }
  };

  // Update tempo and save it
  const handleTempoChange = (newTempo: number) => {
    setTempo(newTempo);
    saveSettingChange('TEMPO', newTempo);
  };

  // Increment/Decrement functions
  const incrementSpeechThreshold = () => {
    if (speechThreshold < 100) {
      const newValue = speechThreshold + 1;
      setSpeechThreshold(newValue);
      setSpeechThresholdText(newValue.toString());
      saveSettingChange('SPEECH_THRESHOLD', newValue);
    }
  };

  const decrementSpeechThreshold = () => {
    if (speechThreshold > silenceThreshold) {
      const newValue = speechThreshold - 1;
      setSpeechThreshold(newValue);
      setSpeechThresholdText(newValue.toString());
      saveSettingChange('SPEECH_THRESHOLD', newValue);
    }
  };

  const incrementSilenceThreshold = () => {
    if (silenceThreshold < speechThreshold) {
      const newValue = silenceThreshold + 1;
      setSilenceThreshold(newValue);
      setSilenceThresholdText(newValue.toString());
      saveSettingChange('SILENCE_THRESHOLD', newValue);
    }
  };

  const decrementSilenceThreshold = () => {
    if (silenceThreshold > 0) {
      const newValue = silenceThreshold - 1;
      setSilenceThreshold(newValue);
      setSilenceThresholdText(newValue.toString());
      saveSettingChange('SILENCE_THRESHOLD', newValue);
    }
  };

  const incrementSilenceDuration = () => {
    if (silenceDuration < 5000) {
      const newValue = silenceDuration + 100;
      setSilenceDuration(newValue);
      setSilenceDurationText(newValue.toString());
      saveSettingChange('SILENCE_DURATION', newValue);
    }
  };

  const decrementSilenceDuration = () => {
    if (silenceDuration > 500) {
      const newValue = silenceDuration - 100;
      setSilenceDuration(newValue);
      setSilenceDurationText(newValue.toString());
      saveSettingChange('SILENCE_DURATION', newValue);
    }
  };

  // Handle onBlur to validate and update with correct values
  const handleSpeechThresholdBlur = () => {
    const numValue = parseInt(speechThresholdText);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      setSpeechThresholdText(speechThreshold.toString());
    } else {
      const validValue = Math.max(numValue, silenceThreshold);
      setSpeechThreshold(validValue);
      setSpeechThresholdText(validValue.toString());
      saveSettingChange('SPEECH_THRESHOLD', validValue);
    }
  };

  const handleSilenceThresholdBlur = () => {
    const numValue = parseInt(silenceThresholdText);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      setSilenceThresholdText(silenceThreshold.toString());
    } else {
      const validValue = Math.min(numValue, speechThreshold);
      setSilenceThreshold(validValue);
      setSilenceThresholdText(validValue.toString());
      saveSettingChange('SILENCE_THRESHOLD', validValue);
    }
  };

  const handleSilenceDurationBlur = () => {
    const numValue = parseInt(silenceDurationText);
    if (isNaN(numValue) || numValue < 500 || numValue > 5000) {
      setSilenceDurationText(silenceDuration.toString());
    } else {
      setSilenceDuration(numValue);
      saveSettingChange('SILENCE_DURATION', numValue);
    }
  };

  // UI toggle handlers with saved preferences
  const handleVoiceInputToggle = () => {
    const newValue = !voiceInputEnabled;
    toggleVoiceInput();
    saveSettingChange('VOICE_INPUT_ENABLED', newValue);
  };

  const handleAutoSendToggle = (value: boolean) => {
    setAutoSendEnabled(value);
    saveSettingChange('AUTO_SEND_ENABLED', value);
  };

  const handleAutoRecordToggle = (value: boolean) => {
    setAutoRecordEnabled(value);
    saveSettingChange('AUTO_RECORD_ENABLED', value);
  };

  const handleDebugModeToggle = (value: boolean) => {
    setDebugMode(value);
    saveSettingChange('DEBUG_MODE', value);
  };

  // Handle reset to defaults
  const resetToDefaults = () => {
    // Platform-specific default values
    const platformDefaults = Platform.OS === 'ios'
      ? { speech: 78, silence: 75, duration: 1500 }
      : { speech: 45, silence: 43, duration: 1500 };

    setSpeechThreshold(platformDefaults.speech);
    setSpeechThresholdText(platformDefaults.speech.toString());
    setSilenceThreshold(platformDefaults.silence);
    setSilenceThresholdText(platformDefaults.silence.toString());
    setSilenceDuration(platformDefaults.duration);
    setSilenceDurationText(platformDefaults.duration.toString());

    // Save the default values
    saveAudioSettings({
      speechThreshold: platformDefaults.speech,
      silenceThreshold: platformDefaults.silence,
      silenceDuration: platformDefaults.duration,
      tempo: 0.9, // Default tempo (90%)
      isMuted: false
    });
  };

  // Helper function to get descriptive text based on tempo value
  const getTempoDescription = (value: number): string => {
    if (value <= 0.65) return 'Slow';
    if (value <= 0.9) return 'Normal';
    if (value <= 1.0) return 'Fast';
    return 'Very Fast';
  };

  return (
  <View style={styles.container}>
    {/* Header Bar */}
    <View style={styles.headerBar}>
      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Ionicons name="chevron-back" size={22} color={colors.gray700} />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text style={styles.flagIcon}>{targetInfo.flag}</Text>
        <Text style={styles.titleText}>{targetInfo.name} Tutor</Text>
      </View>

      {/* Mute button */}
      <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
        <Ionicons
          name={isMuted ? "volume-mute" : "volume-medium"}
          size={22}
          color={isMuted ? colors.danger : colors.gray700}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingsButton} onPress={toggleSettingsModal}>
        <Ionicons name="settings-outline" size={22} color={colors.gray700} />
      </TouchableOpacity>
    </View>

    {/* Settings Modal */}
    <Modal
      animationType="slide"
      transparent={true}
      visible={settingsModalVisible}
      onRequestClose={toggleSettingsModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Settings</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={toggleSettingsModal}
            >
              <Ionicons name="close" size={24} color={colors.gray700} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'audio' && styles.activeTab]}
              onPress={() => setActiveTab('audio')}
            >
              <Ionicons
                name="volume-medium"
                size={18}
                color={activeTab === 'audio' ? colors.primary : colors.gray600}
              />
              <Text style={[
                styles.tabText,
                activeTab === 'audio' && styles.activeTabText
              ]}>
                Audio
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'advanced' && styles.activeTab]}
              onPress={() => setActiveTab('advanced')}
            >
              <Ionicons
                name="options"
                size={18}
                color={activeTab === 'advanced' ? colors.primary : colors.gray600}
              />
              <Text style={[
                styles.tabText,
                activeTab === 'advanced' && styles.activeTabText
              ]}>
                Advanced
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <ScrollView style={styles.tabContent}>
            {activeTab === 'audio' ? (
              <>
                {/* Mute Toggle */}
                <View style={styles.switchSetting}>
                  <View style={styles.switchTextContainer}>
                    <View style={[
                      styles.settingIconContainer,
                      isMuted ? styles.mutedIconContainer : null
                    ]}>
                      <Ionicons
                        name={isMuted ? "volume-mute" : "volume-medium"}
                        size={16}
                        color={isMuted ? "#F44336" : colors.primary}
                      />
                    </View>
                    <View>
                      <Text style={styles.switchLabel}>Mute Audio</Text>
                      <Text style={styles.switchDescription}>
                        Disable AI voice responses
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isMuted}
                    onValueChange={toggleMute}
                    trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                    thumbColor={isMuted ? colors.danger : colors.primary}
                    ios_backgroundColor={colors.gray300}
                  />
                </View>

                {/* Voice Speed - make this disabled if muted */}
                <View style={[
                  styles.settingBlock,
                  isMuted && styles.disabledSettingBlock
                ]}>
                  <View style={styles.settingHeader}>
                    <View style={styles.settingIconContainer}>
                      <Ionicons name="speedometer" size={16} color={isMuted ? colors.gray400 : colors.primary} />
                    </View>
                    <Text style={[
                      styles.settingTitle,
                      isMuted && styles.disabledText
                    ]}>Voice Speed</Text>
                    <Text style={[
                      styles.speedValue,
                      isMuted && styles.disabledSpeedValue
                    ]}>{getTempoDescription(tempo)} ({Math.round(tempo * 100)}%)</Text>
                  </View>

                  {/* Speed slider */}
                  <View style={styles.sliderContainer}>
                    <Slider
                      style={styles.slider}
                      minimumValue={0.6}  // 60%
                      maximumValue={1.2}  // 120%
                      step={0.05}
                      value={tempo}
                      onValueChange={handleTempoChange}
                      minimumTrackTintColor={isMuted ? colors.gray400 : colors.primary}
                      maximumTrackTintColor={colors.gray300}
                      thumbTintColor={isMuted ? colors.gray400 : colors.primary}
                      disabled={isMuted}
                    />
                    
                    {/* Speed labels */}
                    <View style={styles.speedLabels}>
                      <Text style={[styles.speedLabel, isMuted && styles.disabledText]}>60%</Text>
                      <Text style={[styles.speedLabel, isMuted && styles.disabledText]}>90%</Text>
                      <Text style={[styles.speedLabel, isMuted && styles.disabledText]}>120%</Text>
                    </View>
                  </View>
                </View>

                {/* Audio Parameters Section */}
                <View style={styles.settingBlock}>
                  <View style={styles.settingHeader}>
                    <View style={styles.settingIconContainer}>
                      <Ionicons name="mic-outline" size={16} color={colors.primary} />
                    </View>
                    <Text style={styles.settingTitle}>Voice Recognition Parameters</Text>
                  </View>

                  <View style={styles.audioParamContainer}>
                    <Text style={styles.audioParamLabel}>Speech Threshold</Text>
                    <Text style={styles.audioParamHint}>
                      Audio level that indicates speech (0-100)
                    </Text>
                    <View style={styles.numericInputContainer}>
                      <TouchableOpacity
                        style={styles.numericButton}
                        onPress={decrementSpeechThreshold}
                        disabled={speechThreshold <= silenceThreshold}
                      >
                        <Ionicons
                          name="remove"
                          size={20}
                          color={speechThreshold <= silenceThreshold ? colors.gray400 : colors.gray700}
                        />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.numericInput}
                        value={speechThresholdText}
                        onChangeText={updateSpeechThreshold}
                        onBlur={handleSpeechThresholdBlur}
                        keyboardType="number-pad"
                        maxLength={3}
                        selectTextOnFocus
                      />
                      <TouchableOpacity
                        style={styles.numericButton}
                        onPress={incrementSpeechThreshold}
                        disabled={speechThreshold >= 100}
                      >
                        <Ionicons
                          name="add"
                          size={20}
                          color={speechThreshold >= 100 ? colors.gray400 : colors.gray700}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.audioParamContainer}>
                    <Text style={styles.audioParamLabel}>Silence Threshold</Text>
                    <Text style={styles.audioParamHint}>
                      Audio level that indicates silence (0-100)
                    </Text>
                    <View style={styles.numericInputContainer}>
                      <TouchableOpacity
                        style={styles.numericButton}
                        onPress={decrementSilenceThreshold}
                        disabled={silenceThreshold <= 0}
                      >
                        <Ionicons
                          name="remove"
                          size={20}
                          color={silenceThreshold <= 0 ? colors.gray400 : colors.gray700}
                        />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.numericInput}
                        value={silenceThresholdText}
                        onChangeText={updateSilenceThreshold}
                        onBlur={handleSilenceThresholdBlur}
                        keyboardType="number-pad"
                        maxLength={3}
                        selectTextOnFocus
                      />
                      <TouchableOpacity
                        style={styles.numericButton}
                        onPress={incrementSilenceThreshold}
                        disabled={silenceThreshold >= speechThreshold}
                      >
                        <Ionicons
                          name="add"
                          size={20}
                          color={silenceThreshold >= speechThreshold ? colors.gray400 : colors.gray700}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.audioParamContainer}>
                    <Text style={styles.audioParamLabel}>Auto-Send Duration</Text>
                    <Text style={styles.audioParamHint}>
                      Silence time before auto-send (500-5000ms)
                    </Text>
                    <View style={styles.numericInputContainer}>
                      <TouchableOpacity
                        style={styles.numericButton}
                        onPress={decrementSilenceDuration}
                        disabled={silenceDuration <= 500}
                      >
                        <Ionicons
                          name="remove"
                          size={20}
                          color={silenceDuration <= 500 ? colors.gray400 : colors.gray700}
                        />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.numericInput}
                        value={silenceDurationText}
                        onChangeText={updateSilenceDuration}
                        onBlur={handleSilenceDurationBlur}
                        keyboardType="number-pad"
                        maxLength={4}
                        selectTextOnFocus
                      />
                      <TouchableOpacity
                        style={styles.numericButton}
                        onPress={incrementSilenceDuration}
                        disabled={silenceDuration >= 5000}
                      >
                        <Ionicons
                          name="add"
                          size={20}
                          color={silenceDuration >= 5000 ? colors.gray400 : colors.gray700}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.thresholdVisualizer}>
                    <Text style={styles.visualizerLabel}>Visual Reference:</Text>
                    <View style={styles.visualizerBar}>
                      <View style={[styles.silenceZone, { width: `${silenceThreshold}%` }]} />
                      <View style={[styles.middleZone, { width: `${speechThreshold - silenceThreshold}%` }]} />
                      <View style={[styles.speechZone, { width: `${100 - speechThreshold}%` }]} />
                    </View>
                    <View style={styles.visualizerLabels}>
                      <Text style={styles.visualizerLabelText}>Silence</Text>
                      <Text style={styles.visualizerLabelText}>Medium</Text>
                      <Text style={styles.visualizerLabelText}>Speech</Text>
                    </View>
                  </View>

                  {/* Microphone test toggle button */}
                  <TouchableOpacity
                    style={styles.testToggleButton}
                    onPress={toggleMicTest}
                  >
                    <Ionicons name={showMicTest ? "chevron-up" : "mic-circle"} size={18} color="white" />
                    <Text style={styles.testToggleText}>
                      {showMicTest ? "Hide Microphone Test" : "Test Your Microphone"}
                    </Text>
                  </TouchableOpacity>

                  {/* Microphone test section */}
                  {showMicTest && (
                    <MicrophoneTest
                      speechThreshold={speechThreshold}
                      silenceThreshold={silenceThreshold}
                    />
                  )}

                  {/* Reset Button */}
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={resetToDefaults}
                  >
                    <Ionicons name="refresh" size={16} color="white" />
                    <Text style={styles.resetButtonText}>Reset to Defaults</Text>
                  </TouchableOpacity>
                </View>

                {/* Audio Thresholds Toggle */}
                <TouchableOpacity
                  style={styles.infoToggle}
                  onPress={toggleAudioInfo}
                >
                  <Ionicons
                    name={audioInfoVisible ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.infoToggleText}>
                    {audioInfoVisible ? "Hide Platform Details" : "Show Platform Details"}
                  </Text>
                </TouchableOpacity>

                {/* Audio Thresholds Panel - Animated */}
                {audioInfoVisible && (
                  <Animated.View
                    style={[
                      styles.thresholdsPanel,
                      { opacity: animation }
                    ]}
                  >
                    <View style={styles.platformBadge}>
                      <Text style={styles.platformBadgeText}>
                        {Platform.OS === 'ios' ? 'iOS' : 'Android'} Default Settings
                      </Text>
                    </View>

                    <View style={styles.thresholdRow}>
                      <Text style={styles.thresholdLabel}>Speech Threshold:</Text>
                      <Text style={styles.thresholdValue}>{AUDIO_SETTINGS.SPEECH_THRESHOLD}</Text>
                    </View>

                    <View style={styles.thresholdRow}>
                      <Text style={styles.thresholdLabel}>Silence Threshold:</Text>
                      <Text style={styles.thresholdValue}>{AUDIO_SETTINGS.SILENCE_THRESHOLD}</Text>
                    </View>

                    <View style={styles.thresholdRow}>
                      <Text style={styles.thresholdLabel}>Silence Duration:</Text>
                      <Text style={styles.thresholdValue}>{AUDIO_SETTINGS.SILENCE_DURATION}ms</Text>
                    </View>

                    <Text style={styles.thresholdDescription}>
                      These are the default threshold values for your device. You can customize them
                      above to optimize voice recognition for your speaking environment.
                    </Text>
                  </Animated.View>
                )}
              </>
            ) : (
              <>
                {/* Debug Mode */}
                <View style={styles.switchSetting}>
                  <View style={styles.switchTextContainer}>
                    <View style={styles.settingIconContainer}>
                      <Ionicons name="bug" size={16} color="#FF9800" />
                    </View>
                    <View>
                      <Text style={styles.switchLabel}>Debug Mode</Text>
                      <Text style={styles.switchDescription}>
                        Show detailed audio metrics for debugging
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={debugMode}
                    onValueChange={handleDebugModeToggle}
                    trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                    thumbColor={debugMode ? colors.primary : colors.gray100}
                    ios_backgroundColor={colors.gray300}
                  />
                </View>

                {/* Voice Input Toggle */}
                <View style={styles.switchSetting}>
                  <View style={styles.switchTextContainer}>
                    <View style={styles.settingIconContainer}>
                      <Ionicons name="mic-circle" size={16} color="#9C27B0" />
                    </View>
                    <View>
                      <Text style={styles.switchLabel}>Voice Input</Text>
                      <Text style={styles.switchDescription}>
                        Toggle between voice and text input
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={voiceInputEnabled}
                    onValueChange={handleVoiceInputToggle}
                    trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                    thumbColor={voiceInputEnabled ? colors.primary : colors.gray100}
                    ios_backgroundColor={colors.gray300}
                  />
                </View>

                {/* Auto-send Toggle - Now disabled if voice input is off */}
                <View style={[
                  styles.switchSetting,
                  !voiceInputEnabled && styles.disabledSetting
                ]}>
                  <View style={styles.switchTextContainer}>
                    <View style={[
                      styles.settingIconContainer,
                      !voiceInputEnabled && styles.disabledIcon
                    ]}>
                      <Ionicons
                        name="send"
                        size={16}
                        color={voiceInputEnabled ? "#4CAF50" : colors.gray400}
                      />
                    </View>
                    <View>
                      <Text style={[
                        styles.switchLabel,
                        !voiceInputEnabled && styles.disabledText
                      ]}>Auto-send Recording</Text>
                      <Text style={[
                        styles.switchDescription,
                        !voiceInputEnabled && styles.disabledText
                      ]}>
                        Automatically send when silence is detected
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={voiceInputEnabled && autoSendEnabled}
                    onValueChange={handleAutoSendToggle}
                    trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                    thumbColor={(voiceInputEnabled && autoSendEnabled) ? colors.primary : colors.gray100}
                    ios_backgroundColor={colors.gray300}
                    disabled={!voiceInputEnabled}
                  />
                </View>

                {/* Auto-record Toggle - Now disabled if voice input is off */}
                <View style={[
                  styles.switchSetting,
                  !voiceInputEnabled && styles.disabledSetting
                ]}>
                  <View style={styles.switchTextContainer}>
                    <View style={[
                      styles.settingIconContainer,
                      !voiceInputEnabled && styles.disabledIcon
                    ]}>
                      <Ionicons
                        name="mic"
                        size={16}
                        color={voiceInputEnabled ? "#2196F3" : colors.gray400}
                      />
                    </View>
                    <View>
                      <Text style={[
                        styles.switchLabel,
                        !voiceInputEnabled && styles.disabledText
                      ]}>Auto-record</Text>
                      <Text style={[
                        styles.switchDescription,
                        !voiceInputEnabled && styles.disabledText
                      ]}>
                        Start recording after AI response finishes
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={voiceInputEnabled && autoRecordEnabled}
                    onValueChange={handleAutoRecordToggle}
                    trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                    thumbColor={(voiceInputEnabled && autoRecordEnabled) ? colors.primary : colors.gray100}
                    ios_backgroundColor={colors.gray300}
                    disabled={!voiceInputEnabled}
                  />
                </View>


              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* Help Modal */}
    <Modal
      animationType="slide"
      transparent={true}
      visible={helpModalVisible}
      onRequestClose={() => setHelpModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Voice Recording Tips</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setHelpModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.gray700} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.helpContent}>
            <View style={styles.helpSection}>
              <View style={styles.helpSectionHeader}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={styles.helpSectionTitle}>Best Practices</Text>
              </View>
              <View style={styles.helpItemList}>
                <View style={styles.helpItem}>
                  <Ionicons name="headset" size={16} color={colors.primary} />
                  <Text style={styles.helpItemText}>Use headphones for better audio quality</Text>
                </View>
                <View style={styles.helpItem}>
                  <Ionicons name="mic" size={16} color={colors.primary} />
                  <Text style={styles.helpItemText}>Speak clearly at a moderate pace</Text>
                </View>
                <View style={styles.helpItem}>
                  <Ionicons name="volume-mute" size={16} color={colors.primary} />
                  <Text style={styles.helpItemText}>Avoid noisy environments</Text>
                </View>
                <View style={styles.helpItem}>
                  <Ionicons name="phone-portrait" size={16} color={colors.primary} />
                  <Text style={styles.helpItemText}>Keep microphone at consistent distance</Text>
                </View>
              </View>
            </View>

            <View style={styles.helpSection}>
              <View style={styles.helpSectionHeader}>
                <Ionicons name="send" size={20} color="#4CAF50" />
                <Text style={styles.helpSectionTitle}>Auto-submit Feature</Text>
              </View>
              <Text style={styles.helpParagraph}>
                When enabled, the app will automatically send your recording after it
                detects a pause in speech.
              </Text>
            </View>

            <View style={styles.helpSection}>
              <View style={styles.helpSectionHeader}>
                <Ionicons name="mic" size={20} color="#2196F3" />
                <Text style={styles.helpSectionTitle}>Auto-record Feature</Text>
              </View>
              <Text style={styles.helpParagraph}>
                When enabled, the app will automatically start recording 1.5 seconds
                after the AI's audio response finishes playing. This allows for more
                natural back-and-forth conversation.
              </Text>
            </View>

            <View style={styles.helpSection}>
              <View style={styles.helpSectionHeader}>
                <Ionicons name="hardware-chip" size={20} color="#FF9800" />
                <Text style={styles.helpSectionTitle}>Audio Parameters</Text>
              </View>
              <Text style={styles.helpParagraph}>
                You can customize three key audio parameters:
              </Text>
              <View style={styles.helpItemList}>
                <View style={styles.helpItem}>
                  <Ionicons name="volume-high" size={16} color="#4CAF50" />
                  <Text style={styles.helpItemText}>
                    <Text style={{fontWeight: 'bold'}}>Speech Threshold:</Text> Audio level that indicates speech (higher value = louder speech needed)
                  </Text>
                </View>
                <View style={styles.helpItem}>
                  <Ionicons name="volume-low" size={16} color="#FF9800" />
                  <Text style={styles.helpItemText}>
                    <Text style={{fontWeight: 'bold'}}>Silence Threshold:</Text> Audio level that indicates silence (higher value = more background noise allowed)
                  </Text>
                </View>
                <View style={styles.helpItem}>
                  <Ionicons name="timer-outline" size={16} color="#2196F3" />
                  <Text style={styles.helpItemText}>
                    <Text style={{fontWeight: 'bold'}}>Auto-Send Duration:</Text> How long to wait in silence before auto-sending (higher value = longer pauses allowed)
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.helpSection}>
              <View style={styles.helpSectionHeader}>
                <Ionicons name="bug" size={20} color="#F44336" />
                <Text style={styles.helpSectionTitle}>Troubleshooting</Text>
              </View>
              <View style={styles.helpItemList}>
                <View style={styles.helpItem}>
                  <Ionicons name="alert-circle" size={16} color="#F44336" />
                  <Text style={styles.helpItemText}>
                    If recording isn't starting, check microphone permissions
                  </Text>
                </View>
                <View style={styles.helpItem}>
                  <Ionicons name="alert-circle" size={16} color="#F44336" />
                  <Text style={styles.helpItemText}>
                    If voice isn't detected, try decreasing the speech threshold
                  </Text>
                </View>
                <View style={styles.helpItem}>
                  <Ionicons name="alert-circle" size={16} color="#F44336" />
                  <Text style={styles.helpItemText}>
                    If recordings cut off too early, increase the silence duration
                  </Text>
                </View>
                <View style={styles.helpItem}>
                  <Ionicons name="alert-circle" size={16} color="#F44336" />
                  <Text style={styles.helpItemText}>
                    Enable Debug Mode to see detailed audio metrics
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1, // Allow title to take up available space
    justifyContent: 'center', // Center the title
    flexWrap: 'wrap', // Allow items to wrap on smaller screens
  },
  flagIcon: {
    fontSize: 20,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
  },
  // New mute button style
  muteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%', // Increased for more space
    minHeight: '40%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24, // Extra padding for iOS home indicator
    marginTop: 'auto', // This pushes the modal to the bottom
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpContent: {
    padding: 16,
  },
  helpSection: {
    marginBottom: 20,
  },
helpSectionHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12, // Increased from 8 to give more vertical space
  gap: 12, // Increased from 6 to match other spacing
},

  helpSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.gray800,
  },
  helpParagraph: {
    fontSize: 14,
    color: colors.gray700,
    lineHeight: 20,
    marginBottom: 8,
  },
  helpItemList: {
    marginTop: 6,
  },
  helpItem: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12, // Increased from 10 for more breathing room
  gap: 12, // Increased from 8 for consistent spacing
},
  helpItemText: {
    fontSize: 14,
    color: colors.gray700,
    flex: 1,
  },
  // Missing styles for TutorHeader.tsx - append these to your existing styles

// Tab related styles
tabBar: {
  flexDirection: 'row',
  borderBottomWidth: 1,
  borderBottomColor: colors.gray200,
  marginBottom: 16,
},
tab: {
  flex: 1,
  alignItems: 'center',
  paddingVertical: 12,
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 6,
},
activeTab: {
  borderBottomWidth: 2,
  borderBottomColor: colors.primary,
},
tabText: {
  fontSize: 14,
  fontWeight: '500',
  color: colors.gray600,
},
activeTabText: {
  color: colors.primary,
  fontWeight: '600',
},
tabContent: {
  paddingHorizontal: 16,
  paddingBottom: 24,
},

// Settings block styles
settingBlock: {
  marginBottom: 24,
  backgroundColor: colors.gray50,
  borderRadius: 12,
  padding: 16,
  borderWidth: 1,
  borderColor: colors.gray200,
},
disabledSettingBlock: {
  opacity: 0.8,
  backgroundColor: colors.gray100,
},
// For header sections in settings blocks
settingHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 16, // Increased from 12 to give more vertical space
  gap: 12, // Added gap for consistent spacing
},
settingIconContainer: {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: colors.primaryLight,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 8, // Added explicit margin right for spacing
},
mutedIconContainer: {
  backgroundColor: 'rgba(244, 67, 54, 0.1)',
},
settingTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: colors.gray800,
  flex: 1,
},
speedValue: {
  fontSize: 14,
  fontWeight: '700',
  color: colors.primary,
},
disabledText: {
  color: colors.gray500,
},
disabledSpeedValue: {
  color: colors.gray500,
},

// Slider related styles
sliderContainer: {
  width: '100%',
  paddingVertical: 8,
},
slider: {
  width: '100%',
  height: 40,
},
speedLabels: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: -4,
  paddingHorizontal: 8,
},
speedLabel: {
  fontSize: 12,
  color: colors.gray600,
  fontWeight: '500',
},

// Audio Parameter related styles
audioParamContainer: {
  marginBottom: 20,
},
audioParamLabel: {
  fontSize: 15,
  fontWeight: '600',
  color: colors.gray800,
  marginBottom: 4,
},
audioParamHint: {
  fontSize: 13,
  color: colors.gray600,
  marginBottom: 12,
},
numericInputContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: colors.gray300,
  borderRadius: 8,
  backgroundColor: colors.white,
  overflow: 'hidden',
},
numericButton: {
  width: 40,
  height: 40,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.gray100,
},
numericInput: {
  flex: 1,
  height: 40,
  textAlign: 'center',
  fontSize: 16,
  fontWeight: '600',
  color: colors.gray800,
},

// Threshold Visualizer styles
thresholdVisualizer: {
  marginTop: 20,
  marginBottom: 20,
},
visualizerLabel: {
  fontSize: 14,
  fontWeight: '500',
  color: colors.gray700,
  marginBottom: 8,
},
visualizerBar: {
  height: 24,
  flexDirection: 'row',
  borderRadius: 12,
  overflow: 'hidden',
},
silenceZone: {
  height: '100%',
  backgroundColor: '#ced4da',
},
middleZone: {
  height: '100%',
  backgroundColor: '#ff9800',
},
speechZone: {
  height: '100%',
  backgroundColor: '#4caf50',
},
visualizerLabels: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 4,
},
visualizerLabelText: {
  fontSize: 12,
  color: colors.gray600,
},

// Toggle buttons
testToggleButton: {
  backgroundColor: colors.primary,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 12,
  borderRadius: 24,
  gap: 8,
},
testToggleText: {
  color: 'white',
  fontWeight: '600',
  fontSize: 14,
},
resetButton: {
  backgroundColor: colors.gray600,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 10,
  borderRadius: 20,
  marginTop: 16,
  gap: 6,
},
resetButtonText: {
  color: 'white',
  fontWeight: '500',
  fontSize: 14,
},

// Audio Info Toggle styles
infoToggle: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 8,
  marginBottom: 16,
  gap: 4,
},
infoToggleText: {
  fontSize: 14,
  color: colors.primary,
  fontWeight: '500',
},
thresholdsPanel: {
  backgroundColor: colors.gray100,
  borderRadius: 12,
  padding: 16,
  marginBottom: 20,
},
platformBadge: {
  backgroundColor: colors.primaryLight,
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
  alignSelf: 'flex-start',
  marginBottom: 12,
},
platformBadgeText: {
  color: colors.primary,
  fontWeight: '600',
  fontSize: 12,
},
thresholdRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 8,
},
thresholdLabel: {
  fontSize: 14,
  color: colors.gray700,
},
thresholdValue: {
  fontSize: 14,
  fontWeight: '600',
  color: colors.gray800,
},
thresholdDescription: {
  fontSize: 13,
  color: colors.gray600,
  marginTop: 12,
  lineHeight: 18,
},

// Switch Settings
switchSetting: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: colors.white,
  padding: 16,
  borderRadius: 12,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: colors.gray200,
},
switchTextContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
  marginRight: 12,
},
switchLabel: {
  fontSize: 15,
  fontWeight: '600',
  color: colors.gray800,
  marginBottom: 2,
},
switchDescription: {
  fontSize: 13,
  color: colors.gray600,
},
disabledSetting: {
  opacity: 0.7,
  backgroundColor: colors.gray100,
},
disabledIcon: {
  opacity: 0.5,
},

// Help button
helpButton: {
  backgroundColor: colors.secondary,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 14,
  borderRadius: 24,
  marginTop: 16,
  gap: 8,
},
helpButtonText: {
  color: 'white',
  fontWeight: '600',
  fontSize: 15,
},

// Language section styles
languageInfoSection: {
  backgroundColor: colors.gray50,
  borderRadius: 12,
  padding: 16,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: colors.gray200,
},
currentLanguageHeader: {
  marginBottom: 12,
},
sectionHeading: {
  fontSize: 16,
  fontWeight: '600',
  color: colors.gray800,
},
currentLanguageCard: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'white',
  padding: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.gray300,
  marginBottom: 16,
},
currentLanguageFlag: {
  fontSize: 36,
  marginRight: 16,
},
currentLanguageDetails: {
  flex: 1,
},
currentLanguageName: {
  fontSize: 18,
  fontWeight: '700',
  color: colors.gray800,
  marginBottom: 4,
},
currentLanguageCode: {
  fontSize: 14,
  color: colors.gray600,
  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
},
nativeLanguageContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
nativeLanguageLabel: {
  fontSize: 14,
  color: colors.gray700,
},
nativeLanguageBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.gray200,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 16,
  gap: 6,
},
nativeLanguageFlag: {
  fontSize: 16,
},
nativeLanguageName: {
  fontSize: 14,
  fontWeight: '600',
  color: colors.gray800,
},
languageInfoMessage: {
  flexDirection: 'row',
  backgroundColor: colors.primaryLight,
  borderRadius: 12,
  padding: 16,
  marginBottom: 20,
  alignItems: 'flex-start',
  gap: 12,
},
languageInfoText: {
  fontSize: 14,
  color: colors.gray700,
  flex: 1,
  lineHeight: 20,
},
returnButton: {
  backgroundColor: colors.primary,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  borderRadius: 24,
  gap: 8,
},
returnButtonText: {
  color: 'white',
  fontWeight: '600',
  fontSize: 15,
}
});

export default TutorHeader;