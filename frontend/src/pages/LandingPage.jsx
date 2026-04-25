import { Fragment, useEffect, useRef, useState } from 'react';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    const waitForGoogle = (attempt = 0) => {
      if (window.google?.accounts?.id) { resolve(); return; }
      if (attempt >= 40) { reject(new Error('Google script loaded but is unavailable. Disable blockers and allow accounts.google.com.')); return; }
      window.setTimeout(() => waitForGoogle(attempt + 1), 100);
    };
    if (window.google?.accounts?.id) { resolve(); return; }
    const existing = document.querySelector('script[data-google-gsi="true"]');
    if (existing) {
      if (existing.dataset.loaded === 'true') { waitForGoogle(); return; }
      existing.addEventListener('load', () => { existing.dataset.loaded = 'true'; waitForGoogle(); }, { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = 'true';
    script.onload = () => { script.dataset.loaded = 'true'; waitForGoogle(); };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

const ACCENT = '#D9184A';
const BLACK = '#0d0d0d';
const GRAY1 = '#f5f5f5';
const GRAY2 = '#e8e8e8';
const GRAY3 = '#9a9a9a';
const BORDER = `1.5px solid ${GRAY2}`;
const RADIUS = '10px';
const FONT = "'DM Sans', system-ui, sans-serif";

const CSS = `
  .hs-landing { font-family: ${FONT}; background: #fff; color: ${BLACK}; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  .hs-landing *, .hs-landing *::before, .hs-landing *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .hs-hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
  .hs-steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; border: ${BORDER}; border-radius: 14px; overflow: hidden; }
  .hs-step { background: #fff; padding: 36px 32px; border-right: ${BORDER}; }
  .hs-step:last-child { border-right: none; }
  .hs-features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; border: ${BORDER}; border-radius: 14px; overflow: hidden; }
  .hs-feature-card { background: #fff; padding: 40px 36px; border-right: ${BORDER}; border-bottom: ${BORDER}; transition: background 0.15s; }
  .hs-feature-card:hover { background: ${GRAY1}; }
  .hs-feature-card:nth-child(2n) { border-right: none; }
  .hs-feature-card:nth-child(3), .hs-feature-card:nth-child(4) { border-bottom: none; }
  .hs-cta-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
  .hs-stats-inner { display: flex; justify-content: space-between; align-items: center; gap: 24px; }
  .hs-footer-inner { display: flex; justify-content: space-between; align-items: center; }
  .hs-footer-inner a { font-size: 13px; color: ${GRAY3}; text-decoration: none; transition: color 0.15s; }
  .hs-footer-inner a:hover { color: ${BLACK}; }
  .hs-btn-hero-primary { background: ${ACCENT}; color: #fff; border: 1.5px solid ${ACCENT}; border-radius: ${RADIUS}; padding: 13px 28px; font-family: ${FONT}; font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; text-decoration: none; display: inline-block; }
  .hs-btn-hero-primary:hover { opacity: 0.85; }
  .hs-btn-hero-ghost { background: none; color: ${BLACK}; border: ${BORDER}; border-radius: ${RADIUS}; padding: 13px 28px; font-family: ${FONT}; font-size: 15px; font-weight: 500; cursor: pointer; transition: background 0.15s; text-decoration: none; display: inline-block; }
  .hs-btn-hero-ghost:hover { background: ${GRAY1}; }
  @media (max-width: 800px) {
    .hs-hero-inner { grid-template-columns: 1fr; }
    .hs-steps-grid { grid-template-columns: 1fr; }
    .hs-step { border-right: none; border-bottom: ${BORDER}; }
    .hs-step:last-child { border-bottom: none; }
    .hs-features-grid { grid-template-columns: 1fr; }
    .hs-feature-card { border-right: none; }
    .hs-feature-card:nth-child(3) { border-bottom: ${BORDER}; }
    .hs-stats-inner { flex-wrap: wrap; }
    .hs-stat-divider { display: none; }
    .hs-cta-inner { grid-template-columns: 1fr; }
    .hs-footer-inner { flex-direction: column; gap: 16px; text-align: center; }
    .hs-footer-links { justify-content: center; }
  }
`;

function Container({ children, style }) {
  return <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px', ...style }}>{children}</div>;
}

function IconPin({ style }) {
  return <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, ...style }} />;
}

const GoogleG = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function GoogleNavButton({ large, googleReady }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!googleReady || !overlayRef.current) return;
    window.google.accounts.id.renderButton(overlayRef.current, {
      type: 'standard', theme: 'outline', size: 'large',
      shape: 'pill', text: 'signin_with', width: 400,
    });
  }, [googleReady, large]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Visible styled button — pointer-events:none so clicks pass through */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: BORDER, borderRadius: 99, padding: large ? '13px 28px' : '10px 22px', fontFamily: FONT, fontSize: large ? 15 : 14, fontWeight: 500, color: BLACK, whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none' }}>
        <GoogleG />
        Sign in with Google
      </div>
      {/* Transparent real Google button covers the full area and handles clicks */}
      <div ref={overlayRef} style={{ position: 'absolute', inset: 0, opacity: 0.001, overflow: 'hidden', cursor: 'pointer' }} />
    </div>
  );
}

