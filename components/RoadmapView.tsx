'use client';
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import type { PlanDay, Task, ActiveTimer } from '@/types';
import { CATEGORY_BG } from '@/types';

interface Props {
  sprintDay: number;
  activeTimer: ActiveTimer | null;
  startTimer: (taskId: number, taskTitle: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  sprintStartDate: string;
}

const WEEK_LABELS: Record<number, string> = {
  1: 'Week 1 — Ship v0.1 & Solidify Basics',
  2: 'Week 2 — RAG Foundations & Cloud Deployment',
  3: 'Week 3 — Real RAG & Workflow Depth',
  4: 'Week 4 — Senior Polish & Interview Strategy',
};

export default function RoadmapView({ sprintDay }: Props) {
  const [days, setDays] = useState<PlanDay[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([sprintDay]));
  const [tasks, setTasks] = useState<Record<number, Task[]>>({});
  const [loadingDay, setLoadingDay] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/plan-days').then(r => r.json()).then(setDays);
  }, []);

  const toggleDay = async (dayNumber: number) => {
    const next = new Set(expanded);
    if (next.has(dayNumber)) {
      next.delete(dayNumber);
    } else {
      next.add(dayNumber);
      if (!tasks[dayNumber]) {
        setLoadingDay(dayNumber);
        const res = await fetch(`/api/plan-days/${dayNumber}`);
        const data = await res.json();
        setTasks(prev => ({ ...prev, [dayNumber]: data.tasks || [] }));
        setLoadingDay(null);
      }
    }
    setExpanded(next);
  };

  const toggleTaskStatus = async (task: Task, dayNumber: number) => {
    const next = task.status === 'done' ? 'todo' : 'done';
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    setTasks(prev => ({
      ...prev,
      [dayNumber]: prev[dayNumber]?.map(t => t.id === task.id ? { ...t, status: next } : t) || [],
    }));
  };

  const byWeek = [1, 2, 3, 4].map(week => ({
    week,
    days: days.filter(d => d.week === week),
  }));

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">30-Day Roadmap</h1>
        <p className="text-sm text-slate-400 mt-1">Your complete sprint plan — expand any day to see tasks</p>
      </div>

      {byWeek.map(({ week, days: weekDays }) => (
        <div key={week}>
          <div className="flex items-center gap-3 mb-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{WEEK_LABELS[week]}</div>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <div className="space-y-1.5">
            {weekDays.map(day => {
              const isExpanded = expanded.has(day.day_number);
              const isCurrent = day.day_number === sprintDay;
              const isPast = day.day_number < sprintDay;
              const dayTasks = tasks[day.day_number] || [];
              const doneCount = dayTasks.filter(t => t.status === 'done').length;

              return (
                <div
                  key={day.id}
                  className={`bg-white rounded-xl border transition-all ${
                    isCurrent ? 'border-indigo-200 shadow-sm' : 'border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => toggleDay(day.day_number)}
                    className="w-full flex items-center gap-4 p-4 text-left"
                  >
                    {/* Day Number */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isCurrent ? 'bg-indigo-600 text-white' :
                      isPast ? 'bg-slate-100 text-slate-500' :
                      'bg-slate-50 text-slate-400'
                    }`}>
                      {day.day_number}
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isCurrent ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {day.title}
                        </span>
                        {isCurrent && <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Today</span>}
                      </div>
                      {!isExpanded && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{day.objective}</p>
                      )}
                    </div>

                    {/* Progress indicator */}
                    {dayTasks.length > 0 && (
                      <div className="text-xs text-slate-400 flex-shrink-0">
                        {doneCount}/{dayTasks.length}
                      </div>
                    )}

                    {/* Expand toggle */}
                    <div className="text-slate-300 flex-shrink-0">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                      <p className="text-xs text-slate-500 mb-3 leading-relaxed">{day.objective}</p>
                      {loadingDay === day.day_number ? (
                        <div className="text-xs text-slate-400 py-2">Loading tasks...</div>
                      ) : (
                        <div className="space-y-2">
                          {dayTasks.map(task => (
                            <div key={task.id} className="flex items-start gap-3 py-1.5">
                              <button
                                onClick={() => toggleTaskStatus(task, day.day_number)}
                                className="mt-0.5 flex-shrink-0 text-slate-300 hover:text-emerald-500 transition-colors"
                              >
                                {task.status === 'done'
                                  ? <CheckCircle2 size={16} className="text-emerald-500" />
                                  : <Circle size={16} />
                                }
                              </button>
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                  {task.title}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${CATEGORY_BG[task.category]}`}>
                                    {task.category}
                                  </span>
                                  <span className="text-[11px] text-slate-400">{task.estimated_minutes}min</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
