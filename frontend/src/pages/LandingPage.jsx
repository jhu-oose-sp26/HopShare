import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  MapPin,
  Navigation,
  ShieldCheck,
  Star,
} from 'lucide-react';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    const waitForGoogle = (attempt = 0) => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      if (attempt >= 40) {
        reject(new Error('Google script loaded but is unavailable. Disable blockers and allow accounts.google.com.'));
        return;
      }
      window.setTimeout(() => waitForGoogle(attempt + 1), 100);
    };

    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[data-google-gsi="true"]');
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        waitForGoogle();
        return;
      }
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

function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GithubIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 3-.405c1.02.005 2.045.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function LandingPage({ onLogin }) {
  const googleReady = useRef(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (!GOOGLE_CLIENT_ID) {
        if (isMounted) {
          setError('Missing VITE_GOOGLE_CLIENT_ID in frontend/.env.');
          setIsLoading(false);
        }
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
              setSigningIn(false);
            }
          },
        });

        googleReady.current = true;
        if (isMounted) setIsLoading(false);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize login');
          setIsLoading(false);
        }
      }
    }

    init();
    return () => { isMounted = false; };
  }, [onLogin]);

  const handleSignIn = () => {
    if (!googleReady.current) return;
    setSigningIn(true);
    setError('');
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setSigningIn(false);
        setError('Sign-in prompt was blocked. Please disable your ad blocker or allow pop-ups for this site.');
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col font-['Inter',sans-serif] bg-[#f8f9fa] text-[#001a48] antialiased">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-[#c4c6d2]/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-[#001a48] font-['Manrope',sans-serif]">
              HopShare
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleSignIn}
              disabled={isLoading || signingIn}
              className="bg-[#002d72] text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <GoogleIcon className="w-4 h-4" />
              {signingIn ? 'Signing in…' : 'Sign in with Google'}
            </button>
            {error && <p className="text-xs text-red-600 max-w-xs text-right">{error}</p>}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative flex-grow pt-16 flex flex-col">
        {/* Background Img Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="https://www.tripsavvy.com/thmb/85wFz774F2_2HV5MrYCW7xA53MI=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/GettyImages-1050146084-1f58e25cdab445b996e5896ee6e4cbe0.jpg"
            alt="Rideshare photo"
            className="w-full h-full object-cover opacity-40 grayscale"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#f8f9fa]/20 via-transparent to-[#f8f9fa]/80"></div>
        </div>

        {/* Hero Content */}
        <section className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
          <div className="max-w-7xl w-full flex flex-col lg:flex-row items-center gap-16">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1 space-y-8 text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffdeaa] rounded-full">
                <Star className="w-3.5 h-3.5 fill-[#271900] text-[#271900]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#271900] font-['Plus_Jakarta_Sans',sans-serif]">
                  Made for JHU Students, by JHU Students
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#001a48] leading-[1.1] font-['Manrope',sans-serif]">
                Get to wherever you're going...with your fellow <span className="text-[#046398]">Blue Jays.</span>
              </h1>

              <p className="text-lg md:text-xl text-[#2d2f3a] max-w-xl leading-relaxed mx-auto lg:mx-0">
                HopShare is the ultimate rideshare coordination platform built for the JHU community. Ride with other students and save money!
              </p>

              <div className="space-y-4 max-w-xl mx-auto lg:mx-0">
                <div className="flex items-start gap-4 text-left">
                  <div className="mt-1 w-8 h-8 shrink-0 rounded-xl bg-[#046398]/10 flex items-center justify-center">
                    <Navigation className="w-4 h-4 text-[#046398]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#001a48]">Riders: post your trip</p>
                    <p className="text-sm text-[#2d2f3a] leading-relaxed">
                      Share where you're headed and when. If another user wants to make a similar trip, they can find your trip and reach out. Coordinate, split the Uber or Lyft, and save.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 text-left">
                  <div className="mt-1 w-8 h-8 shrink-0 rounded-xl bg-[#001a48]/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#001a48]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#001a48]">Drivers: offer a seat</p>
                    <p className="text-sm text-[#2d2f3a] leading-relaxed">
                      Already driving somewhere? Post your route and time so riders heading your way can reach out and hop in. You can earn a bit of extra money for a trip you were already going to make, or offer a free ride!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 text-left">
                  <div className="mt-1 w-8 h-8 shrink-0 rounded-xl bg-green-600/10 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-green-700" />
                  </div>
                  <div>
                    <p className="font-bold text-[#001a48]">Safety: PIN verification</p>
                    <p className="text-sm text-[#2d2f3a] leading-relaxed">
                      Every post comes with a unique PIN. Share it with your riders beforehand — when you meet in person, ask them for the code to confirm you're connecting with exactly who you chatted with.
                    </p>
                  </div>
                </div>
              </div>

            </motion.div>

            {/* Right Content: Floating Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block w-96"
            >
              <div className="bg-white/75 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#2d2f3a] uppercase font-['Plus_Jakarta_Sans',sans-serif] tracking-widest">
                    Request a Shared Rideshare
                  </span>
                  <div className="h-2 w-2 rounded-full bg-[#046398] animate-pulse"></div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-[#f3f4f5] rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#046398]/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-[#046398]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#2d2f3a] font-['Plus_Jakarta_Sans',sans-serif] uppercase">From</p>
                      <p className="text-sm font-semibold text-[#001a48]">Homewood Campus</p>
                    </div>
                  </div>

                  <div className="p-4 bg-[#f3f4f5] rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#001a48]/10 flex items-center justify-center">
                      <Navigation className="w-5 h-5 text-[#001a48]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#2d2f3a] font-['Plus_Jakarta_Sans',sans-serif] uppercase">To</p>
                      <p className="text-sm font-semibold text-[#001a48]">East Baltimore / JHMI</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-[#81c4ff] rounded-2xl">
                  <div className="flex -space-x-3">
                    {[1, 2, 3].map((i) => (
                      <img
                        key={i}
                        src={`https://picsum.photos/seed/student${i}/100/100`}
                        alt="Student"
                        className="w-10 h-10 rounded-full border-2 border-white object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-[#00517e]">
                      3 users also want to go to a similar spot
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Secondary CTA */}
        <section className="relative z-10 bg-white/60 backdrop-blur-md border-t border-[#c4c6d2]/10 px-6 py-12">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-3xl font-extrabold text-[#001a48] font-['Manrope',sans-serif] tracking-tight">
                Want to Contribute?
              </h3>
              <p className="text-[#2d2f3a] mt-2">
                Check out the project's Github!
              </p>
            </div>
            <a
              href="https://github.com/jhu-oose-sp26/HopShare"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto px-10 py-4 bg-gradient-to-br from-[#001a48] to-[#002d72] text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 hover:scale-105 transition-transform active:scale-95"
            >
              Contribute to the project
              <GithubIcon className="w-5 h-5" />
            </a>
          </div>
        </section>
      </main>

    </div>
  );
}
