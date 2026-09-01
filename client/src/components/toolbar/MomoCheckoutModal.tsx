import React, { useState } from 'react';
import { Smartphone, ShieldCheck, X, Crown } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPaySuccess: (reference: string) => void;
  onManagerUnlock: () => void;
  guestUserId: string;
}

interface CountryConfig {
  country: string;
  flag: string;
  currency: string;
  amountSubunits: number;
  displayAmount: string;
  providers: { code: string; name: string }[];
}

const COUNTRY_OPTIONS: CountryConfig[] = [
  {
    country: 'Ghana',
    flag: '🇬🇭',
    currency: 'GHS',
    amountSubunits: 5000, // 50 GHS = 5,000 Pesewas
    displayAmount: '50 GHS',
    providers: [
      { code: 'mtn', name: 'MTN Mobile Money' },
      { code: 'vod', name: 'Telecel / Vodafone Cash' },
      { code: 'tgo', name: 'AirtelTigo Money' },
    ],
  },
  {
    country: 'Nigeria',
    flag: '🇳🇬',
    currency: 'NGN',
    amountSubunits: 400000, // 4,000 NGN
    displayAmount: '4,000 NGN',
    providers: [
      { code: 'opay', name: 'OPay / PalmPay / MoMo PSB' },
      { code: 'bank_transfer', name: 'Bank Transfer / USSD' },
    ],
  },
  {
    country: 'Kenya',
    flag: '🇰🇪',
    currency: 'KES',
    amountSubunits: 120000, // 1,200 KES
    displayAmount: '1,200 KES',
    providers: [
      { code: 'mpesa', name: 'Safaricom M-Pesa' },
      { code: 'airtel', name: 'Airtel Money' },
    ],
  },
  {
    country: 'Uganda',
    flag: '🇺🇬',
    currency: 'UGX',
    amountSubunits: 1600000, // 16,000 UGX
    displayAmount: '16,000 UGX',
    providers: [
      { code: 'mtn', name: 'MTN MoMo Uganda' },
      { code: 'airtel', name: 'Airtel Money Uganda' },
    ],
  },
  {
    country: 'South Africa',
    flag: '🇿🇦',
    currency: 'ZAR',
    amountSubunits: 8500, // 85 ZAR
    displayAmount: '85 ZAR',
    providers: [
      { code: 'capitec', name: 'Capitec Pay / SnapScan' },
      { code: 'eft', name: 'EFT Bank Transfer' },
    ],
  },
  {
    country: 'International (USD)',
    flag: '🌐',
    currency: 'USD',
    amountSubunits: 450, // $4.50 USD
    displayAmount: '$4.50 USD',
    providers: [
      { code: 'card', name: 'Credit / Debit Card (Global)' },
    ],
  },
];

