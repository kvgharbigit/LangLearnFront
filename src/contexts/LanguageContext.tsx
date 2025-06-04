import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGES } from '../constants/languages';

// Storage key for app language
const APP_LANGUAGE_KEY = 'app_language';

// Default language is English
const DEFAULT_LANGUAGE = 'en';

// Interface for our context
interface LanguageContextType {
  appLanguage: string;
  setAppLanguage: (code: string) => Promise<void>;
  translate: (key: string) => string;
  getLanguageName: (code: string) => string;
}

// Create the context with a default value
const LanguageContext = createContext<LanguageContextType>({
  appLanguage: DEFAULT_LANGUAGE,
  setAppLanguage: async () => {},
  translate: () => '',
  getLanguageName: () => '',
});

// Translations for UI elements
const translations: Record<string, Record<string, string>> = {
  // English translations
  en: {
    // Profile Screen
    'profile.title': 'Confluency',
    'profile.guest': 'Guest',
    'profile.editProfile': 'Edit Profile',
    'profile.settings': 'Settings',
    'profile.appLanguage': 'App Language',
    'profile.subscription': 'Subscription',
    'profile.currentPlan': 'Current Plan',
    'profile.support': 'Support',
    'profile.helpCenter': 'Help Center',
    'profile.contactUs': 'Contact Us',
    'profile.legal': 'Legal',
    'profile.privacyPolicy': 'Privacy Policy',
    'profile.termsOfService': 'Terms of Service',
    'profile.version': 'Version',
    'profile.logoutConfirmTitle': 'Confirm Logout',
    'profile.logoutConfirmMessage': 'Are you sure you want to log out?',
    'profile.logoutError': 'An error occurred during logout. Please try again.',
    
    // Legacy keys (keeping for backward compatibility)
    'profile.section.subscription': 'Subscription',
    'profile.manage.subscription': 'Manage Subscription',
    'profile.section.preferences': 'Preferences',
    'profile.app.language': 'App Language',
    'profile.learning.languages': 'Learning Languages',
    'profile.change': 'Change',
    'profile.section.support': 'Support',
    'profile.contact.support': 'Contact Support',
    'profile.section.account': 'Account',
    'profile.logout': 'Log Out',
    'profile.logout.confirm.title': 'Confirm Logout',
    'profile.logout.confirm.message': 'Are you sure you want to log out?',
    'profile.logout.confirm.cancel': 'Cancel',
    'profile.logout.confirm.logout': 'Log Out',

    // Subscription Screen
    'subscription.title': 'Conversation Tokens',
    'subscription.current': 'Current Subscription',
    'subscription.plan': 'Plan',
    'subscription.usage': 'Conversation Tokens Usage',
    'subscription.reset': 'Resets on',
    'subscription.available.plans': 'Available Plans',
    'subscription.restore': 'Restore Purchases',
    'subscription.expo.notice': 'Running in development mode. Purchases are simulated and not charged.',
    'subscription.legal.text': 'Subscriptions will automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period.',
    'subscription.manage.text': 'You can manage your subscriptions in your App Store/Google Play account settings after purchase.',
    
    // Language Selection
    'language.i.speak': 'I speak:',
    'language.want.to.learn': 'I want to learn:',
    'language.difficulty': 'Difficulty:',
    'language.conversation.mode': 'Conversation Mode:',
    'language.learning.objective': 'Learning Objective (optional):',
    'language.start.button': 'Start Learning',
    'language.app.title': 'App Language',

    // Common
    'common.error': 'Error',
    
    // Buttons
    'button.cancel': 'Cancel',
    'button.save': 'Save',
    'button.select': 'Select',
    'button.continue': 'Continue',
    'button.back': 'Back',
  },
  
  // Spanish translations
  es: {
    'profile.title': 'Confluency',
    'profile.guest': 'Invitado',
    'profile.editProfile': 'Editar Perfil',
    'profile.settings': 'Configuración',
    'profile.appLanguage': 'Idioma de la App',
    'profile.subscription': 'Suscripción',
    'profile.currentPlan': 'Plan Actual',
    'profile.support': 'Soporte',
    'profile.helpCenter': 'Centro de Ayuda',
    'profile.contactUs': 'Contáctanos',
    'profile.legal': 'Legal',
    'profile.privacyPolicy': 'Política de Privacidad',
    'profile.termsOfService': 'Términos de Servicio',
    'profile.version': 'Versión',
    'profile.logoutConfirmTitle': 'Confirmar Cierre de Sesión',
    'profile.logoutConfirmMessage': '¿Estás seguro de que deseas cerrar sesión?',
    'profile.logoutError': 'Ocurrió un error durante el cierre de sesión. Por favor, inténtalo de nuevo.',
    
    // Legacy keys
    'profile.section.subscription': 'Suscripción',
    'profile.manage.subscription': 'Administrar Suscripción',
    'profile.section.preferences': 'Preferencias',
    'profile.app.language': 'Idioma de la App',
    'profile.learning.languages': 'Idiomas de Aprendizaje',
    'profile.change': 'Cambiar',
    'profile.section.support': 'Soporte',
    'profile.contact.support': 'Contactar Soporte',
    'profile.section.account': 'Cuenta',
    'profile.logout': 'Cerrar Sesión',
    'profile.logout.confirm.title': 'Confirmar Cierre de Sesión',
    'profile.logout.confirm.message': '¿Estás seguro de que deseas cerrar sesión?',
    'profile.logout.confirm.cancel': 'Cancelar',
    'profile.logout.confirm.logout': 'Cerrar Sesión',

    'subscription.title': 'Tokens de Conversación',
    'subscription.current': 'Suscripción Actual',
    'subscription.plan': 'Plan',
    'subscription.usage': 'Uso de Tokens de Conversación',
    'subscription.reset': 'Se restablece el',
    'subscription.available.plans': 'Planes Disponibles',
    'subscription.restore': 'Restaurar Compras',
    'subscription.expo.notice': 'Ejecutando en modo de desarrollo. Las compras son simuladas y no se cobran.',
    'subscription.legal.text': 'Las suscripciones se renovarán automáticamente a menos que la renovación automática se desactive al menos 24 horas antes del final del período actual.',
    'subscription.manage.text': 'Puedes administrar tus suscripciones en la configuración de tu cuenta de App Store/Google Play después de la compra.',
    
    'language.i.speak': 'Yo hablo:',
    'language.want.to.learn': 'Quiero aprender:',
    'language.difficulty': 'Dificultad:',
    'language.conversation.mode': 'Modo de Conversación:',
    'language.learning.objective': 'Objetivo de Aprendizaje (opcional):',
    'language.start.button': 'Comenzar a Aprender',
    'language.app.title': 'Idioma de la Aplicación',

    // Common
    'common.error': 'Error',
    
    'button.cancel': 'Cancelar',
    'button.save': 'Guardar',
    'button.select': 'Seleccionar',
    'button.continue': 'Continuar',
    'button.back': 'Volver',
  },

  // French translations
  fr: {
    'profile.title': 'Confluency',
    'profile.section.subscription': 'Abonnement',
    'profile.manage.subscription': 'Gérer l\'Abonnement',
    'profile.section.preferences': 'Préférences',
    'profile.app.language': 'Langue de l\'Application',
    'profile.learning.languages': 'Langues d\'Apprentissage',
    'profile.change': 'Modifier',
    'profile.section.support': 'Support',
    'profile.contact.support': 'Contacter le Support',
    'profile.section.account': 'Compte',
    'profile.logout': 'Déconnexion',
    'profile.logout.confirm.title': 'Confirmer la Déconnexion',
    'profile.logout.confirm.message': 'Êtes-vous sûr de vouloir vous déconnecter?',
    'profile.logout.confirm.cancel': 'Annuler',
    'profile.logout.confirm.logout': 'Déconnexion',

    'subscription.title': 'Tokens de Conversation',
    'subscription.current': 'Abonnement Actuel',
    'subscription.plan': 'Plan',
    'subscription.usage': 'Utilisation des Tokens de Conversation',
    'subscription.reset': 'Réinitialisation le',
    'subscription.available.plans': 'Plans Disponibles',
    'subscription.restore': 'Restaurer les Achats',
    'subscription.expo.notice': 'Exécution en mode développement. Les achats sont simulés et non facturés.',
    'subscription.legal.text': 'Les abonnements seront automatiquement renouvelés sauf si le renouvellement automatique est désactivé au moins 24 heures avant la fin de la période en cours.',
    'subscription.manage.text': 'Vous pouvez gérer vos abonnements dans les paramètres de votre compte App Store/Google Play après l\'achat.',
    
    'language.i.speak': 'Je parle:',
    'language.want.to.learn': 'Je veux apprendre:',
    'language.difficulty': 'Difficulté:',
    'language.conversation.mode': 'Mode de Conversation:',
    'language.learning.objective': 'Objectif d\'Apprentissage (optionnel):',
    'language.start.button': 'Commencer l\'Apprentissage',
    'language.app.title': 'Langue de l\'Application',

    // Common
    'common.error': 'Erreur',
    
    'button.cancel': 'Annuler',
    'button.save': 'Enregistrer',
    'button.select': 'Sélectionner',
    'button.continue': 'Continuer',
    'button.back': 'Retour',
  },
  
  // German translations
  de: {
    'profile.title': 'Confluency',
    'profile.section.subscription': 'Abonnement',
    'profile.manage.subscription': 'Abonnement verwalten',
    'profile.section.preferences': 'Einstellungen',
    'profile.app.language': 'App-Sprache',
    'profile.learning.languages': 'Lernsprachen',
    'profile.change': 'Ändern',
    'profile.section.support': 'Support',
    'profile.contact.support': 'Support kontaktieren',
    'profile.section.account': 'Konto',
    'profile.logout': 'Abmelden',
    'profile.logout.confirm.title': 'Abmeldung bestätigen',
    'profile.logout.confirm.message': 'Sind Sie sicher, dass Sie sich abmelden möchten?',
    'profile.logout.confirm.cancel': 'Abbrechen',
    'profile.logout.confirm.logout': 'Abmelden',

    'subscription.title': 'Konversations-Tokens',
    'subscription.current': 'Aktuelles Abonnement',
    'subscription.plan': 'Plan',
    'subscription.usage': 'Konversations-Tokens Nutzung',
    'subscription.reset': 'Zurückgesetzt am',
    'subscription.available.plans': 'Verfügbare Pläne',
    'subscription.restore': 'Käufe wiederherstellen',
    'subscription.expo.notice': 'Läuft im Entwicklungsmodus. Käufe werden simuliert und nicht berechnet.',
    'subscription.legal.text': 'Abonnements werden automatisch verlängert, es sei denn, die automatische Verlängerung wird mindestens 24 Stunden vor Ende des aktuellen Zeitraums deaktiviert.',
    'subscription.manage.text': 'Sie können Ihre Abonnements in den Einstellungen Ihres App Store/Google Play-Kontos nach dem Kauf verwalten.',
    
    'language.i.speak': 'Ich spreche:',
    'language.want.to.learn': 'Ich möchte lernen:',
    'language.difficulty': 'Schwierigkeitsgrad:',
    'language.conversation.mode': 'Konversationsmodus:',
    'language.learning.objective': 'Lernziel (optional):',
    'language.start.button': 'Mit dem Lernen beginnen',
    'language.app.title': 'App-Sprache',

    // Common
    'common.error': 'Fehler',
    
    'button.cancel': 'Abbrechen',
    'button.save': 'Speichern',
    'button.select': 'Auswählen',
    'button.continue': 'Fortfahren',
    'button.back': 'Zurück',
  },
  
  // Chinese translations
  zh: {
    'profile.title': 'Confluency',
    'profile.section.subscription': '订阅',
    'profile.manage.subscription': '管理订阅',
    'profile.section.preferences': '偏好设置',
    'profile.app.language': '应用语言',
    'profile.learning.languages': '学习语言',
    'profile.change': '更改',
    'profile.section.support': '支持',
    'profile.contact.support': '联系支持',
    'profile.section.account': '账户',
    'profile.logout': '退出登录',
    'profile.logout.confirm.title': '确认退出',
    'profile.logout.confirm.message': '您确定要退出登录吗？',
    'profile.logout.confirm.cancel': '取消',
    'profile.logout.confirm.logout': '退出登录',

    'subscription.title': '对话代币',
    'subscription.current': '当前订阅',
    'subscription.plan': '方案',
    'subscription.usage': '对话代币使用情况',
    'subscription.reset': '重置于',
    'subscription.available.plans': '可用方案',
    'subscription.restore': '恢复购买',
    'subscription.expo.notice': '在开发模式下运行。购买被模拟，不会收费。',
    'subscription.legal.text': '除非在当前期限结束前至少24小时关闭自动续订，否则订阅将自动续订。',
    'subscription.manage.text': '购买后，您可以在App Store/Google Play帐户设置中管理您的订阅。',
    
    'language.i.speak': '我说:',
    'language.want.to.learn': '我想学习:',
    'language.difficulty': '难度:',
    'language.conversation.mode': '对话模式:',
    'language.learning.objective': '学习目标（可选）:',
    'language.start.button': '开始学习',
    'language.app.title': '应用语言',

    // Common
    'common.error': '错误',
    
    'button.cancel': '取消',
    'button.save': '保存',
    'button.select': '选择',
    'button.continue': '继续',
    'button.back': '返回',
  },
};

