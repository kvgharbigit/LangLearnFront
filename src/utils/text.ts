/**
 * Normalizes text by removing accents, punctuation, and extra spacing
 */
export const normalizeText = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents (á -> a, é -> e, etc.)
    .replace(/[.,;:¿?!¡'"()[\]{}\-_@#$%^&*+=<>]/g, '') // Remove all punctuation including Spanish punctuation
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
};

/**
 * Determines if two messages are semantically equivalent
 */
export const areMessagesEquivalent = (original: string, suggestion: string): boolean => {
  const normalizedOriginal = normalizeText(original);
  const normalizedSuggestion = normalizeText(suggestion);

  return normalizedOriginal === normalizedSuggestion;
};

/**
 * Highlights differences between original text and suggestion
 */
export const highlightDifferences = (original: string, suggestion: string): string => {
  if (!original || !suggestion) return suggestion;

  // First check if they're equivalent after normalization
  if (areMessagesEquivalent(original, suggestion)) {
    return suggestion; // Return suggestion as-is if they're equivalent
  }

  // Split suggestion into words, preserving original capitalization and punctuation
  const suggestionWords = suggestion.split(/\s+/);

  // Create a copy of suggestion words to modify
  const highlightedWords = suggestionWords.map((word) => {
    // Normalize current word for comparison, keeping original word for display
    const normalizedWord = normalizeText(word);

    // Check if this normalized word exists in the original text
    const isExactMatch = normalizeText(original)
      .split(/\s+/)
      .some(orig => normalizeText(orig) === normalizedWord);

    // If word is not in the original text, wrap it in <strong>
    return isExactMatch ? word : `<strong>${word}</strong>`;
  });

  // Convert back to a string, allowing HTML
  return highlightedWords.join(' ');
};

export default {
  normalizeText,
  areMessagesEquivalent,
  highlightDifferences
};