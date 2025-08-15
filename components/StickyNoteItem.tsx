import React, { useState, useRef, useEffect } from 'react';
import { StickyNote } from '../types';
import { XMarkIcon } from './icons';

interface StickyNoteItemProps {
    note: StickyNote;
    onUpdate: (note: StickyNote) => void;
    onDelete: (id: number) => void;
}

const colors = ['#FBBF24', '#A78BFA', '#60A5FA', '#F472B6', '#34D399', '#E5E7EB'];

const StickyNoteItem = ({ note, onUpdate, onDelete }: StickyNoteItemProps) => {
    const [currentNote, setCurrentNote] = useState(note);
    const [position, setPosition] = useState(note.position);
    const [isDragging, setIsDragging] = useState(false);

    const dragStartPos = useRef({ x: 0, y: 0 });
    const noteRef = useRef<HTMLDivElement>(null);
    const updateTimeoutRef = useRef<number | null>(null);

    // Sync with external changes (e.g., from 'Organize Notes')
    useEffect(() => {
        if (JSON.stringify(note) !== JSON.stringify(currentNote)) {
            setCurrentNote(note);
        }
        setPosition(note.position);
    }, [note]);

    // Debounced auto-save for any change in the note content
    useEffect(() => {
        if (JSON.stringify(currentNote) !== JSON.stringify(note)) {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
            updateTimeoutRef.current = window.setTimeout(() => {
                onUpdate(currentNote);
            }, 500); // Auto-save after 500ms of inactivity
        }
        
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, [currentNote, onUpdate, note]);

    // Dragging logic
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (noteRef.current && (e.target as HTMLElement).closest('.drag-handle')) {
            setIsDragging(true);
            dragStartPos.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y,
            };
            e.preventDefault();
        }
    };
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setPosition({
                x: e.clientX - dragStartPos.current.x,
                y: e.clientY - dragStartPos.current.y,
            });
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Update internal state with new position after dragging
    useEffect(() => {
        if (!isDragging && (note.position.x !== position.x || note.position.y !== position.y)) {
             setCurrentNote(prev => ({ ...prev, position }));
        }
    }, [isDragging, position, note.position]);


    const handleLocalUpdate = (field: keyof StickyNote, value: any) => {
        setCurrentNote(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div
            ref={noteRef}
            className="absolute w-64 h-auto p-0 shadow-xl rounded-md flex flex-col"
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                backgroundColor: currentNote.color,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out, background-color 0.2s ease-out',
            }}
            onMouseDown={handleMouseDown}
        >
            <header className={`drag-handle p-2 flex items-center justify-between ${currentNote.color === '#E5E7EB' ? 'border-b border-gray-300' : ''}`} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
                 <input
                    type="text"
                    value={currentNote.title}
                    onChange={(e) => handleLocalUpdate('title', e.target.value)}
                    placeholder="Title"
                    className="font-bold bg-transparent border-0 focus:ring-0 w-full p-0 text-sm"
                />
                <button
                    onClick={() => onDelete(note.id)}
                    className="flex-shrink-0 w-6 h-6 rounded-full bg-black/10 hover:bg-black/30 flex items-center justify-center text-black/50 hover:text-black transition-colors"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </header>
           
            <div className="p-3 pt-1 flex-grow text-gray-800">
                <textarea
                    value={currentNote.content}
                    onChange={(e) => handleLocalUpdate('content', e.target.value)}
                    placeholder="Start typing..."
                    className="w-full h-32 bg-transparent border-0 focus:ring-0 resize-none p-0 text-sm"
                />
            </div>

            <footer className="flex-shrink-0 flex items-center space-x-2 px-3 pb-2">
                {colors.map(c => (
                    <button
                        key={c}
                        onClick={() => handleLocalUpdate('color', c)}
                        className={`w-5 h-5 rounded-full border border-black/20 transition-transform hover:scale-110 ${currentNote.color === c ? 'ring-2 ring-black/50' : ''}`}
                        style={{ backgroundColor: c }}
                        aria-label={`Set color to ${c}`}
                    />
                ))}
            </footer>
        </div>
    );
};

export default StickyNoteItem;