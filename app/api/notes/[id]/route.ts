import { NextRequest, NextResponse } from 'next/server';
import { q, q1, run } from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const note = await q1('SELECT id FROM quick_notes WHERE id = ?', [params.id]);
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await run('DELETE FROM note_tags WHERE note_id = ?', [params.id]);
  await run('DELETE FROM quick_notes WHERE id = ?', [params.id]);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const note = await q1('SELECT id FROM quick_notes WHERE id = ?', [params.id]);
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  if (body.content !== undefined) await run('UPDATE quick_notes SET content = ? WHERE id = ?', [body.content, params.id]);
  if (body.type !== undefined) await run('UPDATE quick_notes SET type = ? WHERE id = ?', [body.type, params.id]);
  if (body.tag_ids !== undefined) {
    await run('DELETE FROM note_tags WHERE note_id = ?', [params.id]);
    for (const tagId of body.tag_ids) await run('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)', [params.id, tagId]);
  }

  const updated = await q1('SELECT * FROM quick_notes WHERE id = ?', [params.id]);
  const tags = await q('SELECT tg.* FROM tags tg JOIN note_tags nt ON nt.tag_id = tg.id WHERE nt.note_id = ?', [params.id]);
  return NextResponse.json({ ...updated, tags });
}
