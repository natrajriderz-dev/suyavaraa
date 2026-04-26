// src/services/paymentService.js
const { supabase } = require('../../supabase');

/**
 * Suyavaraa Payment Service
 * 
 * This service handles the integration with payment providers (Stripe/Razorpay)
 * and updates the user's premium status in Supabase.
 */

class PaymentService {
  /**
   * Initialize a payment/checkout session
   * @param {string} planId - 'monthly' or 'yearly'
   * @returns {Promise<{success: boolean, checkoutUrl?: string, error?: string}>}
   */
  async createCheckoutSession(planId) {
    return {
      success: false,
      error:
        'Premium purchases are temporarily disabled while the billing flow is brought into compliance for release.',
    };
  }

  /**
   * Handle successful payment (Webhook or Redirect callback)
   * This should be called to update the user_profiles or users table.
   */
  async grantPremiumAccess(userId, planId) {
    try {
      const expirationDate = new Date();
      if (planId === 'monthly') {
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      } else {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      }

      const { error } = await supabase
        .from('users')
        .update({ 
          is_premium: true,
          premium_expires_at: expirationDate.toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };

    } catch (error) {
      console.error('Failed to grant premium access:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PaymentService();
