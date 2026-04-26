// src/services/deepfakeDetectionService.js
// Detects deepfakes, NSFW content, and manipulated images using DeepSeek Vision API.
// Falls back gracefully if API is unavailable.

const { supabase } = require('../../supabase');

const DEEPSEEK_API_KEY =
  process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL =
  process.env.EXPO_PUBLIC_DEEPSEEK_BASE_URL ||
  process.env.DEEPSEEK_BASE_URL ||
  'https://api.deepseek.com/v1';

// Vision model for image analysis — DeepSeek-VL or compatible
const VISION_MODEL = 'deepseek-vl-7b-chat';

class DeepfakeDetectionService {
  /**
   * Analyzes an image URL for deepfake indicators, NSFW content,
   * and sexual / violent material.
   *
   * @param {string} imageUrl - Public or signed URL of the image
   * @param {string} scanType - 'profile_photo' | 'post_image' | 'verification_photo'
   * @param {string} userId   - The user who owns the image
   * @returns {{ result, confidence, reasoning, action }}
   */
  async scanImage(imageUrl, scanType = 'profile_photo', userId = null) {
    try {
      if (!DEEPSEEK_API_KEY) {
        console.warn('[DeepfakeDetection] No API key — skipping scan');
        return { result: 'clean', confidence: 0, reasoning: 'API key not configured' };
      }

      const prompt = `You are a content safety AI. Analyze this image and detect:
1. DEEPFAKE INDICATORS: Unnatural facial features, blurring around hairline/edges, inconsistent lighting, AI-generated artifacts, GAN artifacts.
2. NSFW / SEXUAL CONTENT: Nudity, sexual acts, sexually suggestive poses.
3. VIOLENCE / SELF-HARM: Graphic injuries, self-harm imagery.
4. IDENTITY FRAUD: Stock photos, celebrity photos used as profile pictures.

Respond in this exact JSON format:
{
  "result": "clean|suspicious|deepfake|nsfw|error",
  "confidence": 0.95,
  "reasoning": "Brief explanation",
  "categories": ["deepfake", "nsfw"],
  "action": "allow|warn_user|auto_remove|ban_review"
}`;

      const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: imageUrl } },
                { type: 'text', text: prompt }
              ]
            }
          ],
          max_tokens: 512,
          temperature: 0.1, // Low temperature for consistent safety judgments
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('[DeepfakeDetection] API error:', err);
        // Fallback: do a text-only heuristic check
        return await this._textHeuristicScan(imageUrl, scanType);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || '{}';

      // Extract JSON from response (may be wrapped in markdown)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      if (!parsed) {
        return { result: 'error', confidence: 0, reasoning: 'Could not parse AI response' };
      }

      const scanResult = {
        result: parsed.result || 'clean',
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning || '',
        action: parsed.action || 'allow',
        categories: parsed.categories || [],
      };

      // Persist scan result to DB
      if (userId) {
        await this._persistScan(userId, imageUrl, scanType, scanResult);
      }

      // Auto-remove if needed and content_id is available
      if (scanResult.action === 'auto_remove' && userId) {
        await this._logAutoRemoval(userId, scanType, imageUrl, scanResult);
      }

      return scanResult;
    } catch (error) {
      console.error('[DeepfakeDetection] Scan error:', error);
      return { result: 'error', confidence: 0, reasoning: error.message };
    }
  }

  /**
   * Text-only heuristic fallback when vision API is unavailable.
   * Checks known patterns and URL risk signals.
   */
  async _textHeuristicScan(imageUrl, scanType) {
    try {
      if (!DEEPSEEK_API_KEY) {
        return { result: 'clean', confidence: 0, reasoning: 'Vision API unavailable — text heuristic skipped' };
      }

      const prompt = `A user uploaded an image with this URL: ${imageUrl}
Based only on the URL and metadata (not the image content since vision is unavailable), assess:
1. Is this URL from a known stock photo/AI image site?
2. Does the URL contain suspicious patterns?
Reply in JSON: {"result":"clean|suspicious","confidence":0.5,"reasoning":"...","action":"allow|warn_user"}`;

      const resp = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.1,
        }),
      });

      if (!resp.ok) return { result: 'clean', confidence: 0, reasoning: 'Heuristic fallback unavailable' };

      const data = await resp.json();
      const raw = data.choices?.[0]?.message?.content || '{}';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { result: 'clean', confidence: 0, reasoning: 'Parse failed' };
    } catch {
      return { result: 'clean', confidence: 0, reasoning: 'Heuristic fallback error' };
    }
  }

  /**
   * Scan all photos in a user's profile for safety.
   * Called after BasicInfoScreen / EditProfile saves.
   */
  async scanUserProfile(userId, photoUrls) {
    if (!photoUrls || photoUrls.length === 0) return [];

    const results = await Promise.allSettled(
      photoUrls.map((url, idx) =>
        this.scanImage(url, idx === 0 ? 'profile_photo' : 'profile_photo', userId)
      )
    );

    return results.map((r, idx) => ({
      url: photoUrls[idx],
      ...(r.status === 'fulfilled' ? r.value : { result: 'error', confidence: 0 })
    }));
  }

  /**
   * Analyze a post's images before publishing.
   * Returns { safe, blockedImages, reason }
   */
  async scanPostImages(userId, imageUrls) {
    if (!imageUrls || imageUrls.length === 0) return { safe: true, blockedImages: [] };

    const scans = await Promise.allSettled(
      imageUrls.map(url => this.scanImage(url, 'post_image', userId))
    );

    const blockedImages = scans
      .map((r, i) => ({ url: imageUrls[i], ...(r.status === 'fulfilled' ? r.value : { result: 'error' }) }))
      .filter(s => ['nsfw', 'deepfake', 'suspicious'].includes(s.result));

    return {
      safe: blockedImages.length === 0,
      blockedImages,
      reason: blockedImages.length > 0
        ? `${blockedImages[0].reasoning || 'Policy violation detected'}`
        : null,
    };
  }

  async _persistScan(userId, imageUrl, scanType, result) {
    try {
      await supabase.from('deepfake_scans').insert({
        user_id: userId,
        image_url: imageUrl,
        scan_type: scanType,
        result: result.result,
        confidence_score: result.confidence,
        ai_reasoning: result.reasoning,
        action_taken: result.action,
      });
    } catch (err) {
      console.warn('[DeepfakeDetection] Could not persist scan:', err.message);
    }
  }

  async _logAutoRemoval(userId, contentType, contentPreview, scanResult) {
    try {
      await supabase.from('content_auto_removals').insert({
        user_id: userId,
        content_type: contentType === 'profile_photo' ? 'profile_photo' : 'post',
        content_preview: contentPreview.substring(0, 200),
        removal_reason: scanResult.reasoning || 'AI safety detection',
        category: scanResult.categories?.[0] || 'nsfw',
        ai_confidence: scanResult.confidence,
      });

      // Also create a high-priority report for admin review
      await supabase.from('reports').insert({
        reporter_id: userId,
        target_id: userId,
        content_type: contentType === 'profile_photo' ? 'profile_photo' : 'post',
        reason: `AUTO-DETECTED: ${scanResult.reasoning}`,
        category: scanResult.categories?.[0] || 'sexual_content',
        severity: scanResult.confidence > 0.8 ? 'critical' : 'high',
        auto_flagged: true,
        status: 'pending',
        ai_analysis: JSON.stringify({
          result: scanResult.result,
          confidence: scanResult.confidence,
          categories: scanResult.categories,
        }),
      });
    } catch (err) {
      console.warn('[DeepfakeDetection] Could not log auto removal:', err.message);
    }
  }
}

module.exports = new DeepfakeDetectionService();
