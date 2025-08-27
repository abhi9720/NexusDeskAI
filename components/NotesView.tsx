import * as React from 'react';
import { Note, List } from '../types';
import NoteModal from './NoteModal';
import { PlusIcon, TagIcon, PaperClipIcon } from './icons';

interface NotesViewProps {
  notes: Note[];
  lists: List[];
  onAddNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateNote: (note: Omit<Note, 'updatedAt'>) => void;
  onDeleteNote: (noteId: number) => void;
}

const NoteCard = ({ note, onClick }: { note: Note; onClick: () => void }) => {
    // Show a snippet of the content
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

const NotesView = ({ notes, lists, onAddNote, onUpdateNote, onDeleteNote }: NotesViewProps) => {
  const [isNoteModalOpen, setIsNoteModalOpen] = React.useState(false);
  const [selectedNote, setSelectedNote] = React.useState<Note | null>(null);

  // This effect synchronizes the selected note with the main list,
  // ensuring the modal always shows fresh data after an update.
  React.useEffect(() => {
    if (selectedNote) {
      const updatedNote = notes.find(n => n.id === selectedNote.id);
      if (updatedNote) {
        setSelectedNote(updatedNote);
      } else {
        // The note was likely deleted, so close the modal.
        handleCloseModal();
      }
    }
  }, [notes]); // Re-run whenever the main notes array changes.


  const handleOpenModal = (note: Note | null) => {
    setSelectedNote(note);
    setIsNoteModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsNoteModalOpen(false);
    setSelectedNote(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <header className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Notes</h2>
            <button
                onClick={() => handleOpenModal(null)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all transform hover:scale-105 shadow-md"
            >
                <PlusIcon className="w-5 h-5" />
                <span>Add Note</span>
            </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {notes.map(note => (
                <NoteCard key={note.id} note={note} onClick={() => handleOpenModal(note)} />
            ))}
        </div>
        
        {notes.length === 0 && (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <p>No notes yet. Click "Add Note" to get started!</p>
            </div>
        )}

        <NoteModal
            isOpen={isNoteModalOpen}
            onClose={handleCloseModal}
            onAdd={onAddNote}
            onUpdate={onUpdateNote}
            onDelete={onDeleteNote}
            note={selectedNote}
            lists={lists}
        />
    </div>
  );
};

export default NotesView;