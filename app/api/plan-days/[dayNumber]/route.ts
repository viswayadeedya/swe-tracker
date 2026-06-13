import { NextRequest, NextResponse } from 'next/server';
import { q, q1 } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { dayNumber: string } }) {
  const day = await q1<{ id: number }>('SELECT * FROM plan_days WHERE day_number = ?', [params.dayNumber]);
  if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const tasks = await q(`
    SELECT t.*,
      COALESCE(SUM(s.duration_minutes), 0) as total_minutes,
      COUNT(s.id) as session_count
    FROM tasks t
    LEFT JOIN sessions s ON s.task_id = t.id
    WHERE t.plan_day_id = ?
    GROUP BY t.id
    ORDER BY t.priority DESC, t.id
  `, [day.id]);

  return NextResponse.json({ ...day, tasks });
}
