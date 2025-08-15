import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Note, NoteAnalysis, Attachment } from '../types';
import { XMarkIcon, SparklesIcon, TrashIcon, TagIcon, PaperClipIcon } from './icons';
import { summarizeAndTagNote } from '../services/geminiService';
import RichTextEditor from './RichTextEditor';
import { fileService } from '../services/storageService';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (note: Omit<Note, 'updatedAt'>) => void;
  onDelete: (noteId: string) => void;
  note: Note | null;
}

const AttachmentDisplay = ({ attachment, onRemove, isPreview }: { attachment: Attachment, onRemove?: (id: string) => void, isPreview: boolean }) => {
    const srcUrl = attachment.url.startsWith('data:') ? attachment.url : `file://${attachment.url}`;
    const renderPreview = () => {
        if (attachment.type.startsWith('image/')) {
            return <a href={srcUrl} target="_blank" rel="noopener noreferrer"><img src={srcUrl} alt={attachment.name} className="max-h-24 rounded-md object-contain"/></a>;
        }
        if (attachment.type.startsWith('video/')) {
            return <video src={srcUrl} controls className="max-h-24 rounded-md" />;
        }
        if (attachment.type.startsWith('audio/')) {
            return <audio src={srcUrl} controls className="w-full" />;
        }
        return <a href={srcUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:underline"><PaperClipIcon className="w-5 h-5"/> <span>{attachment.name}</span></a>;
    };

    return (
        <div className="relative group p-2 bg-white dark:bg-gray-800 rounded-lg">
            {renderPreview()}
            {!isPreview && onRemove && (
                <button onClick={() => onRemove(attachment.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <XMarkIcon className="w-3 h-3"/>
                </button>
            )}
        </div>
    );
}

const NoteModal = ({ isOpen, onClose, onAdd, onUpdate, onDelete, note }: NoteModalProps) => {
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [tagInput, setTagInput] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'write' | 'preview'>('write');
  
  const [analysis, setAnalysis] = React.useState<NoteAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
        if (note) {
            setTitle(note.title);
            setContent(note.content);
            setTags(note.tags);
            setAttachments(note.attachments || []);
            setActiveTab('preview');
        } else {
            setTitle('');
            setContent('');
            setTags([]);
            setAttachments([]);
            setActiveTab('write');
        }
        setAnalysis(null);
        setIsAnalyzing(false);
        setError(null);
        setTagInput('');
    }
  }, [isOpen, note]);

  if (!isOpen) return null;
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

      for (const file of Array.from(files)) {
          if (file.size > MAX_FILE_SIZE) {
            alert(`File "${file.name}" is too large. Maximum size is 15MB.`);
            continue;
          }
          const savedPathOrDataUrl = await fileService.saveAttachment(file);

          const newAttachment: Attachment = {
              id: uuidv4(),
              name: file.name,
              type: file.type,
              url: savedPathOrDataUrl,
          };
          setAttachments(prev => [...prev, newAttachment]);
      }
      setActiveTab('write');
  };
  
  const removeAttachment = (id: string) => {
      setAttachments(prev => prev.filter(att => att.id !== id));
  }

  const handleSave = () => {
    if (!title.trim()) {
        alert("Please add a title to your note.");
        return;
    }

    const noteData = { title, content, tags, attachments };
    
    if (note) {
        // Update: pass the full note object with the original ID and createdAt
        const finalNote: Note = { ...note, ...noteData };
        const { updatedAt, ...noteToUpdate } = finalNote;
        onUpdate(noteToUpdate);
    } else {
        // Add: pass only the new data, with a default listId
        onAdd({ ...noteData, listId: '3' }); // Default note list
    }
    onClose();
  };

  const handleDelete = () => {
    if (note && window.confirm(`Are you sure you want to delete the note: "${note.title}"?`)) {
      onDelete(note.id);
    }
  };
  
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);
    const tempNote: Note = { id: 'temp', listId: 'temp', title, content, tags:[], createdAt:'', updatedAt:'', attachments: [] };
    const result = await summarizeAndTagNote(tempNote);
    if (result) {
      setAnalysis(result);
    } else {
      setError('Failed to analyze the note. Please check your API key and try again.');
    }
    setIsAnalyzing(false);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-start backdrop-blur-sm pt-10" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-brand-light dark:bg-brand-dark rounded-2xl shadow-2xl w-full max-w-3xl m-4 max-h-[90vh] flex flex-col transform transition-all animate-fade-in" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{note ? 'Edit Note' : 'Add New Note'}</h2>
          <div className="flex items-center space-x-2">
            {note && (
                <button onClick={handleDelete} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" aria-label="Delete Note">
                    <TrashIcon className="w-5 h-5" />
                </button>
            )}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close modal">
              <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </header>

        <main className="p-6 flex-grow overflow-y-auto space-y-4">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Note Title"
              className="w-full text-2xl font-bold bg-transparent focus:outline-none focus:ring-0 border-none p-0 text-gray-900 dark:text-white"
            />
            
            <div>
                <div className="border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <button onClick={() => setActiveTab('write')} className={`${activeTab === 'write' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}>Write</button>
                        <button onClick={() => setActiveTab('preview')} className={`${activeTab === 'preview' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}>Preview</button>
                    </nav>
                </div>
                <div className="mt-4">
                    {activeTab === 'write' ? (
                        <div className="space-y-4">
                           <RichTextEditor value={content} onChange={setContent} placeholder="Write your note here..." />
                           <div>
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded-lg p-2 bg-gray-100 dark:bg-gray-900/50 mb-2">
                                    {attachments.map(att => <AttachmentDisplay key={att.id} attachment={att} onRemove={removeAttachment} isPreview={false} />)}
                                </div>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg">
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
                        </div>
                    ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none p-2 min-h-[50px]" dangerouslySetInnerHTML={{ __html: content }} />
                    )}
                </div>
            </div>
            
            {(activeTab === 'preview' && attachments.length > 0) && (
              <div>
                  <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-4 border-t pt-4 dark:border-gray-600">Attachments</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                       {attachments.map(att => <AttachmentDisplay key={att.id} attachment={att} isPreview={true} />)}
                  </div>
              </div>
            )}
            
            <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg">
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">AI Note Analysis</h3>
                    <button onClick={handleAnalyze} disabled={isAnalyzing || !content} className="flex items-center space-x-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark disabled:bg-primary-light disabled:cursor-not-allowed transition-all transform hover:scale-105">
                        <SparklesIcon className="w-5 h-5" />
                        <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Note'}</span>
                    </button>
                </div>
                {isAnalyzing && <div className="text-center p-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>}
                {error && <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">{error}</div>}
                {analysis && (
                    <div className="mt-4 space-y-3 animate-fade-in">
                        <div>
                            <h4 className="font-semibold text-sm mb-1">Summary:</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{analysis.summary}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm mb-2">Suggested Tags:</h4>
                            <div className="flex flex-wrap gap-2">
                                {analysis.tags.map(tag => (
                                    <button key={tag} onClick={() => addTag(tag)} className="px-2 py-1 bg-secondary/20 text-secondary-darker dark:bg-secondary/30 dark:text-secondary-light text-xs font-medium rounded-full hover:bg-secondary/30 transition-colors">
                                        + {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
        
        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end">
            <button onClick={handleSave} className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors transform hover:scale-105">
              Save Note
            </button>
        </footer>
      </div>
    </div>
  );
};

export default NoteModal;