'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { AnalyticsData, ActiveTimer } from '@/types';
import { CATEGORY_COLORS } from '@/types';

interface Props {
  sprintDay: number;
  activeTimer: ActiveTimer | null;
  startTimer: (taskId: number, taskTitle: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  sprintStartDate: string;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs font-medium text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-300 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AnalyticsView({ activeTimer }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);

  const load = () => {
    fetch('/api/analytics').then(r => r.json()).then(setData);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (!activeTimer) load(); }, [activeTimer]);

  if (!data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-slate-400 text-sm">Loading analytics...</div>
      </div>
    );
  }

  const pieColors = Object.values(CATEGORY_COLORS);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">Your sprint performance at a glance</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Hours" value={`${data.totalHours}h`} sub="since sprint start" />
        <StatCard label="Sessions" value={data.totalSessions} sub="focus sessions logged" />
        <StatCard label="Avg Session" value={`${data.avgSessionLength}min`} sub="average length" />
        <StatCard label="Active Days" value={data.dailyHours.filter(d => d.hours > 0).length} sub="days with logged time" />
      </div>

      {/* Daily Hours Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Daily Focus Hours</h2>
            <p className="text-xs text-slate-400 mt-0.5">Last 14 days</p>
          </div>
          <TrendingUp size={16} className="text-slate-300" />
        </div>
        {data.dailyHours.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.dailyHours} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                formatter={(val: number) => [`${val}h`, 'Hours']}
              />
              <Bar dataKey="hours" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-slate-400">
            No session data yet. Start tracking time to see your chart.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-5">Hours by Category</h2>
          {data.categoryHours.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.categoryHours}
                  dataKey="hours"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={35}
                >
                  {(data.categoryHours as { category: string; hours: number }[]).map((entry, i) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: number) => [`${val.toFixed(1)}h`, 'Hours']}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span style={{ fontSize: '11px', color: '#475569' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">
              No data yet
            </div>
          )}
        </div>

        {/* Completed by Week */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-5">Tasks Completed by Week</h2>
          {data.completedByWeek.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.completedByWeek} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">
              Complete tasks to see weekly progress
            </div>
          )}
        </div>
      </div>

      {/* Category Detail Table */}
      {data.categoryHours.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Category Breakdown</h2>
          <div className="space-y-3">
            {(data.categoryHours as { category: string; hours: number }[]).map(cat => {
              const totalHours = data.categoryHours.reduce((s, c) => s + (c as { hours: number }).hours, 0);
              const pct = totalHours > 0 ? (cat.hours / totalHours) * 100 : 0;
              const color = CATEGORY_COLORS[cat.category] || '#94a3b8';
              return (
                <div key={cat.category} className="flex items-center gap-4">
                  <div className="w-28 text-sm text-slate-600 font-medium truncate">{cat.category}</div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <div className="w-12 text-right text-sm font-semibold text-slate-700">{cat.hours.toFixed(1)}h</div>
                  <div className="w-10 text-right text-xs text-slate-400">{Math.round(pct)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
