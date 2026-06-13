'use client';
import { useState } from 'react';
import { Square, Clock } from 'lucide-react';
import type { ActiveTimer } from '@/types';

interface Reflection {
  worked_on: string;
  completed_work: string;
  stuck_on: string;
}

interface Props {
  activeTimer: ActiveTimer | null;
  onStop: (reflection?: Reflection) => Promise<void>;
}

export default function TimerHUD({ activeTimer, onStop }: Props) {
  const [showReflection, setShowReflection] = useState(false);
  const [reflection, setReflection] = useState<Reflection>({ worked_on: '', completed_work: '', stuck_on: '' });

  if (!activeTimer) return null;

  const { elapsed } = activeTimer;
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const timeStr = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const handleStop = async () => {
    if (showReflection) {
      await onStop(reflection);
      setShowReflection(false);
      setReflection({ worked_on: '', completed_work: '', stuck_on: '' });
    } else {
      setShowReflection(true);
    }
  };

  const handleSkip = async () => {
    await onStop();
    setShowReflection(false);
    setReflection({ worked_on: '', completed_work: '', stuck_on: '' });
  };

  return (
    <>
      <div className="slide-in bg-amber-50 border-b border-amber-200 px-6 h-[52px] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="pulse-dot w-2 h-2 rounded-full bg-amber-500 inline-block" />
          <Clock size={14} className="text-amber-600" />
          <span className="text-sm font-medium text-amber-800 truncate max-w-xs">{activeTimer.taskTitle}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-lg font-semibold text-amber-900 tabular-nums">{timeStr}</span>
          <button
            onClick={handleStop}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md transition-colors"
          >
            <Square size={12} />
            Stop
          </button>
        </div>
      </div>

      {showReflection && (
        <div className="bg-white border-b border-slate-200 px-6 py-4 slide-in">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Reflection</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { key: 'worked_on', label: 'What did you work on?' },
                { key: 'completed_work', label: 'What did you complete?' },
                { key: 'stuck_on', label: 'Where did you get stuck?' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[11px] text-slate-400 block mb-1">{label}</label>
                  <input
                    type="text"
                    value={reflection[key as keyof Reflection]}
                    onChange={e => setReflection(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder="Optional..."
                    className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-400 bg-slate-50"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleStop}
                className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors"
              >
                Save & Stop
              </button>
              <button
                onClick={handleSkip}
                className="px-4 py-1.5 text-slate-500 text-xs hover:text-slate-700 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
