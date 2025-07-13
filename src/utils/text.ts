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
    // For corrected message, highlight words in RED if they are new OR used in different context
    const correctedWords = suggestion.split(/\s+/);
    const userWords = original.split(/\s+/);
    
    // Create normalized versions for comparison
    const normalizedCorrectedWords = correctedWords.map(w => normalizeText(w));
    const normalizedUserWords = userWords.map(w => normalizeText(w));
    
    // Create a set for quick lookup of user words
    const normalizedUserWordSet = new Set(normalizedUserWords);
    
    // Helper function to get context window around a word
    const getWordContext = (words: string[], index: number, windowSize: number = 1) => {
      const before = words.slice(Math.max(0, index - windowSize), index).join(' ');
      const after = words.slice(index + 1, Math.min(words.length, index + windowSize + 1)).join(' ');
      return { before, after };
    };
    
    // Helper function to check if word appears in similar context
    const hasSimilarContext = (word: string, correctedIndex: number): boolean => {
      const normalizedWord = normalizeText(word);
      
      // Find all occurrences of this word in the user message
      const userOccurrences: number[] = [];
      normalizedUserWords.forEach((userWord, index) => {
        if (userWord === normalizedWord) {
          userOccurrences.push(index);
        }
      });
      
      if (userOccurrences.length === 0) return false;
      
      // Get context in corrected message
      const correctedContext = getWordContext(normalizedCorrectedWords, correctedIndex);
      
      // Check if any occurrence in user message has similar context
      for (const userIndex of userOccurrences) {
        const userContext = getWordContext(normalizedUserWords, userIndex);
        
        // Check if either before or after context matches (allowing for some flexibility)
        if (correctedContext.before === userContext.before || 
            correctedContext.after === userContext.after ||
            (correctedContext.before.includes(userContext.before) && userContext.before !== '') ||
            (correctedContext.after.includes(userContext.after) && userContext.after !== '')) {
          return true;
        }
      }
      
      return false;
    };
    
    // Mark words based on whether they exist and their context
    const result = correctedWords.map((word, index) => {
      const normalizedWord = normalizeText(word);
      
      // If the word doesn't exist in user message at all
      if (!normalizedUserWordSet.has(normalizedWord)) {
        // Using red+bold for completely new words
        return `<strong>${word}</strong>`;
      }
      
      // Word exists - check if it's used in different context
      if (!hasSimilarContext(word, index)) {
        // Word exists but in different context - highlight in red+bold
        return `<strong>${word}</strong>`;
      }
      
      // Word exists in similar context - keep as regular text
      return word;
    });
    
    return result.join(' ');
  }
  else {
    // For natural message, highlight words in ORANGE if they are new OR used in different context
    const naturalWords = suggestion.split(/\s+/);
    const userWords = original.split(/\s+/);
    
    // Create normalized versions for comparison
    const normalizedNaturalWords = naturalWords.map(w => normalizeText(w));
    const normalizedUserWords = userWords.map(w => normalizeText(w));
    
    // Create a set for quick lookup of user words
    const normalizedUserWordSet = new Set(normalizedUserWords);
    
    // Helper function to get context window around a word
    const getWordContext = (words: string[], index: number, windowSize: number = 1) => {
      const before = words.slice(Math.max(0, index - windowSize), index).join(' ');
      const after = words.slice(index + 1, Math.min(words.length, index + windowSize + 1)).join(' ');
      return { before, after };
    };
    
    // Helper function to check if word appears in similar context
    const hasSimilarContext = (word: string, naturalIndex: number): boolean => {
      const normalizedWord = normalizeText(word);
      
      // Find all occurrences of this word in the user message
      const userOccurrences: number[] = [];
      normalizedUserWords.forEach((userWord, index) => {
        if (userWord === normalizedWord) {
          userOccurrences.push(index);
        }
      });
      
      if (userOccurrences.length === 0) return false;
      
      // Get context in natural message
      const naturalContext = getWordContext(normalizedNaturalWords, naturalIndex);
      
      // Check if any occurrence in user message has similar context
      for (const userIndex of userOccurrences) {
        const userContext = getWordContext(normalizedUserWords, userIndex);
        
        // Check if either before or after context matches (allowing for some flexibility)
        if (naturalContext.before === userContext.before || 
            naturalContext.after === userContext.after ||
            (naturalContext.before.includes(userContext.before) && userContext.before !== '') ||
            (naturalContext.after.includes(userContext.after) && userContext.after !== '')) {
          return true;
        }
      }
      
      return false;
    };
    
    // Mark words based on whether they exist and their context
    const result = naturalWords.map((word, index) => {
      const normalizedWord = normalizeText(word);
      
      // If the word doesn't exist in user message at all
      if (!normalizedUserWordSet.has(normalizedWord)) {
        // Using orangetext for completely new words
        return `<orangetext>${word}</orangetext>`;
      }
      
      // Word exists - check if it's used in different context
      if (!hasSimilarContext(word, index)) {
        // Word exists but in different context - highlight in orange
        return `<orangetext>${word}</orangetext>`;
      }
      
      // Word exists in similar context - keep as regular text
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