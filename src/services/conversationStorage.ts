import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../types/messages';

// Storage keys
const CONVERSATION_STORAGE_KEY = '@confluency:conversations';
const CONVERSATION_LIST_KEY = '@confluency:conversation_list';

// Types
export interface ConversationSettings {
  conversationMode: string;
  learningObjective: string;
  difficulty: string;
  nativeLanguage: string;
  targetLanguage: string;
  tempo: number;
  isMuted: boolean;
}

export interface StoredConversation {
  conversationId: string;
  history: Message[];
  settings: ConversationSettings;
  createdAt: string;
  lastActivity: string;
  title?: string; // Auto-generated from first message
}

export interface ConversationListItem {
  conversationId: string;
  title: string;
  lastActivity: string;
  messageCount: number;
  targetLanguage: string;
}

/**
 * Service for managing conversation persistence in AsyncStorage
 */
class ConversationStorageService {
  private static readonly RETENTION_DAYS = 7; // Keep conversations for 7 days

  /**
   * Save a conversation to AsyncStorage
   */
  async saveConversation(conversation: StoredConversation): Promise<void> {
    try {
      // Update last activity
      conversation.lastActivity = new Date().toISOString();
      
      // Generate title if not provided
      if (!conversation.title && conversation.history.length > 0) {
        conversation.title = this.generateConversationTitle(conversation);
      }

      // Save the conversation
      const key = this.getConversationKey(conversation.conversationId);
      await AsyncStorage.setItem(key, JSON.stringify(conversation));

      // Update conversation list
      await this.updateConversationList(conversation);

      console.log(`💾 Saved conversation ${conversation.conversationId} with ${conversation.history.length} messages`);
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }

  /**
   * Load a conversation from AsyncStorage
   */
  async loadConversation(conversationId: string): Promise<StoredConversation | null> {
    try {
      const key = this.getConversationKey(conversationId);
      const stored = await AsyncStorage.getItem(key);
      
      if (!stored) {
        return null;
      }

      const conversation: StoredConversation = JSON.parse(stored);
      console.log(`📖 Loaded conversation ${conversationId} with ${conversation.history.length} messages`);
      
      return conversation;
    } catch (error) {
      console.error('Error loading conversation:', error);
      return null;
    }
  }

  /**
   * Get list of all conversations
   */
  async getConversationList(): Promise<ConversationListItem[]> {
    try {
      const stored = await AsyncStorage.getItem(CONVERSATION_LIST_KEY);
      if (!stored) {
        return [];
      }

      const list: ConversationListItem[] = JSON.parse(stored);
      
      // Sort by last activity (newest first)
      return list.sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );
    } catch (error) {
      console.error('Error getting conversation list:', error);
      return [];
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      // Remove conversation data
      const key = this.getConversationKey(conversationId);
      await AsyncStorage.removeItem(key);

      // Remove from conversation list
      await this.removeFromConversationList(conversationId);

      console.log(`🗑️ Deleted conversation ${conversationId}`);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  /**
   * Clean up old conversations (older than retention period)
   */
  async cleanupOldConversations(): Promise<number> {
    try {
      const conversationList = await this.getConversationList();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - ConversationStorageService.RETENTION_DAYS);

      const toDelete = conversationList.filter(item => 
        new Date(item.lastActivity) < cutoffDate
      );

      for (const item of toDelete) {
        await this.deleteConversation(item.conversationId);
      }

      if (toDelete.length > 0) {
        console.log(`🧹 Cleaned up ${toDelete.length} old conversations`);
      }

      return toDelete.length;
    } catch (error) {
      console.error('Error cleaning up old conversations:', error);
      return 0;
    }
  }

  /**
   * Get the most recent conversation
   */
  async getMostRecentConversation(): Promise<StoredConversation | null> {
    try {
      const list = await this.getConversationList();
      if (list.length === 0) {
        return null;
      }

      const mostRecent = list[0]; // Already sorted by last activity
      return await this.loadConversation(mostRecent.conversationId);
    } catch (error) {
      console.error('Error getting most recent conversation:', error);
      return null;
    }
  }

  /**
   * Check if a conversation exists
   */
  async conversationExists(conversationId: string): Promise<boolean> {
    try {
      const key = this.getConversationKey(conversationId);
      const stored = await AsyncStorage.getItem(key);
      return stored !== null;
    } catch (error) {
      console.error('Error checking conversation existence:', error);
      return false;
    }
  }

  /**
   * Update conversation history only (for performance)
   */
  async updateConversationHistory(conversationId: string, history: Message[]): Promise<void> {
    try {
      const conversation = await this.loadConversation(conversationId);
      if (!conversation) {
        console.warn(`Cannot update history for non-existent conversation ${conversationId}`);
        return;
      }

      conversation.history = history;
      await this.saveConversation(conversation);
    } catch (error) {
      console.error('Error updating conversation history:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private getConversationKey(conversationId: string): string {
    return `${CONVERSATION_STORAGE_KEY}:${conversationId}`;
  }

  private generateConversationTitle(conversation: StoredConversation): string {
    // Use first user message or learning objective as title
    const firstUserMessage = conversation.history.find(msg => msg.role === 'user');
    if (firstUserMessage && firstUserMessage.content.length <= 50) {
      return firstUserMessage.content;
    } else if (firstUserMessage) {
      return firstUserMessage.content.substring(0, 47) + '...';
    } else if (conversation.settings.learningObjective) {
      return conversation.settings.learningObjective.length <= 50 
        ? conversation.settings.learningObjective
        : conversation.settings.learningObjective.substring(0, 47) + '...';
    } else {
      return `${conversation.settings.targetLanguage.toUpperCase()} conversation`;
    }
  }

  private async updateConversationList(conversation: StoredConversation): Promise<void> {
    try {
      const list = await this.getConversationList();
      
      // Remove existing entry if it exists
      const filteredList = list.filter(item => item.conversationId !== conversation.conversationId);
      
      // Add updated entry
      const listItem: ConversationListItem = {
        conversationId: conversation.conversationId,
        title: conversation.title || this.generateConversationTitle(conversation),
        lastActivity: conversation.lastActivity,
        messageCount: conversation.history.length,
        targetLanguage: conversation.settings.targetLanguage
      };
      
      filteredList.unshift(listItem); // Add to beginning
      
      // Keep only the most recent 50 conversations in the list
      const trimmedList = filteredList.slice(0, 50);
      
      await AsyncStorage.setItem(CONVERSATION_LIST_KEY, JSON.stringify(trimmedList));
    } catch (error) {
      console.error('Error updating conversation list:', error);
      throw error;
    }
  }

  private async removeFromConversationList(conversationId: string): Promise<void> {
    try {
      const list = await this.getConversationList();
      const filteredList = list.filter(item => item.conversationId !== conversationId);
      await AsyncStorage.setItem(CONVERSATION_LIST_KEY, JSON.stringify(filteredList));
    } catch (error) {
      console.error('Error removing from conversation list:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const conversationStorage = new ConversationStorageService();
export default conversationStorage;