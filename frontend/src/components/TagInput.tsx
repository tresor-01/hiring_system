import { useState, KeyboardEvent } from 'react';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ tags, onChange, placeholder = 'Add tag...' }: Props) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-800 border border-slate-700 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500">
      {tags.map(tag => (
        <span
          key={tag}
          className="flex items-center gap-1 bg-indigo-900/50 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full text-xs"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="hover:text-white text-indigo-400 leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-24 bg-transparent text-sm text-slate-100 outline-none placeholder-slate-500"
      />
    </div>
  );
}
