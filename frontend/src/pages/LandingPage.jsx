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
        reject(
          new Error(
            'Google script loaded but is unavailable. Disable blockers and allow accounts.google.com.'
          )
        );
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

      existing.addEventListener(
        'load',
        () => {
          existing.dataset.loaded = 'true';
          waitForGoogle();
        },
        { once: true }
      );
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Identity Services')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = 'true';
    script.onload = () => {
      script.dataset.loaded = 'true';
      waitForGoogle();
    };
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

function GithubIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 3-.405c1.02.005 2.045.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function LandingPage({ onLogin }) {
  const navButtonRef = useRef(null);
  const heroButtonRef = useRef(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initializeGoogleSignIn() {
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
              if (!response?.credential) {
                throw new Error('Google did not return a credential token.');
              }

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
              if (!payload?.user) {
                throw new Error('Google login response is missing user data');
              }

              onLogin(payload.user);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Login failed');
            }
          },
        });

        if (navButtonRef.current) {
          window.google.accounts.id.renderButton(navButtonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            shape: 'pill',
            text: 'signin_with',
          });
        }

        if (heroButtonRef.current) {
          window.google.accounts.id.renderButton(heroButtonRef.current, {
            type: 'standard',
            theme: 'filled_blue',
            size: 'large',
            shape: 'pill',
            text: 'signin_with',
            width: 280,
          });
        }

        if (isMounted) setIsLoading(false);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize login');
          setIsLoading(false);
        }
      }
    }

    initializeGoogleSignIn();

    return () => {
      isMounted = false;
    };
  }, [onLogin]);

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
          <div ref={navButtonRef} className="flex items-center" />
          {isLoading && (
            <span className="text-sm text-slate-400 ml-2">Loading...</span>
          )}
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

              <div className="flex flex-col items-center lg:items-start gap-3">
                <div ref={heroButtonRef} />
                {isLoading && (
                  <p className="text-sm text-slate-400">Loading sign-in...</p>
                )}
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
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
