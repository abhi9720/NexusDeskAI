import React, { useState, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Task, Note, TaskAnalysis, NoteAnalysis, Priority, Status, Attachment, ChecklistItem, Comment } from '../types';
import { XMarkIcon, SparklesIcon, TrashIcon, ClockIcon, PaperClipIcon, PencilIcon, PlusIcon, TagIcon, CheckIcon, CameraIcon, VideoIcon, MicrophoneIcon, UserCircleIcon, FullScreenIcon, ExitFullScreenIcon, FlagIcon, CalendarDaysIcon } from './icons';
import { analyzeTaskAndSuggestSubtasks, summarizeAndTagNote, suggestTaskPriority } from '../services/geminiService';
import { format, isPast, isToday } from 'date-fns';
import RichTextEditor from './RichTextEditor';
import { fileService } from '../services/storageService';

const priorityColors: Record<Priority, string> = {
  [Priority.High]: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
  [Priority.Medium]: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
  [Priority.Low]: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
};

const AttachmentDisplay = ({ attachment, onRemove, isPreview }: { attachment: Attachment, onRemove?: (id: string) => void, isPreview: boolean }) => {
    const baseClasses = "relative group p-2 rounded-lg";
    const bgClass = isPreview ? 'bg-gray-100 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800';
    const srcUrl = attachment.url.startsWith('data:') ? attachment.url : `file://${attachment.url}`;

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
                <span className="text-xs text-gray-400 dark:text-gray-500">{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</span>
            </div>
            <div className="mt-1 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg rounded-tl-none">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
            </div>
        </div>
    </div>
)

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
  item: Task | Note;
  onClose: () => void;
  onUpdate: (item: Task | Note) => void;
  onDelete: (itemId: string, type: 'task' | 'note') => void;
  onAddComment: (taskId: string, content: string) => void;
}

