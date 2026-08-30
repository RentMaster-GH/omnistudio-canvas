import { Router } from 'express';
import axios from 'axios';
import crypto from 'crypto';

const router = Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_placeholder';

/**
 * 1. POST /api/billing/initialize-paystack
 * Initializes a Paystack Payment Transaction for $9/mo (or GHS equivalent)
 * Supports Mobile Money (MTN MoMo, Vodafone, AirtelTigo) & Cards!
 */
router.post('/initialize-paystack', async (req, res) => {
  try {
    const { userId, email, currency = 'USD' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'User email is required for Paystack payment.' });
    }

    // Paystack amounts are in subunits (kobo/pesewas/cents) -> $9.00 USD = 900 cents
    const amountInSubunits = currency === 'GHS' ? 12000 : 900; // e.g., 120 GHS or $9 USD

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amountInSubunits,
        currency,
        callback_url: `${req.headers.origin}/?payment=success`,
        metadata: {
          userId: userId || 'guest_user',
          plan: 'pro_9_monthly',
          custom_fields: [
            {
              display_name: 'Subscription Plan',
              variable_name: 'plan',
              value: 'OmniStudio Pro ($9/mo)',
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Returns Paystack authorization URL to redirect user
    res.json({
      success: true,
      authorizationUrl: response.data.data.authorization_url,
      accessCode: response.data.data.access_code,
      reference: response.data.data.reference,
    });
  } catch (err: any) {
    console.error('[Paystack Initialization Error]:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to initialize Paystack payment',
      details: err.response?.data?.message || err.message,
    });
  }
});

/**
 * 2. POST /api/billing/paystack-webhook
 * Listens for Paystack payment success events (Card & Mobile Money)
 */
router.post('/paystack-webhook', (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // Verify Paystack HMAC Signature for security
    if (hash !== req.headers['x-paystack-signature']) {
      console.warn('[Paystack Webhook] Invalid signature rejected');
      return res.status(400).send('Invalid signature');
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const { reference, amount, customer, metadata } = event.data;
      console.log(`✅ Paystack Payment Successful! Ref: ${reference}, User: ${metadata?.userId}, Customer: ${customer.email}`);
      
      // Activate Pro Tier in database/Supabase here for this user
    }

    res.sendStatus(200);
  } catch (err: any) {
    console.error('[Paystack Webhook Error]:', err.message);
    res.status(500).send('Webhook handler failed');
  }
});

/**
 * 3. GET /api/billing/verify-paystack/:reference
 * Verifies transaction reference status directly with Paystack API
 */
router.get('/verify-paystack/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    res.json({
      success: true,
      status: response.data.data.status,
      data: response.data.data,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Verification failed', details: err.message });
  }
});

export default router;