import { NextResponse } from 'next/server';
import { q1 } from '@/lib/db';

export async function GET() {
  try {
    const row = await q1<{ c: number }>('SELECT COUNT(*) as c FROM plan_days');
    return NextResponse.json({ status: 'ok', plan_days: row?.c ?? 0 });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: String(e) }, { status: 500 });
  }
}
