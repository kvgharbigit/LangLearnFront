import React, { useState } from 'react';
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
import * as WebBrowser from 'expo-web-browser';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

const PrivacyPolicyScreen: React.FC<Props> = ({ navigation }) => {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: May 14, 2025</Text>
        
        <Text style={styles.sectionTitle}>Privacy Policy</Text>
        
        <Text style={styles.paragraph}>
          You can also view our Privacy Policy online at:{' '}
          <Text 
            style={styles.link}
            onPress={() => Linking.openURL('https://persistent-lychee-e09.notion.site/Confluency-Privacy-Policy-1e4282c115ae80ed8f27ce8c8cfb2e9e?pvs=4')}
          >
            https://persistent-lychee-e09.notion.site/Confluency-Privacy-Policy
          </Text>
        </Text>
        
        <Text style={styles.paragraph}>
          LangLearn ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how
          your personal information is collected, used, and disclosed by LangLearn when you use our mobile application
          and related services (collectively, the "Service").
        </Text>

        <Text style={styles.sectionHeader}>1. Information We Collect</Text>
        <Text style={styles.paragraphHeader}>Personal Information</Text>
        <Text style={styles.paragraph}>
          We may collect the following types of personal information:
        </Text>
        <Text style={styles.bulletPoint}>• Contact information (such as email address)</Text>
        <Text style={styles.bulletPoint}>• Account credentials (such as username and password)</Text>
        <Text style={styles.bulletPoint}>• Profile information (such as display name)</Text>
        <Text style={styles.bulletPoint}>• Payment information (processed by Apple App Store)</Text>
        <Text style={styles.bulletPoint}>• User-generated content (such as language learning exercises)</Text>
        <Text style={styles.bulletPoint}>• Audio recordings (for speech recognition features)</Text>

        <Text style={styles.paragraphHeader}>Usage Data</Text>
        <Text style={styles.paragraph}>
          We automatically collect certain information about your device and how you interact with our Service, including:
        </Text>
        <Text style={styles.bulletPoint}>• Device information (such as device type, operating system)</Text>
        <Text style={styles.bulletPoint}>• Usage statistics (such as features used, time spent)</Text>
        <Text style={styles.bulletPoint}>• Performance data (such as crashes, errors)</Text>
        <Text style={styles.bulletPoint}>• Learning progress and statistics</Text>

        <Text style={styles.sectionHeader}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use the information we collect for various purposes, including to:
        </Text>
        <Text style={styles.bulletPoint}>• Provide, maintain, and improve our Service</Text>
        <Text style={styles.bulletPoint}>• Process and manage your account and subscriptions</Text>
        <Text style={styles.bulletPoint}>• Personalize your learning experience</Text>
        <Text style={styles.bulletPoint}>• Communicate with you about our Service</Text>
        <Text style={styles.bulletPoint}>• Monitor and analyze usage patterns and trends</Text>
        <Text style={styles.bulletPoint}>• Detect, prevent, and address technical issues</Text>
        <Text style={styles.bulletPoint}>• Comply with legal obligations</Text>

        <Text style={styles.sectionHeader}>3. How We Share Your Information</Text>
        <Text style={styles.paragraph}>
          We may share your personal information with:
        </Text>
        <Text style={styles.bulletPoint}>• Service providers who perform services on our behalf</Text>
        <Text style={styles.bulletPoint}>• Third-party language processing services (such as speech recognition)</Text>
        <Text style={styles.bulletPoint}>• Analytics providers to help us understand app usage</Text>
        <Text style={styles.bulletPoint}>• Payment processors to process subscription purchases</Text>
        <Text style={styles.bulletPoint}>• Law enforcement or other parties when required by law</Text>

        <Text style={styles.paragraph}>
          We do not sell your personal information to third parties.
        </Text>

        <Text style={styles.sectionHeader}>4. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement appropriate technical and organizational measures to protect the security of your personal
          information. However, please be aware that no method of transmission over the internet or electronic storage
          is 100% secure, and we cannot guarantee absolute security.
        </Text>

        <Text style={styles.sectionHeader}>5. Your Rights and Choices</Text>
        <Text style={styles.paragraph}>
          Depending on your location, you may have certain rights regarding your personal information, such as:
        </Text>
        <Text style={styles.bulletPoint}>• Access and review the personal information we hold about you</Text>
        <Text style={styles.bulletPoint}>• Update or correct inaccurate information</Text>
        <Text style={styles.bulletPoint}>• Delete your personal information</Text>
        <Text style={styles.bulletPoint}>• Restrict or object to certain processing of your data</Text>
        <Text style={styles.bulletPoint}>• Data portability</Text>

        <Text style={styles.paragraph}>
          To exercise these rights, please contact us using the information provided at the end of this policy.
        </Text>

        <Text style={styles.sectionHeader}>6. Subscription Management</Text>
        <Text style={styles.paragraph}>
          Subscription purchases are processed through the Apple App Store. Payment information is handled directly
          by Apple and is subject to their privacy practices. You can manage your subscriptions through your Apple ID
          account settings.
        </Text>

        <Text style={styles.sectionHeader}>7. Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your personal information for as long as necessary to provide you with our Service and as needed to
          comply with our legal obligations. If you delete your account, we will delete or anonymize your personal
          information, unless we are legally required to maintain certain information.
        </Text>

        <Text style={styles.sectionHeader}>8. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Our Service is not directed to children under the age of 13, and we do not knowingly collect personal information
          from children under 13. If we discover that a child under 13 has provided us with personal information, we will
          promptly delete it.
        </Text>

        <Text style={styles.sectionHeader}>9. International Data Transfers</Text>
        <Text style={styles.paragraph}>
          Your personal information may be transferred to and processed in countries other than the country in which you
          reside. These countries may have data protection laws that are different from the laws of your country.
        </Text>

        <Text style={styles.sectionHeader}>10. Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
          Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy
          Policy periodically for any changes.
        </Text>

        <Text style={styles.sectionHeader}>11. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
        </Text>
        <Text style={styles.paragraph}>
          privacy@langlearn.com
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
  paragraphHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
    marginTop: 12,
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
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

export default PrivacyPolicyScreen;