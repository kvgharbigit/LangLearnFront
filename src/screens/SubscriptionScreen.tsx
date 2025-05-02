import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import colors from '../styles/colors';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../types/subscription';
import { MonthlyUsage } from '../types/usage';
import { 
  getCurrentSubscription, 
  getOfferings, 
  purchasePackage,
  restorePurchases
} from '../services/revenueCatService';
import { getUserUsage } from '../services/usageService';
import { isExpoGo, getStoreText } from '../utils/deviceInfo';

type Props = NativeStackScreenProps<RootStackParamList, 'Subscription'>;

const SubscriptionScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [usage, setUsage] = useState<MonthlyUsage | null>(null);
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    loadData();
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
      
      Alert.alert(
        'Subscription Updated',
        `You are now subscribed to the ${plan.name} plan!`
      );
      
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
    if (!usage) return null;
    
    const { percentageUsed } = usage;
    const progressWidth = `${percentageUsed}%`;
    
    let progressColor = colors.primary;
    if (percentageUsed > 90) {
      progressColor = colors.danger;
    } else if (percentageUsed > 70) {
      progressColor = '#FFB300'; // amber/warning color
    }
    
    return (
      <View style={styles.usageContainer}>
        <View style={styles.usageHeader}>
          <Text style={styles.usageTitle}>Confluency Credits Usage</Text>
          <Text style={styles.usagePercentage}>{Math.round(percentageUsed)}%</Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: progressWidth, backgroundColor: progressColor }
            ]}
          />
        </View>
        
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
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.featureIcon} />
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
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confluency Credits</Text>
        <View style={styles.backButton} />
      </View>
      
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Loading subscription details...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          {/* Current Plan Summary */}
          <View style={styles.currentPlanSection}>
            <Text style={styles.sectionTitle}>Current Plan</Text>
            <View style={styles.currentPlanInfo}>
              <Text style={styles.currentPlanName}>
                {SUBSCRIPTION_PLANS.find(p => p.tier === currentTier)?.name || 'Free'}
              </Text>
              {expirationDate && (
                <Text style={styles.expirationText}>
                  Expires: {formatDate(expirationDate)}
                </Text>
              )}
            </View>
          </View>
          
          {/* Usage Progress */}
          {renderUsageProgress()}
          
          {/* Available Plans */}
          <View style={styles.plansSection}>
            <Text style={styles.sectionTitle}>Available Plans</Text>
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
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
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
    padding: 16,
    paddingBottom: 32,
  },
  currentPlanSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
    marginBottom: 12,
  },
  currentPlanInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentPlanName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
  },
  expirationText: {
    fontSize: 14,
    color: colors.gray600,
  },
  usageContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray800,
  },
  usagePercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  usageNote: {
    fontSize: 12,
    color: colors.gray600,
    marginTop: 4,
  },
  plansSection: {
    marginBottom: 16,
  },
  plansContainer: {
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
  },
  popularText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  planHeader: {
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  monthlyCredit: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
    marginTop: 4,
  },
  planFeatures: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.gray700,
  },
  planButton: {
    borderRadius: 8,
    paddingVertical: 12,
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
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  infoContainer: {
    padding: 16,
    backgroundColor: colors.gray100,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.gray600,
    marginBottom: 8,
  },
  expoGoNotice: {
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#FEF3C7', // Amber/yellow light background
    borderRadius: 8,
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