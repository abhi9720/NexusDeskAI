import React from 'react';
import { Note } from '../types';
import { TagIcon, PaperClipIcon } from './icons';


const NoteCard = ({ note, onClick }: { note: Note; onClick: () => void }) => {
    // Show a snippet of the content, stripping HTML tags for the preview
    const contentSnippet = note.content.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...';

    return (
        <div
            onClick={onClick}
            className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow-md cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between"
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


interface NoteListViewProps {
    notes: Note[];
    onSelectNote: (note: Note) => void;
}

const NoteListView = ({ notes, onSelectNote }: NoteListViewProps) => {

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {notes.map(note => (
                <NoteCard key={note.id} note={note} onClick={() => onSelectNote(note)} />
            ))}
        </div>
        
        {notes.length === 0 && (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <p>No notes in this list.</p>
            </div>
        )}
    </div>
  );
};

export default NoteListView;