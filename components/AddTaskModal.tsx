import * as React from 'react';
import { Task, Priority, Attachment, ChecklistItem } from '../types';
import { XMarkIcon, PaperClipIcon, TrashIcon, PlusIcon, TagIcon, LinkIcon } from './icons';
import { fileService } from '../services/storageService';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Partial<Task>) => void;
  tasks: Task[];
}

const newId = () => Date.now() + Math.floor(Math.random() * 1000);

const AttachmentPreview = ({ attachment, onRemove }: { attachment: Attachment, onRemove: (id: number) => void }) => {
    const srcUrl = attachment.url.startsWith('data:') ? attachment.url : `safe-file://${attachment.url}`;
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

const AddTaskModal = ({ isOpen, onClose, onAddTask, tasks }: AddTaskModalProps) => {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [priority, setPriority] = React.useState<Priority>(Priority.Medium);
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [checklist, setChecklist] = React.useState<ChecklistItem[]>([]);
  const [checklistItemText, setChecklistItemText] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');
  const [dependencyIds, setDependencyIds] = React.useState<number[]>([]);
  const [dependencySearch, setDependencySearch] = React.useState('');
  const [isDepDropdownOpen, setIsDepDropdownOpen] = React.useState(false);
  const depDropdownRef = React.useRef<HTMLDivElement>(null);
  
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
          setDependencyIds([]);
          setDependencySearch('');
      }
  }, [isOpen]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (depDropdownRef.current && !depDropdownRef.current.contains(event.target as Node)) {
            setIsDepDropdownOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const { dependencies, availableTasksForDependency } = React.useMemo(() => {
    const deps = dependencyIds.map(id => tasks.find(t => t.id === id)).filter(Boolean) as Task[];

    const existingIds = new Set(dependencyIds);

    const available = tasks.filter(t =>
        !existingIds.has(t.id) &&
        t.title.toLowerCase().includes(dependencySearch.toLowerCase())
    );
    
    return { dependencies: deps, availableTasksForDependency: available };
  }, [dependencyIds, tasks, dependencySearch]);

  const handleAddDependency = (depId: number) => {
      setDependencyIds(prev => [...prev, depId]);
      setIsDepDropdownOpen(false);
      setDependencySearch('');
  };

  const handleRemoveDependency = (depId: number) => {
      setDependencyIds(prev => prev.filter(id => id !== depId));
  };


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

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

  const handleAddChecklistItem = () => {
    if (checklistItemText.trim()) {
        const newItem: ChecklistItem = {
            id: newId(),
            text: checklistItemText.trim(),
            completed: false,
        };
        setChecklist([...checklist, newItem]);
        setChecklistItemText('');
    }
  };

  const handleRemoveChecklistItem = (id: number) => {
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
            id: newId(),
            text: checklistItemText.trim(),
            completed: false,
        };
        finalChecklist.push(newItem);
    }

    onAddTask({ listId: 1, title, description, dueDate, priority, tags, attachments, checklist: finalChecklist, comments: [], dependencyIds });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center backdrop-blur-md" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-page dark:bg-page-dark rounded-2xl shadow-2xl p-8 w-full max-w-lg m-4 transform transition-all animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
              rows={2}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dependencies</label>
            <div className="p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3"/> Prerequisites
                </h4>
                {dependencies.map(dep => (
                <div key={dep.id} className="flex items-center justify-between text-sm p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50">
                    <span className="truncate" title={dep.title}>{dep.title}</span>
                    <button type="button" onClick={() => handleRemoveDependency(dep.id)} className="p-1 text-red-500 hover:text-red-700">
                    <XMarkIcon className="w-3 h-3"/>
                    </button>
                </div>
                ))}
                <div className="relative" ref={depDropdownRef}>
                <input 
                    type="text"
                    value={dependencySearch}
                    onChange={e => setDependencySearch(e.target.value)}
                    onFocus={() => setIsDepDropdownOpen(true)}
                    placeholder="+ Add prerequisite task"
                    className="w-full text-sm mt-1 p-1 bg-transparent border-none focus:ring-0 placeholder-primary/70"
                />
                {isDepDropdownOpen && (
                    <div className="absolute top-full mt-1 w-full max-h-48 overflow-y-auto bg-card-light dark:bg-card-dark rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                    {availableTasksForDependency.map(task => (
                        <button key={task.id} type="button" onClick={() => handleAddDependency(task.id)} className="w-full text-left text-sm px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">{task.title}</button>
                    ))}
                    {availableTasksForDependency.length === 0 && <span className="block text-center text-xs text-gray-400 p-2">No tasks available</span>}
                    </div>
                )}
                </div>
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