export default function LandingPage({ onLogin }) {
  const ctaButtonRef = useRef(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    if (!document.getElementById('dm-sans-font')) {
      const link = document.createElement('link');
      link.id = 'dm-sans-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      if (!GOOGLE_CLIENT_ID) {
        if (isMounted) { setError('Missing VITE_GOOGLE_CLIENT_ID.'); setIsLoading(false); }
        return;
      }
      try {
        await loadGoogleScript();
        if (!isMounted) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            try {
              if (!response?.credential) throw new Error('Google did not return a credential token.');
              const authResponse = await fetch(`${API_ROOT}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
              });
              if (!authResponse.ok) {
                const payload = await authResponse.json().catch(() => ({}));
                throw new Error(payload?.error || 'Google login failed');
              }
              const payload = await authResponse.json();
              if (!payload?.user) throw new Error('Google login response is missing user data');
              onLogin(payload.user);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Login failed');
            }
          },
        });
        if (ctaButtonRef.current) {
          window.google.accounts.id.renderButton(ctaButtonRef.current, { type: 'standard', theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', width: 400 });
        }
        if (isMounted) { setIsLoading(false); setGoogleReady(true); }
      } catch (err) {
        if (isMounted) { setError(err instanceof Error ? err.message : 'Failed to initialize login'); setIsLoading(false); }
      }
    }
    init();
    return () => { isMounted = false; };
  }, [onLogin]);

  return (
    <>
      <style>{CSS}</style>
      <div className="hs-landing">

        {/* ── Nav ── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: BORDER, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="#" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', color: BLACK, textDecoration: 'none' }}>HopShare</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isLoading && <span style={{ fontSize: 14, color: GRAY3 }}>Loading…</span>}
            <a className="hs-btn-hero-ghost" href="#how" style={{ padding: '7px 18px', fontSize: 14 }}>See how it works</a>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{ padding: '96px 0 80px', borderBottom: BORDER }}>
          <Container>
            <div className="hs-hero-inner">
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: GRAY1, border: BORDER, borderRadius: 99, padding: '4px 14px 4px 10px', fontSize: 13, fontWeight: 500, color: GRAY3, marginBottom: 24 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT, display: 'inline-block' }} />
                  Trusted ridesharing
                </div>
                <h1 style={{ fontSize: 'clamp(38px, 5vw, 58px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-1.5px', marginBottom: 20, textWrap: 'balance' }}>
                  Rideshare with people you trust
                </h1>
                <p style={{ fontSize: 17, lineHeight: 1.65, color: GRAY3, maxWidth: 480, marginBottom: 36 }}>
                  HopShare connects you with fellow students heading the same way. Split the cost, skip the hassle.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <GoogleNavButton large googleReady={googleReady} />
                </div>
              </div>

              {/* Mockup card */}
              <div style={{ background: '#fff', border: BORDER, borderRadius: 14, padding: 20, boxShadow: '0 2px 24px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Find nearby routes</div>
                <div style={{ fontSize: 13, color: GRAY3, marginBottom: 16 }}>Match with rides heading your way</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: BORDER, borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 14 }}>
                  <IconPin style={{ background: '#2ecc71' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: GRAY3, minWidth: 36 }}>From</span>
                  <span>Homewood Campus</span>
                </div>
                <div style={{ width: 2, height: 14, background: GRAY2, margin: '0 auto 8px 21px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: BORDER, borderRadius: 8, padding: '10px 14px', fontSize: 14 }}>
                  <IconPin style={{ background: ACCENT }} />
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: GRAY3, minWidth: 36 }}>To</span>
                  <span>Towson, MD</span>
                </div>
                <div style={{ border: BORDER, borderRadius: 8, marginTop: 14, overflow: 'hidden' }}>
                  <img src="/map-example.png" alt="Map preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* ── How it works ── */}
        <section id="how" style={{ padding: '88px 0', borderBottom: BORDER }}>
          <Container>
            <div style={{ marginBottom: 56 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: ACCENT, marginBottom: 12 }}>How it works</div>
              <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 12 }}>Sharing a ride has never been simpler</h2>
              <p style={{ fontSize: 16, color: GRAY3, maxWidth: 520, lineHeight: 1.6 }}>Three steps and you're on your way — whether you need a ride or have space to share.</p>
            </div>
            <div className="hs-steps-grid">
              {[
                { num: '1', label: 'Step one', title: 'Create your account', desc: 'Sign up with your Google account and set up your profile. It takes under a minute.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
                { num: '2', label: 'Step two', title: 'Find or post a ride', desc: 'Users can request a ride or offer a ride. Find people who need to go to/from a similar place and split costs!', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
                { num: '3', label: 'Step three', title: 'Go — and split the cost', desc: 'Coordinate with your match, share the ride, and split the fare. Everyone wins.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
              ].map(step => (
                <div key={step.num} className="hs-step">
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY3, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: BLACK, color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{step.num}</span>
                    {step.label}
                  </div>
                  <div style={{ width: 44, height: 44, border: BORDER, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, background: GRAY1 }}>{step.icon}</div>
                  <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.3px' }}>{step.title}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.65, color: GRAY3 }}>{step.desc}</div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ── Features ── */}
        <section id="features" style={{ padding: '88px 0', borderBottom: BORDER }}>
          <Container>
            <div style={{ marginBottom: 56 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: ACCENT, marginBottom: 12 }}>Features</div>
              <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 12 }}>Everything you need, nothing you don't</h2>
              <p style={{ fontSize: 16, color: GRAY3, maxWidth: 520, lineHeight: 1.6 }}>Built specifically for students who just want an easy, affordable way to get around.</p>
            </div>
            <div className="hs-features-grid">
              {[
                { title: 'Route matching', desc: 'Smart radius search finds rides that overlap your route - not just exact matches.', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
                { title: 'In-app messaging', desc: 'Coordinate directly with your match — no need to share personal contact info.', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
                { title: 'Schedule ahead', desc: 'Plan future rides by date. Post your trip in advance and fill seats before you leave.', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
                { title: 'Safety PIN', desc: "Each ride comes with a unique PIN. Share with your riders beforehand and ask them for the code when you meet in person.", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
              ].map(f => (
                <div key={f.title} className="hs-feature-card">
                  <div style={{ width: 40, height: 40, border: BORDER, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, background: '#fff' }}>{f.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.3px' }}>{f.title}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.65, color: GRAY3 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ── CTA ── */}
        <section id="cta" style={{ padding: '100px 0' }}>
          <Container>
            <div className="hs-cta-inner">
              <div>
                <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-1.2px', lineHeight: 1.1, marginBottom: 16 }}>Ready to share your next ride?</h2>
                <p style={{ fontSize: 16, lineHeight: 1.65, color: GRAY3, marginBottom: 32 }}>Join riders already saving money and meeting people on the way.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {['Free to sign up', 'No app download needed', 'No account needed'].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: GRAY3 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: '#fff', border: BORDER, borderRadius: 14, padding: 32, boxShadow: '0 2px 24px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Get started for free</h3>
                <p style={{ fontSize: 14, color: GRAY3, marginBottom: 24 }}>Sign in with your Google account to start finding and sharing rides.</p>
                <div ref={ctaButtonRef} style={{ display: 'flex', justifyContent: 'center' }} />
                {error && <p style={{ marginTop: 12, fontSize: 13, color: ACCENT, textAlign: 'center' }}>{error}</p>}
              </div>
            </div>
          </Container>
        </section>

      </div>
    </>
  );
}
