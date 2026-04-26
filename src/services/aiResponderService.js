// ============================================
// Suyavaraa AI Responder Service
// ============================================
// Handles AI-powered responses for decoy profiles using DeepSeek API
// Generates natural, human-like responses to detect scammer behavior

const { supabase } = require('../../supabase');

// IMPORTANT: API key should come from environment variables only
// Remove the fallback key before production deployment
const DEEPSEEK_API_KEY =
  process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL =
  process.env.EXPO_PUBLIC_DEEPSEEK_BASE_URL ||
  process.env.DEEPSEEK_BASE_URL ||
  'https://api.deepseek.com/v1';

class AIResponderService {
  constructor() {
    this.apiKey = DEEPSEEK_API_KEY;
    this.baseUrl = DEEPSEEK_BASE_URL;
    this.model = 'deepseek-chat';
    this.maxRetries = 3;
    this.timeout = 10000; // 10 seconds
    
    // Validate API key on initialization
    if (!this.apiKey) {
      console.error('❌ CRITICAL: DEEPSEEK_API_KEY not found in environment variables');
      console.error('Please set EXPO_PUBLIC_DEEPSEEK_API_KEY in your .env file');
    }
  }

  // Generate AI response for decoy profile
  async generateResponse(decoyProfile, conversationHistory, userMessage) {
    try {
      // Check if API key is available
      if (!this.apiKey) {
        throw new Error('DeepSeek API key not configured. Please check your environment variables.');
      }

      // Build system prompt based on decoy personality
      const systemPrompt = this.buildSystemPrompt(decoyProfile);

      // Format conversation history
      const messages = this.formatConversationHistory(systemPrompt, conversationHistory, userMessage);

      // Call DeepSeek API
      const response = await this.callDeepSeekAPI(messages);

      // Validate and clean response
      const cleanResponse = this.validateAndCleanResponse(response);

      await this.logAPIUsage({
        success: true,
        tokens_used: response.usage?.total_tokens || 0,
        response_time: Date.now()
      });

      return {
        success: true,
        response: cleanResponse,
        metadata: {
          model: this.model,
          tokens_used: response.usage?.total_tokens || 0,
          response_time: Date.now()
        }
      };

    } catch (error) {
      await this.logAPIUsage({ success: false, tokens_used: 0, response_time: Date.now() });
      console.error('AI Responder Error:', error);

      // Fallback response if API fails
      return {
        success: false,
        response: this.getFallbackResponse(decoyProfile),
        error: error.message,
        metadata: {
          fallback: true,
          error_type: error.name
        }
      };
    }
  }

  // Build system prompt for decoy personality
  buildSystemPrompt(decoyProfile) {
    const personality = decoyProfile.characteristics || {};
    const traits = personality.traits || ['friendly', 'curious', 'genuine'];

    return `You are ${decoyProfile.name}, a ${decoyProfile.age}-year-old ${decoyProfile.gender} from ${decoyProfile.city}.

Your personality: ${traits.join(', ')}

IMPORTANT INSTRUCTIONS:
- Respond naturally as if you're a real person on a dating app
- Be friendly and engaging, but not overly enthusiastic
- Ask questions to keep the conversation going naturally
- Show genuine interest in their responses
- If they ask for money, contact info, or seem suspicious, respond casually but note it
- Keep responses under 150 words
- Use casual, modern language like a real person
- Don't break character or mention being an AI

Your bio: "${decoyProfile.bio}"

Current conversation context: This is a dating app conversation. Be authentic and natural.`;
  }

  // Format conversation history for API
  formatConversationHistory(systemPrompt, conversationHistory, userMessage) {
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    // Add recent conversation history (last 10 messages to stay within token limits)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: msg.displayed_content || msg.content
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    return messages;
  }

  // Call DeepSeek API
  async callDeepSeekAPI(messages) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: 0.7, // Balanced creativity
        max_tokens: 150,  // Keep responses concise
        top_p: 0.9,
        frequency_penalty: 0.3, // Reduce repetition
        presence_penalty: 0.3
      }),
      timeout: this.timeout
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`DeepSeek API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  // Validate and clean AI response
  validateAndCleanResponse(apiResponse) {
    const content = apiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response content from API');
    }

    // Clean up response
    let cleanContent = content.trim();

    // Remove any system-like text
    cleanContent = cleanContent.replace(/^System:.*$/gm, '');
    cleanContent = cleanContent.replace(/^AI:.*$/gm, '');
    cleanContent = cleanContent.replace(/^Assistant:.*$/gm, '');

    // Ensure reasonable length
    if (cleanContent.length > 500) {
      cleanContent = cleanContent.substring(0, 500) + '...';
    }

    // Basic content validation
    if (cleanContent.length < 5) {
      throw new Error('Response too short');
    }

    return cleanContent;
  }

  // Fallback response when API fails
  getFallbackResponse(decoyProfile) {
    const fallbacks = [
      `Hey! Thanks for reaching out. I'm ${decoyProfile.name} from ${decoyProfile.city}. What brings you to Suyavaraa?`,
      `Hi there! I'm enjoying getting to know people here. Tell me a bit about yourself!`,
      `Nice to meet you! I'm ${decoyProfile.name}, ${decoyProfile.age}. What do you do for fun?`,
      `Hey! I'm glad you said hi. What's your favorite thing to do on weekends?`,
      `Hi! I'm ${decoyProfile.name}. Love connecting with genuine people. What's your story?`
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  // Analyze response for red flags (AI might generate suspicious content)
  analyzeResponseForFlags(response) {
    // This would integrate with redFlagPatterns.js
    // For now, basic checks
    const suspiciousPatterns = [
      /send.*money/i,
      /need.*help/i,
      /emergency/i,
      /whatsapp/i,
      /phone.*number/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(response)) {
        console.warn('AI generated potentially suspicious response:', response);
        return true;
      }
    }

    return false;
  }

  // Get conversation context for better responses
  async getConversationContext(interactionId) {
    try {
      const { data, error } = await supabase
        .from('fish_trap_messages')
        .select('sender_type, content, displayed_content, created_at')
        .eq('interaction_id', interactionId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return [];
    }
  }

  // Generate raw AI response for direct moderation or simple tasks
  async generateRawResponse(prompt) {
    try {
      if (!this.apiKey) {
        throw new Error('DeepSeek API key not configured. Please check your environment variables.');
      }

      const messages = [
        {
          role: 'system',
          content: 'You are a safety assistant. Provide concise moderation output.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const apiResponse = await this.callDeepSeekAPI(messages);
      const content = apiResponse?.choices?.[0]?.message?.content?.trim() || '';

      await this.logAPIUsage({
        success: true,
        tokens_used: apiResponse.usage?.total_tokens || 0,
        response_time: Date.now()
      });

      return content;
    } catch (error) {
      console.error('AI generateRawResponse error:', error);
      await this.logAPIUsage({ success: false, tokens_used: 0, response_time: Date.now() });
      throw error;
    }
  }

  // Log API usage for monitoring
  async logAPIUsage(metadata) {
    try {
      await supabase
        .from('api_usage_logs')
        .insert({
          service: 'deepseek_ai',
          endpoint: 'chat/completions',
          tokens_used: metadata.tokens_used || 0,
          response_time: metadata.response_time || Date.now(),
          success: metadata.success !== false
        });
    } catch (error) {
      // Silent fail for logging
      console.warn('Failed to log API usage:', error.message);
    }
  }
}

// Export singleton instance
module.exports = new AIResponderService();
