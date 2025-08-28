import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StickyNote } from '../types';
import { XMarkIcon } from './icons';
import { marked } from 'marked';

const colors = ['#FBBF24', '#A78BFA', '#60A5FA', '#F472B6', '#34D399', '#E5E7EB'];

interface StickyNoteItemProps {
    note: StickyNote;
    onUpdate: (note: StickyNote) => void;
    onDelete: (id: number) => void;
    onMouseOver: (noteId: number) => void;
    onMouseOut: () => void;
    isHovered: boolean;
}

const StickyNoteItem = ({ note, onUpdate, onDelete, onMouseOver, onMouseOut, isHovered }: StickyNoteItemProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    
    const dragStartPos = useRef({ x: 0, y: 0, noteX: 0, noteY: 0, noteW: 0, noteH: 0 });
    const noteRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing) {
            textareaRef.current?.focus();
            textareaRef.current?.select();
        }
    }, [isEditing]);

    const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isEditing) return;
        const target = e.target as HTMLElement;

        if (target.closest('button, a, input, textarea, .resize-handle')) {
            return;
        }

        if (noteRef.current && e.button === 0) {
            setIsDragging(true);
            dragStartPos.current = { ...dragStartPos.current, x: e.clientX, y: e.clientY, noteX: note.position.x, noteY: note.position.y };
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsResizing(true);
        dragStartPos.current = { ...dragStartPos.current, x: e.clientX, y: e.clientY, noteW: note.size.width, noteH: note.size.height };
        e.preventDefault();
        e.stopPropagation();
    };
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (e.buttons === 0) {
                if (isDragging || isResizing) {
                    setIsDragging(false);
                    setIsResizing(false);
                }
                return;
            }

            if (isDragging) {
                const dx = e.clientX - dragStartPos.current.x;
                const dy = e.clientY - dragStartPos.current.y;
                onUpdate({ ...note, position: { x: dragStartPos.current.noteX + dx, y: dragStartPos.current.noteY + dy }});
            }
            if (isResizing) {
                const dx = e.clientX - dragStartPos.current.x;
                const dy = e.clientY - dragStartPos.current.y;
                const newWidth = Math.max(200, dragStartPos.current.noteW + dx);
                const newHeight = Math.max(150, dragStartPos.current.noteH + dy);
                onUpdate({ ...note, size: { width: newWidth, height: newHeight }});
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
    }, [isDragging, isResizing, note, onUpdate]);

    const handleLocalUpdate = (field: keyof StickyNote, value: any) => {
        onUpdate({ ...note, [field]: value });
    };

    const renderedContent = useMemo(() => {
        return { __html: marked.parse(note.content, { gfm: true, breaks: true }) as string };
    }, [note.content]);

    const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
            const checkbox = target as HTMLInputElement;
            const li = checkbox.closest('li.task-list-item');
            if (!li) return;
            
            const allCheckboxes = Array.from(noteRef.current?.querySelectorAll('li.task-list-item input[type="checkbox"]') || []);
            const checkboxIndex = allCheckboxes.indexOf(checkbox);
            
            if (checkboxIndex > -1) {
                const lines = note.content.split('\n');
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
        }
    };

    const handleEditStart = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'A') {
            setIsEditing(true);
        }
    };

    return (
        <div
            ref={noteRef}
            onMouseDown={handleDragMouseDown}
            onMouseEnter={(e) => { e.stopPropagation(); onMouseOver(note.id); }}
            onMouseLeave={(e) => { e.stopPropagation(); onMouseOut(); }}
            className={`absolute p-0 rounded-lg flex flex-col group transition-all duration-100 ${isHovered ? 'shadow-2xl shadow-primary/50 ring-2 ring-primary' : 'shadow-xl'}`}
            style={{
                transform: `translate(${note.position.x}px, ${note.position.y}px)`,
                width: `${note.size.width}px`,
                height: `${note.size.height}px`,
                backgroundColor: note.color,
                transition: isDragging || isResizing ? 'none' : 'transform 0.2s ease-out, background-color 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out, box-shadow 0.2s ease-out, ring-width 0.2s ease-out',
                cursor: isEditing ? 'default' : 'grab',
            }}
        >
            <header className={`p-2 flex items-center justify-between ${note.color === '#E5E7EB' ? 'border-b border-gray-300' : ''}`}>
                 <input
                    type="text"
                    value={note.title}
                    onChange={(e) => handleLocalUpdate('title', e.target.value)}
                    placeholder="Title"
                    className="font-bold bg-transparent border-0 focus:ring-0 w-full p-0 text-sm text-gray-800"
                />
                 <div className="flex items-center">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                        className="flex-shrink-0 w-6 h-6 rounded-full bg-black/10 hover:bg-black/30 flex items-center justify-center text-black/50 hover:text-black transition-colors ml-1"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            </header>
           
            <div className="px-3 pt-1 flex-grow text-gray-800 overflow-y-auto relative" onClick={!isEditing ? handleContentClick : undefined} onDoubleClick={!isEditing ? handleEditStart : undefined}>
                 {isEditing ? (
                    <>
                        <textarea
                            ref={textareaRef}
                            value={note.content}
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
                        className={`w-5 h-5 rounded-full border border-black/20 transition-transform hover:scale-110 ${note.color === c ? 'ring-2 ring-black/50' : ''}`}
                        style={{ backgroundColor: c }}
                        aria-label={`Set color to ${c}`}
                    />
                ))}
            </footer>
            <div
                onMouseDown={handleResizeMouseDown}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-20 hover:opacity-100 resize-handle"
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
