import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../types/navigation';
import colors from '../styles/colors';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

interface QuotaExceededModalProps {
  visible: boolean;
  onClose: () => void;
}

const QuotaExceededModal: React.FC<QuotaExceededModalProps> = ({ visible, onClose }) => {
  const navigation = useNavigation<NavigationProp>();
  
  const handleUpgradePress = () => {
    onClose();
    navigation.navigate('Subscription');
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <View style={styles.iconContainer}>
                <Ionicons name="alert-circle" size={60} color={colors.primary} />
              </View>
              
              <Text style={styles.title}>Token Limit Reached</Text>
              
              <Text style={styles.message}>
                You've reached your monthly token limit for language learning.
                Upgrade your subscription to continue learning without limits.
              </Text>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={handleUpgradePress}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.laterButton}
                  onPress={onClose}
                >
                  <Text style={styles.laterButtonText}>Not Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.gray700,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  laterButton: {
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  laterButtonText: {
    color: colors.gray600,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default QuotaExceededModal;