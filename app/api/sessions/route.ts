import { NextRequest, NextResponse } from 'next/server';
import { q, q1, run } from '@/lib/db';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  const taskId = req.nextUrl.searchParams.get('taskId');
  const limit = Number(req.nextUrl.searchParams.get('limit') || 50);

  let sql = `
    SELECT s.*, t.title as task_title, t.category, pd.day_number, pd.id as plan_day_id
    FROM sessions s
    JOIN tasks t ON t.id = s.task_id
    JOIN plan_days pd ON pd.id = t.plan_day_id
    WHERE s.end_time IS NOT NULL
  `;
  const args: unknown[] = [];

  if (date) { sql += ` AND DATE(s.start_time) = ?`; args.push(date); }
  if (taskId) { sql += ` AND s.task_id = ?`; args.push(taskId); }
  sql += ` ORDER BY s.start_time DESC LIMIT ?`;
  args.push(limit);

  return NextResponse.json(await q(sql, args));
}

export async function POST(req: NextRequest) {
  const { task_id } = await req.json();
  if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 });

  const task = await q1('SELECT * FROM tasks WHERE id = ?', [task_id]);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const now = new Date().toISOString();
  const id = await run('INSERT INTO sessions (task_id, start_time) VALUES (?, ?)', [task_id, now]);
  await run("UPDATE tasks SET status = 'in_progress' WHERE id = ? AND status = 'todo'", [task_id]);

  return NextResponse.json(await q1('SELECT * FROM sessions WHERE id = ?', [id]), { status: 201 });
}
