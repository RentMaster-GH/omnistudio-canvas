import React from 'react';
import { Lock, Sparkles, ShieldCheck, Zap } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onUnlockPaystack: () => void;
  formattedPrice?: string;
}

export const TimedPaywallModal: React.FC<Props> = ({
  isOpen,
  onUnlockPaystack,
  formattedPrice = '50 GHS',
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.94)',
      backdropFilter: 'blur(10px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '460px',
        width: '100%',
        border: '1px solid #38bdf8',
        boxShadow: '0 25px 50px -12px rgba(56, 189, 248, 0.3)',
        textAlign: 'center'
      }}>
        {/* Lock Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          border: '2px solid #ef4444'
        }}>
          <Lock style={{ width: '32px', height: '32px', color: '#ef4444' }} />
        </div>

        <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 'bold' }}>
          Your 30-Minute Free Trial Has Expired
        </h2>
        <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
          To continue editing, exporting, and saving your blueprints and documents, unlock lifetime unlimited access now.
        </p>

        {/* Price Box */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #334155',
          marginBottom: '24px'
        }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', letterSpacing: '0.5px' }}>
            ONE-TIME UNLIMITED ACCESS PAYMENT
          </span>
          <div style={{ fontSize: '34px', fontWeight: '800', color: '#38bdf8', fontFamily: 'monospace' }}>
            {formattedPrice}
          </div>
          <span style={{ fontSize: '11px', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '6px' }}>
            <ShieldCheck style={{ width: '14px', height: '14px' }} /> Instant Lifetime Unlock • Secure Paystack
          </span>
        </div>

        {/* Features List */}
        <div style={{ textAlign: 'left', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#cbd5e1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles style={{ width: '15px', height: '15px', color: '#f59e0b' }} />
            <span>Unlimited Blueprint & PDF Editing</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap style={{ width: '15px', height: '15px', color: '#38bdf8' }} />
            <span>Full High-Res Exports (PDF, PNG, MP4)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck style={{ width: '15px', height: '15px', color: '#10b981' }} />
            <span>Precision Ruler & Watermark Engine Tools</span>
          </div>
        </div>

        {/* Unlock Button */}
        <button
          onClick={onUnlockPaystack}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
            transition: 'all 0.2s ease'
          }}
        >
          💳 Pay {formattedPrice} to Unlock Studio Now
        </button>
      </div>
    </div>
  );
};