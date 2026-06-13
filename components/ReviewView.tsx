'use client';
import { useEffect, useState } from 'react';
import { Sparkles, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import type { DailyReview, ActiveTimer } from '@/types';

interface Props {
  sprintDay: number;
  activeTimer: ActiveTimer | null;
  startTimer: (taskId: number, taskTitle: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  sprintStartDate: string;
}

const ScoreSlider = ({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) => (
  <div>
    <div className="flex justify-between mb-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <span className={`text-sm font-bold ${color}`}>{value}/10</span>
    </div>
    <input
      type="range" min={1} max={10} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full accent-indigo-600 h-1.5"
    />
    <div className="flex justify-between text-[10px] text-slate-300 mt-0.5">
      <span>1 — Rough</span>
      <span>10 — Excellent</span>
    </div>
  </div>
);

export default function ReviewView({ sprintDay }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    wins: '', struggles: '', blockers: '', lessons: '', plan_tomorrow: '',
    focus_score: 7, energy_score: 7,
  });
  const [saved, setSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [allReviews, setAllReviews] = useState<DailyReview[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/reviews/${today}`)
      .then(r => r.json())
      .then(data => {
        if (data) {
          setForm({
            wins: data.wins || '',
            struggles: data.struggles || '',
            blockers: data.blockers || '',
            lessons: data.lessons || '',
            plan_tomorrow: data.plan_tomorrow || '',
            focus_score: data.focus_score || 7,
            energy_score: data.energy_score || 7,
          });
          setAiSummary(data.ai_summary || '');
        }
      });

    fetch('/api/reviews').then(r => r.json()).then(setAllReviews);
  }, [today]);

  const handleSave = async () => {
    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, plan_day_id: sprintDay, ...form }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    fetch('/api/reviews').then(r => r.json()).then(setAllReviews);
  };

  const handleAiSummary = async () => {
    await handleSave();
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      });
      const data = await res.json();
      if (data.ai_summary) setAiSummary(data.ai_summary);
      else setAiSummary('Failed to generate summary. Check your GEMINI_API_KEY in settings.');
    } catch {
      setAiSummary('Error calling AI. Check your API key in Settings.');
    }
    setAiLoading(false);
  };

  const pastReviews = allReviews.filter(r => r.date !== today);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">Day {sprintDay}</span>
          <span className="text-xs text-slate-400">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Daily Review</h1>
        <p className="text-sm text-slate-400 mt-1">Reflect on today. Be honest with yourself.</p>
      </div>

      {/* Review Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <ScoreSlider
            label="Focus Score"
            value={form.focus_score}
            onChange={v => setForm(p => ({ ...p, focus_score: v }))}
            color={form.focus_score >= 7 ? 'text-emerald-600' : form.focus_score >= 4 ? 'text-amber-600' : 'text-red-600'}
          />
          <ScoreSlider
            label="Energy Score"
            value={form.energy_score}
            onChange={v => setForm(p => ({ ...p, energy_score: v }))}
            color={form.energy_score >= 7 ? 'text-emerald-600' : form.energy_score >= 4 ? 'text-amber-600' : 'text-red-600'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'wins', label: '🏆 Wins', placeholder: "What went well today? What are you proud of?" },
            { key: 'struggles', label: '⚡ Struggles', placeholder: "What was hard? What felt off?" },
            { key: 'blockers', label: '🚧 Blockers', placeholder: "What's blocking you? What do you need?" },
            { key: 'lessons', label: '📚 Lessons Learned', placeholder: "What did you learn that you want to remember?" },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{field.label}</label>
              <textarea
                value={form[field.key as keyof typeof form] as string}
                onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 resize-none h-24 leading-relaxed"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">📋 Plan for Tomorrow</label>
          <textarea
            value={form.plan_tomorrow}
            onChange={e => setForm(p => ({ ...p, plan_tomorrow: e.target.value }))}
            placeholder="What are the top 3 things you'll do tomorrow?"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 resize-none h-20 leading-relaxed"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            className={`px-5 py-2.5 font-semibold text-sm rounded-lg transition-colors ${
              saved ? 'bg-emerald-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {saved ? '✓ Saved' : 'Save Review'}
          </button>
          <button
            onClick={handleAiSummary}
            disabled={aiLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm rounded-lg transition-colors border border-indigo-200 disabled:opacity-60"
          >
            <Sparkles size={15} className={aiLoading ? 'animate-pulse' : ''} />
            {aiLoading ? 'Generating...' : 'AI Summary'}
          </button>
        </div>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 slide-in">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700">AI Coach Summary</span>
          </div>
          <div className="text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap">{aiSummary}</div>
        </div>
      )}

      {/* Past Reviews */}
      {pastReviews.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
            <BookOpen size={16} className="text-slate-400" />
            Past Reviews
          </h2>
          {pastReviews.map(review => (
            <div key={review.id} className="bg-white rounded-xl border border-slate-200">
              <button
                onClick={() => setExpandedId(expandedId === review.id ? null : review.id)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div>
                  <div className="text-sm font-medium text-slate-700">
                    {new Date(review.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400">Focus: <strong className="text-slate-600">{review.focus_score}/10</strong></span>
                    <span className="text-xs text-slate-400">Energy: <strong className="text-slate-600">{review.energy_score}/10</strong></span>
                  </div>
                </div>
                {expandedId === review.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>
              {expandedId === review.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-50">
                  {[
                    { key: 'wins', label: 'Wins' },
                    { key: 'struggles', label: 'Struggles' },
                    { key: 'blockers', label: 'Blockers' },
                    { key: 'lessons', label: 'Lessons' },
                    { key: 'plan_tomorrow', label: 'Plan' },
                  ].filter(f => review[f.key as keyof DailyReview]).map(field => (
                    <div key={field.key} className="pt-2">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{field.label}</div>
                      <div className="text-sm text-slate-600 leading-relaxed">{review[field.key as keyof DailyReview] as string}</div>
                    </div>
                  ))}
                  {review.ai_summary && (
                    <div className="pt-2 bg-indigo-50 rounded-lg p-3">
                      <div className="text-xs font-semibold text-indigo-600 mb-1">AI Summary</div>
                      <div className="text-xs text-indigo-800 leading-relaxed whitespace-pre-wrap">{review.ai_summary}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
