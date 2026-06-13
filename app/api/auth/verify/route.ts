import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { q1, run } from '@/lib/db';

function hashPin(pin: string): string {
  const secret = process.env.AUTH_SECRET ?? 'sprint-default-secret';
  return crypto.createHash('sha256').update(pin + secret).digest('hex');
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: '/',
  sameSite: 'lax' as const,
};

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  if (!pin || pin.length < 4) {
    return NextResponse.json({ error: 'PIN must be at least 4 digits' }, { status: 400 });
  }

  const secret = process.env.AUTH_SECRET ?? 'sprint-default-secret';
  const stored = await q1<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['pin_hash']);

  // First time — no PIN set yet, save whatever they enter
  if (!stored?.value) {
    await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['pin_hash', hashPin(pin)]);
    const res = NextResponse.json({ success: true, firstTime: true });
    res.cookies.set('sprint_auth', secret, COOKIE_OPTS);
    return res;
  }

  // Verify against stored hash
  if (stored.value !== hashPin(pin)) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('sprint_auth', secret, COOKIE_OPTS);
  return res;
}
