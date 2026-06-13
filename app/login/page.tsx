'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Delete } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin]         = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [checked, setChecked] = useState(false);

  // Check if PIN has been created yet
  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(d => { setIsSetup(!d.hasPIN); setChecked(true); });
  }, []);

  const submit = useCallback(async (value: string) => {
    if (value.length < 4) { setError('Enter at least 4 digits'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: value }),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Incorrect PIN');
        setPin('');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  const addDigit = (d: string) => {
    if (loading) return;
    setError('');
    setPin(prev => {
      const next = prev.length < 6 ? prev + d : prev;
      // Auto-submit on 4 digits only if PIN is already set up
      if (!isSetup && next.length === 4) {
        setTimeout(() => submit(next), 80);
      }
      return next;
    });
  };

  const deleteDigit = () => setPin(p => p.slice(0, -1));

  const pad = ['1','2','3','4','5','6','7','8','9','','0','del'];

  if (!checked) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-72">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-7">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div className="text-center">
            <div className="font-semibold text-slate-900 text-sm">Career Sprint OS</div>
            <div className="text-[11px] text-slate-400 tracking-wide">30-Day AI Engineer Sprint</div>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-center font-semibold text-slate-800 mb-1">
          {isSetup ? 'Create your PIN' : 'Enter PIN'}
        </h1>
        <p className="text-center text-xs text-slate-400 mb-5">
          {isSetup
            ? 'Choose a 4–6 digit PIN to protect your data'
            : 'Enter your PIN to access your sprint'}
        </p>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-5">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-150 ${
                i < pin.length ? 'bg-indigo-600 scale-110' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-center text-xs text-red-500 mb-3 animate-pulse">{error}</p>
        )}

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-2">
          {pad.map((key, i) => {
            if (key === '') return <div key={i} />;
            if (key === 'del') return (
              <button
                key={i}
                onClick={deleteDigit}
                disabled={loading}
                className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors flex items-center justify-center active:scale-95"
              >
                <Delete size={18} />
              </button>
            );
            return (
              <button
                key={i}
                onClick={() => addDigit(key)}
                disabled={loading}
                className="h-12 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-800 font-semibold text-lg transition-colors active:scale-95"
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Setup mode needs explicit submit (user picks 4-6 digits) */}
        {isSetup && (
          <button
            onClick={() => submit(pin)}
            disabled={pin.length < 4 || loading}
            className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl disabled:opacity-40 transition-colors"
          >
            {loading ? 'Saving…' : 'Set PIN & Enter'}
          </button>
        )}

        {loading && !isSetup && (
          <p className="text-center text-xs text-slate-400 mt-3">Verifying…</p>
        )}
      </div>
    </div>
  );
}
