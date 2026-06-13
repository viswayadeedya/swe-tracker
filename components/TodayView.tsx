'use client';
import { useEffect, useState } from 'react';
import { Play, Square, CheckCircle2, Circle, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { PlanDay, Task, ActiveTimer } from '@/types';
import { CATEGORY_BG, PRIORITY_COLORS } from '@/types';

interface Props {
  sprintDay: number;
  activeTimer: ActiveTimer | null;
  startTimer: (taskId: number, taskTitle: string) => Promise<void>;
  stopTimer: (r?: { worked_on: string; completed_work: string; stuck_on: string }) => Promise<void>;
  sprintStartDate: string;
}

function fmtMinutes(m: number) {
  if (m < 60) return `${Math.round(m)}m`;
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return min > 0 ? `${h}h ${min}m` : `${h}h`;
}

export default function TodayView({ sprintDay, activeTimer, startTimer, stopTimer }: Props) {
  const [day, setDay] = useState<PlanDay | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', category: 'Build', estimated_minutes: 60, priority: 'Medium' });

  const load = () => {
    fetch(`/api/plan-days/${sprintDay}`)
      .then(r => r.json())
      .then(setDay);
  };

  useEffect(() => { load(); }, [sprintDay]);
  useEffect(() => { if (!activeTimer) load(); }, [activeTimer]);

  const toggleStatus = async (task: Task) => {
    const next = task.status === 'done' ? 'todo' : 'done';
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    load();
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim() || !day) return;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTask, plan_day_id: day.id }),
    });
    setNewTask({ title: '', description: '', category: 'Build', estimated_minutes: 60, priority: 'Medium' });
    setShowAddTask(false);
    load();
  };

  const handleDeleteTask = async (taskId: number) => {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    load();
  };

  if (!day) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-slate-400 text-sm">Loading today&apos;s tasks...</div>
      </div>
    );
  }

  const tasks = day.tasks || [];
  const done = tasks.filter(t => t.status === 'done').length;
  const totalEst = tasks.reduce((s, t) => s + t.estimated_minutes, 0);
  const totalSpent = tasks.reduce((s, t) => s + (t.total_minutes || 0), 0);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">Day {sprintDay}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{day.title}</h1>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{day.objective}</p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xl font-bold text-slate-900">{done}<span className="text-slate-300 font-normal">/{tasks.length}</span></div>
              <div className="text-xs text-slate-400 font-medium">Tasks done</div>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div>
              <div className="text-xl font-bold text-slate-900">{fmtMinutes(totalSpent)}<span className="text-slate-300 text-sm font-normal"> / {fmtMinutes(totalEst)}</span></div>
              <div className="text-xs text-slate-400 font-medium">Time tracked</div>
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-400">{tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0}%</div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: tasks.length > 0 ? `${(done / tasks.length) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.map(task => {
          const isActive = activeTimer?.taskId === task.id;
          const isExpanded = expandedTask === task.id;

          return (
            <div
              key={task.id}
              className={`bg-white rounded-xl border transition-all ${
                isActive ? 'border-amber-300 shadow-sm' : task.status === 'done' ? 'border-slate-100 opacity-70' : 'border-slate-200'
              }`}
            >
              <div className="p-4 flex items-start gap-3">
                {/* Checkbox */}
                <button
                  onClick={() => toggleStatus(task)}
                  className="mt-0.5 flex-shrink-0 text-slate-300 hover:text-emerald-500 transition-colors"
                >
                  {task.status === 'done'
                    ? <CheckCircle2 size={20} className="text-emerald-500" />
                    : <Circle size={20} />
                  }
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {task.title}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_BG[task.category]}`}>
                      {task.category}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400">~{task.estimated_minutes}min est</span>
                    {(task.total_minutes || 0) > 0 && (
                      <span className="text-xs text-slate-500 font-medium">{fmtMinutes(task.total_minutes || 0)} logged</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.description && (
                    <button
                      onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                      className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                  {task.is_custom === 1 && (
                    <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 text-slate-200 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                  {task.status !== 'done' && (
                    isActive ? (
                      <button
                        onClick={() => stopTimer()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Square size={11} /> Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => startTimer(task.id, task.title)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 text-xs font-semibold rounded-lg transition-colors border border-slate-200 hover:border-indigo-200"
                      >
                        <Play size={11} /> Start
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Expanded description */}
              {isExpanded && task.description && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-xs text-slate-500 leading-relaxed pl-8 border-t border-slate-50 pt-3">{task.description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Task */}
      {showAddTask ? (
        <div className="bg-white rounded-xl border border-indigo-200 p-5 space-y-3">
          <div className="text-sm font-semibold text-slate-700">Add Custom Task</div>
          <input
            type="text"
            placeholder="Task title..."
            value={newTask.title}
            onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
          />
          <textarea
            placeholder="Description (optional)..."
            value={newTask.description}
            onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 resize-none h-16"
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              value={newTask.category}
              onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 bg-white"
            >
              {['Build', 'Interview Prep', 'Profile/Marketing', 'Applications/Networking'].map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={newTask.priority}
              onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 bg-white"
            >
              {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
            </select>
            <input
              type="number"
              placeholder="Est. minutes"
              value={newTask.estimated_minutes}
              onChange={e => setNewTask(p => ({ ...p, estimated_minutes: Number(e.target.value) }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddTask} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">
              Add Task
            </button>
            <button onClick={() => setShowAddTask(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddTask(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
        >
          <Plus size={16} /> Add custom task
        </button>
      )}
    </div>
  );
}
