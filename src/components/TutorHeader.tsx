import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { AUDIO_SETTINGS } from '../constants/settings';

interface Props {
  targetLanguage: string;
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
  navigation: any;
}

const TutorHeader: React.FC<Props> = ({
  targetLanguage,
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
  navigation,
}) => {
  // State
  const [settingsModalVisible, setSettingsModalVisible] = useState<boolean>(false);
  const [helpModalVisible, setHelpModalVisible] = useState<boolean>(false);
  const [audioInfoVisible, setAudioInfoVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'audio' | 'advanced'>('audio');

  // Animation
  const [animation] = useState(new Animated.Value(0));

  // Toggle functions
  const toggleSettingsModal = () => {
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

  const goBack = () => {
    navigation.goBack();
  };

  // Speed options with their labels and values - including Extra Slow
  const speedOptions = [
    { label: 'Extra Slow', value: 0.4 },
    { label: 'Slow', value: 0.6 },
    { label: 'Normal', value: 0.8 },
    { label: 'Fast', value: 1.0 },
    { label: 'Very Fast', value: 1.2 },
  ];

  // Helper function to determine if speed option is active
  const isSpeedActive = (value: number): boolean => {
    return Math.abs(tempo - value) < 0.05;
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
                  {/* Voice Speed */}
                  <View style={styles.settingBlock}>
                    <View style={styles.settingHeader}>
                      <View style={styles.settingIconContainer}>
                        <Ionicons name="speedometer" size={16} color={colors.primary} />
                      </View>
                      <Text style={styles.settingTitle}>Voice Speed</Text>
                      <Text style={styles.speedValue}>{Math.round(tempo * 100)}%</Text>
                    </View>

                    {/* Speed buttons in a scrollable row */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.speedButtonsScrollContainer}
                    >
                      {speedOptions.map((option) => (
                        <TouchableOpacity
                          key={option.label}
                          style={[
                            styles.speedButton,
                            isSpeedActive(option.value) && styles.activeSpeedButton
                          ]}
                          onPress={() => setTempo(option.value)}
                        >
                          <Text
                            style={[
                              styles.speedButtonText,
                              isSpeedActive(option.value) && styles.activeSpeedButtonText
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
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
                      {audioInfoVisible ? "Hide Audio Thresholds" : "Show Audio Thresholds"}
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
                          {Platform.OS === 'ios' ? 'iOS' : 'Android'} Settings
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
                        These thresholds are optimized for your device to provide the best
                        speech detection experience.
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
                      onValueChange={setDebugMode}
                      trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                      thumbColor={debugMode ? colors.primary : colors.gray100}
                      ios_backgroundColor={colors.gray300}
                    />
                  </View>

                  {/* Voice Input Toggle - MOVED UP IN THE LIST */}
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
                      onValueChange={toggleVoiceInput}
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
                      onValueChange={setAutoSendEnabled}
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
                      onValueChange={setAutoRecordEnabled}
                      trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                      thumbColor={(voiceInputEnabled && autoRecordEnabled) ? colors.primary : colors.gray100}
                      ios_backgroundColor={colors.gray300}
                      disabled={!voiceInputEnabled}
                    />
                  </View>

                  {/* Help Button */}
                  <TouchableOpacity
                    style={styles.helpButton}
                    onPress={toggleHelpModal}
                  >
                    <Ionicons name="help-circle" size={18} color={colors.white} />
                    <Text style={styles.helpButtonText}>
                      Voice Recording Help
                    </Text>
                  </TouchableOpacity>
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
                  <Text style={styles.helpSectionTitle}>Device Settings</Text>
                </View>
                <Text style={styles.helpParagraph}>
                  The app uses different audio sensitivity settings on iOS and Android
                  devices to compensate for hardware and software differences. These
                  settings are automatically applied based on your device.
                </Text>
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
                      If voice isn't detected, try increasing speaking volume
                    </Text>
                  </View>
                  <View style={styles.helpItem}>
                    <Ionicons name="alert-circle" size={16} color="#F44336" />
                    <Text style={styles.helpItemText}>
                      If recordings cut off too early, disable auto-submit
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
  },
  flagIcon: {
    fontSize: 20,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
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
    // Removed background darkening
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.gray50,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  activeTab: {
    backgroundColor: 'white',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray600,
  },
  activeTabText: {
    color: colors.primary,
  },
  tabContent: {
    padding: 16,
  },
  settingBlock: {
    marginBottom: 16,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  disabledIcon: {
    backgroundColor: colors.gray100,
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
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  speedButtonsScrollContainer: {
    paddingRight: 8,
    paddingBottom: 4,
  },
  speedButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray300,
    marginRight: 8,
    minWidth: 90,
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
  infoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  infoToggleText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  thresholdsPanel: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  platformBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  platformBadgeText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
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
    fontSize: 12,
    color: colors.gray600,
    marginTop: 8,
    fontStyle: 'italic',
  },
  switchSetting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  disabledSetting: {
    opacity: 0.7,
  },
  switchTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray800,
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 13,
    color: colors.gray600,
  },
  disabledText: {
    color: colors.gray400,
  },
  helpButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  helpButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
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
    marginBottom: 8,
    gap: 6,
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
    marginBottom: 10,
    gap: 8,
  },
  helpItemText: {
    fontSize: 14,
    color: colors.gray700,
    flex: 1,
  },
});

export default TutorHeader;