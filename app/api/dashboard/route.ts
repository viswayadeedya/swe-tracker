import { NextRequest, NextResponse } from 'next/server';
import { q, q1 } from '@/lib/db';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const sprintDay = Number(req.nextUrl.searchParams.get('sprintDay') || 1);

  const timeRow = await q1<{ total: number }>(
    `SELECT COALESCE(SUM(duration_minutes), 0) as total FROM sessions WHERE DATE(start_time) = ? AND end_time IS NOT NULL`,
    [date]
  );

  const currentDay = await q1<{ id: number; title: string; objective: string }>(
    'SELECT * FROM plan_days WHERE day_number = ?', [sprintDay]
  );
  const dayId = currentDay?.id ?? null;

  const completedToday = dayId
    ? Number((await q1<{ c: number }>("SELECT COUNT(*) as c FROM tasks WHERE plan_day_id = ? AND status = 'done'", [dayId]))?.c ?? 0)
    : 0;

  const plannedToday = dayId
    ? Number((await q1<{ c: number }>('SELECT COUNT(*) as c FROM tasks WHERE plan_day_id = ?', [dayId]))?.c ?? 0)
    : 0;

  const streak = await computeStreak(date);

  const review = await q1<{ focus_score: number }>('SELECT focus_score FROM daily_reviews WHERE date = ?', [date]);

  const categoryBreakdown = await q(
    `SELECT t.category, SUM(s.duration_minutes) as minutes FROM sessions s JOIN tasks t ON t.id = s.task_id WHERE DATE(s.start_time) = ? AND s.end_time IS NOT NULL GROUP BY t.category`,
    [date]
  );

  const recentSessions = await q<{ start_time: string; title: string; category: string; duration_minutes: number }>(
    `SELECT s.start_time, t.title, t.category, s.duration_minutes FROM sessions s JOIN tasks t ON t.id = s.task_id WHERE DATE(s.start_time) = ? AND s.end_time IS NOT NULL ORDER BY s.start_time DESC LIMIT 5`,
    [date]
  );

  const recentActivity = recentSessions.map(s => ({
    type: 'session' as const,
    title: s.title,
    subtitle: `${s.category} · ${Math.round(Number(s.duration_minutes))}min`,
    time: new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  return NextResponse.json({
    timeToday: Number(timeRow?.total ?? 0),
    completedToday,
    plannedToday,
    streak,
    focusScore: review?.focus_score ?? null,
    categoryBreakdown,
    recentActivity,
    currentDay,
    sprintDay,
  });
}

async function computeStreak(today: string): Promise<number> {
  let streak = 0;
  const cursor = new Date(today + 'T00:00:00');
  for (let i = 0; i < 60; i++) {
    const dateStr = cursor.toISOString().split('T')[0];
    const row = await q1<{ c: number }>(
      `SELECT COUNT(*) as c FROM sessions WHERE DATE(start_time) = ? AND end_time IS NOT NULL`,
      [dateStr]
    );
    const hasActivity = Number(row?.c ?? 0) > 0;
    if (!hasActivity && i > 0) break;
    if (hasActivity) streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
