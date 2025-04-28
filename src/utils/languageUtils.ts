// src/utils/languageUtils.ts
import { getLanguageInfo } from '../constants/languages';
import { isRepetitionRequest } from './repetitionPhrases';

/**
 * Gets welcome message appropriate for the target language
 * @param language Target language code
 * @param learningObjective Optional learning objective
 * @returns Welcome message in the target language
 */
export function getWelcomeMessage(language: string, learningObjective?: string): string {
  // Welcome messages for different languages
  const welcomeMessages: Record<string, { basic: string, withObjective: string }> = {
    "en": {
      basic: "Hello! I'm your English tutor. How can I help you today?",
      withObjective: `Hello! I see you want to practice: "${learningObjective}". Let's begin!`
    },
    "es": {
      basic: "¡Hola! Soy tu tutor de español. ¿Cómo estás hoy?",
      withObjective: `¡Hola! Veo que quieres practicar: "${learningObjective}". ¡Empecemos!`
    },
    "fr": {
      basic: "Bonjour! Je suis votre tuteur de français. Comment allez-vous aujourd'hui?",
      withObjective: `Bonjour! Je vois que vous voulez pratiquer: "${learningObjective}". Commençons!`
    },
    "it": {
      basic: "Ciao! Sono il tuo tutor di italiano. Come stai oggi?",
      withObjective: `Ciao! Vedo che vuoi praticare: "${learningObjective}". Iniziamo!`
    },
    "de": {
      basic: "Hallo! Ich bin dein Deutsch-Tutor. Wie geht es dir heute?",
      withObjective: `Hallo! Ich sehe, dass du über "${learningObjective}" lernen möchtest. Fangen wir an!`
    },
    "pt": {
      basic: "Olá! Sou seu tutor de português. Como está hoje?",
      withObjective: `Olá! Vejo que você quer praticar: "${learningObjective}". Vamos começar!`
    },
    "zh": {
      basic: "你好！我是你的中文老师。今天你好吗？",
      withObjective: `你好！我看到你想学习关于"${learningObjective}"的内容。让我们开始吧！`
    },
    "ja": {
      basic: "こんにちは！私はあなたの日本語チューターです。今日の調子はどうですか？",
      withObjective: `こんにちは！"${learningObjective}"について学びたいようですね。始めましょう！`
    },
    "ko": {
      basic: "안녕하세요! 저는 당신의 한국어 튜터입니다. 오늘 기분이 어떠세요?",
      withObjective: `안녕하세요! "${learningObjective}"에 대해 배우고 싶어하시는군요. 시작합시다!`
    },
    "ar": {
      basic: "مرحباً! أنا معلمك للغة العربية. كيف حالك اليوم؟",
      withObjective: `مرحباً! أرى أنك تريد أن تتعلم عن "${learningObjective}". فلنبدأ!`
    },
    "hi": {
      basic: "नमस्ते! मैं आपका हिंदी शिक्षक हूँ। आज आप कैसे हैं?",
      withObjective: `नमस्ते! मुझे पता है कि आप "${learningObjective}" के बारे में जानना चाहते हैं। चलिए शुरू करते हैं!`
    },
    "ru": {
      basic: "Привет! Я твой репетитор русского языка. Как ты сегодня?",
      withObjective: `Привет! Я вижу, что ты хочешь изучить "${learningObjective}". Давай начнем!`
    },
    "nl": {
      basic: "Hallo! Ik ben je Nederlandse tutor. Hoe gaat het vandaag?",
      withObjective: `Hallo! Ik zie dat je wilt leren over "${learningObjective}". Laten we beginnen!`
    },
    "pl": {
      basic: "Cześć! Jestem twoim nauczycielem polskiego. Jak się dziś masz?",
      withObjective: `Cześć! Widzę, że chcesz się nauczyć o "${learningObjective}". Zaczynajmy!`
    },
    "hu": {
      basic: "Szia! Én vagyok a magyar tanárod. Hogy vagy ma?",
      withObjective: `Szia! Látom, hogy gyakorolni szeretnél: "${learningObjective}". Kezdjünk bele!`
    },
    "fi": {
      basic: "Hei! Olen suomen kielen opettajasi. Miten voit tänään?",
      withObjective: `Hei! Näen että haluat harjoitella: "${learningObjective}". Aloitetaan!`
    },
    "el": {
      basic: "Γεια σας! Είμαι ο καθηγητής ελληνικών σας. Πώς είστε σήμερα;",
      withObjective: `Γεια σας! Βλέπω ότι θέλετε να εξασκηθείτε στο: "${learningObjective}". Ας ξεκινήσουμε!`
    },
    "tr": {
      basic: "Merhaba! Ben senin Türkçe öğretmeninim. Bugün nasılsın?",
      withObjective: `Merhaba! "${learningObjective}" hakkında pratik yapmak istediğini görüyorum. Başlayalım!`
    }
  };

  // Get welcome message for target language, or use English as fallback
  const langMessages = welcomeMessages[language] || welcomeMessages["en"];

  // Return message with or without learning objective
  return learningObjective ? langMessages.withObjective : langMessages.basic;
}

