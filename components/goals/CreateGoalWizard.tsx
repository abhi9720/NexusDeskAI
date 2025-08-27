import React, { useState, useEffect } from 'react';
import { Goal, List, Task, ChecklistItem } from '../../types';
import { XMarkIcon, SparklesIcon, ChevronRightIcon, ChevronLeftIcon, CheckIcon, PencilIcon, TrashIcon, PlusIcon, ClockIcon } from '../icons';
import { refineAndPlanGoal } from '../../services/geminiService';
import { addDays, format } from 'date-fns';

const newId = () => Date.now() + Math.floor(Math.random() * 1000);

const defaultPromptTemplate = `You are a productivity coach. A user has provided a high-level goal. Your job is to refine this into a SMART goal, suggest a project list name, and create a comprehensive, sequential action plan.

**Context for Today:**
- Today's Date: {CURRENT_DATE}

User's Goal: "{GOAL}"

Based on this, generate a JSON response with the following structure:
- smartTitle: A concise, refined SMART goal title.
- motivation: A short, inspiring summary of the user's likely motivation (the "why").
- listSuggestion: A short, sensible name for a new task list for this goal. E.g., 'Learn MERN Stack'.
- targetDate: An estimated, realistic target date to complete the entire goal, in "YYYY-MM-DD" format. **This date must be in the future relative to today's date.**
- tasks: Generate a comprehensive list of sequential, high-level tasks required to achieve this goal. The number of tasks should depend on the goal's complexity. For each task, provide:
    - title: The title of the task.
    - description: A short description for the task.
    - checklist: A detailed checklist of sub-tasks.
    - durationInDays: An estimated number of days this specific task will take to complete.`;

interface CreateGoalWizardProps {
  onClose: () => void;
  onGoalCreate: (goal: Omit<Goal, 'id'> & { id?: number }) => void;
  onTasksCreate: (item: Partial<Task>, listId: number, type: 'task') => void;
  lists: List[];
  onAddList: (list: Omit<List, 'id' | 'statuses'>) => Promise<List>;
}

type AITask = {
  id: number;
  title: string;
  description: string;
  checklist: string[];
  dueDate: string;
}

type AIPlan = {
  smartTitle: string;
  motivation: string;
  listSuggestion: string;
  tasks: AITask[];
};