const DetailPane = ({ item, onClose, onUpdate, onDelete, onAddComment }: DetailPaneProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedItem, setEditedItem] = useState(item);
    const [analysis, setAnalysis] = useState<TaskAnalysis | NoteAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSuggestingPriority, setIsSuggestingPriority] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checklistItemText, setChecklistItemText] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [newComment, setNewComment] = useState('');
    const [isFullScreen, setIsFullScreen] = useState(false);

    const photoInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditedItem(item);
        setIsEditing(false);
        setAnalysis(null);
        setError(null);
    }, [item]);
    
    const isTask = 'status' in editedItem;

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
                id: uuidv4(),
                text: `${sub.title} (${sub.hours}h)`,
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
        
        let finalItem = { ...editedItem };
        if (isTask && checklistItemText.trim()) {
            const newItem = { id: uuidv4(), text: checklistItemText.trim(), completed: false };
            (finalItem as Task).checklist = [...(finalItem as Task).checklist, newItem];
            setChecklistItemText('');
        }

        onUpdate(finalItem);
        setIsEditing(false);
    };
    
    const handleDelete = () => {
        onClose();
        setTimeout(() => {
            if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
                const type = 'status' in item ? 'task' : 'note';
                onDelete(item.id, type);
            }
        }, 50);
    };
    
    const handleFieldChange = (field: string, value: any) => {
        setEditedItem(prev => ({ ...prev, [field]: value }));
    };
    
    const handlePostComment = () => {
        if (newComment.trim() && isTask) {
            onAddComment(item.id, newComment.trim());
            setNewComment('');
        }
    };

    const handleToggleChecklistItem = (itemId: string, isFromEditMode: boolean) => {
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
            const newItem = { id: uuidv4(), text: checklistItemText.trim(), completed: false };
            handleFieldChange('checklist', [...(editedItem as Task).checklist, newItem]);
            setChecklistItemText('');
        }
    };

    const handleRemoveChecklistItem = (id: string) => {
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
          handleFieldChange('attachments', [...editedItem.attachments, newAttachment]);
      }
    };
    
    const removeAttachment = (id: string) => {
      handleFieldChange('attachments', editedItem.attachments.filter(att => att.id !== id));
    }

    const attachmentButtons = [
      { label: 'Photo', icon: <CameraIcon className="w-5 h-5"/>, ref: photoInputRef, accept: 'image/*', capture: 'environment' },
      { label: 'Video', icon: <VideoIcon className="w-5 h-5"/>, ref: videoInputRef, accept: 'video/*', capture: 'user' },
      { label: 'Audio', icon: <MicrophoneIcon className="w-5 h-5"/>, ref: audioInputRef, accept: 'audio/*', capture: 'user' },
      { label: 'File', icon: <PaperClipIcon className="w-5 h-5"/>, ref: fileInputRef, accept: '*', multiple: true },
    ];

    const renderViewMode = () => (
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-3 text-sm border-b border-gray-200 dark:border-gray-700 pb-4 items-center">
                <MetadataItem icon={<ClockIcon className="w-4 h-4" />} label="Created time">
                    {format(new Date(item.createdAt), 'MMM d, yyyy, h:mm a')}
                </MetadataItem>

                {isTask && (
                    <>
                        <MetadataItem icon={<SparklesIcon className="w-4 h-4" />} label="Status">
                             <span className={`px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-200 dark:bg-gray-700`}>
                                {(item as Task).status}
                             </span>
                        </MetadataItem>
                        <MetadataItem icon={<FlagIcon className="w-4 h-4" />} label="Priority">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${priorityColors[(item as Task).priority]}`}>
                                {(item as Task).priority}
                            </span>
                        </MetadataItem>
                        <MetadataItem icon={<CalendarDaysIcon className="w-4 h-4" />} label="Due Date">
                            {format(new Date((item as Task).dueDate), 'MMMM d, yyyy')}
                        </MetadataItem>
                    </>
                )}

                {item.tags && item.tags.length > 0 && (
                     <MetadataItem icon={<TagIcon className="w-4 h-4" />} label="Tags">
                        {item.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/80 rounded-md text-xs">{tag}</span>
                        ))}
                    </MetadataItem>
                )}
            </div>
            
            {(isTask ? (item as Task).description : (item as Note).content) && (
                <div>
                    <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{__html: isTask ? (item as Task).description : (item as Note).content}} />
                </div>
            )}

            {isTask && (item as Task).checklist && (item as Task).checklist.length > 0 && (
                <div>
                    <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Checklist</h3>
                    <div className="space-y-2">
                        {(item as Task).checklist.map(ci => (
                            <label key={ci.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer">
                                <input type="checkbox" checked={ci.completed} onChange={() => handleToggleChecklistItem(ci.id, false)} className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />
                                <span className={`flex-grow ${ci.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>{ci.text}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {item.attachments && item.attachments.length > 0 && (
                 <div>
                    <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Attachments</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {item.attachments.map(att => <AttachmentDisplay key={att.id} attachment={att} isPreview={true} />)}
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
                                                {(analysis as TaskAnalysis).subtasks.map((sub, i) => <li key={i}>{sub.title} ({sub.hours}h)</li>)}
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
                  <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-4">Comments</h3>
                  <div className="space-y-4">
                      {(item as Task).comments.map(comment => <CommentItem key={comment.id} comment={comment} />)}
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
        </div>
    );
    
    const renderEditMode = () => (
         <div className="p-6 space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isTask ? "Description" : "Content"}</label>
                {isTask ? (
                    <textarea value={(editedItem as Task).description} onChange={e => handleFieldChange('description', e.target.value)} rows={5} className="w-full form-textarea rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary"/>
                ) : (
                    <RichTextEditor value={(editedItem as Note).content} onChange={value => handleFieldChange('content', value)} />
                )}
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                     {editedItem.attachments.map(att => <AttachmentDisplay key={att.id} attachment={att} isPreview={false} onRemove={removeAttachment} />)}
                </div>
                 <div className="flex items-center space-x-2">
                    {attachmentButtons.map(btn => (
                        <div key={btn.label}>
                            <button type="button" onClick={() => btn.ref.current?.click()} className="p-2 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors" title={btn.label}>
                                {btn.icon}
                            </button>
                             <input
                                  type="file" ref={btn.ref} accept={btn.accept}
                                  capture={(btn.capture as any)} multiple={btn.multiple}
                                  onChange={handleFileChange} className="hidden"
                              />
                        </div>
                    ))}
                 </div>
            </div>

            {isTask && (
                 <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Checklist</label>
                     <div className="space-y-2">
                        {(editedItem as Task).checklist.map(ci => (
                             <div key={ci.id} className="flex items-center space-x-2 group">
                                 <input type="checkbox" checked={ci.completed} onChange={() => handleToggleChecklistItem(ci.id, true)} className="h-5 w-5 form-checkbox rounded border-gray-300 text-primary focus:ring-primary" />
                                 <input type="text" value={ci.text} onChange={e => handleFieldChange('checklist', (editedItem as Task).checklist.map(i => i.id === ci.id ? {...i, text: e.target.value} : i))} className="flex-grow form-input rounded-md bg-transparent border-0 focus:bg-gray-100 dark:focus:bg-gray-700 focus:ring-1 focus:ring-primary"/>
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
                <div className="grid grid-cols-2 gap-4">
                     <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                      <input type="date" value={format(new Date((editedItem as Task).dueDate), 'yyyy-MM-dd')} onChange={e => handleFieldChange('dueDate', new Date(e.target.value).toISOString())} required className="w-full form-input rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary"/>
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                      <select value={(editedItem as Task).status} onChange={e => handleFieldChange('status', e.target.value as Status)} className="w-full form-select rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary">
                        {Object.values(Status).map(s => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </div>
                </div>
            )}
        </div>
    );

    const paneClasses = `
      fixed z-40 bg-brand-light dark:bg-gray-900 flex flex-col transition-all duration-300 ease-in-out
      ${isFullScreen
        ? 'inset-0 w-screen h-screen'
        : 'top-0 right-0 h-screen w-[480px] max-w-full shadow-2xl animate-slide-in-right'
      }
    `;

    return (
        <aside className={paneClasses}>
            <header className="flex-shrink-0 p-4 flex justify-between items-start border-b border-gray-200 dark:border-gray-700">
                 <div className="flex-grow pr-4">
                     {isEditing ? (
                         <input type="text" value={editedItem.title} onChange={e => handleFieldChange('title', e.target.value)} className="w-full text-lg font-semibold bg-transparent border-b border-dashed border-gray-400 dark:border-gray-500 focus:border-solid focus:border-primary focus:ring-0" />
                     ) : (
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h2>
                     )}
                 </div>
                <div className="flex items-center space-x-1">
                    {isEditing ? (
                        <>
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-200/80 dark:bg-gray-600/80 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                            <button
                                onClick={handleSaveChanges}
                                disabled={!editedItem.title.trim()}
                                className="flex items-center space-x-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark disabled:bg-primary/70 dark:disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors">
                                <CheckIcon className="w-5 h-5"/>
                                <span>Save</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setIsEditing(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" aria-label="Edit Item"><PencilIcon className="w-5 h-5" /></button>
                            <button onClick={handleDelete} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" aria-label="Delete Item"><TrashIcon className="w-5 h-5" /></button>
                        </>
                    )}
                    <button
                        onClick={() => setIsFullScreen(prev => !prev)}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                        aria-label={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                        title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                    >
                        {isFullScreen ? <ExitFullScreenIcon className="w-5 h-5" /> : <FullScreenIcon className="w-5 h-5" />}
                    </button>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" aria-label="Close Pane"><XMarkIcon className="w-5 h-5" /></button>
                </div>
            </header>

            <div className="flex-grow overflow-y-auto pb-24">
                {isEditing ? renderEditMode() : renderViewMode()}
            </div>
            
            {!isEditing && (
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