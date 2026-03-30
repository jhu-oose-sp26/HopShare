import { useEffect, useRef, useState } from 'react';

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

function LoginPage({ onLogin }) {
  const buttonRef = useRef(null);
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

        if (!isMounted) {
          return;
        }

        if (!window.google?.accounts?.id || !buttonRef.current) {
          setError('Google sign-in could not initialize in this browser.');
          setIsLoading(false);
          return;
        }

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

        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: 280,
        });

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to initialize login'
          );
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
    <main className='min-h-screen bg-gradient-to-b from-slate-100 to-white px-4 py-16'>
      <section className='mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm'>
        <h1 className='text-3xl font-bold text-slate-900'>Welcome to HopShare</h1>
        <p className='mt-2 text-sm text-slate-600'>
          Sign in with your Google account to create and manage rides.
        </p>

        <div className='mt-8 flex flex-col items-center gap-3'>
          <div ref={buttonRef} />
          {isLoading && (
            <p className='text-sm text-slate-500'>Loading sign-in options...</p>
          )}
        </div>

        {error && <p className='mt-4 text-sm text-red-600'>{error}</p>}
      </section>
    </main>
  );
}

export default LoginPage;
