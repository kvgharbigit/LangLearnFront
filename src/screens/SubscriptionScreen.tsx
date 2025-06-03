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
  Dimensions,
  Linking
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
import RevenueCatErrorDisplay from '../components/RevenueCatErrorDisplay';
import SubscriptionCancelledBanner from '../components/SubscriptionCancelledBanner';
import GracePeriodBanner from '../components/GracePeriodBanner';
import useSubscriptionStatus from '../hooks/useSubscriptionStatus';
import { 
  getCurrentSubscription, 
  getOfferings, 
  purchasePackage,
  restorePurchases
} from '../services/revenueCatService';
import { getUserUsage, getUserUsageInTokens } from '../services/usageService';
import { 
  getStoreText, 
  getDeploymentEnvironment, 
  isProductionBuild,
  getDetailedDeviceInfo
} from '../utils/deviceInfo';
import { shouldUseSimulatedData } from '../services/revenueCatService';
import { DEBUG_TOOLS_TOGGLE } from '../constants/debug';

type Props = NativeStackScreenProps<RootStackParamList, 'Subscription'>;
const { width } = Dimensions.get('window');

// Enhanced function to check environment status and collect diagnostics
const logEnvironmentInfo = () => {
  try {
    const { getDeploymentEnvironment, getDetailedDeviceInfo } = require('../utils/deviceInfo');
    const deployEnv = getDeploymentEnvironment();
    const deviceInfo = getDetailedDeviceInfo();
    
    console.log('=== ENVIRONMENT INFO ===');
    console.log('Environment detection priority:');
    console.log('1. __DEV__ =', __DEV__, '(primary check)');
    console.log('2. Process.env.DEPLOY_ENV =', process.env.DEPLOY_ENV || 'not set', '(secondary check)');
    console.log('3. Constants.appOwnership =', require('expo-constants').appOwnership, '(fallback check)');
    
    console.log('Computed environment:');
    console.log('Development mode:', __DEV__);
    console.log('Deployment Environment:', deployEnv);
    console.log('Is Production Build:', isProductionBuild());
    
    const Constants = require('expo-constants');
    console.log('Device info:');
    console.log('Platform:', deviceInfo.platform, deviceInfo.version);
    console.log('App Version:', deviceInfo.appVersion);
    console.log('Device:', Constants.deviceName || 'unknown');
    console.log('Constants.executionEnvironment:', Constants.executionEnvironment);
    
    // Try to check RevenueCat status
    try {
      const Purchases = require('react-native-purchases');
      console.log('RevenueCat SDK loaded successfully');
      
      // Check if we can access RevenueCat APIs
      if (Purchases.getAppUserID) {
        console.log('RevenueCat API accessible');
        try {
          const userID = Purchases.getAppUserID();
          console.log('RevenueCat User ID:', userID || 'not available');
        } catch (e) {
          console.log('Could not get RevenueCat User ID:', e.message);
        }
      } else {
        console.log('RevenueCat API not fully accessible');
      }
    } catch (e) {
      console.log('RevenueCat SDK not available:', e.message);
    }
    
    // Log React Native environment
    const reactNativeVersion = Platform.constants?.reactNativeVersion || 'unknown';
    console.log('React Native:', 
      typeof reactNativeVersion === 'object' 
        ? `${reactNativeVersion.major}.${reactNativeVersion.minor}.${reactNativeVersion.patch}` 
        : reactNativeVersion
    );
    
    return {
      __DEV__,
      deployEnv: process.env.DEPLOY_ENV || 'not set',
      deploySetting: deployEnv,
      isProductionBuild: isProductionBuild(),
      deviceInfo
    };
  } catch (e) {
    console.log('Error logging environment:', e);
    return {
      error: e.message,
      __DEV__
    };
  }
};

const SubscriptionScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [currentTier, setCurrentTier] = useState<string>('free');
  
  // Add debug logging for currentTier changes
  useEffect(() => {
    console.log('[SubscriptionScreen] currentTier changed to:', currentTier);
  }, [currentTier]);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [usage, setUsage] = useState<MonthlyUsage | null>(null);
  const [tokenUsage, setTokenUsage] = useState<{usedTokens: number, tokenLimit: number, percentageUsed: number} | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  // Store RevenueCat errors for debugging
  const [revenueCatError, setRevenueCatError] = useState<any>(null);
  // Track whether we're using simulated data based on user preference
  const [debugOptions, setDebugOptions] = useState<{
    debugMode: boolean;
    simulateRevenueCat: boolean;
  }>({ debugMode: false, simulateRevenueCat: false });
  
  // Get subscription status from hook
  const subscriptionStatus = useSubscriptionStatus();
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(15)).current;

  useEffect(() => {
    loadData();
    
    // Log environment info for debugging
    logEnvironmentInfo();
    
    // Load debug settings for UI indicators
    const loadUserPreferences = async () => {
      try {
        // Get user simulation preference
        const { getUISettings } = await import('../utils/userPreferences');
        const settings = await getUISettings();
        
        setDebugOptions({
          debugMode: settings.debugMode,
          simulateRevenueCat: settings.simulateRevenueCat
        });
        
        console.log('Loaded user preferences:', settings);
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };
    
    loadUserPreferences();
    
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
      // Don't clear errors for debugging purposes
      // setRevenueCatError(null);
      
      // Load current subscription for purchasing purposes
      // (we'll get cancellation status from the hook)
      const subscriptionData = await getCurrentSubscription();
      const { tier, expirationDate } = subscriptionData;
      console.log('[SubscriptionScreen] loadData - setting tier to:', tier);
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
      
      // Debug logging of all packages for troubleshooting
      console.log("Available RevenueCat packages:");
      offerings.forEach((pkg, index) => {
        console.log(`[${index}] ID: ${pkg.product.identifier} | Title: ${pkg.product.title} | Price: ${pkg.product.priceString}`);
      });
      
      setPackages(offerings);
      
    } catch (error) {
      console.error('Error loading subscription data:', error);
      setRevenueCatError(error); // Store the error for display
      
      // Check if it's a configuration error (products not set up)
      if (error?.message?.includes('configuration') || error?.message?.includes('products registered')) {
        Alert.alert(
          'Configuration Notice', 
          'RevenueCat products are not yet configured. Running in test mode. To use real subscriptions, please configure products in RevenueCat and App Store Connect.'
        );
        
        // In development, we can continue with an empty packages array
        setPackages([]);
      } else {
        Alert.alert('Error', 'Failed to load subscription information.');
      }
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
      
      // Let user know about subscription changes
      if (currentTier !== 'free' && plan.tier !== 'free') {
        // Check if this is an upgrade or downgrade
        const isUpgrade = 
          (currentTier === 'basic' && (plan.tier === 'premium' || plan.tier === 'gold')) ||
          (currentTier === 'premium' && plan.tier === 'gold');
          
        const isDowngrade = 
          (currentTier === 'gold' && (plan.tier === 'premium' || plan.tier === 'basic')) ||
          (currentTier === 'premium' && plan.tier === 'basic');
        
        // Customize message based on upgrade or downgrade
        let title = isUpgrade ? 'Subscription Upgrade' : 'Subscription Downgrade';
        let message = '';
        
        if (isUpgrade) {
          message = `You're about to upgrade from ${currentTier} to ${plan.tier}. Your billing will be adjusted immediately and your token limit will be increased to ${plan.monthlyTokens} right away. Continue?`;
        } else if (isDowngrade) {
          message = `You're about to downgrade from ${currentTier} to ${plan.tier}.\n\nIMPORTANT: You will continue to have access to your current tier until the end of your current billing cycle, then your subscription will switch to the ${plan.tier} tier with ${plan.monthlyTokens} tokens.\n\nYour renewal date is: ${formatDate(expirationDate)}\n\nContinue with downgrade?`;
        } else {
          message = `You're about to change your subscription from ${currentTier} to ${plan.tier}. Your billing will be adjusted and your token limit will be updated to ${plan.monthlyTokens}. Continue?`;
        }
        
        Alert.alert(
          title,
          message,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => processPurchase(plan) }
          ]
        );
        return;
      }
      
      // Check if simulation mode is enabled by user preference
      const useSimulatedData = await shouldUseSimulatedData();
      
      if (useSimulatedData) {
        // Show the simulation dialog
        Alert.alert(
          'Simulate Purchase',
          `This is a simulated purchase for ${plan.name} plan ($${plan.price.toFixed(2)}/month). No actual purchase will be made.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Simulate Purchase',
              onPress: async () => {
                setPurchasing(true);
                try {
                  // Get all available packages for debugging
                  console.log('DEBUG: Available packages for simulation:', JSON.stringify(packages.map(p => ({
                    id: p.product.identifier,
                    offering: p.offering?.identifier
                  })), null, 2));
                  
                  // Improved matching logic for finding the package - same as above
                  let packageToPurchase = null;
                  
                  // Strategy 1: Exact identifier match
                  packageToPurchase = packages.find(pkg => 
                    pkg.product.identifier === plan.id
                  );
                  
                  // Strategy 2: Check if identifier ends with the tier ID (e.g. "anything.basic_tier")
                  if (!packageToPurchase) {
                    packageToPurchase = packages.find(pkg => 
                      pkg.product.identifier.endsWith(plan.id)
                    );
                  }
                  
                  // Strategy 3: Check if identifier contains the tier name (e.g. "basic")
                  if (!packageToPurchase) {
                    packageToPurchase = packages.find(pkg => 
                      pkg.product.identifier.includes(plan.tier)
                    );
                  }
                  
                  // Strategy 4: Last resort, use the old method of partial matching
                  if (!packageToPurchase) {
                    packageToPurchase = packages.find(pkg => 
                      pkg.product.identifier.includes(plan.id)
                    );
                  }
                  
                  if (!packageToPurchase) {
                    console.error('Failed to find package for simulated plan:', plan);
                    console.error('Available simulated packages:', packages.map(p => p.product.identifier));
                    throw new Error(`Simulated subscription package not found for ${plan.name} (${plan.id})`);
                  }
                  
                  console.log(`Selected simulated package for ${plan.name}: ${packageToPurchase.product.identifier}`)
                  
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
      
      // Get all available packages for debugging
      console.log('DEBUG: Available packages:', JSON.stringify(packages.map(p => ({
        id: p.product.identifier,
        offering: p.offering?.identifier
      })), null, 2));
      
      // Improved matching logic for finding the package
      // Try multiple matching strategies in order of specificity
      let packageToPurchase = null;
      
      // Strategy 1: Exact identifier match
      packageToPurchase = packages.find(pkg => 
        pkg.product.identifier === plan.id
      );
      
      // Strategy 2: Check if identifier ends with the tier ID (e.g. "anything.basic_tier")
      if (!packageToPurchase) {
        packageToPurchase = packages.find(pkg => 
          pkg.product.identifier.endsWith(plan.id)
        );
      }
      
      // Strategy 3: Check if identifier contains the tier name (e.g. "basic")
      if (!packageToPurchase) {
        packageToPurchase = packages.find(pkg => 
          pkg.product.identifier.includes(plan.tier)
        );
      }
      
      // Strategy 4: Last resort, use the old method of partial matching
      if (!packageToPurchase) {
        packageToPurchase = packages.find(pkg => 
          pkg.product.identifier.includes(plan.id)
        );
      }
      
      if (!packageToPurchase) {
        console.error('Failed to find package for plan:', plan);
        console.error('Available packages:', packages.map(p => p.product.identifier));
        throw new Error(`Subscription package not found for ${plan.name} (${plan.id})`);
      }
      
      console.log(`Selected package for ${plan.name}: ${packageToPurchase.product.identifier}`)
      
      // Purchase the package
      await purchasePackage(packageToPurchase);
      
      // Clear cached subscription data to force fresh fetch
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem('cached_subscription');
        console.log('Cleared subscription cache after purchase');
      } catch (e) {
        console.warn('Error clearing subscription cache:', e);
      }
      
      // Reload data after purchase with fresh data
      await loadData();
      
      // Show appropriate message based on whether it was an upgrade or downgrade
      const isUpgrade = 
        (currentTier === 'free' && plan.tier !== 'free') || 
        (currentTier === 'basic' && (plan.tier === 'premium' || plan.tier === 'gold')) ||
        (currentTier === 'premium' && plan.tier === 'gold');
          
      const isDowngrade = 
        (currentTier === 'gold' && (plan.tier === 'premium' || plan.tier === 'basic')) ||
        (currentTier === 'premium' && plan.tier === 'basic');
      
      let title = isUpgrade ? 'Subscription Upgraded' : isDowngrade ? 'Subscription Downgraded' : 'Subscription Updated';
      let message = '';
      
      if (isUpgrade) {
        // Calculate the additional tokens they get (new - old)
        const oldTokens = SUBSCRIPTION_PLANS.find(p => p.tier === currentTier)?.monthlyTokens || 0;
        const additionalTokens = plan.monthlyTokens - oldTokens;
        
        message = `Your subscription has been upgraded to the ${plan.name} plan!\n\n` +
                  `• Your token limit has been immediately increased to ${plan.monthlyTokens} tokens\n` +
                  `• You've gained ${additionalTokens} additional tokens for this billing cycle\n` +
                  `• Your available tokens have been updated now - no need to wait\n` +
                  `• Your next billing date is ${formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}`;
      } else if (isDowngrade) {
        message = `Your subscription has been changed to the ${plan.name} plan.\n\n` +
                  `• You'll continue to have your current token limit until ${formatDate(expirationDate)}\n` +
                  `• On your next billing date, your limit will change to ${plan.monthlyTokens} tokens\n` +
                  `• You won't lose any tokens you've already used`;
      } else {
        message = `You are now subscribed to the ${plan.name} plan!`;
      }
      
      Alert.alert(title, message);
    } catch (error: any) {
      // Check for user cancellation
      if (error.userCancelled) {
        // User cancelled - no need to show error
        console.log('Purchase cancelled by user');
      } else {
        console.error('Error purchasing subscription:', error);
        
        // Store the error for display in the UI
        setRevenueCatError(error);
        
        // Show detailed error information for debugging
        let errorMessage = 'Failed to complete the purchase. Please try again.';
        if (error) {
          const errorCode = error.code || 'unknown';
          const errorDesc = error.message || 'No detail available';
          const underlyingError = error.underlyingErrorMessage || '';
          const readableCode = error.readableErrorCode || '';
          
          // Build comprehensive error message
          errorMessage = `Error Code: ${errorCode}\n\n`;
          
          if (readableCode) {
            errorMessage += `Readable Code: ${readableCode}\n\n`;
          }
          
          errorMessage += `Description: ${errorDesc}\n\n`;
          
          if (underlyingError) {
            errorMessage += `Underlying Error: ${underlyingError}\n\n`;
          }
          
          // Add tips for common error codes
          if (errorCode === 'PurchaseInvalidError') {
            errorMessage += '\nTIP: Make sure you are signed in with a Sandbox Apple ID created in App Store Connect.';
          }
          
          if (errorCode === 'ProductNotAvailableForPurchaseError') {
            errorMessage += '\nTIP: This product might not be properly configured in App Store Connect or RevenueCat.';
          }
          
          console.log('PURCHASE ERROR DETAILS:', JSON.stringify(error, null, 2));
        }
        
        // Show detailed error for debugging in TestFlight
        Alert.alert(
          'Purchase Failed', 
          errorMessage,
          [
            { 
              text: 'OK', 
              onPress: () => {} 
            },
            { 
              text: 'View Details',
              onPress: () => {
                // This will scroll to make the error display visible
                setTimeout(() => {
                  Alert.alert(
                    'Debug Info', 
                    'Check the detailed error information in the RevenueCat Error section below on the screen.'
                  );
                }, 500);
              }
            }
          ]
        );
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
    // Helper function to determine if a plan is lower tier than current subscription
    const isLowerTier = (planTier: string, currentTier: string): boolean => {
      const tierOrder = ['free', 'basic', 'premium', 'gold'];
      const planIndex = tierOrder.indexOf(planTier);
      const currentIndex = tierOrder.indexOf(currentTier);
      
      return planIndex < currentIndex;
    };
    
    // Helper to find the RevenueCat package matching a plan tier
    const findPackageForTier = (tier: string) => {
      // Skip for free tier
      if (tier === 'free') return null;
      
      // Find package by matching tier name in the identifier
      return packages.find(pkg => 
        pkg.product.identifier.toLowerCase().includes(tier.toLowerCase())
      );
    };
    
    return SUBSCRIPTION_PLANS.map((plan) => {
      const isCurrentPlan = currentTier === plan.tier;
      const isLowerThanCurrent = isLowerTier(plan.tier, currentTier);
      
      // Try to find matching RevenueCat package to get dynamic price
      const matchingPackage = findPackageForTier(plan.tier);
      
      // Use dynamic price if available, fall back to static price
      const displayPrice = plan.price > 0 
        ? (matchingPackage 
            ? matchingPackage.product.priceString 
            : `$${plan.price.toFixed(2)}`) + '/month' 
        : 'Free';
      
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
              {displayPrice}
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
              isCurrentPlan ? styles.currentPlanButton : 
              isLowerThanCurrent ? styles.lowerTierButton : styles.upgradePlanButton,
              purchasing && styles.disabledButton
            ]}
            onPress={() => handlePurchase(plan)}
            disabled={isCurrentPlan || purchasing || isLowerThanCurrent}
            accessibilityLabel={
              isCurrentPlan ? "Current Plan" : 
              isLowerThanCurrent ? "Lower Tier" : 
              `Upgrade to ${plan.name}`
            }
          >
            {purchasing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.planButtonText}>
                {isCurrentPlan ? 'Current Plan' : 
                 isLowerThanCurrent ? 'Lower Tier' : 'Upgrade'}
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
      
      {/* Show subscription cancelled banner if applicable */}
      {!loading && currentTier !== 'free' && subscriptionStatus.isCancelled && subscriptionStatus.expirationDate && (
        <SubscriptionCancelledBanner
          expirationDate={subscriptionStatus.expirationDate}
          tier={subscriptionStatus.tier}
        />
      )}

      {/* Show grace period banner if applicable */}
      {!loading && currentTier !== 'free' && subscriptionStatus.isInGracePeriod && subscriptionStatus.expirationDate && (
        <GracePeriodBanner
          expirationDate={subscriptionStatus.expirationDate}
          tier={subscriptionStatus.tier}
        />
      )}
      
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
                  
                  // Store the error for display in the UI
                  setRevenueCatError(error);
                  
                  // Still show the alert for normal operation
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
            {/* Simulated purchase warning - based on user preference only */}
            {debugOptions.simulateRevenueCat && (
              <View style={styles.expoGoNotice}>
                <Ionicons name="information-circle" size={22} color="#F59E0B" style={{ marginRight: 8 }} />
                <Text style={styles.expoGoText}>
                  Using simulated RevenueCat data. Purchases are not real and will not be charged.
                </Text>
              </View>
            )}
            
            {/* Debug toggle notice - only shown in DEBUG mode */}
            {DEBUG_TOOLS_TOGGLE && (
              <View style={[styles.expoGoNotice, {backgroundColor: '#DBEAFE', borderColor: '#3B82F6'}]}>
                <Ionicons name="bug" size={22} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text style={[styles.expoGoText, {color: '#1E3A8A'}]}>
                  Debug mode enabled. Additional diagnostic information is visible.
                </Text>
              </View>
            )}
            
            {/* Enhanced RevenueCat & Environment Diagnostic Information - Only shown when DEBUG_TOOLS_TOGGLE is true */}
            {DEBUG_TOOLS_TOGGLE && (
              <View style={styles.revenueCatStatusContainer}>
                <Text style={styles.revenueCatStatusTitle}>Diagnostic Information</Text>
                
                {/* Core Environment Variables - Critical section */}
                <View style={styles.diagnosticSection}>
                  <Text style={styles.diagnosticSectionTitle}>Core Environment</Text>
                  <View style={styles.revenueCatStatusItem}>
                    <Text style={styles.revenueCatStatusLabel}>__DEV__:</Text>
                    <Text style={[
                      styles.revenueCatStatusValue, 
                      {color: __DEV__ ? '#059669' : '#1E40AF'}
                    ]}>
                      {__DEV__ ? 'TRUE' : 'FALSE'}
                    </Text>
                  </View>
                  <View style={styles.revenueCatStatusItem}>
                    <Text style={styles.revenueCatStatusLabel}>User Preference:</Text>
                    <Text style={[
                      styles.revenueCatStatusValue,
                      {color: debugOptions.simulateRevenueCat ? '#D97706' : '#1E40AF'}
                    ]}>
                      {debugOptions.simulateRevenueCat ? 'TRUE' : 'FALSE'} (active)
                    </Text>
                  </View>
                  <View style={styles.revenueCatStatusItem}>
                    <Text style={styles.revenueCatStatusLabel}>process.env.DEPLOY_ENV:</Text>
                    <Text style={styles.revenueCatStatusValue}>
                      {process.env.DEPLOY_ENV || 'not set'}
                    </Text>
                  </View>
                  <View style={styles.revenueCatStatusItem}>
                    <Text style={styles.revenueCatStatusLabel}>Is Production Build:</Text>
                    <Text style={styles.revenueCatStatusValue}>
                      {isProductionBuild() ? 'YES' : 'NO'}
                    </Text>
                  </View>
                </View>
                
                {/* RevenueCat Status - Enhanced */}
                <View style={styles.diagnosticSection}>
                  <Text style={styles.diagnosticSectionTitle}>RevenueCat Status</Text>
                  <View style={styles.revenueCatStatusItem}>
                    <Text style={styles.revenueCatStatusLabel}>Mode:</Text>
                    <Text style={[
                      styles.revenueCatStatusValue,
                      {
                        color: debugOptions.simulateRevenueCat
                          ? '#D97706'  // Amber for simulated
                          : __DEV__ 
                            ? '#059669'  // Green for sandbox
                            : '#1E40AF'  // Blue for production
                      }
                    ]}>
                      {debugOptions.simulateRevenueCat ? 'SIMULATED' : __DEV__ ? 'SANDBOX' : 'PRODUCTION'}
                    </Text>
                  </View>
                  <View style={styles.revenueCatStatusItem}>
                    <Text style={styles.revenueCatStatusLabel}>Current Tier:</Text>
                    <Text style={styles.revenueCatStatusValue}>{currentTier.toUpperCase()}</Text>
                  </View>
                  <View style={styles.revenueCatStatusItem}>
                    <Text style={styles.revenueCatStatusLabel}>Expiration:</Text>
                    <Text style={styles.revenueCatStatusValue}>{formatDate(expirationDate)}</Text>
                  </View>
                  {currentTier !== 'free' && (
                    <View style={styles.revenueCatStatusItem}>
                      <Text style={styles.revenueCatStatusLabel}>Cancellation Status:</Text>
                      <Text style={[
                        styles.revenueCatStatusValue,
                        {color: subscriptionStatus.isCancelled ? '#EF4444' : '#22C55E'}
                      ]}>
                        {subscriptionStatus.isCancelled ? 'CANCELLED' : 'ACTIVE'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.revenueCatStatusItem}>
                    <Text style={styles.revenueCatStatusLabel}>Offerings:</Text>
                    <Text style={styles.revenueCatStatusValue}>
                      {packages.length > 0 ? `${packages.length} available` : 'None loaded'}
                    </Text>
                  </View>
                  <View style={styles.revenueCatStatusItem}>
                    <Text style={styles.revenueCatStatusLabel}>Platform:</Text>
                    <Text style={styles.revenueCatStatusValue}>
                      {Platform.OS.toUpperCase()} {Platform.Version}
                    </Text>
                  </View>
                  
                  {/* Expected Product IDs (based on config) */}
                  <Text style={[styles.diagnosticSectionSubtitle, {marginTop: 12}]}>Expected Product IDs</Text>
                  <View style={styles.jsonPreviewBox}>
                    <Text style={styles.jsonText}>
                      {Platform.OS === 'ios' ? 
                        'basic_tier3, premium_tier3, gold_tier3' : 
                        'basic_tier:monthly, premium_tier:monthly, gold_tier:monthly'}
                    </Text>
                  </View>
                  
                  {/* Available Products */}
                  <Text style={[styles.diagnosticSectionSubtitle, {marginTop: 12}]}>Available Products</Text>
                  <View style={styles.jsonPreviewBox}>
                    <ScrollView style={{maxHeight: 120}} nestedScrollEnabled={true}>
                      {packages.length > 0 ? (
                        packages.map((pkg, idx) => (
                          <Text key={idx} style={styles.jsonText}>
                            {idx+1}. {pkg.product.identifier} ({pkg.product.priceString})
                          </Text>
                        ))
                      ) : (
                        <Text style={styles.jsonText}>No packages available</Text>
                      )}
                    </ScrollView>
                  </View>
                  
                  {/* Purchase Flow Status */}
                  <Text style={[styles.diagnosticSectionSubtitle, {marginTop: 12}]}>Purchase Flow Status</Text>
                  <View style={styles.revenueCatStatusItemFlex}>
                    <View style={[
                      styles.statusIndicator, 
                      {backgroundColor: currentTier !== 'free' ? '#22C55E' : '#9CA3AF'}
                    ]} />
                    <Text style={styles.revenueCatStatusLabel}>Active Subscription:</Text>
                    <Text style={styles.revenueCatStatusValue}>
                      {currentTier !== 'free' ? `YES (${currentTier})` : 'NO'}
                    </Text>
                  </View>
                  
                  <View style={styles.revenueCatStatusItemFlex}>
                    <View style={[
                      styles.statusIndicator, 
                      {backgroundColor: packages.length > 0 ? '#22C55E' : '#EF4444'}
                    ]} />
                    <Text style={styles.revenueCatStatusLabel}>Products Available:</Text>
                    <Text style={styles.revenueCatStatusValue}>
                      {packages.length > 0 ? 'YES' : 'NO'}
                    </Text>
                  </View>
                  
                  <View style={styles.revenueCatStatusItemFlex}>
                    <View style={[
                      styles.statusIndicator, 
                      {backgroundColor: (tokenUsage && !isNaN(tokenUsage.usedTokens)) ? '#22C55E' : '#EF4444'}
                    ]} />
                    <Text style={styles.revenueCatStatusLabel}>Usage Tracking:</Text>
                    <Text style={styles.revenueCatStatusValue}>
                      {(tokenUsage && !isNaN(tokenUsage.usedTokens)) ? 'WORKING' : 'NOT WORKING'}
                    </Text>
                  </View>
                  
                  <View style={styles.revenueCatStatusItemFlex}>
                    <View style={[
                      styles.statusIndicator, 
                      {backgroundColor: purchasing ? '#F59E0B' : '#22C55E'}
                    ]} />
                    <Text style={styles.revenueCatStatusLabel}>Purchase State:</Text>
                    <Text style={styles.revenueCatStatusValue}>
                      {purchasing ? 'IN PROGRESS' : 'READY'}
                    </Text>
                  </View>
                </View>
                
                {/* Platform & Device Info */}
                <View style={styles.diagnosticSection}>
                  <Text style={styles.diagnosticSectionTitle}>Platform Info</Text>
                  <View style={styles.revenueCatStatusItem}>
                    <Text style={styles.revenueCatStatusLabel}>Platform:</Text>
                    <Text style={styles.revenueCatStatusValue}>
                      {Platform.OS.toUpperCase()} {Platform.Version}
                    </Text>
                  </View>
                  <View style={styles.revenueCatStatusItem}>
                    <Text style={styles.revenueCatStatusLabel}>Deployment Env:</Text>
                    <Text style={styles.revenueCatStatusValue}>
                      {getDeploymentEnvironment().toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.revenueCatStatusItem}>
                    <Text style={styles.revenueCatStatusLabel}>App Version:</Text>
                    <Text style={styles.revenueCatStatusValue}>
                      {require('expo-constants').manifest?.version || 
                      require('expo-constants').manifest2?.version || 'unknown'}
                    </Text>
                  </View>
                  <View style={styles.revenueCatStatusItem}>
                    <Text style={styles.revenueCatStatusLabel}>Device:</Text>
                    <Text style={styles.revenueCatStatusValue}>
                      {require('expo-constants').deviceName || 'unknown'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={loadData}
                    disabled={loading}
                  >
                    <Ionicons name="refresh" size={16} color="#FFF" />
                    <Text style={styles.refreshButtonText}>Refresh Info</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => {
                      // Collect diagnostic info and display it
                      const envInfo = logEnvironmentInfo();
                      const diagInfo = {
                        environment: {
                          __DEV__,
                          USE_SIMULATED_REVENUECAT,
                          DEPLOY_ENV: process.env.DEPLOY_ENV || 'not set',
                          isExpoGo: isExpoGo(),
                          isProductionBuild: isProductionBuild(),
                          deploymentEnvironment: getDeploymentEnvironment()
                        },
                        revenueCat: {
                          currentTier,
                          expirationDate: expirationDate ? formatDate(expirationDate) : 'N/A',
                          packages: packages.length,
                          tokenUsage: tokenUsage ? {
                            usedTokens: tokenUsage.usedTokens,
                            tokenLimit: tokenUsage.tokenLimit,
                            percentageUsed: tokenUsage.percentageUsed
                          } : 'Not available'
                        },
                        platform: {
                          OS: Platform.OS,
                          version: Platform.Version,
                          constants: Platform.constants,
                          timestamp: new Date().toISOString()
                        }
                      };
                      
                      // Show the diagnostic information in an alert instead of copying
                      Alert.alert(
                        'Diagnostic Information',
                        JSON.stringify(diagInfo, null, 2),
                        [{ text: 'OK' }],
                        { cancelable: true }
                      );
                    }}
                  >
                    <Ionicons name="information-circle-outline" size={16} color="#FFF" />
                    <Text style={styles.refreshButtonText}>Show Diagnostics</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Show RevenueCat error details for debugging only when DEBUG_TOOLS_TOGGLE is true */}
            {DEBUG_TOOLS_TOGGLE && revenueCatError && (
              <RevenueCatErrorDisplay 
                error={revenueCatError}
                title="RevenueCat Error Details (Debug Mode)" 
                onClear={() => setRevenueCatError(null)}
              />
            )}

            <View style={styles.infoContainer}>
              <Text style={styles.infoSectionTitle}>Subscription Information</Text>
              
              {/* Subscription Details - Using dynamic pricing */}
              {SUBSCRIPTION_PLANS.filter(plan => plan.tier !== 'free').map(plan => {
                // Find matching package to get dynamic price
                const matchingPackage = packages.find(pkg => 
                  pkg.product.identifier.toLowerCase().includes(plan.tier.toLowerCase())
                );
                
                // Use dynamic price if available, fall back to static price
                const displayPrice = matchingPackage 
                  ? matchingPackage.product.priceString 
                  : `$${plan.price.toFixed(2)}`;
                
                return (
                  <View key={plan.tier} style={styles.subscriptionDetailsContainer}>
                    <Text style={styles.subscriptionDetailsTitle}>
                      {plan.name} Tier - {displayPrice}/month
                    </Text>
                    <Text style={styles.subscriptionDetail}>• Monthly subscription (30 days)</Text>
                    <Text style={styles.subscriptionDetail}>• {plan.monthlyTokens} token limit per month</Text>
                    <Text style={styles.subscriptionDetail}>• Price: {displayPrice} per month</Text>
                  </View>
                );
              })}
              
              {/* Renewal and Management Information */}
              <View style={styles.renewalInfoContainer}>
                <Text style={styles.renewalInfoTitle}>Renewal and Management Information</Text>
                <Text style={styles.infoText}>
                  • Payment will be charged to your Apple ID account at confirmation of purchase
                </Text>
                <Text style={styles.infoText}>
                  • Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period
                </Text>
                <Text style={styles.infoText}>
                  • Account will be charged for renewal within 24 hours prior to the end of the current period
                </Text>
                <Text style={styles.infoText}>
                  • You can manage your subscriptions in your {getStoreText()} account settings after purchase
                </Text>
                <Text style={styles.infoText}>
                  • You can cancel your subscription at any time through your {getStoreText()} settings, which will prevent automatic renewal for the next billing cycle while maintaining access until the end of your current period
                </Text>
                <Text style={styles.infoText}>
                  • Any unused portion of a free trial period, if offered, will be forfeited when the user purchases a subscription
                </Text>
              </View>
              
              {/* Links to Terms and Privacy */}
              <View style={styles.legalLinksContainer}>
                <Text style={styles.legalLinksText}>
                  By purchasing a subscription, you confirm that you have read and agree to our{' '}
                  <Text 
                    style={styles.legalLink} 
                    onPress={() => Linking.openURL('https://persistent-lychee-e09.notion.site/Confluency-Terms-of-Service-EULA-1f2282c115ae804ba5aec1f6239b6962?pvs=4')}
                  >
                    Terms of Service
                  </Text>{' '}
                  and{' '}
                  <Text 
                    style={styles.legalLink} 
                    onPress={() => Linking.openURL('https://persistent-lychee-e09.notion.site/Confluency-Privacy-Policy-1e4282c115ae80ed8f27ce8c8cfb2e9e?pvs=4')}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </View>
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
  revenueCatStatusContainer: {
    backgroundColor: '#EFF6FF', // Light blue background
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  revenueCatStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF', // Darker blue text
    marginBottom: 16,
    textAlign: 'center',
  },
  diagnosticSection: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  diagnosticSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  diagnosticSectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  revenueCatStatusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  revenueCatStatusItemFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  revenueCatStatusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    flex: 1,
  },
  revenueCatStatusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
    textAlign: 'right',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B5563',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
    marginLeft: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  jsonPreviewBox: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    padding: 8,
    marginVertical: 4,
  },
  jsonText: {
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  statusIndicator: {
    width: 8, 
    height: 8,
    borderRadius: 4,
    marginRight: 10,
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
  lowerTierButton: {
    backgroundColor: colors.gray400,
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
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 16,
    textAlign: 'center',
  },
  subscriptionDetailsContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  subscriptionDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  subscriptionDetail: {
    fontSize: 14,
    color: colors.gray700,
    lineHeight: 22,
    paddingLeft: 8,
  },
  renewalInfoContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  renewalInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
    marginBottom: 12,
  },
  legalLinksContainer: {
    marginTop: 8,
    paddingTop: 8,
  },
  legalLinksText: {
    fontSize: 13,
    color: colors.gray700,
    textAlign: 'center',
    lineHeight: 20,
  },
  legalLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

export default SubscriptionScreen;