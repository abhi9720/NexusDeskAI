import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Task, Priority, Attachment, ChecklistItem } from '../types';
import { XMarkIcon, PaperClipIcon, TrashIcon, PlusIcon, TagIcon } from './icons';
import { fileService } from '../services/storageService';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Partial<Task>) => void;
}

const AttachmentPreview = ({ attachment, onRemove }: { attachment: Attachment, onRemove: (id: string) => void }) => {
    const srcUrl = attachment.url.startsWith('data:') ? attachment.url : `file://${attachment.url}`;
    const renderPreview = () => {
        if (attachment.type.startsWith('image/')) {
            return <img src={srcUrl} alt={attachment.name} className="max-h-24 rounded-md object-contain"/>;
        }
        if (attachment.type.startsWith('video/')) {
            return <video src={srcUrl} controls className="max-h-24 rounded-md" />;
        }
        if (attachment.type.startsWith('audio/')) {
            return <audio src={srcUrl} controls className="w-full" />;
        }
        return <div className="flex items-center space-x-2 text-sm"><PaperClipIcon className="w-5 h-5"/> <span>{attachment.name}</span></div>;
    };

    return (
        <div className="relative group p-2 bg-white dark:bg-gray-800 rounded-lg">
            {renderPreview()}
            <button onClick={() => onRemove(attachment.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <XMarkIcon className="w-3 h-3"/>
            </button>
        </div>
    );
}

const AddTaskModal = ({ isOpen, onClose, onAddTask }: AddTaskModalProps) => {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [priority, setPriority] = React.useState<Priority>(Priority.Medium);
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [checklist, setChecklist] = React.useState<ChecklistItem[]>([]);
  const [checklistItemText, setChecklistItemText] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
      if (isOpen) {
          setTitle('');
          setDescription('');
          setDueDate('');
          setPriority(Priority.Medium);
          setAttachments([]);
          setChecklist([]);
          setChecklistItemText('');
          setTags([]);
          setTagInput('');
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

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
  };
  
  const removeAttachment = (id: string) => {
      setAttachments(prev => prev.filter(att => att.id !== id));
  }

  const handleAddChecklistItem = () => {
    if (checklistItemText.trim()) {
        const newItem: ChecklistItem = {
            id: uuidv4(),
            text: checklistItemText.trim(),
            completed: false,
        };
        setChecklist([...checklist, newItem]);
        setChecklistItemText('');
    }
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
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


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
        alert("Please fill out the title and due date.");
        return;
    };

    let finalChecklist = [...checklist];
    if (checklistItemText.trim()) {
        const newItem: ChecklistItem = {
            id: uuidv4(),
            text: checklistItemText.trim(),
            completed: false,
        };
        finalChecklist.push(newItem);
    }

    onAddTask({ listId: '1', title, description, dueDate, priority, tags, attachments, checklist: finalChecklist, comments: [] });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-brand-light dark:bg-brand-dark rounded-2xl shadow-2xl p-8 w-full max-w-lg m-4 transform transition-all animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Add New Task</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
            <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., Design new dashboard"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Add more details about the task..."
            />
          </div>
          
           <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Checklist</label>
            <div className="space-y-2">
                {checklist.map(item => (
                    <div key={item.id} className="flex items-center space-x-2">
                        <span className="flex-grow text-gray-800 dark:text-gray-200">{item.text}</span>
                        <button type="button" onClick={() => handleRemoveChecklistItem(item.id)} className="p-1 text-red-500 hover:text-red-700">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex items-center space-x-2 mt-2">
                <input
                    type="text"
                    value={checklistItemText}
                    onChange={e => setChecklistItemText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                    placeholder="Add a checklist item..."
                    className="flex-grow px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary"
                />
                <button type="button" onClick={handleAddChecklistItem} className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
                    <PlusIcon className="w-4 h-4" />
                </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                <TagIcon className="w-5 h-5 text-gray-400" />
                {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary/80 dark:bg-primary/20 dark:text-primary-light text-xs font-semibold rounded-full">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-primary/60 hover:text-primary"><XMarkIcon className="w-3 h-3"/></button>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments</label>
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                {attachments.map(att => <AttachmentPreview key={att.id} attachment={att} onRemove={removeAttachment} />)}
              </div>
            )}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input
                type="date"
                id="dueDate"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select
                id="priority"
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.values(Priority).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button type="submit" className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors transform hover:scale-105">
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;