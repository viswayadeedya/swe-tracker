import { NextResponse } from 'next/server';
import { q1 } from '@/lib/db';

export async function GET() {
  const row = await q1<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['pin_hash']);
  return NextResponse.json({ hasPIN: !!row?.value });
}
