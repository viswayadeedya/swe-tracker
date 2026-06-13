export interface PlanDay {
  id: number;
  day_number: number;
  title: string;
  objective: string;
  week: number;
  tasks?: Task[];
}

export interface Task {
  id: number;
  plan_day_id: number;
  title: string;
  description: string;
  category: TaskCategory;
  estimated_minutes: number;
  priority: Priority;
  status: TaskStatus;
  is_custom: number;
  total_minutes?: number;
  session_count?: number;
}

export type TaskCategory = 'Build' | 'Interview Prep' | 'Profile/Marketing' | 'Applications/Networking';
export type Priority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type NoteType = 'work' | 'struggle' | 'idea' | 'win';

export interface Session {
  id: number;
  task_id: number;
  task_title?: string;
  plan_day_id?: number;
  day_number?: number;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  note: string;
  worked_on: string;
  completed_work: string;
  stuck_on: string;
}

export interface QuickNote {
  id: number;
  task_id: number | null;
  task_title?: string;
  content: string;
  type: NoteType;
  created_at: string;
  tags?: Tag[];
}

export interface DailyReview {
  id: number;
  plan_day_id: number | null;
  date: string;
  wins: string;
  struggles: string;
  blockers: string;
  lessons: string;
  plan_tomorrow: string;
  focus_score: number;
  energy_score: number;
  ai_summary: string;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Settings {
  sprint_start_date: string;
  gemini_api_key: string;
}

export interface DashboardStats {
  timeToday: number;
  completedToday: number;
  plannedToday: number;
  streak: number;
  focusScore: number | null;
  categoryBreakdown: { category: string; minutes: number }[];
  recentActivity: RecentActivity[];
  currentDay: PlanDay | null;
  sprintDay: number;
}

export interface RecentActivity {
  type: 'session' | 'note' | 'task_complete';
  title: string;
  subtitle: string;
  time: string;
}

export interface AnalyticsData {
  dailyHours: { date: string; label: string; hours: number }[];
  categoryHours: { category: string; hours: number }[];
  completedByWeek: { week: string; count: number }[];
  struggleTags: { tag: string; count: number }[];
  avgSessionLength: number;
  totalSessions: number;
  totalHours: number;
}

export interface ActiveTimer {
  taskId: number;
  taskTitle: string;
  sessionId: number;
  startTime: string;
  elapsed: number;
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Build': '#2563eb',
  'Interview Prep': '#7c3aed',
  'Profile/Marketing': '#d97706',
  'Applications/Networking': '#059669',
};

export const CATEGORY_BG: Record<string, string> = {
  'Build': 'bg-blue-50 text-blue-700 border-blue-200',
  'Interview Prep': 'bg-violet-50 text-violet-700 border-violet-200',
  'Profile/Marketing': 'bg-amber-50 text-amber-700 border-amber-200',
  'Applications/Networking': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-50 text-red-700 border-red-200',
  Medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Low: 'bg-slate-50 text-slate-600 border-slate-200',
};
