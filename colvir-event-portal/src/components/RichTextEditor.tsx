import React, { useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Palette,
  Type,
  RemoveFormatting
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Введите описание мероприятия...',
  minHeight = '120px'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedRange.current = range;
      }
    }
  };

  const handleCommand = (e: React.MouseEvent, command: string, arg: string = '') => {
    e.preventDefault();
    
    if (editorRef.current) {
      editorRef.current.focus();
    }
    if (savedRange.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange.current);
      }
    }

    document.execCommand(command, false, arg);
    
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        savedRange.current = selection.getRangeAt(0);
      }
    }
  };

  const handleInput = () => {
    saveSelection();
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleKeyUpOrClick = () => {
    saveSelection();
  };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs focus-within:border-[#1560AA] transition-all">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 text-slate-700 text-xs">
        
        {/* Bold */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => handleCommand(e, 'bold')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors font-bold cursor-pointer"
          title="Жирный"
        >
          <Bold className="w-4 h-4" />
        </button>

        {/* Italic */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => handleCommand(e, 'italic')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors italic cursor-pointer"
          title="Курсив"
        >
          <Italic className="w-4 h-4" />
        </button>

        {/* Underline */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => handleCommand(e, 'underline')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors underline cursor-pointer"
          title="Подчеркнутый"
        >
          <Underline className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-300 mx-1" />

        {/* Bullet List */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => handleCommand(e, 'insertUnorderedList')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          title="Маркированный список"
        >
          <List className="w-4 h-4" />
        </button>

        {/* Numbered List */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => handleCommand(e, 'insertOrderedList')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          title="Нумерованный список"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-300 mx-1" />

        {/* Text Colors */}
        <div className="flex items-center gap-1">
          <Palette className="w-3.5 h-3.5 text-slate-400" />
          {[
            { label: 'Синий', color: '#1560AA' },
            { label: 'Красный', color: '#DC2626' },
            { label: 'Зеленый', color: '#059669' },
            { label: 'Фиолетовый', color: '#7C3AED' },
            { label: 'Тёмный', color: '#0F172A' }
          ].map((c) => (
            <button
              key={c.color}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleCommand(e, 'foreColor', c.color)}
              className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs hover:scale-110 transition-transform cursor-pointer"
              style={{ backgroundColor: c.color }}
              title={c.label}
            />
          ))}
        </div>

        <div className="w-px h-4 bg-slate-300 mx-1" />

        {/* Font Sizes */}
        <div className="flex items-center gap-1">
          <Type className="w-3.5 h-3.5 text-slate-400" />
          {[
            { label: 'Маленький', size: '2' },
            { label: 'Нормальный', size: '3' },
            { label: 'Крупный', size: '5' },
            { label: 'Заголовок', size: '6' }
          ].map((s) => (
            <button
              key={s.size}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleCommand(e, 'fontSize', s.size)}
              className="px-2 py-0.5 bg-white hover:bg-slate-200 border border-slate-200 rounded text-[11px] font-bold cursor-pointer"
              title={s.label}
            >
              {s.size === '2' ? 'S' : s.size === '3' ? 'M' : s.size === '5' ? 'L' : 'XL'}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-slate-300 mx-1" />

        {/* Clear Formatting */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => handleCommand(e, 'removeFormat')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 cursor-pointer"
          title="Очистить форматирование"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>

      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyUp={handleKeyUpOrClick}
        onClick={handleKeyUpOrClick}
        style={{ minHeight }}
        className="p-3.5 text-sm text-slate-800 outline-hidden overflow-y-auto prose max-w-none focus:outline-none"
        data-placeholder={placeholder}
      />
    </div>
  );
};
