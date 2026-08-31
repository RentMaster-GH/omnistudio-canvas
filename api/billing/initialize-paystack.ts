// omnistudio-canvas/api/billing/initialize-paystack.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

function resolveGeoLocalization(req: VercelRequest, timeZone?: string) {
  const ipCountry = (req.headers['cf-ipcountry'] || req.headers['x-country-code'] || '').toString().toUpperCase();
  const tz = (timeZone || '').toLowerCase();

  // 1. GHANA (GHS) -> Mobile Money (MoMo) + Card
  if (ipCountry === 'GH' || tz.includes('accra') || tz.includes('ghana')) {
    return { currency: 'GHS', amountInSubunits: 12000, channels: ['mobile_money', 'card'] };
  }

  // 2. NIGERIA (NGN) -> USSD, Bank Transfer, MoMo, Card
  if (ipCountry === 'NG' || tz.includes('lagos') || tz.includes('nigeria')) {
    return { currency: 'NGN', amountInSubunits: 500000, channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'] };
  }

  // 3. KENYA (KES) -> M-Pesa / Mobile Money
  if (ipCountry === 'KE' || tz.includes('nairobi') || tz.includes('kenya')) {
    return { currency: 'KES', amountInSubunits: 120000, channels: ['mobile_money', 'card'] };
  }

  // 4. SOUTH AFRICA (ZAR) -> EFT & Card
  if (ipCountry === 'ZA' || tz.includes('johannesburg') || tz.includes('south_africa')) {
    return { currency: 'ZAR', amountInSubunits: 18000, channels: ['card', 'eft'] };
  }

  // 5. DEFAULT GLOBAL (USD)
  return { currency: 'USD', amountInSubunits: 900, channels: ['card'] };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers for Vercel Serverless
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, email, timeZone, currency: clientCurrency } = req.body || {};
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    const MERCHANT_PRIMARY_CURRENCY = (process.env.PAYSTACK_DEFAULT_CURRENCY || 'GHS').toUpperCase();

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(400).json({
        error: 'PAYSTACK_SECRET_KEY is missing in Vercel Environment Variables.'
      });
    }

    // 1. DUMMY / ANONYMOUS EMAIL GENERATION
    const guestIdentifier = userId || `guest_${Math.random().toString(36).substring(2, 9)}`;
    const finalEmail = email && typeof email === 'string' && email.includes('@')
      ? email
      : `anonymous_${guestIdentifier}@omnistudio.internal`;

    // 2. DYNAMIC GEO LOCALIZATION
    const geoConfig = resolveGeoLocalization(req, timeZone);
    let targetCurrency = clientCurrency || geoConfig.currency;

    const getSubunits = (curr: string) => {
      switch (curr) {
        case 'NGN': return 500000; // 5,000 NGN
        case 'GHS': return 12000;  // 120 GHS
        case 'KES': return 120000; // 1,200 KES
        case 'ZAR': return 18000;  // 180 ZAR
        case 'USD': default: return 900; // $9 USD
      }
    };

    const callPaystackApi = async (curr: string) => {
      return await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: finalEmail,
          amount: getSubunits(curr),
          currency: curr,
          channels: geoConfig.channels,
          callback_url: `${req.headers.origin || 'https://omnistudio-canvas.vercel.app'}/?payment=success`,
          metadata: {
            userId: guestIdentifier,
            plan: 'pro_9_monthly',
            isAnonymousCheckout: !email,
            clientTimeZone: timeZone || 'unknown',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY.trim()}`,
            'Content-Type': 'application/json',
          },
        }
      );
    };

    let paystackRes;
    try {
      paystackRes = await callPaystackApi(targetCurrency);
    } catch (firstErr: any) {
      const errMsg = firstErr.response?.data?.message || '';
      
      // Auto-fallback to Merchant Primary Currency if requested currency fails
      if (errMsg.toLowerCase().includes('currency') || errMsg.toLowerCase().includes('merchant')) {
        targetCurrency = MERCHANT_PRIMARY_CURRENCY;
        paystackRes = await callPaystackApi(targetCurrency);
      } else {
        throw firstErr;
      }
    }

    return res.status(200).json({
      success: true,
      authorizationUrl: paystackRes.data.data.authorization_url,
      accessCode: paystackRes.data.data.access_code,
      reference: paystackRes.data.data.reference,
      currency: targetCurrency,
      dummyEmailUsed: finalEmail,
    });
  } catch (err: any) {
    console.error('[Vercel Native Paystack Init Error]:', err.response?.data || err.message);

    const paystackErrorMsg = typeof err.response?.data?.message === 'string'
      ? err.response.data.message
      : err.message || 'Paystack Payment Initialization Failed.';

    return res.status(500).json({
      error: paystackErrorMsg,
      details: typeof err.response?.data === 'object' ? JSON.stringify(err.response.data) : String(err.response?.data || err.message)
    });
  }
}