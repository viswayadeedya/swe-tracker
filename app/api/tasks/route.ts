import { NextRequest, NextResponse } from 'next/server';
import { q, q1, run } from '@/lib/db';

export async function GET(req: NextRequest) {
  const dayId = req.nextUrl.searchParams.get('dayId');
  const dayNumber = req.nextUrl.searchParams.get('dayNumber');

  let planDayId = dayId;
  if (!planDayId && dayNumber) {
    const day = await q1<{ id: number }>('SELECT id FROM plan_days WHERE day_number = ?', [dayNumber]);
    planDayId = day ? String(day.id) : null;
  }
  if (!planDayId) return NextResponse.json({ error: 'dayId or dayNumber required' }, { status: 400 });

  const tasks = await q(`
    SELECT t.*,
      COALESCE(SUM(s.duration_minutes), 0) as total_minutes,
      COUNT(s.id) as session_count
    FROM tasks t
    LEFT JOIN sessions s ON s.task_id = t.id
    WHERE t.plan_day_id = ?
    GROUP BY t.id
    ORDER BY t.priority DESC, t.id
  `, [planDayId]);

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { plan_day_id, title, description = '', category, estimated_minutes = 60, priority = 'Medium' } = body;
  if (!plan_day_id || !title || !category) return NextResponse.json({ error: 'plan_day_id, title, category required' }, { status: 400 });

  const id = await run(
    'INSERT INTO tasks (plan_day_id, title, description, category, estimated_minutes, priority, is_custom) VALUES (?, ?, ?, ?, ?, ?, 1)',
    [plan_day_id, title, description, category, estimated_minutes, priority]
  );
  const task = await q1('SELECT * FROM tasks WHERE id = ?', [id]);
  return NextResponse.json(task, { status: 201 });
}
