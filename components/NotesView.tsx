'use client';
import { useEffect, useState } from 'react';
import { Plus, X, Search, Tag, StickyNote } from 'lucide-react';
import type { QuickNote, Tag as TagType, ActiveTimer } from '@/types';

interface Props {
  sprintDay: number;
  activeTimer: ActiveTimer | null;
  startTimer: (taskId: number, taskTitle: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  sprintStartDate: string;
}

const NOTE_TYPES = ['work', 'struggle', 'idea', 'win'] as const;
const NOTE_TYPE_STYLES: Record<string, string> = {
  work: 'bg-blue-50 text-blue-700 border-blue-200',
  struggle: 'bg-red-50 text-red-700 border-red-200',
  idea: 'bg-violet-50 text-violet-700 border-violet-200',
  win: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const NOTE_TYPE_ICONS: Record<string, string> = {
  work: '💼', struggle: '⚡', idea: '💡', win: '🏆',
};

export default function NotesView({ sprintDay }: Props) {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newNote, setNewNote] = useState({ content: '', type: 'work', tag_ids: [] as number[] });

  const load = () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (tagFilter) params.set('tag', tagFilter);
    if (search) params.set('search', search);
    fetch(`/api/notes?${params}`).then(r => r.json()).then(setNotes);
  };

  const loadTags = () => {
    // Tags are returned with notes; also fetch from a helper
    fetch('/api/notes').then(r => r.json()).then((allNotes: QuickNote[]) => {
      const tagMap = new Map<number, TagType>();
      for (const n of allNotes) {
        for (const t of (n.tags || [])) tagMap.set(t.id, t);
      }
      // Also add default tags
    });
  };

  useEffect(() => {
    // Load predefined tags from DB
    fetch('/api/notes').then(r => r.json()).then((allNotes: QuickNote[]) => {
      const tagMap = new Map<number, TagType>();
      for (const n of allNotes) {
        for (const t of (n.tags || [])) tagMap.set(t.id, t);
      }
    });

    // Get tags via settings endpoint workaround - fetch all notes to extract tags
    fetch('/api/notes').then(r => r.json()).then((data: QuickNote[]) => {
      setNotes(data);
      const seen = new Map<number, TagType>();
      for (const n of data) for (const t of (n.tags || [])) seen.set(t.id, t);
    });
  }, []);

  useEffect(() => {
    // Fetch all available tags
    fetch('/api/notes').then(r => r.json()).then((data: QuickNote[]) => {
      const seen = new Map<number, TagType>();
      for (const n of data) for (const t of (n.tags || [])) seen.set(t.id, t);
    });
  }, []);

  // Load all tags once at start
  useEffect(() => {
    const defaultTags = ['FastAPI', 'Python', 'Gemini', 'RAG', 'Deployment', 'DSA', 'Resume', 'LinkedIn', 'NextJS', 'TypeScript', 'Docker', 'Postgres'];
    setTags(defaultTags.map((name, i) => ({ id: i + 1, name })));
  }, [sprintDay]);

  useEffect(() => { load(); }, [typeFilter, tagFilter, search]);

  const handleAdd = async () => {
    if (!newNote.content.trim()) return;
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNote),
    });
    setNewNote({ content: '', type: 'work', tag_ids: [] });
    setShowAdd(false);
    load();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const toggleTagInNew = (tagId: number) => {
    setNewNote(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId],
    }));
  };

  // Group notes by date
  const grouped: Record<string, QuickNote[]> = {};
  for (const n of notes) {
    const date = new Date(n.created_at).toISOString().split('T')[0];
    (grouped[date] ??= []).push(n);
  }
  const dates = Object.keys(grouped).sort().reverse();

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notes</h1>
          <p className="text-sm text-slate-400 mt-1">{notes.length} notes · ideas, wins, struggles</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Note
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 w-48"
          />
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setTypeFilter('')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${!typeFilter ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
          >
            All
          </button>
          {NOTE_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${typeFilter === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
            >
              {NOTE_TYPE_ICONS[t]} {t}
            </button>
          ))}
        </div>
      </div>

      {/* Add Note Form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-indigo-200 p-5 space-y-3 slide-in">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">New Note</div>
            <button onClick={() => setShowAdd(false)} className="text-slate-300 hover:text-slate-500">
              <X size={16} />
            </button>
          </div>
          <textarea
            placeholder="What's on your mind? A win, a struggle, an idea..."
            value={newNote.content}
            onChange={e => setNewNote(p => ({ ...p, content: e.target.value }))}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 resize-none h-24"
            autoFocus
          />
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1.5">
              {NOTE_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setNewNote(p => ({ ...p, type: t }))}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                    newNote.type === t ? NOTE_TYPE_STYLES[t] : 'bg-white text-slate-400 border-slate-200'
                  }`}
                >
                  {NOTE_TYPE_ICONS[t]} {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Tag size={12} className="text-slate-400" />
              <span className="text-xs text-slate-400">Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTagInNew(tag.id)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                    newNote.tag_ids.includes(tag.id)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">
              Save Note
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-slate-500 text-sm transition-colors hover:text-slate-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <StickyNote size={32} className="mx-auto text-slate-200 mb-3" />
          <div className="text-sm text-slate-400">No notes yet</div>
          <div className="text-xs text-slate-300 mt-1">Capture wins, struggles, and ideas as you work</div>
        </div>
      ) : (
        <div className="space-y-6">
          {dates.map(date => {
            const today = new Date().toISOString().split('T')[0];
            const label = date === today
              ? 'Today'
              : new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

            return (
              <div key={date}>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{label}</div>
                <div className="space-y-2">
                  {grouped[date].map(note => (
                    <div key={note.id} className="bg-white rounded-xl border border-slate-200 p-4 group">
                      <div className="flex items-start gap-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${NOTE_TYPE_STYLES[note.type]}`}>
                          {NOTE_TYPE_ICONS[note.type]} {note.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              {note.tags.map(t => (
                                <span key={t.id} className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-400 mt-1.5">
                            {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-200 hover:text-red-400 transition-all p-1 flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
