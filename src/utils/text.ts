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
 * Highlights differences between original text and suggestion based on the specified mode
 */
export const highlightDifferences = (
  original: string, 
  suggestion: string, 
  mode: 'user' | 'corrected' | 'natural' = 'corrected'
): string => {
  if (!original || !suggestion) return suggestion;

  // First check if they're equivalent after normalization
  if (areMessagesEquivalent(original, suggestion)) {
    return suggestion; // Return suggestion as-is if they're equivalent
  }

  if (mode === 'user') {
    // For user message, match words with 'corrected' in a similar position
    const userWords = suggestion.split(/\s+/);
    const correctedWords = original.split(/\s+/);
    
    // Convert to normalized forms for comparison
    const normalizedUserWords = userWords.map(w => normalizeText(w));
    const normalizedCorrectedWords = correctedWords.map(w => normalizeText(w));
    
    // Create a map of word positions in corrected text
    const correctedWordPositions = new Map();
    normalizedCorrectedWords.forEach((word, index) => {
      if (!correctedWordPositions.has(word)) {
        correctedWordPositions.set(word, []);
      }
      correctedWordPositions.get(word).push(index);
    });
    
    // First check if all words exist in both sentences (only position errors)
    // Create sets of normalized words for comparison
    const normalizedUserWordSet = new Set(normalizedUserWords);
    const normalizedCorrectedWordSet = new Set(normalizedCorrectedWords);
    
    // Check if every word in user message exists in corrected
    const allUserWordsExistInCorrected = normalizedUserWords.every(word => 
      normalizedCorrectedWordSet.has(word)
    );
    
    // Check if every word in corrected exists in user
    const allCorrectedWordsExistInUser = normalizedCorrectedWords.every(word => 
      normalizedUserWordSet.has(word)
    );
    
    // Only positional errors if all words exist in both texts
    const onlyPositionalErrors = allUserWordsExistInCorrected && allCorrectedWordsExistInUser;
    
    // Mark words based on position matching
    const result = userWords.map((word, index) => {
      const normalizedWord = normalizeText(word);
      
      // If the word doesn't exist in corrected at all
      if (!correctedWordPositions.has(normalizedWord)) {
        return `<strong>${word}</strong>`; // Red bold
      }
      
      // Check if the word appears in a similar position
      const positionsInCorrected = correctedWordPositions.get(normalizedWord);
      
      // Find the closest position match
      let bestPositionMatch = -1;
      let minPositionDiff = Infinity;
      
      positionsInCorrected.forEach(position => {
        const positionDiff = Math.abs(position - index);
        if (positionDiff < minPositionDiff) {
          minPositionDiff = positionDiff;
          bestPositionMatch = position;
        }
      });
      
      // If position is within a reasonable threshold (allow for some words to be added/removed)
      // The threshold of 2 allows words to be up to 2 positions away and still match
      const POSITION_THRESHOLD = 2; 
      if (minPositionDiff <= POSITION_THRESHOLD) {
        // Words in correct position are green
        return `<greentext>${word}</greentext>`; // Green for matching words in similar position
      } else {
        // Words in significantly different position - handling depends on whether it's only positional errors
        if (onlyPositionalErrors) {
          // Use underline style for pure position errors
          return `<positionerror>${word}</positionerror>`; // Underlined style for position-only errors
        } else {
          // Use regular error style when there are other types of errors too
          return `<strong>${word}</strong>`; // Red bold for words that exist but in wrong position
        }
      }
    });
    
    return result.join(' ');
  } 
  else if (mode === 'corrected') {
    // For corrected message, highlight words not from user message in red+bold
    const correctedWords = suggestion.split(/\s+/);
    const userWords = original.split(/\s+/);
    
    // Create a normalized set of user words for faster lookup
    const normalizedUserWords = new Set(
      userWords.map(word => normalizeText(word))
    );
    
    // Mark words that don't appear in the user text as new
    const result = correctedWords.map(word => {
      const normalizedWord = normalizeText(word);
      
      // Words not in user message are red and bold
      if (!normalizedUserWords.has(normalizedWord)) {
        return `<strong>${word}</strong>`;
      }
      
      // Words in user message are green
      return `<greentext>${word}</greentext>`;
    });
    
    return result.join(' ');
  }
  else {
    // For natural message, highlight words not in user message in ORANGE and bold
    const naturalWords = suggestion.split(/\s+/);
    const userWords = original.split(/\s+/);
    
    // Create a normalized set of user words for faster lookup
    const normalizedUserWords = new Set(
      userWords.map(word => normalizeText(word))
    );
    
    // Mark words that don't appear in the user message as new (orange and bold)
    const result = naturalWords.map(word => {
      const normalizedWord = normalizeText(word);
      
      // Words not in user message are orange and bold
      if (!normalizedUserWords.has(normalizedWord)) {
        // Using orangetext for words not in user message
        return `<orangetext>${word}</orangetext>`;
      }
      
      // Words in user message remain plain black text (no special marking)
      return word;
    });
    
    const joinedResult = result.join(' ');
    console.log("Final HTML for natural field:", joinedResult);
    return joinedResult;
  }
};

export default {
  normalizeText,
  areMessagesEquivalent,
  highlightDifferences
};