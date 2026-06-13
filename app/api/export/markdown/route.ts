import { NextResponse } from 'next/server';
import { q } from '@/lib/db';

export async function GET() {
  const sessions = await q<{
    start_time: string; duration_minutes: number; task_title: string;
    category: string; day_number: number; day_title: string;
    worked_on: string; stuck_on: string;
  }>(`
    SELECT s.*, t.title as task_title, t.category, pd.day_number, pd.title as day_title
    FROM sessions s JOIN tasks t ON t.id = s.task_id JOIN plan_days pd ON pd.id = t.plan_day_id
    WHERE s.end_time IS NOT NULL ORDER BY s.start_time
  `);

  const reviews = await q<{
    date: string; focus_score: number; energy_score: number;
    wins: string; struggles: string; blockers: string; lessons: string;
  }>('SELECT * FROM daily_reviews ORDER BY date');

  const notes = await q<{ created_at: string; type: string; content: string }>(
    'SELECT * FROM quick_notes ORDER BY created_at'
  );

  const totalHours = sessions.reduce((s, r) => s + Number(r.duration_minutes), 0) / 60;
  let md = `# AI Career Sprint OS — Export\n\nGenerated: ${new Date().toISOString()}\n\n---\n\n`;
  md += `## Summary\n\n- Total sessions: ${sessions.length}\n- Total hours: ${totalHours.toFixed(1)}\n- Daily reviews: ${reviews.length}\n- Notes: ${notes.length}\n\n---\n\n`;

  md += `## Sessions by Day\n\n`;
  const byDay: Record<number, typeof sessions> = {};
  for (const s of sessions) (byDay[s.day_number] ??= []).push(s);
  for (const [dayNum, daySessions] of Object.entries(byDay)) {
    const dayTotal = daySessions.reduce((s, r) => s + Number(r.duration_minutes), 0);
    md += `### Day ${dayNum}: ${daySessions[0].day_title}\n\n**Total:** ${(dayTotal / 60).toFixed(1)}h\n\n`;
    for (const s of daySessions) {
      md += `- **${s.task_title}** (${s.category}) — ${Math.round(Number(s.duration_minutes))}min\n`;
      if (s.worked_on) md += `  - Worked on: ${s.worked_on}\n`;
      if (s.stuck_on) md += `  - Stuck on: ${s.stuck_on}\n`;
    }
    md += '\n';
  }

  md += `---\n\n## Daily Reviews\n\n`;
  for (const r of reviews) {
    md += `### ${r.date}\nFocus: ${r.focus_score}/10 | Energy: ${r.energy_score}/10\n\n`;
    if (r.wins) md += `**Wins:** ${r.wins}\n\n`;
    if (r.struggles) md += `**Struggles:** ${r.struggles}\n\n`;
    if (r.lessons) md += `**Lessons:** ${r.lessons}\n\n`;
  }

  md += `---\n\n## Notes\n\n`;
  for (const n of notes) {
    md += `- [${n.type.toUpperCase()}] ${n.content} *(${new Date(n.created_at).toLocaleDateString()})*\n`;
  }

  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown',
      'Content-Disposition': `attachment; filename="sprint-export-${new Date().toISOString().split('T')[0]}.md"`,
    },
  });
}
