import * as React from 'react';
import { Task, TaskAnalysis, Priority, Status, Attachment, ChecklistItem } from '../types';
import { XMarkIcon, SparklesIcon, TrashIcon, ClockIcon, PaperClipIcon, PencilIcon, PlusIcon } from './icons';
import { analyzeTaskAndSuggestSubtasks } from '../services/geminiService';
import AddTaskModal from './AddTaskModal'; // Reusing some styles and structure

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
}

const newId = () => Date.now() + Math.floor(Math.random() * 1000);

const priorityColors: Record<Priority, string> = {
  [Priority.High]: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
  [Priority.Medium]: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
  [Priority.Low]: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
};

const AttachmentDisplay = ({ attachment }: { attachment: Attachment }) => {
    const srcUrl = attachment.url.startsWith('data:') ? attachment.url : `file://${attachment.url}`;

    if (attachment.type.startsWith('image/')) {
        return <a href={srcUrl} target="_blank" rel="noopener noreferrer"><img src={srcUrl} alt={attachment.name} className="max-h-40 w-auto rounded-lg object-contain border dark:border-gray-600"/></a>;
    }
    if (attachment.type.startsWith('video/')) {
        return <video src={srcUrl} controls className="max-h-40 w-auto rounded-lg" />;
    }
    if (attachment.type.startsWith('audio/')) {
        return <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"><p className="text-sm mb-2">{attachment.name}</p><audio src={srcUrl} controls className="w-full" /></div>;
    }
    return (
      <a href={srcUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sm p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
        <PaperClipIcon className="w-5 h-5 flex-shrink-0"/>
        <span className="truncate">{attachment.name}</span>
      </a>
    );
}

const TaskModal = ({ task, onClose, onUpdateTask, onDeleteTask }: TaskModalProps) => {
  const [analysis, setAnalysis] = React.useState<TaskAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedTask, setEditedTask] = React.useState<Task | null>(task);
  const [checklistItemText, setChecklistItemText] = React.useState('');

  React.useEffect(() => {
      // Reset state when a new task is selected
      setAnalysis(null);
      setIsAnalyzing(false);
      setError(null);
      setIsEditing(false);
      setEditedTask(task);
  }, [task]);

  if (!task) return null;

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);
    const result = await analyzeTaskAndSuggestSubtasks(task);
    if (result) {
      setAnalysis(result);
    } else {
      setError('Failed to analyze the task. Please check your API key and try again.');
    }
    setIsAnalyzing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the task: "${task.title}"?`)) {
      onDeleteTask(task.id);
      onClose();
    }
  };

  const handleToggleChecklistItem = (itemId: number) => {
    const updatedChecklist = task.checklist.map(item => 
        item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onUpdateTask({ ...task, checklist: updatedChecklist });
  };
  
  const handleEditChange = (field: keyof Task, value: any) => {
    if (editedTask) {
        setEditedTask({ ...editedTask, [field]: value });
    }
  };

  const handleAddChecklistItem = () => {
    if (checklistItemText.trim() && editedTask) {
        const newItem: ChecklistItem = {
            id: newId(),
            text: checklistItemText.trim(),
            completed: false,
        };
        setEditedTask({ ...editedTask, checklist: [...editedTask.checklist, newItem] });
        setChecklistItemText('');
    }
  };

  const handleRemoveChecklistItem = (id: number) => {
    if (editedTask) {
        setEditedTask({ ...editedTask, checklist: editedTask.checklist.filter(item => item.id !== id) });
    }
  };

  const handleSaveChanges = () => {
      if (editedTask) {
          let finalTask = { ...editedTask };
          if (checklistItemText.trim()) {
              const newItem: ChecklistItem = {
                  id: newId(),
                  text: checklistItemText.trim(),
                  completed: false,
              };
              finalTask.checklist = [...finalTask.checklist, newItem];
              setChecklistItemText('');
          }
          onUpdateTask(finalTask);
          setIsEditing(false);
      }
  };
  
  const dueDate = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0,0,0,0);
  const isOverdue = dueDate < today && task.status !== Status.Done;

  const renderViewMode = () => (
    <>
      <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap mb-6">{task.description}</p>
      
      {task.checklist && task.checklist.length > 0 && (
          <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Checklist</h3>
              <div className="space-y-2">
                  {task.checklist.map(item => (
                      <label key={item.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/50 cursor-pointer">
                          <input type="checkbox" checked={item.completed} onChange={() => handleToggleChecklistItem(item.id)} className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />
                          <span className={`flex-grow ${item.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>{item.text}</span>
                      </label>
                  ))}
              </div>
          </div>
      )}

      {task.attachments && task.attachments.length > 0 && (
        <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Attachments</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {task.attachments.map(att => <AttachmentDisplay key={att.id} attachment={att} />)}
            </div>
        </div>
      )}

      <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">AI Task Analysis</h3>
          <button onClick={handleAnalyze} disabled={isAnalyzing} className="flex items-center space-x-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark disabled:bg-primary-light disabled:cursor-not-allowed transition-all transform hover:scale-105">
            <SparklesIcon className="w-5 h-5" />
            <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Task'}</span>
          </button>
        </div>
        
        {isAnalyzing && <div className="text-center p-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>}
        {error && <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg">{error}</div>}
        
        {analysis && (
          <div className="mt-4 space-y-4 animate-fade-in">
            <div><strong>Complexity:</strong> <span className="text-gray-600 dark:text-gray-300">{analysis.complexity}</span></div>
            <div><strong>Required Skills:</strong> <span className="text-gray-600 dark:text-gray-300">{analysis.requiredSkills.join(', ')}</span></div>
            <div><strong>Potential Blockers:</strong> <span className="text-gray-600 dark:text-gray-300">{analysis.potentialBlockers.join(', ')}</span></div>
            <div>
              <h4 className="font-semibold mt-2 mb-2">Suggested Subtasks:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                {analysis.subtasks.map((sub, i) => (
                  <li key={i}>{sub.title} ({sub.hours}h)</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const renderEditMode = () => (
      <div className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input type="text" id="title" value={editedTask?.title || ''} onChange={e => handleEditChange('title', e.target.value)} required className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary"/>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea id="description" value={editedTask?.description || ''} onChange={e => handleEditChange('description', e.target.value)} rows={4} className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Checklist</label>
            <div className="space-y-2">
                {editedTask?.checklist.map(item => (
                    <div key={item.id} className="flex items-center space-x-2">
                        <input type="text" value={item.text} onChange={e => handleEditChange('checklist', editedTask.checklist.map(i => i.id === item.id ? {...i, text: e.target.value} : i))} className="flex-grow px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"/>
                        <button type="button" onClick={() => handleRemoveChecklistItem(item.id)} className="p-1 text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>
            <div className="flex items-center space-x-2 mt-2">
                <input type="text" value={checklistItemText} onChange={e => setChecklistItemText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())} placeholder="Add a checklist item..." className="flex-grow px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary"/>
                <button type="button" onClick={handleAddChecklistItem} className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark"><PlusIcon className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input type="date" id="dueDate" value={editedTask?.dueDate || ''} onChange={e => handleEditChange('dueDate', e.target.value)} required className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary"/>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select id="priority" value={editedTask?.priority} onChange={e => handleEditChange('priority', e.target.value as Priority)} className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary">
                {Object.values(Priority).map(p => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-4 space-x-4">
            <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancel</button>
            <button type="button" onClick={handleSaveChanges} className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors">Save Changes</button>
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-start backdrop-blur-sm pt-10" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-brand-light dark:bg-brand-dark rounded-2xl shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto transform transition-all animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white pr-4">{task.title}</h2>
            <div className="flex items-center space-x-2 flex-shrink-0">
              {!isEditing && (
                  <button onClick={() => setIsEditing(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-primary-dark dark:hover:text-primary-light" aria-label="Edit Task">
                      <PencilIcon className="w-5 h-5" />
                  </button>
              )}
              <button onClick={handleDelete} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" aria-label="Delete Task">
                  <TrashIcon className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close modal">
                  <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          {!isEditing && (
              <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityColors[task.priority]}`}>{task.priority} Priority</span>
                <span className="flex items-center space-x-1.5 text-gray-600 dark:text-gray-400">
                    <ClockIcon className={`w-4 h-4 ${isOverdue ? 'text-red-500' : ''}`} />
                    <span className={isOverdue ? 'text-red-500 font-semibold' : ''}>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{task.status}</span>
              </div>
          )}

          {isEditing ? renderEditMode() : renderViewMode()}
        </div>
      </div>
    </div>
  );
};

export default TaskModal;