/**
 * Gets appropriate welcome title in the target language
 * @param language Target language code
 * @returns Welcome title in the target language
 */
export function getWelcomeTitle(language: string): string {
  const titles: Record<string, string> = {
    "en": "Hello! I am your English tutor.",
    "es": "¡Hola! Soy tu tutor de español.",
    "fr": "Bonjour! Je suis votre tuteur de français.",
    "it": "Ciao! Sono il tuo tutor di italiano.",
    "de": "Hallo! Ich bin dein Deutsch-Tutor.",
    "pt": "Olá! Sou seu tutor de português.",
    "zh": "你好！我是你的中文老师。",
    "ja": "こんにちは！私はあなたの日本語チューターです。",
    "ko": "안녕하세요! 저는 당신의 한국어 튜터입니다.",
    "ar": "مرحباً! أنا معلمك للغة العربية.",
    "hi": "नमस्ते! मैं आपका हिंदी शिक्षक हूँ।",
    "ru": "Привет! Я твой репетитор русского языка.",
    "nl": "Hallo! Ik ben je Nederlandse tutor.",
    "pl": "Cześć! Jestem twoim nauczycielem polskiego.",
    "hu": "Szia! Én vagyok a magyar tanárod.",
    "fi": "Hei! Olen suomen kielen opettajasi.",
    "el": "Γεια σας! Είμαι ο καθηγητής ελληνικών σας.",
    "tr": "Merhaba! Ben senin Türkçe öğretmeninim."
  };

  return titles[language] || titles["en"];
}

/**
 * Gets welcome subtitle based on the target language
 * @param language Target language code
 * @returns Welcome subtitle text
 */
export function getWelcomeSubtitle(language: string): string {
  const languageInfo = getLanguageInfo(language);
  return `Start practicing your ${languageInfo.name} conversation skills!`;
}

/**
 * Checks if a message is a repetition request
 * @param message Message text to check
 * @param targetLanguage The language being learned
 * @param nativeLanguage The user's native language
 * @returns Boolean indicating if the message is a repetition request
 */
export function checkRepetitionRequest(message: string, targetLanguage: string, nativeLanguage: string): boolean {
  // If message is empty, it's not a repetition request
  if (!message || message.trim() === '') {
    return false;
  }

  // Create array of languages to check in priority order
  // 1. Check target language first (user might be using target language for repetition)
  // 2. Check native language next (user might fall back to native language)
  // 3. Check English as fallback if neither native nor target is English
  const languagesToCheck = [targetLanguage, nativeLanguage];
  if (!languagesToCheck.includes('en')) {
    languagesToCheck.push('en');
  }

  return isRepetitionRequest(message, languagesToCheck);
}

/**
 * Formats a date for message timestamps
 * @param timestamp ISO string date or Date object
 * @returns Formatted date string for UI
 */
export function formatMessageTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  // Get hours and minutes with leading zeros
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}