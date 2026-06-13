import { NextRequest, NextResponse } from 'next/server';
import { q, q1, run } from '@/lib/db';

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');
  const tag = req.nextUrl.searchParams.get('tag');
  const search = req.nextUrl.searchParams.get('search');

  let sql = `SELECT n.*, t.title as task_title FROM quick_notes n LEFT JOIN tasks t ON t.id = n.task_id WHERE 1=1`;
  const args: unknown[] = [];

  if (type) { sql += ` AND n.type = ?`; args.push(type); }
  if (search) { sql += ` AND n.content LIKE ?`; args.push(`%${search}%`); }
  if (tag) {
    sql += ` AND n.id IN (SELECT nt.note_id FROM note_tags nt JOIN tags tg ON tg.id = nt.tag_id WHERE tg.name = ?)`;
    args.push(tag);
  }
  sql += ` ORDER BY n.created_at DESC`;

  const notes = await q(sql, args);
  const withTags = await Promise.all(notes.map(async (note: unknown) => {
    const n = note as { id: number };
    const tags = await q('SELECT tg.* FROM tags tg JOIN note_tags nt ON nt.tag_id = tg.id WHERE nt.note_id = ?', [n.id]);
    return { ...n, tags };
  }));

  return NextResponse.json(withTags);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { content, type = 'work', task_id = null, tag_ids = [] } = body;
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const id = await run(
    'INSERT INTO quick_notes (content, type, task_id, created_at) VALUES (?, ?, ?, ?)',
    [content.trim(), type, task_id, new Date().toISOString()]
  );
  for (const tagId of tag_ids) {
    await run('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)', [id, tagId]);
  }

  const note = await q1('SELECT * FROM quick_notes WHERE id = ?', [id]);
  const tags = await q('SELECT tg.* FROM tags tg JOIN note_tags nt ON nt.tag_id = tg.id WHERE nt.note_id = ?', [id]);
  return NextResponse.json({ ...note, tags }, { status: 201 });
}
