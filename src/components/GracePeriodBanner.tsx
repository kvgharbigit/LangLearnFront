import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../styles/colors';

interface GracePeriodBannerProps {
  expirationDate: Date | null;
  tier: string;
}

/**
 * A banner that displays when a user's subscription is in billing grace period due to payment issues
 */
const GracePeriodBanner: React.FC<GracePeriodBannerProps> = ({ 
  expirationDate, 
  tier 
}) => {
  const navigation = useNavigation();
  
  // If no expiration date, don't show the banner
  if (!expirationDate) return null;
  
  // Format the date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Calculate days until expiration
  const daysUntilExpiration = Math.max(0, Math.ceil(
    (expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));
  
  // Message for grace period
  const message = `Your payment for ${tier} subscription failed. Please update your payment method to avoid losing access after ${formatDate(expirationDate)}.`;
  
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="card" size={24} color="#FFFFFF" />
      </View>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('Subscription' as never)}
      >
        <Text style={styles.buttonText}>Update Payment</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF9800', // Orange color for warning
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconContainer: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  buttonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GracePeriodBanner;