// src/components/LanguageKeyboardHelper.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import colors from '../styles/colors';

interface LanguageKeyboardHelperProps {
  language: string;
  onCharSelect: (char: string) => void;
}

const LanguageKeyboardHelper: React.FC<LanguageKeyboardHelperProps> = ({
  language,
  onCharSelect
}) => {
  // Define special characters for each language
  const specialChars: Record<string, string[]> = {
    'es': ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'],
    'fr': ['à', 'â', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'ù', 'û', 'ü', 'ÿ', 'æ', 'œ'],
    'de': ['ä', 'ö', 'ü', 'ß'],
    'it': ['à', 'è', 'é', 'ì', 'ò', 'ù'],
    'pt': ['á', 'â', 'ã', 'à', 'ç', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú'],
    'pl': ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż'],
    'nl': ['á', 'é', 'í', 'ó', 'ú', 'ë', 'ï', 'ö', 'ü', 'ij'],
    'hu': ['á', 'é', 'í', 'ó', 'ö', 'ő', 'ú', 'ü', 'ű'],
    'fi': ['ä', 'ö', 'å'],
    'el': ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω'],
    'tr': ['ç', 'ğ', 'ı', 'i', 'ö', 'ş', 'ü'],
    'ru': ['а', 'б', 'в', 'г', 'д', 'е', 'ё', 'ж', 'з', 'и', 'й', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ъ', 'ы', 'ь', 'э', 'ю', 'я'],
    'zh': ['。', '，', '？', '！', '：', '；', '（', '）', '【', '】', '「', '」', '"', '"'],
    'ja': ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と', '。', '、', 'ー'],
    'ko': ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ', 'ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ', 'ㅣ'],
    'ar': ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'],
    'hi': ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ', 'क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ', 'ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह']
  };

  // Common punctuation for all languages
  const commonChars = ['?', '!', ',', '.', ':', ';', '\'', '"', '(', ')', '[', ']', '-', '+', '=', '@', '#', '$', '%', '&', '*', '/', '\\'];

  // Get language-specific characters, or common ones if language not supported
  const chars = specialChars[language] || commonChars;

  // Don't render if there are no special characters
  if (chars.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {chars.map((char, index) => (
          <TouchableOpacity
            key={index}
            style={styles.charButton}
            onPress={() => onCharSelect(char)}
          >
            <Text style={styles.charText}>{char}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray100,
    borderTopWidth: 1,
    borderTopColor: colors.gray300,
    paddingVertical: 8,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  charButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray300,
    padding: 8,
    marginHorizontal: 4,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  charText: {
    fontSize: 16,
    color: colors.gray800,
  }
});

export default LanguageKeyboardHelper;