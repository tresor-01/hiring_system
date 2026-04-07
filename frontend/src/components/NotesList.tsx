import { useState } from 'react';
import { Note } from '../types';
import { applicationsApi } from '../api/applications';
import toast from 'react-hot-toast';

interface Props {
  resumeId: string;
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
}

export default function NotesList({ resumeId, notes, onNotesChange }: Props) {
  const [content, setContent] = useState('');
  const [starRating, setStarRating] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const note = await applicationsApi.addNote(resumeId, content, starRating || undefined);
      onNotesChange([note, ...notes]);
      setContent('');
      setStarRating(0);
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await applicationsApi.deleteNote(resumeId, noteId);
      onNotesChange(notes.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    }
  };

  return (
    <div className="space-y-4">
      {/* Add note */}
      <div className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note..."
          rows={3}
          className="input text-sm resize-none"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(star => (
              <button
                key={star}
                onClick={() => setStarRating(star === starRating ? 0 : star)}
                className={`text-xl ${star <= starRating ? 'text-yellow-400' : 'text-slate-600 hover:text-slate-400'}`}
              >
                ★
              </button>
            ))}
            {starRating > 0 && (
              <span className="text-xs text-slate-500 ml-1">{starRating}/5</span>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={loading || !content.trim()}
            className="btn-primary text-sm py-1.5"
          >
            {loading ? 'Adding...' : 'Add Note'}
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No notes yet</p>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-slate-800 rounded-lg p-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm text-slate-200">{note.content}</div>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors text-xs shrink-0"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-3">
                {note.starRating && (
                  <span className="text-yellow-400 text-xs">
                    {'★'.repeat(note.starRating)}{'☆'.repeat(5 - note.starRating)}
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  {note.user?.name} · {new Date(note.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
