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
    'subscription.title': 'Confluency Tokens',
    'subscription.current': 'Current Subscription',
    'subscription.plan': 'Plan',
    'subscription.usage': 'Confluency Tokens Usage',
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

    // Conversation Mode Translations
    'conversation.categories.conversations': 'Conversations',
    'conversation.categories.languageLessons': 'Language Lessons',
    'conversation.freeConversation.label': 'Free Conversation',
    'conversation.freeConversation.description': 'Engage in natural, unstructured conversations about any topic that interests you.',
    'conversation.freeConversation.placeholder': '• Game of Thrones\n• Golfing Tips\n• Holiday Destinations',
    'conversation.topicLesson.label': 'Special Topic Lesson',
    'conversation.topicLesson.description': 'Explore fascinating topics in your target language - history, culture, sport, geopolitics...',
    'conversation.topicLesson.placeholder': '• History of Rome\n• Dog Training Tips\n• Modern Art Movements',
    'conversation.interview.label': 'Interview',
    'conversation.interview.description': 'Express yourself naturally while answering questions about your interests, experiences and opinions.',
    'conversation.interview.placeholder': '• Your Hobbies\n• Travel Experiences\n• Life Goals',
    'conversation.situationSimulation.label': 'Situation Simulation',
    'conversation.situationSimulation.description': 'Practice real-life conversations in common scenarios like restaurants, travel, and shopping.',
    'conversation.situationSimulation.placeholder': '• At a restaurant\n• Job interview\n• Airport check-in\n• Shopping for clothes',
    'conversation.verbChallenge.label': 'Verb Challenge',
    'conversation.verbChallenge.description': 'Practice constructing sentences with essential verbs in different tenses and moods.',
    'conversation.verbChallenge.placeholder': '• Specific verb tenses to practice\n• Difficulty level preferences\n• Types of verbs',
    'conversation.verbChallenge.comingSoon': 'Coming Soon',
    'conversation.topicTheme.label': 'Topic/Theme',
    'conversation.generateRandomTopic': 'Generate Random Topic',
    'conversation.selectMode': 'Select Conversation Mode',
    'conversation.topicInfo': 'Confluency can talk with you about any topic you can dream of - from dating advice to dancing, from Ancient Egypt to Taylor Swift!',
    'loading.generating': 'Generating...',

    // Email Verification
    'email.verification.title': 'Email Verification Required',
    'email.verification.message': 'Your email address needs to be verified before you can continue. Please check your inbox (including spam folder) for a verification email, or use the "Resend Email" button below.',
    'email.verification.ok': 'OK',
    'email.verification.resendEmail': 'Resend Email',
    'email.verification.checkingVerification': 'Checking verification...',
    'email.verification.emailSent': 'Email Sent',
    'email.verification.emailSentMessage': 'A new verification email has been sent. Please check your inbox.',
    'email.verification.errorSending': 'Error Sending',
    'email.verification.errorSendingMessage': 'Failed to send verification email. Please try again.',
    'email.verification.verificationComplete': 'Verification Complete',
    'email.verification.verificationCompleteMessage': 'Your email has been successfully verified.',
    'email.verification.networkError': 'Connection Error',
    'email.verification.networkErrorMessage': 'Please check your internet connection and try again.',
    'email.verification.notVerified': 'Your email is not verified yet. Please check your inbox and click the verification link.',
    'email.verification.checkEmail': 'Please check your email and click the verification link to activate your account.',
    'email.verification.checkEmailTitle': 'Check Your Email',
    'email.verification.checkEmailMessage': 'Please check your email inbox and click the verification link to activate your account. After verification, you\'ll be automatically signed in.',
    'email.verification.cannotOpenEmail': 'Cannot Open Email',
    'email.verification.cannotOpenEmailMessage': 'Unable to open your email app. Please check your email inbox manually.',
    'email.verification.verifyTitle': 'Verify Your Email',
    'email.verification.sentTo': 'We\'ve sent a verification email to:',
    'email.verification.instructions': 'Please check your inbox and click the verification link to activate your account. Don\'t forget to check your spam or junk folder.',
    'email.verification.offlineWarning': 'You are offline. Please connect to the internet to verify your email.',
    'email.verification.openEmailApp': 'Open Email App',
    'email.verification.verifiedButton': 'I\'ve Verified My Email',
    'email.verification.helpText': 'Having trouble? Check your spam folder or contact our support team for assistance.',

    // Quota Exceeded Modal
    'quota.exceeded.title': 'Token Limit Reached',
    'quota.exceeded.message': 'You\'ve reached your monthly token limit for language learning. Upgrade your subscription to continue learning without limits.',
    'quota.exceeded.upgradeNow': 'Upgrade Now',
    'quota.exceeded.notNow': 'Not Now',

    // Loading States
    'loading.general': 'Loading...',
    'loading.savingPreferences': 'Saving preferences...',
    'loading.connecting': 'Connecting...',
    'loading.verifying': 'Verifying...',
    'loading.sendingEmail': 'Sending email...',

    // Status Messages
    'status.offline': 'Offline',
    'status.connecting': 'Connecting...',
    'status.connected': 'Connected',
    'status.disconnected': 'Disconnected',

    // Error Messages
    'error.network.title': 'Connection Error',
    'error.network.message': 'Could not connect to server. Please check your internet connection.',
    'error.auth.generic': 'Authentication error. Please try again.',
    'error.auth.network': 'Network error during authentication.',
    'error.subscription.failed': 'Subscription processing failed.',
    'error.verification.failed': 'Email verification failed.',

    // Placeholders
    'placeholder.learningObjective': 'e.g. Roman history, Japanese culture...',
    'placeholder.searchLanguages': 'Search languages...',
    'placeholder.email': 'your@email.com',
    'placeholder.password': 'Password',

    // Accessibility Labels
    'accessibility.closeModal': 'Close modal',
    'accessibility.selectLanguage': 'Select language',
    'accessibility.backButton': 'Back button',
    'accessibility.menuButton': 'Menu button',

    // Additional Button Labels
    'button.upgradeNow': 'Upgrade Now',
    'button.notNow': 'Not Now',
    'button.resendEmail': 'Resend Email',
    'button.tryAgain': 'Try Again',
    'button.ok': 'OK',

    // Common
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Info',
    
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

    'subscription.title': 'Tokens de Confluency',
    'subscription.current': 'Suscripción Actual',
    'subscription.plan': 'Plan',
    'subscription.usage': 'Uso de Tokens de Confluency',
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

    // Conversation Mode Translations
    'conversation.categories.conversations': 'Conversaciones',
    'conversation.categories.languageLessons': 'Lecciones de Idioma',
    'conversation.freeConversation.label': 'Conversación Libre',
    'conversation.freeConversation.description': 'Participa en conversaciones naturales y no estructuradas sobre cualquier tema que te interese.',
    'conversation.freeConversation.placeholder': '• Juego de Tronos\n• Consejos de Golf\n• Destinos de Vacaciones',
    'conversation.topicLesson.label': 'Lección de Tema Especial',
    'conversation.topicLesson.description': 'Explora temas fascinantes en tu idioma objetivo: historia, cultura, deportes, geopolítica...',
    'conversation.topicLesson.placeholder': '• Historia de Roma\n• Consejos de Entrenamiento de Perros\n• Movimientos de Arte Moderno',
    'conversation.interview.label': 'Entrevista',
    'conversation.interview.description': 'Exprésate naturalmente mientras respondes preguntas sobre tus intereses, experiencias y opiniones.',
    'conversation.interview.placeholder': '• Tus Pasatiempos\n• Experiencias de Viaje\n• Objetivos de Vida',
    'conversation.situationSimulation.label': 'Simulación de Situaciones',
    'conversation.situationSimulation.description': 'Practica conversaciones de la vida real en escenarios comunes como restaurantes, viajes y compras.',
    'conversation.situationSimulation.placeholder': '• En un restaurante\n• Entrevista de trabajo\n• Registro en el aeropuerto\n• Compras de ropa',
    'conversation.verbChallenge.label': 'Desafío de Verbos',
    'conversation.verbChallenge.description': 'Practica construyendo oraciones con verbos esenciales en diferentes tiempos y modos.',
    'conversation.verbChallenge.placeholder': '• Tiempos verbales específicos para practicar\n• Preferencias de nivel de dificultad\n• Tipos de verbos',
    'conversation.verbChallenge.comingSoon': 'Próximamente',
    'conversation.topicTheme.label': 'Tema/Asunto',
    'conversation.generateRandomTopic': 'Generar Tema Aleatorio',
    'conversation.selectMode': 'Seleccionar Modo de Conversación',
    'conversation.topicInfo': '¡Confluency puede conversar contigo sobre cualquier tema que puedas imaginar: desde consejos de citas hasta baile, desde el Antiguo Egipto hasta Taylor Swift!',
    'loading.generating': 'Generando...',

    // Email Verification
    'email.verification.title': 'Verificación de Email Requerida',
    'email.verification.message': 'Tu dirección de email debe ser verificada antes de continuar. Por favor revisa tu bandeja de entrada (incluyendo la carpeta de spam) para un email de verificación, o usa el botón "Reenviar Email" abajo.',
    'email.verification.ok': 'OK',
    'email.verification.resendEmail': 'Reenviar Email',
    'email.verification.checkingVerification': 'Verificando...',
    'email.verification.emailSent': 'Email Enviado',
    'email.verification.emailSentMessage': 'Se ha enviado un nuevo email de verificación. Por favor revisa tu bandeja de entrada.',
    'email.verification.errorSending': 'Error al Enviar',
    'email.verification.errorSendingMessage': 'No se pudo enviar el email de verificación. Por favor inténtalo de nuevo.',
    'email.verification.verificationComplete': 'Verificación Completa',
    'email.verification.verificationCompleteMessage': 'Tu email ha sido verificado exitosamente.',
    'email.verification.networkError': 'Error de Conexión',
    'email.verification.networkErrorMessage': 'Por favor verifica tu conexión a internet e inténtalo de nuevo.',
    'email.verification.notVerified': 'Tu email aún no está verificado. Por favor revisa tu bandeja de entrada y haz clic en el enlace de verificación.',
    'email.verification.checkEmail': 'Por favor revisa tu email y haz clic en el enlace de verificación para activar tu cuenta.',
    'email.verification.checkEmailTitle': 'Revisa Tu Email',
    'email.verification.checkEmailMessage': 'Por favor revisa tu bandeja de entrada y haz clic en el enlace de verificación para activar tu cuenta. Después de la verificación, serás conectado automáticamente.',
    'email.verification.cannotOpenEmail': 'No Se Puede Abrir Email',
    'email.verification.cannotOpenEmailMessage': 'No se pudo abrir tu aplicación de email. Por favor revisa tu bandeja de entrada manualmente.',
    'email.verification.verifyTitle': 'Verifica Tu Email',
    'email.verification.sentTo': 'Hemos enviado un email de verificación a:',
    'email.verification.instructions': 'Por favor revisa tu bandeja de entrada y haz clic en el enlace de verificación para activar tu cuenta. No olvides revisar tu carpeta de spam.',
    'email.verification.offlineWarning': 'Estás sin conexión. Por favor conéctate a internet para verificar tu email.',
    'email.verification.openEmailApp': 'Abrir App de Email',
    'email.verification.verifiedButton': 'He Verificado Mi Email',
    'email.verification.helpText': '¿Tienes problemas? Revisa tu carpeta de spam o contacta a nuestro equipo de soporte.',

    // Quota Exceeded Modal
    'quota.exceeded.title': 'Límite de Tokens Alcanzado',
    'quota.exceeded.message': 'Has alcanzado tu límite mensual de tokens para aprendizaje de idiomas. Actualiza tu suscripción para continuar aprendiendo sin límites.',
    'quota.exceeded.upgradeNow': 'Actualizar Ahora',
    'quota.exceeded.notNow': 'Ahora No',

    // Loading States
    'loading.general': 'Cargando...',
    'loading.savingPreferences': 'Guardando preferencias...',
    'loading.connecting': 'Conectando...',
    'loading.verifying': 'Verificando...',
    'loading.sendingEmail': 'Enviando email...',

    // Status Messages
    'status.offline': 'Sin conexión',
    'status.connecting': 'Conectando...',
    'status.connected': 'Conectado',
    'status.disconnected': 'Desconectado',

    // Error Messages
    'error.network.title': 'Error de Conexión',
    'error.network.message': 'No se pudo conectar al servidor. Por favor verifica tu conexión a internet.',
    'error.auth.generic': 'Error de autenticación. Por favor inténtalo de nuevo.',
    'error.auth.network': 'Error de conexión durante la autenticación.',
    'error.subscription.failed': 'Error al procesar la suscripción.',
    'error.verification.failed': 'Error en la verificación del email.',

    // Placeholders
    'placeholder.learningObjective': 'Ej: Historia romana, cultura japonesa...',
    'placeholder.searchLanguages': 'Buscar idiomas...',
    'placeholder.email': 'tu@email.com',
    'placeholder.password': 'Contraseña',

    // Accessibility Labels
    'accessibility.closeModal': 'Cerrar modal',
    'accessibility.selectLanguage': 'Seleccionar idioma',
    'accessibility.backButton': 'Botón de regresar',
    'accessibility.menuButton': 'Botón de menú',

    // Additional Button Labels
    'button.upgradeNow': 'Actualizar Ahora',
    'button.notNow': 'Ahora No',
    'button.resendEmail': 'Reenviar Email',
    'button.tryAgain': 'Intentar de Nuevo',
    'button.ok': 'OK',

    // Common
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.warning': 'Advertencia',
    'common.info': 'Información',
    
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

    'subscription.title': 'Tokens de Confluency',
    'subscription.current': 'Abonnement Actuel',
    'subscription.plan': 'Plan',
    'subscription.usage': 'Utilisation des Tokens de Confluency',
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

    'subscription.title': 'Confluency-Tokens',
    'subscription.current': 'Aktuelles Abonnement',
    'subscription.plan': 'Plan',
    'subscription.usage': 'Confluency-Tokens Nutzung',
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

    'subscription.title': 'Confluency代币',
    'subscription.current': '当前订阅',
    'subscription.plan': '方案',
    'subscription.usage': 'Confluency代币使用情况',
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