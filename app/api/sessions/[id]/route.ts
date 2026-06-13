import { NextRequest, NextResponse } from 'next/server';
import { q1, run } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await q1<{ start_time: string; end_time: string | null }>(
    'SELECT * FROM sessions WHERE id = ?', [params.id]
  );
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { end_time, note, worked_on, completed_work, stuck_on } = body;

  if (end_time) {
    const start = new Date(session.start_time).getTime();
    const end = new Date(end_time).getTime();
    const duration_minutes = Math.max(0, (end - start) / 60000);
    await run(`
      UPDATE sessions SET end_time = ?, duration_minutes = ?,
        note = COALESCE(?, note), worked_on = COALESCE(?, worked_on),
        completed_work = COALESCE(?, completed_work), stuck_on = COALESCE(?, stuck_on)
      WHERE id = ?
    `, [end_time, duration_minutes, note ?? null, worked_on ?? null, completed_work ?? null, stuck_on ?? null, params.id]);
  } else {
    await run(`
      UPDATE sessions SET note = COALESCE(?, note), worked_on = COALESCE(?, worked_on),
        completed_work = COALESCE(?, completed_work), stuck_on = COALESCE(?, stuck_on)
      WHERE id = ?
    `, [note ?? null, worked_on ?? null, completed_work ?? null, stuck_on ?? null, params.id]);
  }

  return NextResponse.json(await q1('SELECT * FROM sessions WHERE id = ?', [params.id]));
}
