import React from 'react';
import { 
  FileText, Video, Mic, Sliders, Play, Sparkles, Check, Shield, Zap, 
  Layers, ArrowRight, Smartphone, CreditCard, Award, FileDown
} from 'lucide-react';

export default function LandingPage({ onLaunchStudio }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      
      {/* 1. NAVIGATION BAR */}
      <nav style={{ height: '64px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', padding: '0 32px', justifyContent: 'space-between', position: 'sticky', top: 0, backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '18px', color: '#38bdf8' }}>
          <FileText size={24} color="#0284c7" />
          <span>OmniStudio Canvas</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="#features" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Features</a>
          <a href="#pricing" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Pricing</a>
          <button 
            onClick={onLaunchStudio}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
            }}
          >
            Launch Studio <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section style={{ padding: '80px 20px', textAlign: 'center', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(2, 132, 199, 0.15)', border: '1px solid #0284c7', fontSize: '12px', color: '#38bdf8', fontWeight: 'bold' }}>
          <Sparkles size={14} /> All-In-One AI Multimedia Studio
        </div>

        <h1 style={{ fontSize: '48px', fontWeight: '800', lineHeight: '1.15', margin: 0, background: 'linear-gradient(to right, #ffffff, #38bdf8, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Edit Documents, Videos, Images & AI Subtitles in One Unified Canvas
        </h1>

        <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '720px', margin: 0, lineHeight: '1.6' }}>
          The world's first browser-based studio combining PDF markup, non-linear video timeline editing, Whisper AI transcription, and 30+ Google Fonts.
        </p>

        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
          <button 
            onClick={onLaunchStudio}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '14px 28px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.4)'
            }}
          >
            <Play size={18} /> Open Canvas Studio Free
          </button>
        </div>

        {/* Hero Video Preview Graphic */}
        <div style={{ width: '100%', maxWidth: '880px', marginTop: '32px', border: '2px solid #334155', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', backgroundColor: '#1e293b' }}>
          <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80" alt="OmniStudio Studio Preview" style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.85 }} />
        </div>
      </section>

      {/* 3. FEATURE GRID */}
      <section id="features" style={{ padding: '60px 20px', backgroundColor: '#1e293b', borderTop: '1px solid #334155', borderBottom: '1px solid #334155' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 'bold', marginBottom: '48px', color: '#ffffff' }}>
            Built for Creators, Educators & Legal Professionals
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <FeatureCard 
              icon={<FileText size={24} color="#0284c7" />}
              title="PDF Portal & Multi-Page Export"
              desc="Markup PDFs, reorder thumbnail pages, add digital stamps, redact text, and compile edits into downloadable multi-page PDFs via jsPDF."
            />
            <FeatureCard 
              icon={<Video size={24} color="#8b5cf6" />}
              title="Non-Linear Video Timeline"
              desc="Drag-and-drop video/audio tracks, trim clip durations, apply Green Screen Chroma Keying, and render canvas animations to MP4."
            />
            <FeatureCard 
              icon={<Mic size={24} color="#ec4899" />}
              title="Whisper AI Subtitles & TTS"
              desc="Generate timestamped AI transcriptions, export .SRT subtitle files, and create synthetic text-to-speech voiceovers."
            />
            <FeatureCard 
              icon={<Sliders size={24} color="#10b981" />}
              title="30+ Google Fonts & Text FX"
              desc="Access 30+ popular fonts, drop shadows, outline stroke formatting, and custom aspect ratio presets (16:9, 9:16, 1:1, A4)."
            />
            <FeatureCard 
              icon={<Smartphone size={24} color="#f59e0b" />}
              title="Paystack Mobile Money & Cards"
              desc="Native payment support for Ghana Mobile Money (MTN MoMo, Vodafone, AirtelTigo) and Debit/Credit cards."
            />
            <FeatureCard 
              icon={<Layers size={24} color="#06b6d4" />}
              title="Real-Time Collaboration"
              desc="Socket.io powered live multi-user editing with team cursors, canvas layer sync, and shared timeline playhead scrubbing."
            />
          </div>
        </div>
      </section>

      {/* 4. PRICING SECTION ($9/mo) */}
      <section id="pricing" style={{ padding: '80px 20px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '12px' }}>Simple, Transparent Pricing</h2>
        <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '40px' }}>Unlock unlimited AI features and 4K exports with Paystack Mobile Money & Cards.</p>

        <div style={{ backgroundColor: '#1e293b', border: '2px solid #0284c7', borderRadius: '16px', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '1px' }}>OmniStudio Pro Plan</div>
          <div style={{ fontSize: '56px', fontWeight: '800', color: '#ffffff' }}>$9<span style={{ fontSize: '18px', color: '#94a3b8', fontWeight: 'normal' }}> / month</span></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', width: '100%', maxWidth: '360px', margin: '16px 0' }}>
            <PricingItem text="Unlimited Multi-Page PDF Exports" />
            <PricingItem text="Whisper AI Speech-to-Text & .SRT Exports" />
            <PricingItem text="OpenAI Text-To-Speech (TTS) Voiceovers" />
            <PricingItem text="Green Screen Chroma Key & Speed Ramping" />
            <PricingItem text="30+ Google Fonts & Social Canvas Presets" />
            <PricingItem text="Ghana Mobile Money (MTN MoMo, Vodafone) & Cards" />
          </div>

          <button 
            onClick={onLaunchStudio}
            style={{
              width: '100%',
              maxWidth: '360px',
              backgroundColor: '#059669', // Paystack Green Accent
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '14px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Zap size={18} /> Launch Studio & Upgrade ($9/mo)
          </button>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer style={{ borderTop: '1px solid #1e293b', padding: '32px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
        © {new Date().getFullYear()} OmniStudio Canvas. All rights reserved. Powered by React, FFmpeg, Whisper AI, and Paystack.
      </footer>

    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
      <div>{icon}</div>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#ffffff' }}>{title}</h3>
      <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>{desc}</p>
    </div>
  );
}

function PricingItem({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#e2e8f0' }}>
      <Check size={16} color="#10b981" />
      <span>{text}</span>
    </div>
  );
}