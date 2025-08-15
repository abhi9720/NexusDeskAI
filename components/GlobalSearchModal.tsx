import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, Note } from '../types';
import { MagnifyingGlassIcon, DocumentTextIcon, TasksIcon } from './icons';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  notes: Note[];
  onSelectItem: (item: Task | Note) => void;
}

const GlobalSearchModal = ({ isOpen, onClose, tasks, notes, onSelectItem }: GlobalSearchModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) {
      return { tasks: [], notes: [] };
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    const filteredTasks = tasks.filter(task =>
      task.title.toLowerCase().includes(lowercasedTerm) ||
      task.description.toLowerCase().includes(lowercasedTerm)
    );
    const filteredNotes = notes.filter(note =>
      note.title.toLowerCase().includes(lowercasedTerm) ||
      note.content.toLowerCase().includes(lowercasedTerm)
    );
    return { tasks: filteredTasks, notes: filteredNotes };
  }, [searchTerm, tasks, notes]);
  
  const allResults = useMemo(() => [...searchResults.tasks, ...searchResults.notes], [searchResults]);
  
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      // Reset state on open
      setSearchTerm('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset active index when search term changes
    setActiveIndex(0);
  }, [searchTerm]);
  
  useEffect(() => {
    resultsRef.current[activeIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
    });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (allResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % allResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + allResults.length) % allResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allResults[activeIndex]) {
          onSelectItem(allResults[activeIndex]);
        }
      }
    }
  };

  const ResultItem = ({ item, index, isActive }: { item: Task | Note, index: number, isActive: boolean }) => {
    const isTask = 'status' in item;
    return (
      <button
        ref={el => { resultsRef.current[index] = el; }}
        onClick={() => onSelectItem(item)}
        className={`w-full text-left p-3 flex items-center gap-4 rounded-lg transition-colors ${
          isActive ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${
            isActive ? 'bg-primary/20' : 'bg-gray-100 dark:bg-gray-800'
        }`}>
            {isTask ? <TasksIcon className="w-5 h-5"/> : <DocumentTextIcon className="w-5 h-5"/>}
        </div>
        <div>
            <p className={`font-semibold ${isActive ? 'text-primary' : 'text-gray-800 dark:text-white'}`}>{item.title}</p>
            <p className={`text-xs truncate ${isActive ? 'text-primary/80' : 'text-gray-500 dark:text-gray-400'}`}>
                {isTask ? (item as Task).description : (item as Note).content.replace(/<[^>]*>?/gm, '')}
            </p>
        </div>
      </button>
    )
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex justify-center items-start backdrop-blur-sm pt-[15vh]"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-card-light dark:bg-card-dark rounded-xl shadow-2xl w-full max-w-2xl transform transition-all animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search tasks and notes..."
            className="w-full pl-12 pr-4 py-4 rounded-t-xl bg-transparent border-b border-gray-200 dark:border-gray-700 text-lg text-gray-900 dark:text-white focus:ring-0 focus:outline-none"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
            {searchTerm.trim() && allResults.length === 0 ? (
                <div className="text-center p-8 text-gray-500">No results found for "{searchTerm}"</div>
            ) : (
                <>
                    {searchResults.tasks.length > 0 && (
                        <div className="p-2">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Tasks</h3>
                            {searchResults.tasks.map((task, i) => (
                                <ResultItem key={task.id} item={task} index={i} isActive={i === activeIndex} />
                            ))}
                        </div>
                    )}
                     {searchResults.notes.length > 0 && (
                        <div className="p-2">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Notes</h3>
                             {searchResults.notes.map((note, i) => {
                                const overallIndex = searchResults.tasks.length + i;
                                return (
                                    <ResultItem key={note.id} item={note} index={overallIndex} isActive={overallIndex === activeIndex} />
                                );
                             })}
                        </div>
                    )}
                </>
            )}
        </div>
        
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 flex justify-between items-center">
            <span>
                <kbd className="px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-xs">↑</kbd>
                <kbd className="px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-xs">↓</kbd> to navigate,
                <kbd className="px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-xs">↵</kbd> to select
            </span>
            <span>
                 <kbd className="px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-xs">esc</kbd> to close
            </span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;