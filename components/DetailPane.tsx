import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, Note, TaskAnalysis, NoteAnalysis, Priority, Status, Attachment, ChecklistItem, Comment, CustomFieldDefinition, List, ActivityLog, ActivityType } from '../types';
import { XMarkIcon, SparklesIcon, TrashIcon, ClockIcon, PaperClipIcon, PencilIcon, PlusIcon, TagIcon, CheckIcon, UserCircleIcon, FullScreenIcon, ExitFullScreenIcon, FlagIcon, CalendarDaysIcon, CrosshairIcon, ChatBubbleLeftEllipsisIcon, DocumentTextIcon, MagnifyingGlassIcon, BellIcon } from './icons';
import { analyzeTaskAndSuggestSubtasks, summarizeAndTagNote, suggestTaskPriority, assistWriting } from '../services/geminiService';
import { format, isPast, isToday, formatDistanceToNow } from 'date-fns';
import { fileService } from '../services/storageService';
import { marked } from 'marked';
import RichTextEditor from './RichTextEditor';

const newId = () => Date.now() + Math.floor(Math.random() * 1000);

const formatDateSafely = (dateString: string | undefined | null, formatStr: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        console.warn(`Invalid date string for formatting: ${dateString}`);
        return 'Invalid Date';
    }
    return format(date, formatStr);
};

const formatDistanceToNowSafely = (dateString: string | undefined | null): string => {
    if (!dateString) return 'some time ago';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        console.warn(`Invalid date string for distance: ${dateString}`);
        return 'an unknown time ago';
    }
    return formatDistanceToNow(date, { addSuffix: true });
};

const getValidDateForInput = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return '';
    }
    return format(date, 'yyyy-MM-dd');
};


const priorityColors: Record<Priority, string> = {
  [Priority.High]: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
  [Priority.Medium]: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
  [Priority.Low]: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
};

