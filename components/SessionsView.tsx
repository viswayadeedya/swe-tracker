'use client';
import { useEffect, useState } from 'react';
import { Clock, Calendar } from 'lucide-react';
import type { Session, ActiveTimer } from '@/types';
import { CATEGORY_BG } from '@/types';

interface Props {
  sprintDay: number;
  activeTimer: ActiveTimer | null;
  startTimer: (taskId: number, taskTitle: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  sprintStartDate: string;
}

function fmtMinutes(m: number) {
  if (m < 1) return '<1m';
  if (m < 60) return `${Math.round(m)}m`;
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return min > 0 ? `${h}h ${min}m` : `${h}h`;
}

type SessionWithCategory = Session & { category?: string };

export default function SessionsView({ activeTimer }: Props) {
  const [sessions, setSessions] = useState<SessionWithCategory[]>([]);
  const [filter, setFilter] = useState<string>('all');

  const load = () => {
    fetch('/api/sessions?limit=100')
      .then(r => r.json())
      .then(setSessions);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (!activeTimer) load(); }, [activeTimer]);

  // Group by date
  const grouped: Record<string, SessionWithCategory[]> = {};
  for (const s of sessions) {
    const date = new Date(s.start_time).toISOString().split('T')[0];
    (grouped[date] ??= []).push(s);
  }

  const dates = Object.keys(grouped).sort().reverse();
  const totalHours = sessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>
          <p className="text-sm text-slate-400 mt-1">
            {sessions.length} sessions · {totalHours.toFixed(1)} hours total
          </p>
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 bg-white"
        >
          <option value="all">All sessions</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
        </select>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Clock size={32} className="mx-auto text-slate-200 mb-3" />
          <div className="text-sm text-slate-400">No sessions yet</div>
          <div className="text-xs text-slate-300 mt-1">Start a timer on the Today page</div>
        </div>
      ) : (
        <div className="space-y-6">
          {dates.map(date => {
            const daySessions = grouped[date];
            const today = new Date().toISOString().split('T')[0];
            const dateLabel = date === today
              ? 'Today'
              : new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            const dayTotal = daySessions.reduce((s, r) => s + r.duration_minutes, 0);

            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">{dateLabel}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{fmtMinutes(dayTotal)} total</span>
                </div>

                <div className="space-y-2">
                  {daySessions.map(session => (
                    <div key={session.id} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-800">{session.task_title}</span>
                            {session.category && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${CATEGORY_BG[session.category] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                {session.category}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {session.end_time && ` → ${new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            {session.day_number && <span className="ml-2">· Day {session.day_number}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Clock size={13} className="text-slate-300" />
                          <span className="text-sm font-semibold text-slate-700">{fmtMinutes(session.duration_minutes)}</span>
                        </div>
                      </div>

                      {(session.worked_on || session.stuck_on || session.note) && (
                        <div className="mt-3 pt-3 border-t border-slate-50 space-y-1.5">
                          {session.worked_on && (
                            <div className="text-xs text-slate-500">
                              <span className="font-medium text-slate-600">Worked on:</span> {session.worked_on}
                            </div>
                          )}
                          {session.completed_work && (
                            <div className="text-xs text-slate-500">
                              <span className="font-medium text-emerald-600">Completed:</span> {session.completed_work}
                            </div>
                          )}
                          {session.stuck_on && (
                            <div className="text-xs text-slate-500">
                              <span className="font-medium text-amber-600">Stuck on:</span> {session.stuck_on}
                            </div>
                          )}
                          {session.note && (
                            <div className="text-xs text-slate-500">
                              <span className="font-medium text-slate-600">Note:</span> {session.note}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
