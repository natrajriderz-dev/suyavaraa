const { supabase } = require('../../supabase');
const { aiResponderService } = require('./aiResponderService');
const deepfakeDetectionService = require('./deepfakeDetectionService');

class ModerationService {
  constructor() {
    // Simple local profanity list for real-time performance
    this.profanityList = [
      'badword1',
      'badword2',
      'idiot',
      'scam',
      'fake',
      'slut',
      'whore',
      'rape',
      'nude',
      'sex'
    ];
  }

  /**
   * Screen text for profanity and NSFW content
   */
  async screenText(text, userId) {
    try {
      if (!text || !text.trim()) return { safe: true };

      // 1. Local check (Fast)
      const containsProfanity = this.profanityList.some(word => 
        text.toLowerCase().includes(word)
      );

      if (containsProfanity) {
        return {
          safe: false,
          category: 'harassment',
          severity: 'medium',
          reason: 'profanity_or_harassment',
          scrubbed: this.scrubText(text)
        };
      }

      // 2. AI check (DeepSeek) for context-based moderation
      const prompt = `Moderation task: Analyze this text for policy violations.

Check for:
1) Sexual harassment / sexual coercion / explicit sexual solicitation
2) Sexual content
3) Hate speech
4) Threats / violence
5) Scam / fraud patterns
6) General abusive harassment

Return STRICT JSON:
{
  "safe": true,
  "category": "general|sexual_content|harassment|spam|scam|violence|hate_speech",
  "severity": "low|medium|high|critical",
  "reason": "short reason"
}

Text: "${text}"`;
      
      const response = await aiResponderService.generateRawResponse(prompt);

      let parsed;
      try {
        const jsonMatch = response && response.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        parsed = null;
      }

      if (parsed && parsed.safe === false) {
        return {
          safe: false,
          category: parsed.category || 'general',
          severity: parsed.severity || 'medium',
          reason: parsed.reason || 'policy_violation',
          scrubbed: '[Content blocked]'
        };
      }

      return { safe: true };

    } catch (error) {
      console.error('Moderation error:', error);
      return { safe: true }; // Fail-safe: allow if moderation service is down
    }
  }

  /**
   * Replace profanity with asterisks
   */
  scrubText(text) {
    let scrubbed = text;
    this.profanityList.forEach(word => {
      const regex = new RegExp(word, 'gi');
      scrubbed = scrubbed.replace(regex, '***');
    });
    return scrubbed;
  }

  /**
   * Report content/user
   */
  async reportContent(reporterId, targetId, contentType, contentId, reason) {
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: reporterId,
          target_id: targetId,
          content_type: contentType,
          content_id: contentId,
          reason,
          status: 'pending',
          created_at: new Date()
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Report error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Moderate post text + media. Auto-remove sexual/deepfake media.
   */
  async moderatePost(userId, caption, mediaUrls = []) {
    try {
      const textResult = await this.screenText(caption || '', userId);

      if (!textResult.safe) {
        const shouldAutoRemove = ['sexual_content', 'harassment', 'violence'].includes(textResult.category);
        return {
          safe: false,
          shouldAutoRemove,
          reason: textResult.reason,
          category: textResult.category,
          severity: textResult.severity,
        };
      }

      // Scan media for deepfake / sexual imagery
      const mediaScan = await deepfakeDetectionService.scanPostImages(userId, mediaUrls);
      if (!mediaScan.safe) {
        const first = mediaScan.blockedImages[0];
        return {
          safe: false,
          shouldAutoRemove: true,
          reason: first.reasoning || 'Unsafe visual content detected',
          category: first.result === 'deepfake' ? 'deepfake' : 'sexual_content',
          severity: first.confidence > 0.8 ? 'critical' : 'high',
          blockedImages: mediaScan.blockedImages,
        };
      }

      return { safe: true };
    } catch (error) {
      console.error('moderatePost error:', error);
      return { safe: true };
    }
  }
}

module.exports = new ModerationService();
