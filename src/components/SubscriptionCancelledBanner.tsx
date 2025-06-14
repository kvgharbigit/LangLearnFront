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

interface SubscriptionCancelledBannerProps {
  expirationDate: Date | null;
  tier: string;
}

/**
 * A banner that displays when a user has cancelled their subscription but it hasn't expired yet
 */
const SubscriptionCancelledBanner: React.FC<SubscriptionCancelledBannerProps> = ({ 
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
  
  // Determine message based on days remaining
  let message = '';
  if (daysUntilExpiration > 30) {
    message = `Your ${tier} subscription has been cancelled but will remain active until ${formatDate(expirationDate)}. After that, you'll automatically return to the free tier.`;
  } else if (daysUntilExpiration > 7) {
    message = `Your ${tier} subscription will expire on ${formatDate(expirationDate)}. You have ${daysUntilExpiration} days of access left. After that, you'll automatically return to the free tier.`;
  } else if (daysUntilExpiration > 1) {
    message = `Your ${tier} subscription is ending soon! You have only ${daysUntilExpiration} days left until ${formatDate(expirationDate)}. After that, you'll automatically return to the free tier.`;
  } else if (daysUntilExpiration === 1) {
    message = `Your ${tier} subscription expires tomorrow! After that, you'll automatically return to the free tier. Renew now to maintain premium access.`;
  } else {
    message = `Your ${tier} subscription expires today! After that, you'll automatically return to the free tier. Renew now to maintain premium access.`;
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
      </View>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('Subscription' as never)}
      >
        <Text style={styles.buttonText}>Renew</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
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
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SubscriptionCancelledBanner;