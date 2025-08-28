import React, { useState, useRef, useEffect } from 'react';
import { StickyNote, StickyNoteBoard, StickyNoteLink, ConnectorEndStyle, ConnectorStyle } from '../types';
import StickyNoteItem from './StickyNoteItem';
import StickyNotesWelcome from './StickyNotesWelcome';
import { PlusIcon, ChevronLeftIcon, PencilIcon, TrashIcon, EllipsisHorizontalIcon, CheckIcon, XMarkIcon, MinusIcon, ArrowUpRightIcon, ArrowPathIcon, ArrowLongRightIcon, StopCircleIcon } from './icons';
import { formatDistanceToNow } from 'date-fns';
import LinkRenderer from './LinkRenderer';

interface StickyNotesViewProps {
    notes: StickyNote[];
    boards: StickyNoteBoard[];
    links: StickyNoteLink[];
    onAddNote: (boardId: number) => void;
    onUpdateNote: (note: StickyNote) => void;
    onDeleteNote: (id: number) => void;
    onAddBoard: (name: string) => Promise<StickyNoteBoard>;
    onUpdateBoard: (board: StickyNoteBoard) => void;
    onDeleteBoard: (boardId: number) => void;
    onAddLink: (link: Omit<StickyNoteLink, 'id'>) => void;
    onUpdateLink: (link: StickyNoteLink) => void;
    onDeleteLink: (id: number) => void;
}

const BoardCard = ({ board, onSelect, onUpdate, onDelete }: { board: StickyNoteBoard, onSelect: () => void, onUpdate: (name: string) => void, onDelete: () => void }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(board.name);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);
    
    const handleSave = () => {
        if (name.trim()) {
            onUpdate(name.trim());
        } else {
            setName(board.name); // revert if empty
        }
        setIsEditing(false);
    };

    return (
        <div onClick={() => !isEditing && onSelect()} className="group relative p-4 bg-card-light dark:bg-card-dark rounded-lg shadow-md cursor-pointer hover:shadow-xl transition-all">
            {isEditing ? (
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        onBlur={handleSave}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-lg font-semibold bg-transparent border-b border-primary focus:outline-none dark:text-white"
                    />
                    <button onClick={(e) => { e.stopPropagation(); handleSave(); }}><CheckIcon className="w-5 h-5 text-green-500"/></button>
                    <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); setName(board.name); }}><XMarkIcon className="w-5 h-5 text-red-500"/></button>
                </div>
            ) : (
                <h3 className="text-lg font-semibold truncate text-gray-800 dark:text-white">{board.name}</h3>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">Created {formatDistanceToNow(new Date(board.createdAt), { addSuffix: true })}</p>
            <div className="absolute top-2 right-2" ref={menuRef}>
                <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(p => !p); }} className="p-2 -m-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700">
                    <EllipsisHorizontalIcon className="w-5 h-5 text-gray-500 dark:text-gray-300"/>
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700 animate-scale-in origin-top-right">
                        <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"><PencilIcon className="w-4 h-4"/> Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><TrashIcon className="w-4 h-4"/> Delete</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const LinkEditor = ({ link, onUpdate, onDelete, position }: { link: StickyNoteLink; onUpdate: (link: StickyNoteLink) => void; onDelete: (id: number) => void; position: {x: number, y: number} }) => {
    
    const styleButtons: { title: string, style: ConnectorStyle, icon: React.ReactNode }[] = [
        { title: 'Curved', style: 'curved', icon: <ArrowPathIcon className="w-4 h-4"/> },
        { title: 'Straight', style: 'straight', icon: <MinusIcon className="w-4 h-4"/> },
        { title: 'Elbow', style: 'elbow', icon: <ArrowUpRightIcon className="w-4 h-4 -rotate-90"/> },
    ];
    
    const endStyleButtons: { title: string, style: ConnectorEndStyle, icon: React.ReactNode }[] = [
        { title: 'Arrow', style: 'arrow', icon: <ArrowLongRightIcon className="w-4 h-4"/> },
        { title: 'Dot', style: 'dot', icon: <StopCircleIcon className="w-4 h-4"/> },
        { title: 'None', style: 'none', icon: <MinusIcon className="w-4 h-4"/> },
    ];
    
    const ToolButton = ({ title, isActive, onClick, children }: { title: string; isActive: boolean; onClick: () => void; children: React.ReactNode; }) => (
        <button
            title={title}
            onClick={onClick}
            className={`p-1.5 rounded-md transition-colors ${isActive ? 'bg-primary/20 text-primary' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
            {children}
        </button>
    );

    return (
        <div 
            className="absolute z-30 flex items-center gap-1 p-1 bg-card-light dark:bg-card-dark rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 animate-scale-in" 
            style={{ 
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: `translate(-50%, -50%)` 
            }}
            onClick={e => e.stopPropagation()}
        >
            {styleButtons.map(b => <ToolButton key={b.style} title={b.title} isActive={link.style === b.style} onClick={() => onUpdate({ ...link, style: b.style })}>{b.icon}</ToolButton>)}
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1"></div>
            {endStyleButtons.map(b => <ToolButton key={b.style} title={b.title} isActive={link.endStyle === b.style} onClick={() => onUpdate({ ...link, endStyle: b.style })}>{b.icon}</ToolButton>)}
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1"></div>
            <button title="Delete Link" onClick={() => onDelete(link.id)} className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500"><TrashIcon className="w-4 h-4"/></button>
        </div>
    );
};


const StickyNotesView = ({ notes, boards, links, onAddNote, onUpdateNote, onDeleteNote, onAddBoard, onUpdateBoard, onDeleteBoard, onAddLink, onUpdateLink, onDeleteLink }: StickyNotesViewProps) => {
    const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
    const [newBoardName, setNewBoardName] = useState('');
    const [isAddingBoard, setIsAddingBoard] = useState(false);
    
    const [localNotes, setLocalNotes] = useState<StickyNote[]>(notes);
    const updateTimeoutRef = useRef<{[key: number]: number}>({});

    const [localLinks, setLocalLinks] = useState<StickyNoteLink[]>(links);
    useEffect(() => {
        setLocalLinks(links);
    }, [links]);

    const [draggingLinkEnd, setDraggingLinkEnd] = useState<{ linkId: number; end: 'start' | 'end' } | null>(null);
    const [hoveredNoteId, setHoveredNoteId] = useState<number | null>(null);
    const [selectedLink, setSelectedLink] = useState<{link: StickyNoteLink, position: {x:number, y:number}} | null>(null);
    const boardContainerRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLElement>(null);
    const [isLinkMenuOpen, setIsLinkMenuOpen] = useState(false);
    const linkMenuRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        // Sync local state if the prop changes from a higher-level update (e.g., adding/deleting a note)
        setLocalNotes(notes);
    }, [notes]);

    const handleNoteUpdate = (updatedNote: StickyNote) => {
        // Update local state immediately for smooth UI feedback.
        setLocalNotes(prevNotes => prevNotes.map(n => n.id === updatedNote.id ? updatedNote : n));
        
        // Debounce the call to persist data to the database via App.tsx.
        if (updateTimeoutRef.current[updatedNote.id]) {
            clearTimeout(updateTimeoutRef.current[updatedNote.id]);
        }
        
        updateTimeoutRef.current[updatedNote.id] = window.setTimeout(() => {
            onUpdateNote(updatedNote);
        }, 500);
    };

    useEffect(() => {
        if (activeBoardId && !boards.find(b => b.id === activeBoardId)) {
            setActiveBoardId(null);
        }
    }, [boards, activeBoardId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (linkMenuRef.current && !linkMenuRef.current.contains(event.target as Node)) {
                setIsLinkMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [linkMenuRef]);

    const activeBoard = boards.find(b => b.id === activeBoardId);
    const notesForBoard = localNotes.filter(n => n.boardId === activeBoardId);
    const linksForBoard = localLinks.filter(l => l.boardId === activeBoardId);

    const handleAddBoard = async () => {
        if (!newBoardName.trim()) {
            setIsAddingBoard(false);
            return;
        }
        const newBoard = await onAddBoard(newBoardName.trim());
        setNewBoardName('');
        setIsAddingBoard(false);
        setActiveBoardId(newBoard.id);
    };
    
    const handleDeleteBoard = (boardId: number) => {
        if (window.confirm("Are you sure you want to delete this board and all its notes?")) {
            onDeleteBoard(boardId);
        }
    };

    const handleAddLink = (style: ConnectorStyle) => {
        if (!activeBoardId || !mainRef.current) return;

        const mainEl = mainRef.current;
        const centerX = mainEl.scrollLeft + mainEl.clientWidth / 2;
        const centerY = mainEl.scrollTop + mainEl.clientHeight / 2;

        onAddLink({
            boardId: activeBoardId,
            style,
            endStyle: 'arrow',
            startNoteId: null,
            endNoteId: null,
            startPosition: { x: centerX - 50, y: centerY },
            endPosition: { x: centerX + 50, y: centerY },
        });
        setIsLinkMenuOpen(false);
    };
    
    const handleStartDragLinkEnd = (linkId: number, end: 'start' | 'end', e: React.MouseEvent) => {
        e.stopPropagation();
        setDraggingLinkEnd({ linkId, end });
        const link = linksForBoard.find(l => l.id === linkId);
        if (!link || !mainRef.current) return;

        const mainEl = mainRef.current;
        const rect = mainEl.getBoundingClientRect();
        const mousePos = { 
            x: e.clientX - rect.left + mainEl.scrollLeft,
            y: e.clientY - rect.top + mainEl.scrollTop
        };

        setLocalLinks(currentLinks => currentLinks.map(l => {
            if (l.id === linkId) {
                const updatedLink = { ...l };
                if (end === 'start') {
                    updatedLink.startNoteId = null;
                    updatedLink.startPosition = mousePos;
                } else {
                    updatedLink.endNoteId = null;
                    updatedLink.endPosition = mousePos;
                }
                return updatedLink;
            }
            return l;
        }));
    };
    
    const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        if (draggingLinkEnd && boardContainerRef.current) {
            const mainEl = e.currentTarget;
            const rect = mainEl.getBoundingClientRect();
            const mousePos = { 
                x: e.clientX - rect.left + mainEl.scrollLeft, 
                y: e.clientY - rect.top + mainEl.scrollTop 
            };
            
            setLocalLinks(currentLinks => currentLinks.map(l => {
                if (l.id === draggingLinkEnd.linkId) {
                    const updatedLink = { ...l };
                    if (draggingLinkEnd.end === 'start') {
                        updatedLink.startPosition = mousePos;
                        updatedLink.startNoteId = null;
                    } else {
                        updatedLink.endPosition = mousePos;
                        updatedLink.endNoteId = null;
                    }
                    return updatedLink;
                }
                return l;
            }));
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLElement>) => {
        if (draggingLinkEnd) {
            const linkToUpdate = localLinks.find(l => l.id === draggingLinkEnd.linkId);
            if (!linkToUpdate) {
                setDraggingLinkEnd(null);
                return;
            }
    
            const mainEl = e.currentTarget;
            const rect = mainEl.getBoundingClientRect();
            if (!rect) {
                setDraggingLinkEnd(null);
                return;
            }
            const mousePos = { 
                x: e.clientX - rect.left + mainEl.scrollLeft, 
                y: e.clientY - rect.top + mainEl.scrollTop 
            };
    
            const noteUnderCursor = notesForBoard.find(note =>
                mousePos.x >= note.position.x &&
                mousePos.x <= note.position.x + note.size.width &&
                mousePos.y >= note.position.y &&
                mousePos.y <= note.position.y + note.size.height
            );
    
            const updatedLink = { ...linkToUpdate };
            const endKey = draggingLinkEnd.end === 'start' ? 'startNoteId' : 'endNoteId';
            const posKey = draggingLinkEnd.end === 'start' ? 'startPosition' : 'endPosition';
    
            if (noteUnderCursor) {
                updatedLink[endKey] = noteUnderCursor.id;
                delete (updatedLink as any)[posKey];
            } else {
                // Endpoint is free-floating. Update with the final mouse position.
                updatedLink[posKey] = mousePos;
                updatedLink[endKey] = null;
            }
            
            onUpdateLink(updatedLink);
            
            setDraggingLinkEnd(null);
            setHoveredNoteId(null);
        }
    };
    
    if (boards.length === 0) {
        return (
            <div className="relative h-full w-full">
                <StickyNotesWelcome />
                <div className="absolute bottom-10 right-10 flex items-center gap-2">
                     {isAddingBoard && (
                        <input 
                            type="text"
                            placeholder="New board name..."
                            autoFocus 
                            onBlur={handleAddBoard} 
                            onKeyDown={e => e.key === 'Enter' && handleAddBoard()} 
                            value={newBoardName} 
                            onChange={e => setNewBoardName(e.target.value)} 
                            className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg form-input text-gray-800 dark:text-white"
                        />
                    )}
                    <button onClick={() => setIsAddingBoard(true)} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg flex items-center gap-2 shadow-lg hover:bg-primary-dark transition-all transform hover:scale-105">
                        <PlusIcon className="w-5 h-5"/>
                        Create Your First Board
                    </button>
                </div>
            </div>
        );
    }
    
    if (!activeBoard) {
        return (
            <div className="p-8 animate-fade-in">
                <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Sticky Note Boards</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {boards.map(board => (
                        <BoardCard 
                            key={board.id} 
                            board={board} 
                            onSelect={() => setActiveBoardId(board.id)}
                            onUpdate={(name) => onUpdateBoard({...board, name})}
                            onDelete={() => handleDeleteBoard(board.id)}
                        />
                    ))}
                    {isAddingBoard ? (
                         <div className="p-4 bg-card-light dark:bg-card-dark rounded-lg shadow-md flex items-center gap-2">
                             <input type="text" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddBoard()} autoFocus className="w-full bg-transparent focus:outline-none form-input text-gray-800 dark:text-white"/>
                             <button onClick={handleAddBoard}><CheckIcon className="w-5 h-5 text-green-500"/></button>
                         </div>
                    ) : (
                        <button onClick={() => setIsAddingBoard(true)} className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary">
                            <PlusIcon className="w-8 h-8"/>
                            <span>New Board</span>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col bg-gray-100 dark:bg-gray-900">
            <header className="p-4 bg-card-light dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 flex-shrink-0">
                 <button onClick={() => setActiveBoardId(null)} className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary">
                    <ChevronLeftIcon className="w-5 h-5"/>
                    All Boards
                 </button>
                 <h2 className="text-xl font-bold text-gray-800 dark:text-white">{activeBoard.name}</h2>
                 <div className="ml-auto flex items-center gap-2">
                     <div className="relative" ref={linkMenuRef}>
                        <button onClick={() => setIsLinkMenuOpen(p => !p)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 font-semibold rounded-lg flex items-center gap-2 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600">
                            <PlusIcon className="w-5 h-5"/> Add Link
                        </button>
                        {isLinkMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-card-light dark:bg-card-dark rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700 animate-scale-in origin-top-right py-1">
                                <button onClick={() => handleAddLink('straight')} className="w-full text-left px-3 py-2 text-sm flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><MinusIcon className="w-4 h-4"/> Straight Line</button>
                                <button onClick={() => handleAddLink('curved')} className="w-full text-left px-3 py-2 text-sm flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowPathIcon className="w-4 h-4"/> Curved Line</button>
                                <button onClick={() => handleAddLink('elbow')} className="w-full text-left px-3 py-2 text-sm flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowUpRightIcon className="w-4 h-4 -rotate-90"/> Elbow Line</button>
                            </div>
                        )}
                    </div>
                    <button onClick={() => onAddNote(activeBoard.id)} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg flex items-center gap-2"><PlusIcon className="w-5 h-5"/>Add Note</button>
                 </div>
            </header>
            <main
              ref={mainRef}
              className="flex-grow relative overflow-auto"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onClick={() => setSelectedLink(null)}
            >
                <div className="absolute inset-0" ref={boardContainerRef}>
                    {notesForBoard.map(note => (
                        <StickyNoteItem
                            key={note.id}
                            note={note}
                            onUpdate={handleNoteUpdate}
                            onDelete={onDeleteNote}
                            onMouseOver={() => setHoveredNoteId(note.id)}
                            onMouseOut={() => setHoveredNoteId(null)}
                            isHovered={hoveredNoteId === note.id}
                        />
                    ))}

                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 text-gray-700 dark:text-gray-300">
                        <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                            </marker>
                            <marker id="dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="10" markerHeight="10">
                                <circle cx="5" cy="5" r="4" fill="currentColor" />
                            </marker>
                        </defs>
                        {linksForBoard.map(link => (
                            <LinkRenderer 
                                key={link.id} 
                                link={link} 
                                notes={notesForBoard}
                                isSelected={selectedLink?.link.id === link.id}
                                onSelect={(pos) => setSelectedLink({link, position: pos})}
                                onStartDragEnd={handleStartDragLinkEnd}
                                draggingLinkEndInfo={draggingLinkEnd}
                            />
                        ))}
                    </svg>
                    
                    {selectedLink && (
                       <div style={{position: 'absolute', top: 0, left: 0, pointerEvents: 'auto'}}>
                          <LinkEditor 
                            link={selectedLink.link} 
                            onUpdate={(updatedLink) => {
                                onUpdateLink(updatedLink);
                                setSelectedLink(sl => sl ? {...sl, link: updatedLink} : null);
                            }}
                            onDelete={(id) => {
                                onDeleteLink(id);
                                setSelectedLink(null);
                            }}
                            position={selectedLink.position}
                          />
                       </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StickyNotesView;