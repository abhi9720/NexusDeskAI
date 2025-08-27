import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StickyNote } from '../types';
import { XMarkIcon } from './icons';
import { marked } from 'marked';

const colors = ['#FBBF24', '#A78BFA', '#60A5FA', '#F472B6', '#34D399', '#E5E7EB'];

const StickyNoteItem = ({ note, onUpdate, onDelete }: { note: StickyNote; onUpdate: (note: StickyNote) => void; onDelete: (id: number) => void; }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [currentNote, setCurrentNote] = useState(note);
    
    const dragStartPos = useRef({ x: 0, y: 0, noteX: 0, noteY: 0, noteW: 0, noteH: 0 });
    const noteRef = useRef<HTMLDivElement>(null);
    const updateTimeoutRef = useRef<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (JSON.stringify(note) !== JSON.stringify(currentNote)) {
            setCurrentNote(note);
        }
    }, [note]);

    useEffect(() => {
        if (isEditing) {
            textareaRef.current?.focus();
            textareaRef.current?.select();
        }
    }, [isEditing]);
    
    useEffect(() => {
        if (JSON.stringify(currentNote) !== JSON.stringify(note)) {
            if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
            updateTimeoutRef.current = window.setTimeout(() => {
                onUpdate(currentNote);
            }, 500);
        }
        return () => { if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); };
    }, [currentNote, onUpdate, note]);

    const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (noteRef.current && (e.target as HTMLElement).closest('.drag-handle') && e.button === 0) {
            setIsDragging(true);
            dragStartPos.current = { ...dragStartPos.current, x: e.clientX, y: e.clientY, noteX: currentNote.position.x, noteY: currentNote.position.y };
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsResizing(true);
        dragStartPos.current = { ...dragStartPos.current, x: e.clientX, y: e.clientY, noteW: currentNote.size.width, noteH: currentNote.size.height };
        e.preventDefault();
        e.stopPropagation();
    };
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const dx = e.clientX - dragStartPos.current.x;
                const dy = e.clientY - dragStartPos.current.y;
                setCurrentNote(prev => ({ ...prev, position: { x: dragStartPos.current.noteX + dx, y: dragStartPos.current.noteY + dy }}));
            }
            if (isResizing) {
                const dx = e.clientX - dragStartPos.current.x;
                const dy = e.clientY - dragStartPos.current.y;
                const newWidth = Math.max(200, dragStartPos.current.noteW + dx);
                const newHeight = Math.max(150, dragStartPos.current.noteH + dy);
                setCurrentNote(prev => ({ ...prev, size: { width: newWidth, height: newHeight }}));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing]);

    const handleLocalUpdate = (field: keyof StickyNote, value: any) => {
        setCurrentNote(prev => ({ ...prev, [field]: value }));
    };

    const renderedContent = useMemo(() => {
        return { __html: marked.parse(currentNote.content, { gfm: true, breaks: true }) as string };
    }, [currentNote.content]);

    const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
            const checkbox = target as HTMLInputElement;
            const li = checkbox.closest('li.task-list-item');
            if (!li) return;
            
            const allCheckboxes = Array.from(noteRef.current?.querySelectorAll('li.task-list-item input[type="checkbox"]') || []);
            const checkboxIndex = allCheckboxes.indexOf(checkbox);
            
            if (checkboxIndex > -1) {
                const lines = currentNote.content.split('\n');
                let taskItemCounter = -1;
                const newLines = lines.map(line => {
                    if (line.match(/^\s*-\s*\[[ x]\]/)) {
                        taskItemCounter++;
                        if (taskItemCounter === checkboxIndex) {
                            return line.includes('[ ]') ? line.replace('[ ]', '[x]') : line.replace('[x]', '[ ]');
                        }
                    }
                    return line;
                });
                handleLocalUpdate('content', newLines.join('\n'));
            }
        } else if (target.tagName !== 'A') {
            setIsEditing(true);
        }
    };
    
    return (
        <div
            ref={noteRef}
            className="absolute p-0 shadow-xl rounded-lg flex flex-col"
            style={{
                transform: `translate(${currentNote.position.x}px, ${currentNote.position.y}px)`,
                width: `${currentNote.size.width}px`,
                height: `${currentNote.size.height}px`,
                backgroundColor: currentNote.color,
                transition: isDragging || isResizing ? 'none' : 'transform 0.2s ease-out, background-color 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out',
            }}
        >
            <header onMouseDown={handleDragMouseDown} className={`drag-handle p-2 flex items-center justify-between ${currentNote.color === '#E5E7EB' ? 'border-b border-gray-300' : ''}`} style={{ cursor: 'grab' }}>
                 <input
                    type="text"
                    value={currentNote.title}
                    onChange={(e) => handleLocalUpdate('title', e.target.value)}
                    placeholder="Title"
                    className="font-bold bg-transparent border-0 focus:ring-0 w-full p-0 text-sm"
                />
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                    className="flex-shrink-0 w-6 h-6 rounded-full bg-black/10 hover:bg-black/30 flex items-center justify-center text-black/50 hover:text-black transition-colors"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </header>
           
            <div className="px-3 pt-1 flex-grow text-gray-800 overflow-y-auto relative" onClick={!isEditing ? handleContentClick : undefined}>
                 {isEditing ? (
                    <>
                        <textarea
                            ref={textareaRef}
                            value={currentNote.content}
                            onChange={(e) => handleLocalUpdate('content', e.target.value)}
                            placeholder="Start typing... Markdown is supported."
                            className="w-full h-full bg-transparent border-0 focus:ring-0 resize-none p-0 text-sm"
                        />
                         <button onClick={() => setIsEditing(false)} className="absolute bottom-2 right-2 px-2 py-1 text-xs font-semibold bg-primary text-white rounded-md">Done</button>
                    </>
                ) : (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5" dangerouslySetInnerHTML={renderedContent} />
                )}
            </div>

            <footer className="flex-shrink-0 flex items-center space-x-2 px-3 pb-2 mt-auto pt-2">
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
            <div
                onMouseDown={handleResizeMouseDown}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-20 hover:opacity-100"
                style={{
                  borderBottom: '2px solid black',
                  borderRight: '2px solid black',
                  borderBottomRightRadius: '5px'
                }}
            />
        </div>
    );
};

export default StickyNoteItem;