const AttachmentDisplay = ({ attachment, onRemove, isPreview }: { attachment: Attachment, onRemove?: (id: number) => void, isPreview: boolean }) => {
    const baseClasses = "relative group p-2 rounded-lg";
    const bgClass = isPreview ? 'bg-gray-100 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800';
    const srcUrl = attachment.url.startsWith('data:') ? attachment.url : `safe-file://${attachment.url}`;

    const renderPreview = () => {
        if (attachment.type.startsWith('image/')) {
            return <a href={srcUrl} target="_blank" rel="noopener noreferrer"><img src={srcUrl} alt={attachment.name} className="max-h-24 w-full rounded-md object-contain"/></a>;
        }
        if (attachment.type.startsWith('video/')) {
            return <video src={srcUrl} controls className="max-h-24 w-full rounded-md" />;
        }
        if (attachment.type.startsWith('audio/')) {
            return <audio src={srcUrl} controls className="w-full text-sm" />;
        }
        return <a href={srcUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:underline"><PaperClipIcon className="w-5 h-5"/> <span className="truncate">{attachment.name}</span></a>;
    };

    return (
        <div className={`${baseClasses} ${bgClass}`}>
            {renderPreview()}
            {!isPreview && onRemove && (
                <button onClick={() => onRemove(attachment.id)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <XMarkIcon className="w-3.5 h-3.5"/>
                </button>
            )}
        </div>
    );
}

const CommentItem = ({ comment }: { comment: Comment }) => (
    <div className="flex items-start space-x-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <UserCircleIcon className="w-6 h-6 text-gray-500" />
        </div>
        <div className="flex-grow">
            <div className="flex items-baseline space-x-2">
                <span className="font-semibold text-sm text-gray-800 dark:text-white">{comment.userName}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{formatDateSafely(comment.createdAt, 'MMM d, h:mm a')}</span>
            </div>
            <div className="mt-1 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg rounded-tl-none">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
            </div>
        </div>
    </div>
)

const ActivityIcon = ({ type }: { type: ActivityType }) => {
    switch (type) {
        case 'created':
            return <PlusIcon className="w-4 h-4 text-blue-500" />;
        case 'comment':
            return <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-green-500" />;
        case 'status':
            return <ClockIcon className="w-4 h-4 text-purple-500" />;
        case 'priority':
            return <FlagIcon className="w-4 h-4 text-yellow-500" />;
        case 'focus':
            return <CrosshairIcon className="w-4 h-4 text-indigo-500" />;
        default:
            return <CheckIcon className="w-4 h-4 text-gray-500" />;
    }
};

const ActivityLogItem = ({ activity }: { activity: ActivityLog }) => {
    const renderContent = () => {
        const user = <span className="font-semibold">{activity.userName}</span>;
        switch (activity.type) {
            case 'created':
                return <>{user} created this task.</>;
            case 'comment':
                return <>{user} left a comment: <span className="italic text-gray-600 dark:text-gray-400">"{activity.content.commentContent?.substring(0, 50)}..."</span></>;
            case 'status':
                return <>{user} changed status from '{activity.content.from}' to '{activity.content.to}'.</>;
            case 'priority':
                return <>{user} changed priority from '{activity.content.from}' to '{activity.content.to}'.</>;
            case 'focus':
                return <>{user} completed a {activity.content.duration}-minute focus session on {activity.content.focusedOn}.</>;
            default:
                return <>An update was made.</>;
        }
    };

    return (
        <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
                <ActivityIcon type={activity.type} />
            </div>
            <div className="flex-grow">
                <p className="text-sm text-gray-700 dark:text-gray-300">{renderContent()}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {formatDistanceToNowSafely(activity.createdAt)}
                </p>
            </div>
        </div>
    );
};

const MetadataItem = ({ icon, label, children }: { icon: React.ReactNode, label: string, children: React.ReactNode }) => (
    <>
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            {icon}
            <span>{label}</span>
        </div>
        <div className="text-gray-800 dark:text-white font-medium flex flex-wrap gap-1 items-center">
            {children}
        </div>
    </>
);

interface DetailPaneProps {
  item: Task | Note | null;
  list?: List;
  onClose: () => void;
  onUpdate: (item: Task | Note) => void;
  onAddItem: (item: Partial<Task & Note>, listId: number, type: 'task' | 'note') => void;
  onDelete: (itemId: number, type: 'task' | 'note') => void;
  onAddComment: (taskId: number, content: string) => void;
  onStartFocus: (task: Task) => void;
  onStartSubtaskFocus: (task: Task, subtask: ChecklistItem) => void;
  customFieldDefinitions: CustomFieldDefinition[];
  itemTypeToAdd?: 'task' | 'note';
  listIdToAdd?: number;
  isSidebarCollapsed: boolean;
  allNotes: Note[];
  onDetailItemChange: (item: Task | Note | null) => void;
}

const DetailPane = ({ item, list, onClose, onUpdate, onAddItem, onDelete, onAddComment, onStartFocus, onStartSubtaskFocus, customFieldDefinitions, itemTypeToAdd, listIdToAdd, isSidebarCollapsed, allNotes, onDetailItemChange }: DetailPaneProps) => {
    const isAdding = !item;

    const [isEditing, setIsEditing] = useState(isAdding);
    
    const [editedItem, setEditedItem] = useState<Task | Note>(() => {
        if (!isAdding) return item!;
        
        const base = {
            id: newId(), // temporary id
            title: '',
            tags: [],
            attachments: [],
            createdAt: new Date().toISOString(),
            listId: listIdToAdd!,
        };

        if (itemTypeToAdd === 'task') {
            return {
                ...base,
                description: '',
                status: Status.ToDo,
                priority: Priority.Medium,
                dueDate: new Date().toISOString(),
                reminder: null,
                checklist: [],
                comments: [],
                activityLog: [],
                customFields: {},
                linkedNoteIds: [],
            } as Task;
        } else { // Note
            return {
                ...base,
                content: '',
                updatedAt: new Date().toISOString(),
            } as Note;
        }
    });

    const [analysis, setAnalysis] = useState<TaskAnalysis | NoteAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSuggestingPriority, setIsSuggestingPriority] = useState(false);
    const [isImproving, setIsImproving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checklistItemText, setChecklistItemText] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [newComment, setNewComment] = useState('');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
    const [noteLinkSearch, setNoteLinkSearch] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (item) {
            setEditedItem(item);
            setIsEditing(false);
            setAnalysis(null);
            setError(null);
            setActiveTab('comments');
        }
    }, [item]);
    
    // Determine the type of the item being displayed or added.
    // This is the crucial fix: it uses the `item` prop for view mode to avoid using stale state,
    // and falls back to the `editedItem` for add mode.
    const currentDisplayItem = isAdding ? editedItem : item;
    const isTask = !!currentDisplayItem && 'status' in currentDisplayItem;

    const statusOptions = useMemo(() => {
        if (isTask && list?.statuses && list.statuses.length > 0) {
            return list.statuses;
        }
        return Object.values(Status).map(s => ({ status: s, name: s }));
    }, [isTask, list]);

    const applicableFields = useMemo(() => {
        if (!isTask) return [];
        return customFieldDefinitions.filter(
            field => field.listId === null || field.listId === (editedItem as Task).listId
        );
    }, [customFieldDefinitions, editedItem, isTask]);

    const linkedNotes = useMemo(() => {
        if (!item || !('linkedNoteIds' in item) || !item.linkedNoteIds) {
            return [];
        }
        return allNotes.filter(note => item.linkedNoteIds!.includes(note.id));
    }, [allNotes, item]);

    const filteredNotesForLinking = useMemo(() => {
        if (!noteLinkSearch.trim()) {
            return allNotes;
        }
        const lowercasedSearch = noteLinkSearch.toLowerCase();
        return allNotes.filter(note => 
            note.title.toLowerCase().includes(lowercasedSearch)
        );
    }, [allNotes, noteLinkSearch]);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setError(null);
        setAnalysis(null);
        let result;
        if (isTask) {
             result = await analyzeTaskAndSuggestSubtasks(editedItem as Task);
        } else {
             result = await summarizeAndTagNote(editedItem as Note);
        }
        if (result) {
            setAnalysis(result);
        } else {
            setError('Failed to analyze. Please check your API key and try again.');
        }
        setIsAnalyzing(false);
    };
    
    const handleImproveNoteContent = async () => {
        if (isTask) return;
        const noteContent = (editedItem as Note).content;
        if (!noteContent.trim()) return;

        setIsImproving(true);
        const improvedContent = await assistWriting(noteContent);
        if (improvedContent) {
            handleFieldChange('content', improvedContent);
        } else {
            alert("AI assistance failed. Please check your API key or try again.");
        }
        setIsImproving(false);
    };

    const handleSuggestPriority = async () => {
        if (!isTask) return;
        setIsSuggestingPriority(true);
        const priority = await suggestTaskPriority({ title: editedItem.title, description: (editedItem as Task).description });
        if (priority) {
            handleFieldChange('priority', priority);
        }
        setIsSuggestingPriority(false);
    }

    const handleSaveAnalysis = () => {
        if (!analysis || !item) return;

        if (isTask) {
            const taskAnalysis = analysis as TaskAnalysis;
            const currentTask = item as Task;

            const analysisText = `\n\n<hr>\n<h3>AI Analysis</h3>\n<p><strong>Summary:</strong> ${taskAnalysis.summary}</p>\n<p><strong>Complexity:</strong> ${taskAnalysis.complexity}</p>\n<p><strong>Skills Required:</strong> ${taskAnalysis.requiredSkills.join(', ')}</p>`;
            
            const newChecklistItems: ChecklistItem[] = taskAnalysis.subtasks.map(sub => ({
                id: newId(),
                text: sub.title,
                completed: false,
            }));

            const updatedTask: Task = {
                ...currentTask,
                description: currentTask.description + analysisText,
                checklist: [...currentTask.checklist, ...newChecklistItems],
            };
            onUpdate(updatedTask);
        } else {
            const noteAnalysis = analysis as NoteAnalysis;
            const currentNote = item as Note;

            const analysisText = `\n\n<hr>\n<h3>AI Summary</h3>\n<p>${noteAnalysis.summary}</p>`;
            const newTags = [...new Set([...currentNote.tags, ...noteAnalysis.tags])];
            
            const updatedNote: Note = {
                ...currentNote,
                content: currentNote.content + analysisText,
                tags: newTags
            };
            onUpdate(updatedNote);
        }
        
        alert('AI Analysis has been saved to the item.');
        setAnalysis(null);
    };


    const handleSaveChanges = () => {
        if (!editedItem.title.trim()) {
            alert("Title cannot be empty.");
            return;
        }
        
        let finalItem: Partial<Task & Note> = { ...editedItem };
        if (isTask && checklistItemText.trim()) {
            const newItem: ChecklistItem = { id: newId(), text: checklistItemText.trim(), completed: false };
            (finalItem as Task).checklist = [...(finalItem as Task).checklist, newItem];
            setChecklistItemText('');
        }

        if (isAdding) {
            const { id, createdAt, ...newItemData } = finalItem as any; // remove temporary/unwanted fields
            onAddItem(newItemData, listIdToAdd!, itemTypeToAdd!);
        } else {
            onUpdate(finalItem as Task | Note);
            setIsEditing(false);
        }
    };
    
    const handleDeleteClick = () => {
        onClose();
        setTimeout(() => {
            if (window.confirm(`Are you sure you want to delete "${item!.title}"?`)) {
                const type = 'status' in item! ? 'task' : 'note';
                onDelete(item!.id, type);
            }
        }, 50);
    };
    
    const handleFieldChange = (field: string, value: any) => {
        setEditedItem(prev => ({ ...prev, [field]: value }));
    };

    const handleCustomFieldChange = (fieldId: number, value: any) => {
        const currentCustomFields = (editedItem as Task).customFields || {};
        handleFieldChange('customFields', {
            ...currentCustomFields,
            [fieldId]: value
        });
    };
    
    const handlePostComment = () => {
        if (newComment.trim() && isTask && item) {
            onAddComment(item.id, newComment.trim());
            setNewComment('');
        }
    };

    const handleToggleChecklistItem = (itemId: number, isFromEditMode: boolean) => {
        if (!isTask) return;
        const list = isFromEditMode ? (editedItem as Task).checklist : (item as Task).checklist;
        const updatedChecklist = list.map(ci => 
            ci.id === itemId ? { ...ci, completed: !ci.completed } : ci
        );
        
        if (isFromEditMode) {
            handleFieldChange('checklist', updatedChecklist);
        } else {
            onUpdate({ ...item, checklist: updatedChecklist } as Task);
        }
    };
    
    const handleAddChecklistItem = () => {
        if(isTask && checklistItemText.trim()){
            const newItem: ChecklistItem = { id: newId(), text: checklistItemText.trim(), completed: false };
            handleFieldChange('checklist', [...(editedItem as Task).checklist, newItem]);
            setChecklistItemText('');
        }
    };

    const handleRemoveChecklistItem = (id: number) => {
        if (isTask) {
            handleFieldChange('checklist', (editedItem as Task).checklist.filter(ci => ci.id !== id));
        }
    };

    const addTag = (tag: string) => {
        const trimmed = tag.trim().toLowerCase();
        if(trimmed && !editedItem.tags.includes(trimmed)) {
            handleFieldChange('tags', [...editedItem.tags, trimmed]);
        }
    }
    const removeTag = (tag: string) => {
        handleFieldChange('tags', editedItem.tags.filter(t => t !== tag));
    }
    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if(e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(tagInput);
            setTagInput('');
        }
    }
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

      for (const file of Array.from(files)) {
          if (file.size > MAX_FILE_SIZE) {
            alert(`File "${file.name}" is too large. Maximum size is 15MB.`);
            continue;
          }
          const savedPathOrDataUrl = await fileService.saveAttachment(file);
          const newAttachment: Attachment = {
              id: newId(),
              name: file.name,
              type: file.type,
              url: savedPathOrDataUrl,
          };
          setEditedItem(prev => ({
              ...prev,
              attachments: [...prev.attachments, newAttachment]
          }));
      }
    };
    
    const removeAttachment = (id: number) => {
      handleFieldChange('attachments', editedItem.attachments.filter(att => att.id !== id));
    }

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!isAdding && 'status' in item!) { 
            onUpdate({ ...item, status: e.target.value as Status } as Task);
        }
    };

    const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!isAdding && 'priority' in item!) { 
            onUpdate({ ...item, priority: e.target.value as Priority } as Task);
        }
    };

    const renderViewMode = () => {
        return (
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-3 text-sm border-b border-gray-200 dark:border-gray-700 pb-4 items-center">
                    <MetadataItem icon={<ClockIcon className="w-4 h-4" />} label="Created time">
                        {formatDateSafely(item!.createdAt, 'MMM d, yyyy, h:mm a')}
                    </MetadataItem>

                    {isTask && (
                        <>
                            <MetadataItem icon={<SparklesIcon className="w-4 h-4" />} label="Status">
                                <select
                                    value={(item as Task).status}
                                    onChange={handleStatusChange}
                                    className="px-2 py-0.5 rounded-md text-xs font-semibold appearance-none bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-none focus:ring-2 focus:ring-primary cursor-pointer"
                                >
                                    {statusOptions.map(s => (
                                        <option key={s.status} value={s.status} className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white">{s.name}</option>
                                    ))}
                                </select>
                            </MetadataItem>
                            <MetadataItem icon={<FlagIcon className="w-4 h-4" />} label="Priority">
                            <select
                                    value={(item as Task).priority}
                                    onChange={handlePriorityChange}
                                    className={`px-2 py-0.5 rounded-md text-xs font-semibold appearance-none border-none focus:ring-2 focus:ring-primary cursor-pointer ${priorityColors[(item as Task).priority]}`}
                                >
                                    {Object.values(Priority).map(p => (
                                        <option key={p} value={p} className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white">{p}</option>
                                    ))}
                                </select>
                            </MetadataItem>
                            <MetadataItem icon={<CalendarDaysIcon className="w-4 h-4" />} label="Due Date">
                                {formatDateSafely((item as Task).dueDate, 'MMMM d, yyyy')}
                            </MetadataItem>
                             {isTask && (item as Task).reminder && (
                                <MetadataItem icon={<BellIcon className="w-4 h-4 text-primary" />} label="Reminder">
                                    {formatDateSafely((item as Task).reminder, 'MMM d, h:mm a')}
                                </MetadataItem>
                            )}
                        </>
                    )}

                    {item!.tags && item!.tags.length > 0 && (
                        <MetadataItem icon={<TagIcon className="w-4 h-4" />} label="Tags">
                            {item!.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/80 rounded-md text-xs">{tag}</span>
                            ))}
                        </MetadataItem>
                    )}
                    {isTask && applicableFields.map(field => {
                        const value = (item as Task).customFields?.[field.id];
                        if (value === undefined || value === null || value === '') return null;

                        const getDisplayValue = () => {
                            switch (field.type) {
                                case 'select':
                                    const selectedOption = field.options?.find(opt => opt.id === value);
                                    return selectedOption ? selectedOption.value : String(value);
                                case 'checkbox':
                                    return value ? 'Yes' : 'No';
                                case 'date':
                                    return formatDateSafely(value, 'MMMM d, yyyy');
                                default:
                                    return String(value);
                            }
                        };

                        return (
                            <MetadataItem key={field.id} icon={<div className="w-4 h-4"></div>} label={field.name}>
                                <span>{getDisplayValue()}</span>
                            </MetadataItem>
                        )
                    })}
                </div>
                
                {(isTask ? (item as Task).description : (item as Note).content) && (
                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{__html: isTask ? (item as Task).description : marked.parse((item as Note).content, { gfm: true, breaks: true }) as string}} />
                )}

                {isTask && (item as Task).checklist && (item as Task).checklist.length > 0 && (
                    <div>
                        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Checklist</h3>
                        <div className="space-y-2">
                            {(item as Task).checklist.map(ci => (
                                <label key={ci.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer group">
                                    <input type="checkbox" checked={ci.completed} onChange={() => handleToggleChecklistItem(ci.id, false)} className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />
                                    <span className={`flex-grow ${ci.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>{ci.text}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onStartSubtaskFocus(item as Task, ci); }}
                                        className="ml-auto flex-shrink-0 p-1 rounded-full text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-primary"
                                        title="Focus on this subtask"
                                    >
                                        <CrosshairIcon className="w-4 h-4" />
                                    </button>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {item!.attachments && item!.attachments.length > 0 && (
                    <div>
                        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Attachments</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {item!.attachments.map(att => <AttachmentDisplay key={att.id} attachment={att} isPreview={true} />)}
                        </div>
                    </div>
                )}
                
                {isTask && linkedNotes.length > 0 && (
                    <div>
                        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Linked Notes</h3>
                        <div className="space-y-2">
                            {linkedNotes.map(note => (
                                <button key={note.id} onClick={() => onDetailItemChange(note)} className="w-full text-left p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600/50 flex items-center gap-3">
                                    <DocumentTextIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                    <span className="font-semibold text-sm truncate">{note.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {(analysis || isAnalyzing || error) && (
                    <div className="bg-gray-100/80 dark:bg-black/20 p-4 rounded-lg mt-4">
                        {isAnalyzing && <div className="text-center p-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>}
                        {error && <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg">{error}</div>}
                        {analysis && (
                            <>
                                <div className="space-y-4 animate-fade-in text-sm">
                                    {isTask && (analysis as TaskAnalysis).summary && (
                                        <div>
                                            <h4 className="font-semibold mb-1">AI Summary:</h4>
                                            <p className="text-gray-600 dark:text-gray-300">{(analysis as TaskAnalysis).summary}</p>
                                        </div>
                                    )}
                                    {!isTask && (
                                        <div>
                                            <h4 className="font-semibold mb-1">Summary:</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">{(analysis as NoteAnalysis).summary}</p>
                                        </div>
                                    )}
                                    {isTask && (
                                        <>
                                            <p><strong>Complexity:</strong> <span className="text-gray-600 dark:text-gray-300">{(analysis as TaskAnalysis).complexity}</span></p>
                                            <p><strong>Skills:</strong> <span className="text-gray-600 dark:text-gray-300">{(analysis as TaskAnalysis).requiredSkills.join(', ')}</span></p>
                                            <div>
                                                <h4 className="font-semibold mt-2 mb-2">Suggested Subtasks:</h4>
                                                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                                                    {(analysis as TaskAnalysis).subtasks.map((sub, i) => <li key={i}>{sub.title}</li>)}
                                                </ul>
                                            </div>
                                        </>
                                    )}
                                    {!isTask && (
                                        <div>
                                            <h4 className="font-semibold mb-2">Suggested Tags:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {(analysis as NoteAnalysis).tags.map(tag => (
                                                    <span key={tag} className="px-2 py-1 bg-secondary/20 text-secondary-darker dark:bg-secondary/30 dark:text-secondary-light text-xs font-medium rounded-full">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end mt-4">
                                    <button 
                                        onClick={handleSaveAnalysis}
                                        className="px-3 py-1.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                                    >
                                        Save Analysis
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {isTask && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                        <button onClick={() => setActiveTab('comments')} className={`px-4 py-2 text-sm font-semibold -mb-px ${activeTab === 'comments' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent'}`}>
                            Comments ({item && isTask ? (item as Task).comments?.length || 0 : 0})
                        </button>
                        <button onClick={() => setActiveTab('activity')} className={`px-4 py-2 text-sm font-semibold -mb-px ${activeTab === 'activity' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent'}`}>
                            Activity ({item && isTask ? (item as Task).activityLog?.length || 0 : 0})
                        </button>
                    </div>

                    {activeTab === 'comments' && (
                        <div>
                            <div className="space-y-4">
                                {(item as Task).comments?.map(comment => <CommentItem key={comment.id} comment={comment} />)}
                            </div>
                            <div className="mt-4 flex items-start space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <UserCircleIcon className="w-6 h-6 text-gray-500" />
                                </div>
                                <div className="flex-grow">
                                <textarea value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }} placeholder="Add a comment..." rows={2} className="w-full form-textarea rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary"/>
                                <div className="flex justify-end mt-2">
                                    <button onClick={handlePostComment} disabled={!newComment.trim()} className="px-4 py-1.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark disabled:bg-primary/70 dark:disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors">Post</button>
                                </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'activity' && (
                        <div className="space-y-4">
                            {(item as Task).activityLog
                                ?.slice()
                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                .map(activity => <ActivityLogItem key={activity.id} activity={activity} />)
                            }
                        </div>
                    )}
                </div>
                )}
            </div>
        );
    }
    
    const renderEditMode = () => (
         <div className="p-6 h-full flex flex-col gap-4">
            <div className="flex-grow min-h-0">
                {isTask ? (
                    <textarea 
                        value={(editedItem as Task).description} 
                        onChange={e => handleFieldChange('description', e.target.value)} 
                        className="w-full h-full form-textarea rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary resize-none"
                        placeholder="Add a description..."
                    />
                ) : (
                    <RichTextEditor
                        value={(editedItem as Note).content}
                        onChange={(newContent) => handleFieldChange('content', newContent)}
                        onAiAssist={handleImproveNoteContent}
                        isAiLoading={isImproving}
                        placeholder="Start writing your note..."
                    />
                )}
            </div>
            
            <div className="flex-shrink-0 overflow-y-auto space-y-4 max-h-[45%] pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments</label>
                    <div className="flex items-center gap-2 mb-2 pb-2 overflow-x-auto">
                        {(editedItem.attachments || []).map(att => (
                            <div key={att.id} className="flex-shrink-0 w-32">
                                <AttachmentDisplay attachment={att} isPreview={false} onRemove={removeAttachment} />
                            </div>
                        ))}
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

                {isTask && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Checklist</label>
                        <div className="space-y-2">
                            {(editedItem as Task).checklist.map(ci => (
                                <div key={ci.id} className="flex items-center space-x-2 group">
                                    <input type="checkbox" checked={ci.completed} onChange={() => handleToggleChecklistItem(ci.id, true)} className="h-5 w-5 form-checkbox rounded border-gray-300 text-primary focus:ring-primary" />
                                    <input type="text" value={ci.text} onChange={e => handleFieldChange('checklist', (editedItem as Task).checklist.map(i => i.id === ci.id ? {...i, text: e.target.value} : i))} className="flex-grow form-input rounded-md bg-transparent border-0 focus:bg-gray-100 dark:focus:bg-gray-700 focus:ring-1 focus:ring-primary"/>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onStartSubtaskFocus(editedItem as Task, ci); }}
                                        className="p-1 text-gray-400 hover:text-primary opacity-0 group-hover:opacity-100"
                                        title="Focus on this subtask"
                                    >
                                        <CrosshairIcon className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => handleRemoveChecklistItem(ci.id)} className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            ))}
                            <div className="flex items-center space-x-2">
                                <button type="button" onClick={handleAddChecklistItem} className="p-2 text-gray-400 hover:text-primary"><PlusIcon className="w-4 h-4" /></button>
                                <input type="text" value={checklistItemText} onChange={e => setChecklistItemText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())} placeholder="Add a checklist item..." className="flex-grow form-input bg-transparent border-0 focus:ring-0 p-0"/>
                            </div>
                        </div>
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                    <div className="flex flex-wrap items-center gap-2 p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                        {editedItem.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light text-xs font-semibold rounded-full">
                                {tag}
                                <button onClick={() => removeTag(tag)} className="ml-1 text-primary/60 hover:text-primary"><XMarkIcon className="w-3 h-3"/></button>
                            </span>
                        ))}
                        <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="Add a tag..." className="flex-grow bg-transparent focus:outline-none focus:ring-0 border-none p-0 text-sm"/>
                    </div>
                </div>

                {isTask && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Linked Notes</label>
                        <div className="p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                            <div className="relative mb-2">
                                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search notes to link..."
                                    value={noteLinkSearch}
                                    onChange={e => setNoteLinkSearch(e.target.value)}
                                    className="w-full pl-8 pr-2 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-gray-700/50 border-transparent focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {allNotes.length > 0 ? (
                                    filteredNotesForLinking.length > 0 ? (
                                        filteredNotesForLinking.map(note => (
                                            <label key={note.id} className="flex items-center gap-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox h-4 w-4 rounded text-primary"
                                                    checked={(editedItem as Task).linkedNoteIds?.includes(note.id)}
                                                    onChange={(e) => {
                                                        const currentIds = (editedItem as Task).linkedNoteIds || [];
                                                        const newIds = e.target.checked
                                                            ? [...currentIds, note.id]
                                                            : currentIds.filter(id => id !== note.id);
                                                        handleFieldChange('linkedNoteIds', newIds);
                                                    }}
                                                />
                                                <span className="text-sm truncate">{note.title}</span>
                                            </label>
                                        ))
                                    ) : (
                                        <p className="text-xs text-center text-gray-500 p-2">No matching notes found.</p>
                                    )
                                ) : (
                                    <p className="text-xs text-center text-gray-500 p-2">No notes available to link.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {isTask && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                        <input type="date" value={getValidDateForInput((editedItem as Task).dueDate)} onChange={e => { handleFieldChange('dueDate', e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : '') }} required className="w-full form-input rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary"/>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                                <button
                                    type="button"
                                    onClick={handleSuggestPriority}
                                    disabled={isSuggestingPriority}
                                    className="text-xs font-semibold text-primary hover:underline disabled:opacity-50 flex items-center gap-1"
                                >
                                    <SparklesIcon className="w-3 h-3" />
                                    {isSuggestingPriority ? "Thinking..." : "Suggest"}
                                </button>
                            </div>
                        <select value={(editedItem as Task).priority} onChange={e => handleFieldChange('priority', e.target.value as Priority)} className="w-full form-select rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary">
                            {Object.values(Priority).map(p => (<option key={p} value={p}>{p}</option>))}
                        </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reminder</label>
                            <input
                                type="datetime-local"
                                value={
                                    (editedItem as Task).reminder
                                        ? format(new Date((editedItem as Task).reminder!), "yyyy-MM-dd'T'HH:mm")
                                        : ''
                                }
                                onChange={e => handleFieldChange('reminder', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                className="w-full form-input rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary"
                            />
                        </div>
                        {!isAdding && (
                            <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                            <select value={(editedItem as Task).status} onChange={e => handleFieldChange('status', e.target.value as Status)} className="w-full form-select rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary">
                                {statusOptions.map(s => (
                                    <option key={s.status} value={s.status}>{s.name}</option>
                                ))}
                            </select>
                            </div>
                        )}
                    </div>
                )}
                {isTask && applicableFields.length > 0 && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Custom Fields</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {applicableFields.map(field => (
                                <div key={field.id}>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.name}</label>
                                    {field.type === 'text' && <input type="text" value={(editedItem as Task).customFields?.[field.id] || ''} onChange={e => handleCustomFieldChange(field.id, e.target.value)} className="w-full form-input rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary" />}
                                    {field.type === 'number' && <input type="number" value={(editedItem as Task).customFields?.[field.id] || ''} onChange={e => handleCustomFieldChange(field.id, e.target.value)} className="w-full form-input rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary" />}
                                    {field.type === 'date' && <input type="date" value={(editedItem as Task).customFields?.[field.id] || ''} onChange={e => handleCustomFieldChange(field.id, e.target.value)} className="w-full form-input rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary" />}
                                    {field.type === 'checkbox' && <input type="checkbox" checked={!!(editedItem as Task).customFields?.[field.id]} onChange={e => handleCustomFieldChange(field.id, e.target.checked)} className="form-checkbox h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />}
                                    {field.type === 'select' && (
                                        <select value={(editedItem as Task).customFields?.[field.id] || ''} onChange={e => handleCustomFieldChange(field.id, e.target.value)} className="w-full form-select rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary">
                                            <option value="">Select...</option>
                                            {field.options?.map(opt => <option key={opt.id} value={opt.id}>{opt.value}</option>)}
                                        </select>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const paneClasses = `
      fixed z-40 bg-card-light dark:bg-card-dark flex flex-col transition-all duration-300 ease-in-out
      ${isFullScreen
        ? `inset-0 ${isSidebarCollapsed ? 'md:left-20' : 'md:left-72'}`
        : 'top-0 right-0 h-screen w-full md:w-[480px] shadow-2xl animate-slide-in-right'
      }
    `;

    return (
        <aside className={paneClasses}>
            <header className="flex-shrink-0 p-4 flex justify-between items-start border-b border-gray-200 dark:border-gray-700">
                 <div className="flex-grow pr-4">
                     {(isEditing || isAdding) ? (
                         <input type="text" value={editedItem.title} autoFocus={isAdding} onChange={e => handleFieldChange('title', e.target.value)} placeholder={isTask ? "New Task Title" : "New Note Title"} className="w-full text-lg font-semibold bg-transparent border-b border-dashed border-gray-400 dark:border-gray-500 focus:border-solid focus:border-primary focus:ring-0" />
                     ) : (
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{item!.title}</h2>
                     )}
                 </div>
                <div className="flex items-center space-x-1">
                    {(isEditing || isAdding) ? (
                        <>
                            <button
                                onClick={handleSaveChanges}
                                disabled={!editedItem.title.trim()}
                                className="flex items-center space-x-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark disabled:bg-primary/70 dark:disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors">
                                {isAdding ? (
                                    <>
                                        <PlusIcon className="w-5 h-5"/>
                                        <span>Add</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckIcon className="w-5 h-5"/>
                                        <span>Save</span>
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            {isTask && (
                                <button onClick={() => onStartFocus(item as Task)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20" aria-label="Start Focus Session">
                                    <CrosshairIcon className="w-4 h-4" />
                                    Focus
                                </button>
                            )}
                            <button onClick={() => setIsEditing(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" aria-label="Edit Item"><PencilIcon className="w-5 h-5" /></button>
                            <button onClick={handleDeleteClick} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" aria-label="Delete Item"><TrashIcon className="w-5 h-5" /></button>
                        </>
                    )}
                    <button
                        onClick={() => setIsFullScreen(prev => !prev)}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hidden md:block"
                        aria-label={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                        title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                    >
                        {isFullScreen ? <ExitFullScreenIcon className="w-5 h-5" /> : <FullScreenIcon className="w-5 h-5" />}
                    </button>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" aria-label="Close Pane"><XMarkIcon className="w-5 h-5" /></button>
                </div>
            </header>

            <div className="flex-grow flex flex-col min-h-0">
                {(isEditing || isAdding) ? renderEditMode() : (
                    <div className="flex-grow overflow-y-auto pb-24">
                       {renderViewMode()}
                    </div>
                )}
            </div>
            
            {!isAdding && !isEditing && (
              <div className="absolute bottom-6 right-6 z-10">
                  <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="w-14 h-14 bg-primary rounded-full text-white flex items-center justify-center shadow-lg hover:bg-primary-dark disabled:bg-primary/70 disabled:cursor-not-allowed transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-900"
                      title="Analyze with AI"
                      aria-label="Analyze with AI"
                  >
                      {isAnalyzing 
                          ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          : <SparklesIcon className="w-7 h-7" />
                      }
                  </button>
              </div>
            )}
        </aside>
    );
};

export default DetailPane;