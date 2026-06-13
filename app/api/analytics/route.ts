import { NextResponse } from 'next/server';
import { q, q1 } from '@/lib/db';

export async function GET() {
  const dailyHoursRaw = await q<{ date: string; hours: number }>(`
    SELECT DATE(start_time) as date, SUM(duration_minutes) / 60.0 as hours
    FROM sessions
    WHERE end_time IS NOT NULL AND start_time >= DATE('now', '-14 days')
    GROUP BY DATE(start_time)
    ORDER BY date ASC
  `);

  const categoryHours = await q(`
    SELECT t.category, SUM(s.duration_minutes) / 60.0 as hours
    FROM sessions s JOIN tasks t ON t.id = s.task_id
    WHERE s.end_time IS NOT NULL
    GROUP BY t.category ORDER BY hours DESC
  `);

  const completedByWeek = await q(`
    SELECT 'Week ' || pd.week as week, COUNT(*) as count
    FROM tasks t JOIN plan_days pd ON pd.id = t.plan_day_id
    WHERE t.status = 'done'
    GROUP BY pd.week ORDER BY pd.week
  `);

  const avgRow = await q1<{ avg: number; total: number }>(
    `SELECT AVG(duration_minutes) as avg, COUNT(*) as total FROM sessions WHERE end_time IS NOT NULL`
  );

  const totalRow = await q1<{ total: number }>(
    `SELECT SUM(duration_minutes) / 60.0 as total FROM sessions WHERE end_time IS NOT NULL`
  );

  const dailyHours = dailyHoursRaw.map(row => ({
    ...row,
    label: new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    hours: Math.round(Number(row.hours) * 10) / 10,
  }));

  return NextResponse.json({
    dailyHours,
    categoryHours: categoryHours.map(c => ({ ...(c as object), hours: Math.round(Number((c as { hours: number }).hours) * 10) / 10 })),
    completedByWeek,
    struggleTags: [],
    avgSessionLength: Math.round(Number(avgRow?.avg) || 0),
    totalSessions: Number(avgRow?.total) || 0,
    totalHours: Math.round((Number(totalRow?.total) || 0) * 10) / 10,
  });
}
