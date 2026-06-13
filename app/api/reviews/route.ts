import { NextRequest, NextResponse } from 'next/server';
import { q, q1, run } from '@/lib/db';

export async function GET() {
  return NextResponse.json(await q('SELECT * FROM daily_reviews ORDER BY date DESC'));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, plan_day_id = null, wins = '', struggles = '', blockers = '', lessons = '', plan_tomorrow = '', focus_score = 5, energy_score = 5 } = body;
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const existing = await q1('SELECT id FROM daily_reviews WHERE date = ?', [date]);
  const now = new Date().toISOString();

  if (existing) {
    await run(
      `UPDATE daily_reviews SET plan_day_id=?, wins=?, struggles=?, blockers=?, lessons=?, plan_tomorrow=?, focus_score=?, energy_score=? WHERE date=?`,
      [plan_day_id, wins, struggles, blockers, lessons, plan_tomorrow, focus_score, energy_score, date]
    );
  } else {
    await run(
      `INSERT INTO daily_reviews (date,plan_day_id,wins,struggles,blockers,lessons,plan_tomorrow,focus_score,energy_score,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [date, plan_day_id, wins, struggles, blockers, lessons, plan_tomorrow, focus_score, energy_score, now]
    );
  }

  return NextResponse.json(await q1('SELECT * FROM daily_reviews WHERE date = ?', [date]), { status: existing ? 200 : 201 });
}
