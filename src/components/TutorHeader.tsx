import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import TempoSlider from './TempoSlider';

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
  const [settingsModalVisible, setSettingsModalVisible] = useState<boolean>(false);
  const [debugModalVisible, setDebugModalVisible] = useState<boolean>(false);

  const toggleSettingsModal = () => {
    setSettingsModalVisible(!settingsModalVisible);
  };

  const toggleDebugModal = () => {
    setDebugModalVisible(!debugModalVisible);
  };

  const goBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.flagIcon}>{targetInfo.flag}</Text>
          <Text style={styles.titleText}>{targetInfo.name} Tutor</Text>
        </View>

        <TouchableOpacity style={styles.settingsButton} onPress={toggleSettingsModal}>
          <Ionicons name="settings-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={toggleSettingsModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Conversation Settings</Text>
              <TouchableOpacity onPress={toggleSettingsModal}>
                <Ionicons name="close" size={24} color={colors.gray700} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent}>
              <View style={styles.settingSection}>
                <Text style={styles.settingSectionTitle}>Audio Settings</Text>

                <View style={styles.settingItem}>
                  <View style={styles.settingLabelContainer}>
                    <Text style={styles.settingLabel}>Voice Speed</Text>
                    <Text style={styles.settingValue}>{Math.round(tempo * 100)}%</Text>
                  </View>
                  <TempoSlider
                    tempo={tempo}
                    setTempo={setTempo}
                  />
                </View>
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.settingSectionTitle}>Input Mode</Text>

                <View style={styles.settingItem}>
                  <View style={styles.settingLabelContainer}>
                    <Text style={styles.settingLabel}>Voice Input</Text>
                    <Text style={styles.settingDescription}>Use microphone for spoken conversation</Text>
                  </View>
                  <Switch
                    value={voiceInputEnabled}
                    onValueChange={toggleVoiceInput}
                    trackColor={{ false: '#d1d1d1', true: colors.primaryLight }}
                    thumbColor={voiceInputEnabled ? colors.primary : '#f4f3f4'}
                    ios_backgroundColor="#d1d1d1"
                  />
                </View>

                {voiceInputEnabled && (
                  <>
                    <View style={styles.settingItem}>
                      <View style={styles.settingLabelContainer}>
                        <Text style={styles.settingLabel}>Auto-submit on Silence</Text>
                        <Text style={styles.settingDescription}>Automatically send after detected pause</Text>
                      </View>
                      <Switch
                        value={autoSendEnabled}
                        onValueChange={setAutoSendEnabled}
                        trackColor={{ false: '#d1d1d1', true: colors.primaryLight }}
                        thumbColor={autoSendEnabled ? colors.primary : '#f4f3f4'}
                        ios_backgroundColor="#d1d1d1"
                      />
                    </View>

                    <View style={styles.settingItem}>
                      <View style={styles.settingLabelContainer}>
                        <Text style={styles.settingLabel}>Auto-record after AI</Text>
                        <Text style={styles.settingDescription}>Start recording 1.5s after AI response</Text>
                      </View>
                      <Switch
                        value={autoRecordEnabled}
                        onValueChange={setAutoRecordEnabled}
                        trackColor={{ false: '#d1d1d1', true: colors.primaryLight }}
                        thumbColor={autoRecordEnabled ? colors.primary : '#f4f3f4'}
                        ios_backgroundColor="#d1d1d1"
                      />
                    </View>
                  </>
                )}
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.settingSectionTitle}>Advanced</Text>

                <View style={styles.settingItem}>
                  <View style={styles.settingLabelContainer}>
                    <Text style={styles.settingLabel}>Debug Mode</Text>
                    <Text style={styles.settingDescription}>Show detailed audio metrics for debugging</Text>
                  </View>
                  <Switch
                    value={debugMode}
                    onValueChange={setDebugMode}
                    trackColor={{ false: '#d1d1d1', true: colors.primaryLight }}
                    thumbColor={debugMode ? colors.primary : '#f4f3f4'}
                    ios_backgroundColor="#d1d1d1"
                  />
                </View>

                <TouchableOpacity style={styles.helpButton} onPress={toggleDebugModal}>
                  <Text style={styles.helpButtonText}>Voice Recording Help</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Debug Help Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={debugModalVisible}
        onRequestClose={toggleDebugModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Voice Recording Tips</Text>
              <TouchableOpacity onPress={toggleDebugModal}>
                <Ionicons name="close" size={24} color={colors.gray700} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent}>
              <Text style={styles.helpSectionTitle}>Getting the Best Experience</Text>

              <Text style={styles.helpItem}>• Use headphones for better audio quality</Text>
              <Text style={styles.helpItem}>• Speak clearly and at a moderate pace</Text>
              <Text style={styles.helpItem}>• Avoid very noisy environments</Text>
              <Text style={styles.helpItem}>• Try to keep the microphone a consistent distance from your mouth</Text>

              <Text style={styles.helpSectionTitle}>Auto-submit Feature</Text>
              <Text style={styles.helpParagraph}>When enabled, the app will automatically send your recording after it detects a pause in speech.</Text>

              <Text style={styles.helpSectionTitle}>Auto-record Feature</Text>
              <Text style={styles.helpParagraph}>When enabled, the app will automatically start recording 1.5 seconds after the AI's audio response finishes playing. This allows for more natural back-and-forth conversation.</Text>

              <Text style={styles.helpSectionTitle}>Troubleshooting</Text>
              <Text style={styles.helpItem}>• If recording isn't starting, check microphone permissions in your device settings</Text>
              <Text style={styles.helpItem}>• If your voice isn't being detected, try increasing your speaking volume</Text>
              <Text style={styles.helpItem}>• If recordings cut off too early, try disabling auto-submit</Text>
              <Text style={styles.helpItem}>• Enable Debug Mode to see detailed audio metrics</Text>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
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
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 0 : 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
  },
  modalScrollContent: {
    flex: 1,
    padding: 16,
  },
  settingSection: {
    marginBottom: 24,
  },
  settingSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  settingLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.gray800,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.gray600,
  },
  settingValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  helpButton: {
    backgroundColor: colors.gray100,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  helpButtonText: {
    color: colors.primary,
    fontWeight: '500',
  },
  helpSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
    marginTop: 16,
    marginBottom: 8,
  },
  helpParagraph: {
    fontSize: 14,
    color: colors.gray700,
    marginBottom: 12,
    lineHeight: 20,
  },
  helpItem: {
    fontSize: 14,
    color: colors.gray700,
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default TutorHeader;