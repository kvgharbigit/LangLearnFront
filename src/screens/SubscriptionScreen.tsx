import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  Dimensions
} from 'react-native';
import SafeView from '../components/SafeView';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
// Remove expo-linear-gradient dependency as it's not installed
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import colors from '../styles/colors';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../types/subscription';
import { MonthlyUsage, creditsToTokens } from '../types/usage';
import { 
  getCurrentSubscription, 
  getOfferings, 
  purchasePackage,
  restorePurchases
} from '../services/revenueCatService';
import { getUserUsage, getUserUsageInTokens } from '../services/usageService';
import { isExpoGo, getStoreText, isDevelopment } from '../utils/deviceInfo';

type Props = NativeStackScreenProps<RootStackParamList, 'Subscription'>;
const { width } = Dimensions.get('window');

// Debug function to verify environment
const logEnvironmentInfo = () => {
  try {
    console.log('Environment: __DEV__ =', __DEV__);
    
    const Constants = require('expo-constants');
    console.log('Constants.appOwnership =', Constants.appOwnership);
    console.log('Constants.executionEnvironment =', Constants.executionEnvironment);
    
    // Check if running in TestFlight
    const isTestFlight = 
      Constants.appOwnership === 'standalone' && 
      Constants.executionEnvironment === 'standalone';
    
    console.log('isTestFlight() =', isTestFlight);
    console.log('isDevelopment() =', isDevelopment());
  } catch (e) {
    console.log('Error logging environment:', e);
  }
};

const SubscriptionScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [usage, setUsage] = useState<MonthlyUsage | null>(null);
  const [tokenUsage, setTokenUsage] = useState<{usedTokens: number, tokenLimit: number, percentageUsed: number} | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(15)).current;

  useEffect(() => {
    loadData();
    
    // Log environment info for debugging
    logEnvironmentInfo();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load current subscription
      const { tier, expirationDate } = await getCurrentSubscription();
      setCurrentTier(tier);
      setExpirationDate(expirationDate);
      
      // Load usage data
      const usageData = await getUserUsage();
      setUsage(usageData);
      
      // Load token usage data
      const tokenData = await getUserUsageInTokens();
      setTokenUsage(tokenData);
      
      // Load available packages
      const offerings = await getOfferings();
      setPackages(offerings);
      
    } catch (error) {
      console.error('Error loading subscription data:', error);
      Alert.alert('Error', 'Failed to load subscription information.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (plan: SubscriptionPlan) => {
    try {
      // Check if this is the current plan
      if (currentTier === plan.tier) {
        Alert.alert('Already Subscribed', `You are already subscribed to the ${plan.name} plan.`);
        return;
      }
      
      // Let user know about mid-cycle upgrades
      if (currentTier !== 'free' && plan.tier !== 'free') {
        // Only show for actual subscription changes, not free tier
        Alert.alert(
          'Subscription Change',
          `You're about to change your subscription from ${currentTier} to ${plan.tier}. Your billing will be adjusted immediately and your token limit will be updated to ${plan.monthlyTokens}. Continue?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => processPurchase(plan) }
          ]
        );
        return;
      }
      
      // If in Expo Go, show a special dialog for simulating purchases
      if (isExpoGo()) {
        Alert.alert(
          'Simulate Purchase',
          `This is a simulated purchase for ${plan.name} plan ($${plan.price.toFixed(2)}/month). In Expo Go, no actual purchase will be made.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Simulate Purchase',
              onPress: async () => {
                setPurchasing(true);
                try {
                  // Find the package for this plan
                  const packageToPurchase = packages.find(pkg => 
                    pkg.product.identifier.includes(plan.id)
                  );
                  
                  if (!packageToPurchase) {
                    throw new Error('Subscription package not found');
                  }
                  
                  // Purchase the package (will be mocked in Expo Go)
                  await purchasePackage(packageToPurchase);
                  
                  // Reload data after purchase
                  await loadData();
                  
                  Alert.alert(
                    'Subscription Updated',
                    `You are now subscribed to the ${plan.name} plan!`
                  );
                } catch (error) {
                  console.error('Error in simulated purchase:', error);
                  Alert.alert('Simulation Error', 'Failed to simulate the purchase.');
                } finally {
                  setPurchasing(false);
                }
              }
            }
          ]
        );
        return;
      }
      
      // Process the purchase directly for free tier or if not changing tiers
      processPurchase(plan);
    } catch (error) {
      console.error('Error handling purchase:', error);
      Alert.alert('Error', 'Failed to process your subscription request.');
    }
  };
  
  // Extracted purchase logic to separate function
  const processPurchase = async (plan: SubscriptionPlan) => {
    try {
      // For real builds, proceed with actual purchase
      setPurchasing(true);
      
      // Find the package for this plan
      const packageToPurchase = packages.find(pkg => 
        pkg.product.identifier.includes(plan.id)
      );
      
      if (!packageToPurchase) {
        throw new Error('Subscription package not found');
      }
      
      // Purchase the package
      await purchasePackage(packageToPurchase);
      
      // Reload data after purchase
      await loadData();
      
      // Show appropriate message based on whether it was an upgrade or downgrade
      const isUpgrade = 
        (currentTier === 'free' && plan.tier !== 'free') || 
        (currentTier === 'basic' && (plan.tier === 'premium' || plan.tier === 'gold')) ||
        (currentTier === 'premium' && plan.tier === 'gold');
          
      const isDowngrade = 
        (currentTier === 'gold' && (plan.tier === 'premium' || plan.tier === 'basic')) ||
        (currentTier === 'premium' && plan.tier === 'basic');
      
      let message = `You are now subscribed to the ${plan.name} plan!`;
      
      if (isUpgrade) {
        message += ` Your token limit has been increased to ${plan.monthlyTokens} tokens for this billing cycle.`;
      } else if (isDowngrade) {
        message += ` Your new token limit of ${plan.monthlyTokens} will take effect at your next billing cycle.`;
      }
      
      Alert.alert('Subscription Updated', message);
    } catch (error: any) {
      // Check for user cancellation
      if (error.userCancelled) {
        // User cancelled - no need to show error
        console.log('Purchase cancelled by user');
      } else {
        console.error('Error purchasing subscription:', error);
        Alert.alert('Purchase Failed', 'Failed to complete the purchase. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderUsageProgress = () => {
    if (!usage || !tokenUsage) return null;
    
    // Ensure percentageUsed is a valid number
    const percentageUsed = isNaN(tokenUsage.percentageUsed) ? 0 : tokenUsage.percentageUsed;
    const progressWidth = `${Math.min(percentageUsed, 100)}%`;
    
    let progressColor = colors.primary;
    
    if (percentageUsed > 90) {
      progressColor = colors.danger;
    } else if (percentageUsed > 70) {
      progressColor = '#FFC107';
    }
    
    return (
      <View style={styles.usageContainer}>
        <View style={styles.usageHeader}>
          <View style={styles.usageTitleContainer}>
            <Ionicons name="analytics-outline" size={20} color={colors.primary} style={styles.usageIcon} />
            <Text style={styles.usageTitle}>Token Usage</Text>
          </View>
          <View style={styles.usagePercentageContainer}>
            <Text style={[
              styles.usagePercentage, 
              percentageUsed > 90 ? {color: colors.danger} : 
              percentageUsed > 70 ? {color: '#FFB300'} : 
              {color: colors.primary}
            ]}>
              {isNaN(percentageUsed) ? '0' : Math.round(percentageUsed)}%
            </Text>
          </View>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground} />
          <View
            style={[
              styles.progressBar,
              { 
                width: progressWidth,
                backgroundColor: progressColor
              }
            ]}
          />
        </View>
        
        <Text style={styles.tokenCount}>
          {isNaN(tokenUsage.usedTokens) ? '0' : Math.round(tokenUsage.usedTokens)} of {isNaN(tokenUsage.tokenLimit) ? '150000' : tokenUsage.tokenLimit} tokens used
        </Text>
        
        <Text style={styles.usageNote}>
          Resets on {formatDate(new Date(usage.currentPeriodEnd))}
        </Text>
      </View>
    );
  };

  const renderSubscriptionPlans = () => {
    return SUBSCRIPTION_PLANS.map((plan) => {
      const isCurrentPlan = currentTier === plan.tier;
      
      return (
        <View
          key={plan.id}
          style={[
            styles.planCard,
            isCurrentPlan && styles.currentPlanCard
          ]}
        >
          {plan.isPopular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>POPULAR</Text>
            </View>
          )}
          
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planPrice}>
              {plan.price > 0 ? `$${plan.price.toFixed(2)}/month` : 'Free'}
            </Text>
            <Text style={styles.monthlyCredit}>
              ${plan.monthlyCredits.toFixed(2)} in Confluency Credits
            </Text>
          </View>
          
          <View style={styles.planFeatures}>
            {plan.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.checkmarkContainer}>
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
          
          <TouchableOpacity
            style={[
              styles.planButton,
              isCurrentPlan ? styles.currentPlanButton : styles.upgradePlanButton,
              purchasing && styles.disabledButton
            ]}
            onPress={() => handlePurchase(plan)}
            disabled={isCurrentPlan || purchasing}
            accessibilityLabel={isCurrentPlan ? "Current Plan" : `Upgrade to ${plan.name}`}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.planButtonText}>
                {isCurrentPlan ? 'Current Plan' : 'Upgrade'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      );
    });
  };

  return (
    <SafeView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conversation Tokens</Text>
        <View style={styles.placeholderButton} />
      </View>
      
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Loading subscription details...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              { opacity: fadeAnim, transform: [{ translateY }] }
            ]}
          >
            {/* Current Plan Summary */}
            <View style={styles.currentPlanSection}>
              <View style={styles.currentPlanHeader}>
                <Ionicons name="card-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Current Plan</Text>
              </View>
              <View style={styles.currentPlanInfo}>
                <View style={styles.currentPlanDetails}>
                  <Text style={styles.currentPlanName}>
                    {SUBSCRIPTION_PLANS.find(p => p.tier === currentTier)?.name || 'Free'}
                  </Text>
                  {expirationDate && (
                    <Text style={styles.expirationText}>
                      Expires: {formatDate(expirationDate)}
                    </Text>
                  )}
                </View>
                {currentTier !== 'free' && (
                  <View style={styles.currentPlanBadge}>
                    <Text style={styles.currentPlanBadgeText}>ACTIVE</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Usage Progress */}
            {renderUsageProgress()}
            
            {/* Available Plans */}
            <View style={styles.plansSection}>
              <View style={styles.sectionHeaderContainer}>
                <Ionicons name="pricetags-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Available Plans</Text>
              </View>
              
              <View style={styles.plansContainer}>
                {renderSubscriptionPlans()}
              </View>
            </View>
            
            {/* Restore Purchases Button */}
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={async () => {
                try {
                  setLoading(true);
                  await restorePurchases(); // Call the actual restore function
                  await loadData();
                  Alert.alert('Success', 'Your purchases have been successfully restored!');
                } catch (error) {
                  console.error('Error restoring purchases:', error);
                  Alert.alert('Error', 'Failed to restore purchases. Please try again.');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || purchasing}
              accessibilityLabel="Restore Purchases"
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="refresh" size={18} color={colors.primary} style={styles.restoreIcon} />
                  <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                </>
              )}
            </TouchableOpacity>
            
            {/* Subscription Info */}
            {/* Display notice for Expo Go (development mode) */}
            {isExpoGo() && (
              <View style={styles.expoGoNotice}>
                <Ionicons name="information-circle" size={22} color="#F59E0B" style={{ marginRight: 8 }} />
                <Text style={styles.expoGoText}>
                  Running in development mode. Purchases are simulated and not charged.
                </Text>
              </View>
            )}

            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Subscriptions will automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period.
              </Text>
              <Text style={styles.infoText}>
                You can manage your subscriptions in your {getStoreText()} account settings after purchase.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      )}
    </SafeView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  placeholderButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray800,
    flex: 1,
    textAlign: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray600,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  currentPlanSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray800,
  },
  currentPlanInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentPlanDetails: {
    flex: 1,
  },
  currentPlanName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  currentPlanBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentPlanBadgeText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '700',
  },
  expirationText: {
    fontSize: 14,
    color: colors.gray600,
  },
  usageContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  usageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usageIcon: {
    marginRight: 8,
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
  },
  usagePercentageContainer: {
    backgroundColor: 'rgba(84, 104, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  usagePercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarContainer: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#E9ECEF',
    position: 'relative',
  },
  progressBarBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: '#E9ECEF',
    borderRadius: 5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  tokenCount: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray700,
    marginBottom: 4,
  },
  usageNote: {
    fontSize: 13,
    color: colors.gray600,
  },
  plansSection: {
    marginBottom: 16,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingLeft: 4,
  },
  plansContainer: {
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  currentPlanCard: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 12,
  },
  popularText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  monthlyCredit: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
  },
  planFeatures: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkmarkContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    color: colors.gray700,
    flex: 1,
  },
  planButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradePlanButton: {
    backgroundColor: colors.primary,
  },
  currentPlanButton: {
    backgroundColor: colors.gray300,
  },
  disabledButton: {
    opacity: 0.7,
  },
  planButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  restoreIcon: {
    marginRight: 8,
  },
  restoreButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  infoText: {
    fontSize: 13,
    color: colors.gray600,
    marginBottom: 8,
  },
  expoGoNotice: {
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#FEF3C7', // Amber/yellow light background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B', // Amber/yellow border
    flexDirection: 'row',
    alignItems: 'center',
  },
  expoGoText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E', // Amber/yellow dark text
  },
});

export default SubscriptionScreen;