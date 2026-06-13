import { NextRequest, NextResponse } from 'next/server';
import { q1, run } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { date: string } }) {
  return NextResponse.json(await q1('SELECT * FROM daily_reviews WHERE date = ?', [params.date]) ?? null);
}

export async function PATCH(req: NextRequest, { params }: { params: { date: string } }) {
  const body = await req.json();
  const allowed = ['wins', 'struggles', 'blockers', 'lessons', 'plan_tomorrow', 'focus_score', 'energy_score', 'ai_summary'];
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const key of allowed) {
    if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
  }
  if (fields.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  values.push(params.date);
  await run(`UPDATE daily_reviews SET ${fields.join(', ')} WHERE date = ?`, values);
  return NextResponse.json(await q1('SELECT * FROM daily_reviews WHERE date = ?', [params.date]));
}
