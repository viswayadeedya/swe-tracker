import { NextRequest, NextResponse } from 'next/server';
import { q1, run } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const task = await q1('SELECT * FROM tasks WHERE id = ?', [params.id]);
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const allowed = ['status', 'title', 'description', 'estimated_minutes', 'priority', 'category'];
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const key of allowed) {
    if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
  }
  if (fields.length === 0) return NextResponse.json(task);

  values.push(params.id);
  await run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
  return NextResponse.json(await q1('SELECT * FROM tasks WHERE id = ?', [params.id]));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const task = await q1<{ is_custom: number }>('SELECT * FROM tasks WHERE id = ?', [params.id]);
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!task.is_custom) return NextResponse.json({ error: 'Cannot delete seed tasks' }, { status: 403 });
  await run('DELETE FROM tasks WHERE id = ?', [params.id]);
  return NextResponse.json({ success: true });
}
