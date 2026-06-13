import { NextRequest, NextResponse } from 'next/server';
import { q, run } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { date } = await req.json();
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });

  const sessions = await q<{ task_title: string; category: string; duration_minutes: number; worked_on: string; stuck_on: string }>(
    `SELECT s.*, t.title as task_title, t.category FROM sessions s JOIN tasks t ON t.id = s.task_id WHERE DATE(s.start_time) = ? AND s.end_time IS NOT NULL`,
    [date]
  );

  const notes = await q<{ type: string; content: string }>(
    `SELECT * FROM quick_notes WHERE DATE(created_at) = ?`, [date]
  );

  const totalMinutes = sessions.reduce((s, r) => s + Number(r.duration_minutes), 0);
  const sessionSummary = sessions.map(s =>
    `- [${s.category}] ${s.task_title} (${Math.round(Number(s.duration_minutes))}min)${s.stuck_on ? ` | Stuck: ${s.stuck_on}` : ''}`
  ).join('\n');
  const notesSummary = notes.map(n => `- [${n.type}] ${n.content}`).join('\n');

  const prompt = `You are an AI career coach reviewing an engineer's daily sprint log.

Date: ${date}
Total time logged: ${Math.round(totalMinutes)} minutes

Sessions:
${sessionSummary || 'No sessions logged'}

Notes:
${notesSummary || 'No notes logged'}

Provide as JSON:
{
  "summary": "2-3 sentence summary of what was accomplished",
  "tomorrow_priorities": ["priority 1", "priority 2", "priority 3"],
  "encouragement": "one encouraging observation"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(text);

    const aiSummary = `**Summary:** ${parsed.summary || ''}\n\n**Tomorrow's Priorities:**\n${(parsed.tomorrow_priorities || []).map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}\n\n**Coach says:** ${parsed.encouragement || ''}`;

    await run('UPDATE daily_reviews SET ai_summary = ? WHERE date = ?', [aiSummary, date]);
    return NextResponse.json({ ai_summary: aiSummary, raw: parsed });
  } catch {
    return NextResponse.json({ error: 'Failed to generate AI summary' }, { status: 500 });
  }
}
