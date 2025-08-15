import React, { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Task, Note, Priority, Attachment, ChecklistItem, CustomFieldDefinition } from '../types';
import { XMarkIcon, DocumentTextIcon, PlusIcon, TrashIcon, TagIcon, PaperClipIcon, ListBulletIcon, FullScreenIcon, ExitFullScreenIcon, SparklesIcon } from './icons';
import { format } from 'date-fns';
import RichTextEditor from './RichTextEditor';
import { fileService } from '../services/storageService';
import { suggestTaskPriority } from '../services/geminiService';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: Partial<Task & Note>, listId: string, type: 'task' | 'note') => void;
  listId: string;
  listType: 'task' | 'note';
  customFieldDefinitions: CustomFieldDefinition[];
}

const AttachmentPreview = ({ attachment, onRemove }: { attachment: Attachment, onRemove: (id: string) => void }) => {
    const srcUrl = attachment.url.startsWith('data:') ? attachment.url : `file://${attachment.url}`;
    const renderPreview = () => {
        if (attachment.type.startsWith('image/')) {
            return <img src={srcUrl} alt={attachment.name} className="max-h-20 rounded-md object-contain"/>;
        }
        if (attachment.type.startsWith('video/')) {
            return <video src={srcUrl} controls className="max-h-20 rounded-md" />;
        }
        if (attachment.type.startsWith('audio/')) {
            return <audio src={srcUrl} controls className="w-full text-xs" />;
        }
        return <div className="flex items-center space-x-2 text-xs"><PaperClipIcon className="w-4 h-4"/> <span>{attachment.name}</span></div>;
    };

    return (
        <div className="relative group p-1 bg-white dark:bg-gray-700/50 rounded-lg">
            {renderPreview()}
            <button onClick={() => onRemove(attachment.id)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <XMarkIcon className="w-3 h-3"/>
            </button>
        </div>
    );
}

const AddItemModal = ({ isOpen, onClose, onAddItem, listId, listType, customFieldDefinitions }: AddItemModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [priority, setPriority] = useState<Priority>(Priority.Medium);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistItemText, setChecklistItemText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSuggestingPriority, setIsSuggestingPriority] = useState(false);
  const [customFields, setCustomFields] = useState<{ [key: string]: any }>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (isOpen) {
          setTitle('');
          setDescription('');
          setDueDate(format(new Date(), 'yyyy-MM-dd'));
          setPriority(Priority.Medium);
          setAttachments([]);
          setChecklist([]);
          setChecklistItemText('');
          setTags([]);
          setTagInput('');
          setIsFullScreen(false);
          setCustomFields({});
      }
  }, [isOpen]);

  if (!isOpen) return null;
  
    const applicableFields = useMemo(() => {
        if (listType !== 'task') return [];
        return customFieldDefinitions.filter(
            field => field.listId === null || field.listId === listId
        );
    }, [customFieldDefinitions, listId, listType]);

    const handleCustomFieldChange = (fieldId: string, value: any) => {
        setCustomFields(prev => ({
            ...prev,
            [fieldId]: value
        }));
    };

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
  
  const handleToggleChecklistItem = (id: string) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
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
  
  const handleSuggestPriority = async () => {
      if (!title.trim()) {
          alert("Please enter a title before suggesting a priority.");
          return;
      }
      setIsSuggestingPriority(true);
      const suggested = await suggestTaskPriority({ title, description });
      if (suggested) {
          setPriority(suggested);
      }
      setIsSuggestingPriority(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    let finalChecklist = [...checklist];
    if (listType === 'task' && checklistItemText.trim()) {
        const newItem: ChecklistItem = {
            id: uuidv4(),
            text: checklistItemText.trim(),
            completed: false,
        };
        finalChecklist.push(newItem);
    }
    
    let newItem: Partial<Task & Note> = { title, tags, attachments };
    
    if (listType === 'task') {
        newItem = {
            ...newItem,
            description,
            dueDate: new Date(dueDate).toISOString(),
            priority,
            checklist: finalChecklist,
            customFields,
        };
        onAddItem(newItem, listId, 'task');
    } else {
        newItem = {
            ...newItem,
            content: description,
        };
        onAddItem(newItem, listId, 'note');
    }
    onClose();
  };

  const modalSizeClasses = isFullScreen
    ? 'w-screen h-screen max-w-none max-h-none m-0 rounded-none'
    : `w-full ${listType === 'note' ? 'max-w-2xl' : 'max-w-lg'} m-4 max-h-[90vh]`;
  
  return (
    <div className="fixed inset-0 bg-brand-dark/50 z-50 flex justify-center items-center backdrop-blur-md" onClick={onClose} role="dialog" aria-modal="true">
      <div className={`bg-brand-light dark:bg-gray-800 rounded-2xl shadow-2xl p-6 ${modalSizeClasses} transform transition-all duration-300 ease-in-out flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Add New {listType === 'task' ? 'Task' : 'Note'}</h2>
          <div className="flex items-center space-x-1">
            <button
                type="button"
                onClick={() => setIsFullScreen(prev => !prev)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
            >
                {isFullScreen
                    ? <ExitFullScreenIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    : <FullScreenIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                }
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
                <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-4">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
              placeholder={listType === 'task' ? "Task Title (e.g., Design new dashboard)" : "Note Title (e.g., Q4 Brainstorm)"}
              className="w-full text-lg font-semibold bg-transparent focus:outline-none focus:ring-0 border-none p-1 text-gray-900 dark:text-white"
            />
          
            {listType === 'task' ? (
                <div className="flex items-start space-x-3 text-gray-500 dark:text-gray-400">
                    <DocumentTextIcon className="w-5 h-5 mt-1 flex-shrink-0" />
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={4}
                      className="w-full p-0 bg-transparent border-0 focus:ring-0 resize-none text-sm text-gray-700 dark:text-gray-300"
                      placeholder="Add a description..."
                    />
                </div>
            ) : (
                <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Type your note here..."
                />
            )}
            
            {listType === 'task' && (
                <div className="flex items-start space-x-3 text-gray-500 dark:text-gray-400">
                    <ListBulletIcon className="w-5 h-5 mt-1 flex-shrink-0" />
                    <div className="flex-grow space-y-1">
                        {checklist.map(item => (
                            <div key={item.id} className="flex items-center group">
                                <input type="checkbox" checked={item.completed} onChange={() => handleToggleChecklistItem(item.id)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mr-2" />
                                <span className={`flex-grow text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>{item.text}</span>
                                <button type="button" onClick={() => handleRemoveChecklistItem(item.id)} className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        <div className="flex items-center">
                            <input
                                type="text"
                                value={checklistItemText}
                                onChange={e => setChecklistItemText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                                placeholder="Add checklist item..."
                                className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm"
                            />
                            <button type="button" onClick={handleAddChecklistItem} className={`p-1 text-primary rounded-full transition-opacity ${checklistItemText.trim() ? 'opacity-100' : 'opacity-0'}`}>
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-start space-x-3 text-gray-500 dark:text-gray-400">
                <TagIcon className="w-5 h-5 mt-1 flex-shrink-0" />
                <div className="flex-grow flex flex-wrap items-center gap-1">
                    {tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary/80 dark:bg-primary/20 dark:text-primary-light text-xs font-semibold rounded-full">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 text-primary/60 hover:text-primary"><XMarkIcon className="w-3 h-3"/></button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        placeholder="Add tag..."
                        className="bg-transparent focus:outline-none focus:ring-0 border-none p-0 text-sm w-24"
                    />
                </div>
            </div>

            <div className="flex items-start space-x-3 text-gray-500 dark:text-gray-400">
                <PaperClipIcon className="w-5 h-5 mt-1 flex-shrink-0" />
                <div className="flex-grow">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-primary hover:underline mb-2">
                        Attach a file
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                    {attachments.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                           {attachments.map(att => <AttachmentPreview key={att.id} attachment={att} onRemove={removeAttachment} />)}
                      </div>
                    )}
                </div>
            </div>
          
           {listType === 'task' && (
             <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="dueDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Due Date</label>
                        <input
                            type="date" id="dueDate" value={dueDate} onChange={e => setDueDate(e.target.value)} required
                            className="w-full text-sm px-3 py-1.5 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label htmlFor="priority" className="block text-xs font-medium text-gray-500 dark:text-gray-400">Priority</label>
                            <button type="button" onClick={handleSuggestPriority} disabled={isSuggestingPriority} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 disabled:opacity-50">
                                <SparklesIcon className="w-3 h-3"/>
                                {isSuggestingPriority ? 'Thinking...' : 'Suggest'}
                            </button>
                        </div>
                        <select
                            id="priority" value={priority} onChange={e => setPriority(e.target.value as Priority)}
                            className="w-full text-sm px-3 py-1.5 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-primary focus:border-primary"
                        >
                            {Object.values(Priority).map(p => (<option key={p} value={p}>{p}</option>))}
                        </select>
                    </div>
                </div>

                {applicableFields.length > 0 && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700/80">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Custom Fields</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {applicableFields.map(field => (
                                <div key={field.id}>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{field.name}</label>
                                    {field.type === 'text' && <input type="text" value={customFields[field.id] || ''} onChange={e => handleCustomFieldChange(field.id, e.target.value)} className="w-full text-sm px-3 py-1.5 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-primary focus:border-primary" />}
                                    {field.type === 'number' && <input type="number" value={customFields[field.id] || ''} onChange={e => handleCustomFieldChange(field.id, e.target.value)} className="w-full text-sm px-3 py-1.5 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-primary focus:border-primary" />}
                                    {field.type === 'date' && <input type="date" value={customFields[field.id] || ''} onChange={e => handleCustomFieldChange(field.id, e.target.value)} className="w-full text-sm px-3 py-1.5 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-primary focus:border-primary" />}
                                    {field.type === 'checkbox' && <input type="checkbox" checked={!!customFields[field.id]} onChange={e => handleCustomFieldChange(field.id, e.target.checked)} className="form-checkbox h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />}
                                    {field.type === 'select' && (
                                        <select value={customFields[field.id] || ''} onChange={e => handleCustomFieldChange(field.id, e.target.value)} className="w-full text-sm px-3 py-1.5 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-primary focus:border-primary">
                                            <option value="">Select...</option>
                                            {field.options?.map(opt => <option key={opt.id} value={opt.id}>{opt.value}</option>)}
                                        </select>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </>
          )}
        </form>
         <div className="flex justify-end pt-4 mt-auto flex-shrink-0 border-t border-gray-200 dark:border-gray-700/80">
            <button 
                type="button" 
                onClick={handleSubmit} 
                disabled={!title.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark disabled:bg-primary/70 dark:disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors"
            >
              <span>Add {listType === 'task' ? 'Task' : 'Note'}</span>
            </button>
          </div>
      </div>
    </div>
  );
};

export default AddItemModal;