const CreateGoalWizard = ({ onClose, onGoalCreate, onTasksCreate, lists, onAddList }: CreateGoalWizardProps) => {
  const [step, setStep] = useState(1);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [targetListId, setTargetListId] = useState<number | string | null>(null);
  const [targetDate, setTargetDate] = useState('');
  const [editingTask, setEditingTask] = useState<AITask | null>(null);

  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [promptTemplate, setPromptTemplate] = useState(defaultPromptTemplate);

  useEffect(() => {
    const taskLists = lists.filter(l => l.type === 'task');
    if (taskLists.length > 0 && !targetListId) {
        setTargetListId(taskLists[0].id);
    }
  }, [lists, targetListId]);

  const handlePlanWithAI = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true);
    const plan = await refineAndPlanGoal(userInput, promptTemplate);
    if (plan) {
      let cumulativeDate = new Date();
      const tasksWithDates = plan.tasks.map(t => {
          const duration = (t as any).durationInDays > 0 ? (t as any).durationInDays : 1;
          cumulativeDate = addDays(cumulativeDate, duration);
          return {
              ...t,
              id: newId(),
              dueDate: cumulativeDate.toISOString(),
          };
      });
      setAiPlan({ ...plan, tasks: tasksWithDates });
      setSelectedTasks(new Set(tasksWithDates.map(t => t.id)));
      setTargetDate(plan.targetDate);
      setStep(2);
    } else {
      alert("Could not generate a plan. Please check your API key or try a different goal.");
    }
    setIsLoading(false);
  };

  const handleToggleTask = (taskId: number) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  };
  
  const handleAddTask = () => {
      if (!aiPlan) return;
      const lastTaskDate = aiPlan.tasks.length > 0 ? new Date(aiPlan.tasks[aiPlan.tasks.length - 1].dueDate) : new Date();
      const newTask: AITask = { id: newId(), title: 'New Task', description: '', checklist: [], dueDate: addDays(lastTaskDate, 1).toISOString() };
      setAiPlan({ ...aiPlan, tasks: [...aiPlan.tasks, newTask] });
      setSelectedTasks(prev => new Set(prev).add(newTask.id));
      setEditingTask(newTask);
  };
  
  const handleUpdateTask = (updatedTask: AITask) => {
      if (!aiPlan) return;
      setAiPlan({ ...aiPlan, tasks: aiPlan.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) });
      setEditingTask(null);
  };

  const handleDeleteTask = (taskId: number) => {
      if (!aiPlan) return;
      setAiPlan({ ...aiPlan, tasks: aiPlan.tasks.filter(t => t.id !== taskId) });
      setSelectedTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
      });
  };


  const handleFinalize = async () => {
    if (!aiPlan || !targetDate) {
        alert("Please select a target date.");
        return;
    }

    let listId: number | null = null;
    
    if (typeof targetListId === 'string' && targetListId.startsWith('new:')) {
        const newListName = targetListId.substring(4);
         try {
            const newList = await onAddList({ name: newListName, color: '#8b64fd', type: 'task', parentId: null });
            listId = newList.id;
        } catch (e) {
            alert('Could not create the new task list.');
            return;
        }
    } else {
        listId = Number(targetListId);
    }


    if (!listId) {
        alert("Please select a task list.");
        return;
    }
    
    // Create the Goal
    const newGoal = {
        title: aiPlan.smartTitle,
        motivation: aiPlan.motivation,
        targetDate: new Date(`${targetDate}T00:00:00`).toISOString(),
        linkedTaskListIds: [listId],
    };
    onGoalCreate(newGoal as any);
    
    // Create the selected tasks
    selectedTasks.forEach(taskId => {
        const taskData = aiPlan.tasks.find(t => t.id === taskId);
        if(taskData) {
            const {id, ...taskToCreateBase} = taskData; // remove temporary ID
            const taskToCreate: Partial<Task> = {
                title: taskToCreateBase.title,
                description: taskToCreateBase.description,
                dueDate: taskToCreateBase.dueDate,
                checklist: taskToCreateBase.checklist.map(text => ({
                    id: newId(),
                    text,
                    completed: false
                } as ChecklistItem))
            };
            onTasksCreate(taskToCreate, listId as number, 'task');
        }
    });

    onClose();
  };

  const taskLists = lists.filter(l => l.type === 'task');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-md animate-fade-in-overlay" onMouseDown={onClose}>
      <div className="bg-page dark:bg-page-dark rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-scale-in" onMouseDown={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold">New Goal</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><XMarkIcon className="w-6 h-6" /></button>
        </header>

        {step === 1 && (
          <div className="flex-grow flex flex-col justify-center items-center p-8 text-center">
            <h3 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">What's your ambition?</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg max-w-lg">Describe your goal in your own words. The more detail, the better the AI plan will be.</p>
            <textarea
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder="e.g., I want to learn ReactJS to build modern web apps"
              className="w-full max-w-xl h-32 mt-8 p-4 text-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:border-primary transition"
            />
            <div className="w-full max-w-xl mt-4 text-left">
                <button onClick={() => setShowPromptEditor(p => !p)} className="text-sm text-primary hover:underline">{showPromptEditor ? 'Hide' : 'Customize AI Prompt'}</button>
                {showPromptEditor && (
                    <textarea 
                        value={promptTemplate}
                        onChange={e => setPromptTemplate(e.target.value)}
                        rows={8}
                        className="w-full mt-2 p-2 text-xs font-mono rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                    />
                )}
            </div>
            <button
              onClick={handlePlanWithAI}
              disabled={isLoading || !userInput.trim()}
              className="mt-8 flex items-center space-x-2 px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-all transform hover:scale-105 shadow-xl shadow-primary/20 hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Planning...</span>
                  </>
              ) : (
                  <>
                    <SparklesIcon className="w-5 h-5"/>
                    <span>Plan with AI</span>
                  </>
              )}
            </button>
          </div>
        )}

        {step === 2 && aiPlan && (
          <div className="flex-grow grid grid-cols-2 grid-rows-[1fr] gap-0 overflow-hidden">
            <div className="p-6 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <h3 className="text-lg font-semibold mb-2">Your Input:</h3>
                <p className="flex-grow p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm italic">"{userInput}"</p>
            </div>
            <div className="p-6 flex flex-col h-full overflow-hidden">
                <h3 className="text-lg font-semibold mb-4 text-primary flex-shrink-0">AI's Suggested Plan</h3>
                
                {/* Non-scrolling top part */}
                <div className="space-y-4 flex-shrink-0">
                    <div>
                        <label className="block text-sm font-medium">Refined Goal Title:</label>
                        <input type="text" value={aiPlan.smartTitle} onChange={e => setAiPlan({...aiPlan, smartTitle: e.target.value})} className="w-full form-input mt-1 rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Motivation:</label>
                        <textarea value={aiPlan.motivation} onChange={e => setAiPlan({...aiPlan, motivation: e.target.value})} rows={2} className="w-full form-textarea mt-1 rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"/>
                    </div>
                </div>

                {/* Scrolling middle part */}
                <div className="my-4 flex-grow min-h-0 overflow-y-auto pr-2 -mr-2">
                    <label className="block text-sm font-medium mb-2">Suggested Tasks (Milestones):</label>
                    <div className="space-y-2">
                        {aiPlan.tasks.map((task) => (
                            <div key={task.id} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 group">
                                {editingTask?.id === task.id ? (
                                    <TaskEditForm task={editingTask} onSave={handleUpdateTask} onCancel={() => setEditingTask(null)} />
                                ) : (
                                    <div className="flex items-start gap-3 cursor-pointer" onClick={() => handleToggleTask(task.id)}>
                                        <input type="checkbox" checked={selectedTasks.has(task.id)} readOnly className="h-5 w-5 rounded form-checkbox text-primary mt-1"/>
                                        <div className="flex-grow">
                                            <p className="text-sm font-semibold">{task.title}</p>
                                            <p className="text-xs text-gray-500">{task.description}</p>
                                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1"><ClockIcon className="w-3 h-3"/><span>Due: {format(new Date(task.dueDate), 'MMM d')}</span></div>
                                        </div>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => {e.stopPropagation(); setEditingTask(task);}} className="p-1 text-gray-500 hover:text-primary"><PencilIcon className="w-4 h-4"/></button>
                                            <button onClick={(e) => {e.stopPropagation(); handleDeleteTask(task.id);}} className="p-1 text-gray-500 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <button onClick={handleAddTask} className="mt-2 text-sm text-primary font-semibold flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add a task</button>
                </div>

                {/* Non-scrolling bottom part */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700/80 flex-shrink-0">
                    <div>
                        <label className="block text-sm font-medium mb-1">Add tasks to:</label>
                        <select value={targetListId || ''} onChange={e => setTargetListId(e.target.value)} className="w-full form-select rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                            {taskLists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
                            <option value={`new:${aiPlan.listSuggestion}`}>+ Create new list: "{aiPlan.listSuggestion}"</option>
                        </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium mb-1">Target Date:</label>
                       <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} required className="w-full form-input rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"/>
                    </div>
                </div>
            </div>
          </div>
        )}
        
        {step > 1 && (
            <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                 <button onClick={() => setStep(1)} className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                    <ChevronLeftIcon className="w-5 h-5"/>
                    <span>Back</span>
                </button>
                 <button onClick={handleFinalize} disabled={!targetListId || !targetDate || selectedTasks.size === 0} className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50">
                    Create Goal & {selectedTasks.size} Tasks
                </button>
            </footer>
        )}

      </div>
    </div>
  );
};

// Sub-component for editing a task inline
const TaskEditForm = ({ task, onSave, onCancel }: { task: AITask; onSave: (task: AITask) => void; onCancel: () => void }) => {
    const [editedTask, setEditedTask] = useState(task);
    const [newChecklistItem, setNewChecklistItem] = useState('');

    const handleSave = () => {
        onSave(editedTask);
    };
    
    const handleAddChecklistItem = () => {
        if (newChecklistItem.trim()) {
            setEditedTask(t => ({...t, checklist: [...t.checklist, newChecklistItem.trim()]}));
            setNewChecklistItem('');
        }
    }
    
    const handleRemoveChecklistItem = (index: number) => {
        setEditedTask(t => ({...t, checklist: t.checklist.filter((_, i) => i !== index)}));
    }

    return (
        <div className="space-y-2 p-2 bg-white dark:bg-gray-800 border rounded-md">
            <input 
                type="text" 
                value={editedTask.title} 
                onChange={e => setEditedTask({...editedTask, title: e.target.value})} 
                className="w-full form-input text-sm font-semibold p-1"
            />
            <textarea 
                value={editedTask.description} 
                onChange={e => setEditedTask({...editedTask, description: e.target.value})}
                rows={2} 
                className="w-full form-textarea text-xs p-1" 
            />
            <div className="space-y-1">
                <label className="text-xs font-medium">Checklist:</label>
                {editedTask.checklist.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input type="text" value={item} onChange={e => {
                            const newChecklist = [...editedTask.checklist];
                            newChecklist[index] = e.target.value;
                            setEditedTask({...editedTask, checklist: newChecklist});
                        }} className="w-full form-input text-xs p-1" />
                        <button onClick={() => handleRemoveChecklistItem(index)}><TrashIcon className="w-3 h-3 text-red-500"/></button>
                    </div>
                ))}
                 <div className="flex items-center gap-2">
                    <input type="text" value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} placeholder="New item" className="w-full form-input text-xs p-1"/>
                    <button onClick={handleAddChecklistItem}><PlusIcon className="w-4 h-4 text-primary"/></button>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <button onClick={onCancel} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600">Cancel</button>
                <button onClick={handleSave} className="text-xs px-2 py-1 rounded bg-primary text-white">Save</button>
            </div>
        </div>
    );
};

export default CreateGoalWizard;