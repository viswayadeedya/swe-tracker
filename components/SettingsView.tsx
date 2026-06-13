'use client';
import { useEffect, useState } from 'react';
import { Save, Download, Calendar, Key, Lock } from 'lucide-react';
import type { ActiveTimer } from '@/types';

interface Props {
  sprintDay: number;
  activeTimer: ActiveTimer | null;
  startTimer: (taskId: number, taskTitle: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  sprintStartDate: string;
  onSprintDateChange: (date: string) => void;
}

export default function SettingsView({ sprintDay, sprintStartDate, onSprintDateChange }: Props) {
  const [sprintDate, setSprintDate] = useState(sprintStartDate);
  const [geminiKey, setGeminiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [pinForm, setPinForm] = useState({ current: '', next: '', confirm: '' });
  const [pinMsg, setPinMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    setSprintDate(sprintStartDate);
    fetch('/api/settings').then(r => r.json()).then(s => {
      setGeminiKey(s.gemini_api_key || '');
    });
  }, [sprintStartDate]);

  const handleSave = async () => {
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sprint_start_date: sprintDate, gemini_api_key: geminiKey }),
    });
    onSprintDateChange(sprintDate);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    window.open('/api/export/markdown', '_blank');
  };

  const handleChangePin = async () => {
    if (pinForm.next.length < 4) { setPinMsg({ text: 'New PIN must be at least 4 digits', ok: false }); return; }
    if (pinForm.next !== pinForm.confirm) { setPinMsg({ text: 'PINs do not match', ok: false }); return; }
    // Verify current PIN first
    const verify = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinForm.current }),
    });
    if (!verify.ok) { setPinMsg({ text: 'Current PIN is incorrect', ok: false }); return; }
    // Set new PIN
    const change = await fetch('/api/auth/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinForm.next }),
    });
    if (change.ok) {
      setPinMsg({ text: 'PIN updated successfully', ok: true });
      setPinForm({ current: '', next: '', confirm: '' });
    } else {
      setPinMsg({ text: 'Failed to update PIN', ok: false });
    }
    setTimeout(() => setPinMsg(null), 3000);
  };

  const calculatedDay = sprintDate
    ? Math.max(1, Math.min(30, Math.floor((Date.now() - new Date(sprintDate).getTime()) / 86400000) + 1))
    : sprintDay;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure your sprint and integrations</p>
      </div>

      {/* Sprint Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Sprint Configuration</h2>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sprint Start Date</label>
          <input
            type="date"
            value={sprintDate}
            onChange={e => setSprintDate(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 bg-white"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            {sprintDate ? `Currently on Day ${calculatedDay} of 30` : 'Set a start date to track your sprint day'}
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500 font-medium mb-2">Sprint Timeline</div>
          <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-400">
            {[1, 2, 3, 4].map(week => {
              const weekStart = (week - 1) * 7 + 1;
              const weekEnd = Math.min(week * 7, 30);
              const weekLabels = ['Ship v0.1', 'RAG + Deploy', 'Deep RAG', 'Polish + Interviews'];
              return (
                <div key={week} className={`rounded-lg p-2 ${calculatedDay >= weekStart && calculatedDay <= weekEnd ? 'bg-indigo-50 border border-indigo-200' : 'border border-slate-200 bg-white'}`}>
                  <div className={`font-semibold ${calculatedDay >= weekStart && calculatedDay <= weekEnd ? 'text-indigo-600' : 'text-slate-500'}`}>
                    Week {week}
                  </div>
                  <div>Days {weekStart}–{weekEnd}</div>
                  <div className="mt-0.5 text-[10px]">{weekLabels[week - 1]}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Key size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Gemini API</h2>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">API Key</label>
          <input
            type="password"
            value={geminiKey}
            onChange={e => setGeminiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 font-mono"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            Used for AI daily summaries in Daily Review. Get yours at{' '}
            <span className="text-indigo-600 font-medium">aistudio.google.com</span>.
          </p>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            <strong>Note:</strong> You can also set <code className="bg-amber-100 px-1 rounded">GEMINI_API_KEY</code> in your <code className="bg-amber-100 px-1 rounded">.env.local</code> file. Keys saved here override the env var.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 font-semibold text-sm rounded-lg transition-colors ${
            saved ? 'bg-emerald-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
          }`}
        >
          <Save size={15} />
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>

      {/* PIN Management */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Change PIN</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'current', label: 'Current PIN' },
            { key: 'next',    label: 'New PIN' },
            { key: 'confirm', label: 'Confirm PIN' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinForm[f.key as keyof typeof pinForm]}
                onChange={e => setPinForm(p => ({ ...p, [f.key]: e.target.value.replace(/\D/g, '') }))}
                placeholder="••••"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 tracking-widest"
              />
            </div>
          ))}
        </div>
        {pinMsg && (
          <p className={`text-xs font-medium ${pinMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{pinMsg.text}</p>
        )}
        <button onClick={handleChangePin} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors">
          Update PIN
        </button>
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Export Data</h2>
        <p className="text-xs text-slate-400 mb-4">Download all your sessions, notes, and reviews as a Markdown file.</p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 transition-colors"
        >
          <Download size={15} />
          Export to Markdown
        </button>
      </div>

      {/* Sprint Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Current Sprint Status</div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-slate-900">{calculatedDay}</div>
            <div className="text-[11px] text-slate-400">Current Day</div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{30 - calculatedDay + 1}</div>
            <div className="text-[11px] text-slate-400">Days Remaining</div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{Math.ceil(calculatedDay / 7)}</div>
            <div className="text-[11px] text-slate-400">Current Week</div>
          </div>
        </div>
        <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${(calculatedDay / 30) * 100}%` }}
          />
        </div>
        <div className="text-[11px] text-slate-400 mt-1 text-center">{Math.round((calculatedDay / 30) * 100)}% complete</div>
      </div>
    </div>
  );
}