export const MomoCheckoutModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onPaySuccess,
  onManagerUnlock,
  guestUserId,
}) => {
  const [selectedCountryIndex, setSelectedCountryIndex] = useState<number>(0);
  const [selectedProviderCode, setSelectedProviderCode] = useState<string>(COUNTRY_OPTIONS[0].providers[0].code);
  const [phoneNo, setPhoneNo] = useState('');
  const [showManagerPrompt, setShowManagerPrompt] = useState(false);
  const [managerKeyInput, setManagerKeyInput] = useState('');

  if (!isOpen) return null;

  const currentCountry = COUNTRY_OPTIONS[selectedCountryIndex];

  const handleCountryChange = (index: number) => {
    setSelectedCountryIndex(index);
    setSelectedProviderCode(COUNTRY_OPTIONS[index].providers[0].code);
  };

  const handleExecutePayment = () => {
    const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_1ce038da68ee109f5e603f5b816613d9cf261be5';
    const cleanGuestId = guestUserId.replace(/[^a-zA-Z0-9]/g, '');
    const dummyEmail = `guest_${cleanGuestId}@omnistudio.app`;

    if (!(window as any).PaystackPop) {
      alert('Paystack script loading... Please try again in 2 seconds.');
      return;
    }

    const handler = (window as any).PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: dummyEmail,
      amount: currentCountry.amountSubunits,
      currency: currentCountry.currency,
      ref: `omni_momo_${selectedProviderCode}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      metadata: {
        mobile_money_provider: selectedProviderCode,
        phone_number: phoneNo,
        country: currentCountry.country,
      },
      callback: (response: any) => {
        onPaySuccess(response.reference);
        onClose();
      },
      onClose: () => {},
    });

    handler.openIframe();
  };

  const handleVerifyManagerKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (managerKeyInput.trim() === 'manager50' || managerKeyInput.trim().toLowerCase() === 'admin') {
      onManagerUnlock();
      setShowManagerPrompt(false);
      onClose();
    } else {
      alert('Invalid Manager Passcode. Please enter a valid passcode.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.90)',
      backdropFilter: 'blur(8px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '28px',
        maxWidth: '480px',
        width: '100%',
        border: '1px solid #334155',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
        >
          <X style={{ width: '20px', height: '20px' }} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #38bdf8' }}>
            <Smartphone style={{ width: '22px', height: '22px', color: '#38bdf8' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>One-Time Lifetime Access Unlock</h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Pay once • Recognized across all future visits</span>
          </div>
        </div>

        {/* Country & Currency Selector */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '6px' }}>
            1. Select Country & Currency:
          </label>
          <select
            value={selectedCountryIndex}
            onChange={(e) => handleCountryChange(Number(e.target.value))}
            style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
          >
            {COUNTRY_OPTIONS.map((c, idx) => (
              <option key={idx} value={idx}>
                {c.flag} {c.country} ({c.displayAmount})
              </option>
            ))}
          </select>
        </div>

        {/* Mobile Money Provider Selector */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '6px' }}>
            2. Network Provider:
          </label>
          <select
            value={selectedProviderCode}
            onChange={(e) => setSelectedProviderCode(e.target.value)}
            style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
          >
            {currentCountry.providers.map((p) => (
              <option key={p.code} value={p.code}>
                📱 {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Optional Mobile Phone Number Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '6px' }}>
            3. Mobile Wallet Phone Number (Optional):
          </label>
          <input
            type="tel"
            value={phoneNo}
            onChange={(e) => setPhoneNo(e.target.value)}
            placeholder="e.g. 024XXXXXXX or +233..."
            style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Amount Banner */}
        <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Total One-Time Fee:</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8', fontFamily: 'monospace' }}>
            {currentCountry.displayAmount}
          </span>
        </div>

        {/* Pay Button */}
        <button
          onClick={handleExecutePayment}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
            marginBottom: '16px'
          }}
        >
          💳 Proceed to Pay {currentCountry.displayAmount}
        </button>

        {/* Security Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: '#34d399', marginBottom: '16px' }}>
          <ShieldCheck style={{ width: '14px', height: '14px' }} />
          <span>Secured by Paystack • Instant One-Time Lifetime License</span>
        </div>

        {/* App Manager Free Bypass Link */}
        <div style={{ borderTop: '1px solid #334155', paddingTop: '12px', textAlign: 'center' }}>
          {!showManagerPrompt ? (
            <button
              type="button"
              onClick={() => setShowManagerPrompt(true)}
              style={{ background: 'none', border: 'none', color: '#fbbf24', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
            >
              <Crown style={{ width: '12px', height: '12px' }} /> Are you the App Manager? Unlock Free Access
            </button>
          ) : (
            <form onSubmit={handleVerifyManagerKey} style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <input
                type="password"
                value={managerKeyInput}
                onChange={(e) => setManagerKeyInput(e.target.value)}
                placeholder="Enter Manager Passcode (e.g. manager50)"
                style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #f59e0b', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px' }}
                autoFocus
              />
              <button
                type="submit"
                style={{ padding: '6px 12px', backgroundColor: '#f59e0b', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                Unlock
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};