// Provider component
export const LanguageProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [appLanguage, setAppLanguageState] = useState<string>(DEFAULT_LANGUAGE);

  // Load saved language on mount
  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
        if (savedLanguage) {
          setAppLanguageState(savedLanguage);
        }
      } catch (error) {
        console.error('Error loading saved app language:', error);
      }
    };

    loadSavedLanguage();
  }, []);

  // Function to set app language
  const setAppLanguage = async (code: string) => {
    try {
      await AsyncStorage.setItem(APP_LANGUAGE_KEY, code);
      setAppLanguageState(code);
    } catch (error) {
      console.error('Error saving app language:', error);
    }
  };

  // Function to translate keys based on current language
  const translate = (key: string): string => {
    // First check if the translation exists for current language
    if (translations[appLanguage] && translations[appLanguage][key]) {
      return translations[appLanguage][key];
    }
    
    // Fallback to English
    if (translations.en && translations.en[key]) {
      return translations.en[key];
    }
    
    // If no translation found, return the key itself
    return key;
  };

  // Function to get language name from code
  const getLanguageName = (code: string): string => {
    const language = LANGUAGES.find(lang => lang.code === code);
    return language ? language.name : code;
  };

  return (
    <LanguageContext.Provider value={{ appLanguage, setAppLanguage, translate, getLanguageName }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;