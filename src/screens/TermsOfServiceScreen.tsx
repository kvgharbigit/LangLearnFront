import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking
} from 'react-native';
import SafeView from '../components/SafeView';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TermsOfService'>;

const TermsOfServiceScreen: React.FC<Props> = ({ navigation }) => {
  // Link to standard Apple EULA
  const standardAppleEULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

  return (
    <SafeView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: May 14, 2025</Text>
        
        <Text style={styles.sectionTitle}>Terms of Service</Text>
        
        <Text style={styles.paragraph}>
          You can also view our Terms of Service online at:{' '}
          <Text 
            style={styles.link}
            onPress={() => Linking.openURL('https://persistent-lychee-e09.notion.site/Confluency-Terms-of-Service-EULA-1f2282c115ae804ba5aec1f6239b6962?pvs=4')}
          >
            https://persistent-lychee-e09.notion.site/Confluency-Terms-of-Service-EULA
          </Text>
        </Text>
        
        <Text style={styles.paragraph}>
          Welcome to LangLearn! These Terms of Service ("Terms") govern your use of the LangLearn mobile application
          and all related services (collectively, the "Service"). By using our Service, you agree to be bound by these Terms.
        </Text>

        <Text style={styles.sectionHeader}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing or using our Service, you acknowledge that you have read, understood, and agree to be bound by these Terms.
          If you do not agree with any part of these Terms, you must not use our Service.
        </Text>

        <Text style={styles.sectionHeader}>2. Subscription Services</Text>
        <Text style={styles.paragraph}>
          Our app offers auto-renewable subscription options to access premium features. The following terms apply to subscriptions:
        </Text>
        <Text style={styles.bulletPoint}>• Subscription length: Monthly, billed every 30 days</Text>
        <Text style={styles.bulletPoint}>• Pricing: Varies by tier (Basic: $4.99/month, Premium: $11.99/month, Gold: $19.99/month)</Text>
        <Text style={styles.bulletPoint}>• Payment will be charged to your Apple ID account at confirmation of purchase</Text>
        <Text style={styles.bulletPoint}>• Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period</Text>
        <Text style={styles.bulletPoint}>• Account will be charged for renewal within 24 hours prior to the end of the current period</Text>
        <Text style={styles.bulletPoint}>• Subscriptions may be managed by the user and auto-renewal may be turned off by going to the user's Account Settings after purchase</Text>
        <Text style={styles.bulletPoint}>• No cancellation of the current subscription is allowed during active subscription period</Text>
        <Text style={styles.bulletPoint}>• Any unused portion of a free trial period, if offered, will be forfeited when the user purchases a subscription</Text>

        <Text style={styles.sectionHeader}>3. User Accounts</Text>
        <Text style={styles.paragraph}>
          To use certain features of our Service, you may need to create an account. You are responsible for maintaining
          the confidentiality of your account credentials and for all activities that occur under your account.
        </Text>

        <Text style={styles.sectionHeader}>4. User Content</Text>
        <Text style={styles.paragraph}>
          Our Service may allow you to create, upload, or share content. You retain ownership of any intellectual
          property rights you hold in that content, but you grant us a worldwide, royalty-free license to use, copy, 
          reproduce, process, adapt, modify, publish, transmit, display, and distribute such content.
        </Text>

        <Text style={styles.sectionHeader}>5. Prohibited Uses</Text>
        <Text style={styles.paragraph}>
          You agree not to use the Service: (a) in violation of these Terms; (b) in violation of any applicable laws;
          (c) to infringe upon intellectual property rights; (d) to harass, abuse, or harm others; (e) to develop or
          generate unauthorized data; (f) to impersonate any person or entity; or (g) to interfere with the Service.
        </Text>

        <Text style={styles.sectionHeader}>6. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          The Service and its original content, features, and functionality are owned by LangLearn and are protected by
          international copyright, trademark, patent, trade secret, and other intellectual property laws.
        </Text>

        <Text style={styles.sectionHeader}>7. Termination</Text>
        <Text style={styles.paragraph}>
          We may terminate or suspend your account and access to the Service immediately, without prior notice or
          liability, for any reason, including breach of these Terms. Upon termination, your right to use the Service
          will immediately cease.
        </Text>

        <Text style={styles.sectionHeader}>8. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          To the maximum extent permitted by law, in no event shall LangLearn be liable for any indirect, incidental,
          special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising out of or in
          connection with your access to or use of the Service.
        </Text>

        <Text style={styles.sectionHeader}>9. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify these Terms at any time. If we make material changes, we will notify you through
          the Service or by other means. Your continued use of the Service after such notice constitutes your acceptance
          of the modified Terms.
        </Text>

        <Text style={styles.sectionHeader}>10. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms shall be governed by the laws of the state of California, without regard to its conflict of law
          provisions. Any disputes relating to these Terms or your use of the Service shall be subject to the exclusive
          jurisdiction of the courts in California.
        </Text>

        <Text style={styles.paragraph} style={styles.standardEula}>
          For Apple App Store users, the Standard EULA provided by Apple also applies. You can view the standard Apple EULA by{' '}
          <Text 
            style={styles.link}
            onPress={() => Linking.openURL(standardAppleEULA)}
          >
            clicking here
          </Text>
          .
        </Text>

        <Text style={styles.sectionHeader}>11. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms, please contact us at legal@langlearn.com.
        </Text>
      </ScrollView>
    </SafeView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 14,
    color: colors.gray500,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
    marginTop: 24,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.gray700,
    marginBottom: 16,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.gray700,
    marginBottom: 8,
    paddingLeft: 16,
  },
  standardEula: {
    marginTop: 24,
    fontSize: 16,
    fontStyle: 'italic',
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

export default TermsOfServiceScreen;