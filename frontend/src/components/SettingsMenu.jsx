import { useEffect, useState } from 'react';
import { Settings, Moon, Sun } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

const THEME_KEY = 'hopshare.theme';

function getInitialDark() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) return stored === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  const el = document.documentElement;
  if (dark) {
    el.style.setProperty('--color-white', 'oklch(0.18 0 0)');
    el.style.setProperty('--color-black', 'oklch(0.95 0 0)');
    el.style.setProperty('--color-gray-50',  'oklch(0.21 0 0)');
    el.style.setProperty('--color-gray-100', 'oklch(0.24 0 0)');
    el.style.setProperty('--color-gray-200', 'oklch(0.28 0 0)');
    el.style.setProperty('--color-gray-300', 'oklch(0.33 0 0)');
    el.style.setProperty('--color-gray-400', 'oklch(0.55 0 0)');
    el.style.setProperty('--color-gray-500', 'oklch(0.62 0 0)');
    el.style.setProperty('--color-gray-600', 'oklch(0.72 0 0)');
    el.style.setProperty('--color-gray-700', 'oklch(0.82 0 0)');
    el.style.setProperty('--color-gray-800', 'oklch(0.88 0 0)');
    el.style.setProperty('--color-gray-900', 'oklch(0.95 0 0)');
    document.body.style.backgroundColor = 'oklch(0.145 0 0)';
    document.body.style.color = 'oklch(0.9 0 0)';
  } else {
    el.style.removeProperty('--color-white');
    el.style.removeProperty('--color-black');
    el.style.removeProperty('--color-gray-50');
    el.style.removeProperty('--color-gray-100');
    el.style.removeProperty('--color-gray-200');
    el.style.removeProperty('--color-gray-300');
    el.style.removeProperty('--color-gray-400');
    el.style.removeProperty('--color-gray-500');
    el.style.removeProperty('--color-gray-600');
    el.style.removeProperty('--color-gray-700');
    el.style.removeProperty('--color-gray-800');
    el.style.removeProperty('--color-gray-900');
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
  }
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
}

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(getInitialDark);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className='relative p-2 rounded-full hover:bg-gray-100 transition-colors'
        aria-label='Settings'
      >
        <Settings className='w-6 h-6 text-gray-600' />
      </button>

      <SheetContent side='right' className='w-80 sm:w-96 flex flex-col'>
        <SheetHeader className='px-4 pt-4 pb-2 border-b border-gray-100'>
          <SheetTitle className='text-lg font-semibold'>Settings</SheetTitle>
          <SheetDescription className='sr-only'>App settings</SheetDescription>
        </SheetHeader>

        <div className='flex-1 px-4 py-4 space-y-4'>
          {/* Dark mode toggle */}
          <div className='flex items-center justify-between py-3 border-b border-gray-100'>
            <div className='flex items-center gap-3'>
              {isDark ? <Moon className='w-5 h-5 text-gray-600' /> : <Sun className='w-5 h-5 text-gray-600' />}
              <div>
                <p className='text-sm font-medium text-gray-800'>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </p>
                <p className='text-xs text-gray-500'>Toggle display theme</p>
              </div>
            </div>
            <button
              onClick={() => setIsDark(d => !d)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isDark ? 'bg-gray-700' : 'bg-gray-300'
              }`}
              aria-label='Toggle dark mode'
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  isDark ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
