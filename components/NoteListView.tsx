import React, { useState, useRef, useEffect } from 'react';
import { Note, List } from '../types';
import { TagIcon, PaperClipIcon, FolderIcon, EllipsisHorizontalIcon, PencilIcon, TrashIcon } from './icons';


const NoteCard = ({ note, onClick }: { note: Note; onClick: () => void }) => {
    // Show a snippet of the content, stripping HTML tags for the preview
    const contentSnippet = note.content.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...';

    return (
        <div
            onClick={onClick}
            className="p-5 bg-card-light dark:bg-card-dark rounded-lg shadow-md cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between"
            role="button"
            aria-label={`View note: ${note.title}`}
        >
            <div>
                <h4 className="font-semibold text-lg text-gray-800 dark:text-white mb-2">{note.title}</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{contentSnippet}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-gray-400 dark:text-gray-500"/>
                    {note.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-primary/10 text-primary/80 dark:bg-primary/20 dark:text-primary-light text-xs font-semibold rounded-full">
                            {tag}
                        </span>
                    ))}
                    {note.tags.length > 2 && <span className="text-xs text-gray-400">+{note.tags.length - 2}</span>}
                </div>
                {note.attachments && note.attachments.length > 0 && (
                     <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                        <PaperClipIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">{note.attachments.length}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const FolderCard = ({ list, onClick, onEdit, onDelete }: { list: List & { itemCount: number }; onClick: (id: number) => void; onEdit: (list: List) => void; onDelete: (id: number) => void; }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
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

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(list);
        setIsMenuOpen(false);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete the folder "${list.name}"? This will also delete all items inside it.`)) {
            onDelete(list.id);
        }
        setIsMenuOpen(false);
    };

    return (
        <div
            onClick={() => onClick(list.id)}
            className="group relative p-5 bg-card-light dark:bg-card-dark rounded-lg shadow-md cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between border-l-4"
            style={{ borderLeftColor: list.color }}
            role="button"
            aria-label={`Open folder: ${list.name}`}
        >
            <div className="flex items-center gap-4">
                 <span style={{ color: list.color }}><FolderIcon className="w-8 h-8 flex-shrink-0" /></span>
                 <div className="flex-grow min-w-0">
                    <h4 className="font-semibold text-lg text-gray-800 dark:text-white truncate">{list.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{list.itemCount} items</p>
                 </div>
            </div>
             <div className="absolute top-2 right-2" ref={menuRef}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(p => !p);
                    }}
                    className="p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Folder options"
                >
                    <EllipsisHorizontalIcon className="w-5 h-5" />
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700 animate-scale-in origin-top-right py-1">
                        <button onClick={handleEdit} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <PencilIcon className="w-4 h-4"/> Edit
                        </button>
                        <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                            <TrashIcon className="w-4 h-4"/> Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


interface NoteListViewProps {
    notes: Note[];
    subfolders: (List & { itemCount: number })[];
    onSelectNote: (note: Note) => void;
    onSelectFolder: (listId: number) => void;
    onEditFolder: (list: List) => void;
    onDeleteFolder: (listId: number) => void;
}

const NoteListView = ({ notes, subfolders, onSelectNote, onSelectFolder, onEditFolder, onDeleteFolder }: NoteListViewProps) => {

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {subfolders.map(folder => (
                <FolderCard 
                    key={`folder-${folder.id}`} 
                    list={folder} 
                    onClick={onSelectFolder} 
                    onEdit={onEditFolder}
                    onDelete={onDeleteFolder}
                />
            ))}
            {notes.map(note => (
                <NoteCard key={note.id} note={note} onClick={() => onSelectNote(note)} />
            ))}
        </div>
        
        {(notes.length === 0 && subfolders.length === 0) && (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <p>This folder is empty.</p>
            </div>
        )}
    </div>
  );
};

export default NoteListView;