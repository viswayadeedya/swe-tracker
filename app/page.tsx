'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import TimerHUD from '@/components/TimerHUD';
import DashboardView from '@/components/DashboardView';
import TodayView from '@/components/TodayView';
import RoadmapView from '@/components/RoadmapView';
import SessionsView from '@/components/SessionsView';
import NotesView from '@/components/NotesView';
import ReviewView from '@/components/ReviewView';
import AnalyticsView from '@/components/AnalyticsView';
import SettingsView from '@/components/SettingsView';
import type { ActiveTimer } from '@/types';

export type View = 'dashboard' | 'today' | 'roadmap' | 'sessions' | 'notes' | 'review' | 'analytics' | 'settings';

export default function Home() {
  const [view, setView] = useState<View>('dashboard');
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [sprintDay, setSprintDay] = useState(1);
  const [sprintStartDate, setSprintStartDate] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(settings => {
        const start = settings.sprint_start_date;
        setSprintStartDate(start);
        if (start) {
          const diff = Math.floor((Date.now() - new Date(start).getTime()) / 86400000);
          setSprintDay(Math.max(1, Math.min(30, diff + 1)));
        }
      });
  }, []);

  useEffect(() => {
    if (activeTimer) {
      intervalRef.current = setInterval(() => {
        setActiveTimer(prev => prev ? { ...prev, elapsed: prev.elapsed + 1 } : null);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeTimer?.sessionId]);

  const startTimer = useCallback(async (taskId: number, taskTitle: string) => {
    if (activeTimer) {
      await stopTimer();
    }
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId }),
    });
    if (res.ok) {
      const session = await res.json();
      setActiveTimer({ taskId, taskTitle, sessionId: session.id, startTime: session.start_time, elapsed: 0 });
    }
  }, [activeTimer]);

  const stopTimer = useCallback(async (reflection?: { worked_on: string; completed_work: string; stuck_on: string }) => {
    if (!activeTimer) return;
    const end_time = new Date().toISOString();
    await fetch(`/api/sessions/${activeTimer.sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end_time, ...reflection }),
    });
    setActiveTimer(null);
  }, [activeTimer]);

  const updateSprintDay = useCallback((date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    const day = Math.max(1, Math.min(30, diff + 1));
    setSprintDay(day);
    setSprintStartDate(date);
  }, []);

  const viewProps = { sprintDay, activeTimer, startTimer, stopTimer, sprintStartDate };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentView={view} onNavigate={setView} sprintDay={sprintDay} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TimerHUD activeTimer={activeTimer} onStop={stopTimer} />
        <main className="flex-1 overflow-y-auto">
          {view === 'dashboard' && <DashboardView {...viewProps} onNavigate={setView} />}
          {view === 'today' && <TodayView {...viewProps} />}
          {view === 'roadmap' && <RoadmapView {...viewProps} />}
          {view === 'sessions' && <SessionsView {...viewProps} />}
          {view === 'notes' && <NotesView {...viewProps} />}
          {view === 'review' && <ReviewView {...viewProps} />}
          {view === 'analytics' && <AnalyticsView {...viewProps} />}
          {view === 'settings' && <SettingsView {...viewProps} onSprintDateChange={updateSprintDay} />}
        </main>
      </div>
    </div>
  );
}
