import { NextResponse } from 'next/server';
import { q } from '@/lib/db';

export async function GET() {
  const days = await q('SELECT * FROM plan_days ORDER BY day_number');
  return NextResponse.json(days);
}
