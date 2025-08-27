import * as React from 'react';
import { Note, NoteAnalysis, Attachment, List } from '../types';
import { XMarkIcon, SparklesIcon, TrashIcon, TagIcon, PaperClipIcon, PlusIcon, FullScreenIcon, ExitFullScreenIcon } from './icons';
import { summarizeAndTagNote, assistWriting } from '../services/geminiService';
import { fileService } from '../services/storageService';
import RichTextEditor from './RichTextEditor';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (note: Omit<Note, 'updatedAt' | 'id'> & { id: number }) => void;
  onDelete: (noteId: number) => void;
  note: Note | null;
  lists: List[];
}

const newId = () => Date.now() + Math.floor(Math.random() * 1000);

const AttachmentDisplay = ({ attachment, onRemove }: { attachment: Attachment, onRemove?: (id: number) => void }) => {
    const srcUrl = attachment.url.startsWith('data:') ? attachment.url : `safe-file://${attachment.url}`;
    const renderPreview = () => {
        const commonClasses = "h-24 w-full rounded-md object-contain";
        if (attachment.type.startsWith('image/')) {
            return <a href={srcUrl} target="_blank" rel="noopener noreferrer"><img src={srcUrl} alt={attachment.name} className={commonClasses}/></a>;
        }
        if (attachment.type.startsWith('video/')) {
            return <video src={srcUrl} controls className={commonClasses} />;
        }
        if (attachment.type.startsWith('audio/')) {
            return <audio src={srcUrl} controls className="w-full" />;
        }
        return <a href={srcUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:underline"><PaperClipIcon className="w-5 h-5"/> <span>{attachment.name}</span></a>;
    };

    return (
        <div className="relative group p-2 bg-white dark:bg-gray-800 rounded-lg flex-shrink-0 w-32">
            {renderPreview()}
            {onRemove && (
                <button onClick={() => onRemove(attachment.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <XMarkIcon className="w-3 h-3"/>
                </button>
            )}
        </div>
    );
}

const NoteModal = ({ isOpen, onClose, onAdd, onUpdate, onDelete, note, lists }: NoteModalProps) => {
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [tagInput, setTagInput] = React.useState('');
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  
  const [isImproving, setIsImproving] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
        if (note) {
            setTitle(note.title);
            setContent(note.content);
            setTags(note.tags);
            setAttachments(note.attachments || []);
        } else {
            setTitle('');
            setContent('');
            setTags([]);
            setAttachments([]);
        }
        setTagInput('');
    }
  }, [isOpen, note]);

  if (!isOpen) return null;
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

      const attachmentPromises = Array.from(files).map(async file => {
          if (file.size > MAX_FILE_SIZE) {
              alert(`File "${file.name}" is too large. Maximum size is 15MB.`);
              return null;
          }
          const savedPathOrDataUrl = await fileService.saveAttachment(file);
          return {
              id: newId(),
              name: file.name,
              type: file.type,
              url: savedPathOrDataUrl,
          };
      });

      const newAttachments = (await Promise.all(attachmentPromises)).filter((att): att is Attachment => att !== null);
      
      if (newAttachments.length > 0) {
          setAttachments(prev => [...prev, ...newAttachments]);
      }
  };
  
  const removeAttachment = (id: number) => {
      setAttachments(prev => prev.filter(att => att.id !== id));
  }

  const handleSave = () => {
    if (!title.trim()) {
        alert("Please add a title to your note.");
        return;
    }

    const finalTags = [...tags];
    if (tagInput.trim()) {
        finalTags.push(tagInput.trim());
    }

    const noteData = { title, content, tags: finalTags, attachments };
    
    if (note) {
        const finalNote: Note = { ...note, ...noteData };
        const { updatedAt, ...noteToUpdate } = finalNote;
        onUpdate(noteToUpdate);
    } else {
        const list = lists.find(l => l.type === 'note');
        const listId = list ? list.id : 1;
        onAdd({ ...noteData, listId: listId });
    }
    onClose();
  };

  const handleDelete = () => {
    if (note && window.confirm(`Are you sure you want to delete the note: "${note.title}"?`)) {
      onDelete(note.id);
      onClose();
    }
  };
  
    const handleImproveWithAI = async () => {
        if (!content.trim()) return;
        setIsImproving(true);
        const improvedContent = await assistWriting(content);
        if (improvedContent) {
            setContent(improvedContent);
        } else {
            alert("AI assistance failed. Please check your API key or try again.");
        }
        setIsImproving(false);
    };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
        setTags([...tags, trimmedTag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag(tagInput);
        setTagInput('');
    }
  };

  const modalClasses = `
    fixed inset-0 bg-black bg-opacity-60 z-40 flex backdrop-blur-md ${isFullScreen ? '' : 'justify-center items-center'}
  `;
  const contentClasses = `
    bg-page dark:bg-page-dark flex flex-col transform transition-all animate-scale-in
    ${isFullScreen 
      ? 'w-full h-full rounded-none' 
      : 'rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh]'}
  `;

  return (
    <div className={modalClasses} onClick={onClose} role="dialog" aria-modal="true">
      <div className={contentClasses} onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="New Note Title"
              className="w-full text-xl font-bold bg-transparent focus:outline-none focus:ring-0 border-0 p-1 text-gray-900 dark:text-white border-b-2 border-dashed border-gray-300 dark:border-gray-600 focus:border-solid focus:border-primary"
            />
          <div className="flex items-center space-x-2">
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all transform hover:scale-105 shadow-sm text-sm">
              <PlusIcon className="w-5 h-5" />
              <span>{note ? 'Save' : 'Add'}</span>
            </button>
            {note && (
                <button onClick={handleDelete} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" aria-label="Delete Note">
                    <TrashIcon className="w-5 h-5" />
                </button>
            )}
            <button onClick={() => setIsFullScreen(p => !p)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}>
              {isFullScreen ? <ExitFullScreenIcon className="w-5 h-5" /> : <FullScreenIcon className="w-5 h-5" />}
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close modal">
              <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto p-6 relative">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing your note..."
            onAiAssist={handleImproveWithAI}
            isAiLoading={isImproving}
          />
        </main>
        
        <footer className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 space-y-4 bg-gray-50 dark:bg-gray-900/50">
            <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments</h3>
                <div className="flex items-center gap-2 pb-2">
                    <div className="flex items-center gap-2 overflow-x-auto">
                        {attachments.map(att => <AttachmentDisplay key={att.id} attachment={att} onRemove={removeAttachment} />)}
                    </div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg">
                        <PaperClipIcon className="w-4 h-4" />
                        Attach File
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="*"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                    <TagIcon className="w-5 h-5 text-gray-400" />
                    {tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary/80 dark:bg-primary/20 dark:text-primary-light text-xs font-semibold rounded-full">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="ml-1 text-primary/60 hover:text-primary"><XMarkIcon className="w-3 h-3"/></button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        placeholder="Add a tag..."
                        className="flex-grow bg-transparent focus:outline-none focus:ring-0 border-none p-0 text-sm"
                    />
                </div>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default NoteModal;