'use client';
import { LayoutDashboard, CalendarCheck, Map, Clock, StickyNote, BookOpen, BarChart2, Settings, Flame, Zap, LogOut, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { View } from '@/app/page';

const NAV_ITEMS: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'today', label: 'Today', icon: CalendarCheck },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'sessions', label: 'Sessions', icon: Clock },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'review', label: 'Daily Review', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface Props {
  currentView: View;
  onNavigate: (v: View) => void;
  sprintDay: number;
}

export default function Sidebar({ currentView, onNavigate, sprintDay }: Props) {
  const router = useRouter();
  const progress = Math.round((sprintDay / 30) * 100);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="w-[240px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 leading-tight">Career Sprint</div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">30-Day OS</div>
          </div>
        </div>
      </div>

      {/* Sprint Progress */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">Sprint Progress</span>
          <span className="text-xs font-semibold text-indigo-600">Day {sprintDay} / 30</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-1 mt-2">
          <Flame size={11} className="text-orange-400" />
          <span className="text-[11px] text-slate-400">Week {Math.ceil(sprintDay / 7)} of 4</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100 text-left ${
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={16} className={active ? 'text-indigo-600' : 'text-slate-400'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-100 space-y-2">
        <div className="text-[11px] text-slate-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={12} /> Lock app
        </button>
      </div>
    </aside>
  );
}
