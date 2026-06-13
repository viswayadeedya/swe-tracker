'use client';
import { useEffect, useState } from 'react';
import { Clock, CheckSquare, ListTodo, Flame, Target, TrendingUp, Play } from 'lucide-react';
import type { DashboardStats, ActiveTimer } from '@/types';
import { CATEGORY_COLORS } from '@/types';
import type { View } from '@/app/page';

interface Props {
  sprintDay: number;
  activeTimer: ActiveTimer | null;
  startTimer: (taskId: number, taskTitle: string) => Promise<void>;
  stopTimer: (r?: { worked_on: string; completed_work: string; stuck_on: string }) => Promise<void>;
  onNavigate: (v: View) => void;
  sprintStartDate: string;
}

function fmtMinutes(m: number) {
  if (m < 60) return `${Math.round(m)}m`;
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return min > 0 ? `${h}h ${min}m` : `${h}h`;
}

export default function DashboardView({ sprintDay, activeTimer, startTimer, onNavigate, sprintStartDate }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const loadStats = () => {
    fetch(`/api/dashboard?date=${today}&sprintDay=${sprintDay}`)
      .then(r => r.json())
      .then(setStats);
  };

  useEffect(() => { loadStats(); }, [sprintDay]);
  useEffect(() => {
    if (!activeTimer) loadStats();
  }, [activeTimer]);

  if (!stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-slate-400 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  const { timeToday, completedToday, plannedToday, streak, focusScore, categoryBreakdown, recentActivity, currentDay } = stats;

  const metricCards = [
    { label: 'Time Today', value: fmtMinutes(timeToday), icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Completed', value: `${completedToday} / ${plannedToday}`, icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Day Streak', value: streak > 0 ? `${streak} days` : 'Start today', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Focus Score', value: focusScore !== null ? `${focusScore}/10` : 'Not rated', icon: Target, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  const totalCatMinutes = categoryBreakdown.reduce((s: number, c: { minutes: number }) => s + c.minutes, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">Day {sprintDay}</span>
          {sprintStartDate && (
            <span className="text-xs text-slate-400">Sprint started {new Date(sprintStartDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h1>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        {metricCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={card.color} />
              </div>
              <div className="text-xl font-bold text-slate-900">{card.value}</div>
              <div className="text-xs text-slate-400 mt-0.5 font-medium">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Today's Objective */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Today&apos;s Objective</h2>
            <button onClick={() => onNavigate('today')} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              Go to Today →
            </button>
          </div>
          {currentDay ? (
            <>
              <div className="text-base font-semibold text-slate-800 mb-2">{(currentDay as { title: string }).title}</div>
              <p className="text-sm text-slate-500 leading-relaxed">{(currentDay as { objective: string }).objective}</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: plannedToday > 0 ? `${(completedToday / plannedToday) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs text-slate-400">{completedToday}/{plannedToday} tasks</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400">No plan for this day yet.</div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Today&apos;s Focus</h2>
          {totalCatMinutes > 0 ? (
            <div className="space-y-3">
              {(categoryBreakdown as { category: string; minutes: number }[]).map(cat => {
                const pct = totalCatMinutes > 0 ? (cat.minutes / totalCatMinutes) * 100 : 0;
                const color = CATEGORY_COLORS[cat.category] || '#94a3b8';
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium truncate">{cat.category}</span>
                      <span className="text-slate-400">{fmtMinutes(cat.minutes)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-400 text-center py-4">Start a timer to see focus breakdown</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
          <TrendingUp size={16} className="text-slate-300" />
        </div>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center">
                    <Play size={12} className="text-slate-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-800 font-medium">{item.title}</div>
                    <div className="text-xs text-slate-400">{item.subtitle}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400">{item.time}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-slate-300 mb-2">
              <Clock size={28} className="mx-auto" />
            </div>
            <div className="text-sm text-slate-400">No sessions logged today</div>
            <button
              onClick={() => onNavigate('today')}
              className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Start your first session →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
