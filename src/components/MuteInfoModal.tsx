// src/components/MuteInfoModal.tsx
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';

interface MuteInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

const MuteInfoModal: React.FC<MuteInfoModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Ionicons name="volume-mute" size={24} color={colors.danger} />
            <Text style={styles.modalTitle}>Audio Muted</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.description}>
              You've turned on mute mode. The tutor will continue sending text responses, but won't speak out loud.
            </Text>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="battery-full" size={20} color={colors.success} />
                <Text style={styles.benefitText}>Reduces battery usage</Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="wifi" size={20} color={colors.success} />
                <Text style={styles.benefitText}>Saves data usage</Text>
              </View>

              {/* Add this new benefit item */}
              <View style={styles.benefitItem}>
                <Ionicons name="flash-outline" size={20} color={colors.success} />
                <Text style={styles.benefitText}>Increases reply speed</Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="cafe-outline" size={20} color={colors.success} />
                <Text style={styles.benefitText}>Perfect for quiet environments</Text>
              </View>
            </View>


          </View>

          <TouchableOpacity style={styles.gotItButton} onPress={onClose}>
            <Text style={styles.gotItButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.gray100,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
    marginLeft: 10,
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: colors.gray700,
    lineHeight: 24,
    marginBottom: 20,
  },
  benefitsList: {
    marginBottom: 20,
    backgroundColor: colors.gray50,
    padding: 16,
    borderRadius: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 15,
    color: colors.gray700,
    marginLeft: 12,
  },
  instructionText: {
    fontSize: 15,
    color: colors.gray600,
    fontStyle: 'italic',
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 10,
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  gotItButton: {
    backgroundColor: colors.primary,
    padding: 16,
    alignItems: 'center',
    margin: 20,
    borderRadius: 12,
  },
  gotItButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MuteInfoModal;