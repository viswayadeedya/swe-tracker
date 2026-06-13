import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { run } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  if (!pin || pin.length < 4) {
    return NextResponse.json({ error: 'PIN must be at least 4 digits' }, { status: 400 });
  }
  const secret  = process.env.AUTH_SECRET ?? 'sprint-default-secret';
  const pinHash = crypto.createHash('sha256').update(pin + secret).digest('hex');
  await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['pin_hash', pinHash]);
  return NextResponse.json({ success: true });
}
