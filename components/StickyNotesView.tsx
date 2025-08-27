import React from 'react';
import { StickyNote } from '../types';
import StickyNoteItem from './StickyNoteItem';
import StickyNotesWelcome from './StickyNotesWelcome';
import { PlusIcon, SparklesIcon } from './icons';

interface StickyNotesViewProps {
    notes: StickyNote[];
    onAddNote: () => void;
    onUpdateNote: (note: StickyNote) => void;
    onDeleteNote: (id: number) => void;
}

const StickyNotesView = ({ notes, onAddNote, onUpdateNote, onDeleteNote }: StickyNotesViewProps) => {
    
    const handleOrganizeNotes = () => {
        const margin = 20;
        const noteWidth = 256; // default width
        const noteHeight = 224; // default height
        const containerWidth = window.innerWidth - 80; // Account for smallest sidebar width

        let x = margin;
        let y = margin;

        notes.forEach(note => {
            onUpdateNote({ ...note, position: { x, y }, size: { width: noteWidth, height: noteHeight } });
            x += noteWidth + margin;
            if (x + noteWidth > containerWidth) {
                x = margin;
                y += noteHeight + margin;
            }
        });
    };
    
    return (
        <div className="relative w-full h-full overflow-hidden bg-gray-100 dark:bg-gray-900/50 bg-[linear-gradient(to_right,theme(colors.gray.200/50)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.gray.200/50)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,theme(colors.gray.700/50)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.gray.700/50)_1px,transparent_1px)] bg-[size:2rem_2rem]">
             <header className="sticky top-0 z-20 flex items-center justify-between p-4 bg-page/90 dark:bg-page-dark/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700/80">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Sticky Notes</h2>
                <div className="flex items-center space-x-2">
                     <button
                        onClick={handleOrganizeNotes}
                        className="flex items-center space-x-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                        title="Organize Notes"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        <span>Organize</span>
                    </button>
                    <button
                        onClick={onAddNote}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all transform hover:scale-105 shadow-md"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Add Note</span>
                    </button>
                </div>
            </header>

            <div className="absolute top-0 left-0 w-full h-full p-4 pt-20 overflow-auto">
                 {notes.map(note => (
                    <StickyNoteItem
                        key={note.id}
                        note={note}
                        onUpdate={onUpdateNote}
                        onDelete={onDeleteNote}
                    />
                ))}
                {notes.length === 0 && <StickyNotesWelcome />}
            </div>
        </div>
    );
};

export default StickyNotesView;