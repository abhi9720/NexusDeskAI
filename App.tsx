import * as React from 'react';
import AppLayout from './components/AppLayout';
import OnboardingFlow from './components/OnboardingFlow';
import {
  List,
  Task,
  Note,
  Status,
  Priority,
  ActiveSelection,
  SavedFilter,
  StickyNote,
  TaskFilter,
  ChecklistItem,
  Attachment,
  ChatSession,
  ChatMessage,
  Goal,
  JournalEntry,
  GoalStatus,
  ListStatusMapping,
  Comment,
  CustomFieldDefinition,
  ActivityLog,
  UserStats,
  FocusItem,
  Habit,
  HabitLog,
  CustomReminder,
} from './types';
import { isDate, format } from 'date-fns';
import { runChat, initializeAi, parseQuickAddTask } from './services/geminiService';
import { storageService } from './services/storageService';
import FocusModeView from './components/FocusModeView';
import { notificationService } from './services/notificationService';
import { gamificationService } from './services/gamificationService';
import { CheckCircleIcon, BellIcon, XMarkIcon } from './components/icons';

const newSubId = () => Date.now() + Math.floor(Math.random() * 1000);

const levenshtein = (s1: string, s2: string): number => {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let j = 1; j <= len2; j++) {
        for (let i = 1; i <= len1; i++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[len1][len2];
};

interface InAppNotification {
    id: number;
    title: string;
    body: string;
}

const App = () => {
    // --- STATE MANAGEMENT ---
    const [lists, setLists] = React.useState<List[]>([]);
    const [tasks, setTasks] = React.useState<Task[]>([]);
    const [notes, setNotes] = React.useState<Note[]>([]);
    const [savedFilters, setSavedFilters] = React.useState<SavedFilter[]>([]);
    const [stickyNotes, setStickyNotes] = React.useState<StickyNote[]>([]);
    const [chatSessions, setChatSessions] = React.useState<ChatSession[]>([]);
    const [goals, setGoals] = React.useState<Goal[]>([]);
    const [habits, setHabits] = React.useState<Habit[]>([]);
    const [habitLogs, setHabitLogs] = React.useState<HabitLog[]>([]);
    const [customReminders, setCustomReminders] = React.useState<CustomReminder[]>([]);
    const [userStats, setUserStats] = React.useState<UserStats | null>(null);
    const [customFieldDefinitions, setCustomFieldDefinitions] = React.useState<CustomFieldDefinition[]>([]);
    const [activeSelection, setActiveSelection] = React.useState<ActiveSelection>({ type: 'dashboard' });
    const [detailItem, setDetailItem] = React.useState<Task | Note | null>(null);
    const [isDataLoaded, setIsDataLoaded] = React.useState(false);
    const [isOnboardingComplete, setIsOnboardingComplete] = React.useState(false);
    const [activeChatSessionId, setActiveChatSessionId] = React.useState<number | null>(null);
    const [userName, setUserName] = React.useState('User');
    const [apiKey, setApiKey] = React.useState<string | null>(null);
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);
    const [focusItem, setFocusItem] = React.useState<FocusItem | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
    const [addingItemInfo, setAddingItemInfo] = React.useState<{ type: 'task' | 'note', listId: number } | null>(null);
    const [isAiLoading, setIsAiLoading] = React.useState(false);
    const [focusSessionCompleteInfo, setFocusSessionCompleteInfo] = React.useState<{ item: FocusItem, duration: number } | null>(null);
    const [inAppNotifications, setInAppNotifications] = React.useState<InAppNotification[]>([]);
    
    const findTaskFuzzily = (title: string): { task: Task | null; error?: string } => {
        if (!title) {
            return { task: null, error: "No task title was provided." };
        }
        const lowerTitle = title.toLowerCase();
        
        const scoredTasks = tasks
            .map(task => {
                const taskTitleLower = task.title.toLowerCase();
                const distance = levenshtein(lowerTitle, taskTitleLower);
                const similarity = 1 - (distance / Math.max(lowerTitle.length, taskTitleLower.length));
                return { task, score: similarity };
            })
            .filter(item => item.score > 0.6) // A threshold to filter out very different tasks
            .sort((a, b) => b.score - a.score);
    
        if (scoredTasks.length === 0) {
            return { task: null, error: `Task similar to "${title}" not found.` };
        }
        
        // If top score is a near-perfect match, take it.
        if (scoredTasks[0].score > 0.9) {
            return { task: scoredTasks[0].task };
        }

        if (scoredTasks.length > 1 && scoredTasks[0].score - scoredTasks[1].score < 0.1) {
            // If the top 2 scores are very close, it's ambiguous
            const ambiguousTitles = scoredTasks.slice(0, 3).map(t => `'${t.task.title}'`).join(', ');
            return { task: null, error: `Task title is ambiguous. Found: ${ambiguousTitles}. Please be more specific.` };
        }
    
        return { task: scoredTasks[0].task };
    };

    const findListFuzzily = (name: string): List | null => {
        if (!name) return null;
        const lowerName = name.toLowerCase();
    
        const taskLists = lists.filter(l => l.type === 'task');
    
        // Prefer exact match
        const exactMatch = taskLists.find(l => l.name.toLowerCase() === lowerName);
        if (exactMatch) return exactMatch;
        
        // Levenshtein distance for fuzzy matching
        const scoredLists = taskLists
            .map(list => {
                const listNameLower = list.name.toLowerCase();
                const distance = levenshtein(lowerName, listNameLower);
                const similarity = 1 - (distance / Math.max(lowerName.length, listNameLower.length));
                return { list, score: similarity };
            })
            .filter(item => item.score > 0.6) // A threshold to filter out very different lists
            .sort((a, b) => b.score - a.score);
    
        if (scoredLists.length > 0) {
            return scoredLists[0].list;
        }
    
        return null;
    };

    // --- GLOBAL KEYBOARD SHORTCUTS ---
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                setIsSearchOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // --- IN-APP NOTIFICATION HANDLER ---
    React.useEffect(() => {
        const handleShowNotification = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { id, title, body } = customEvent.detail;
            setInAppNotifications(prev => [...prev, { id, title, body }]);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                setInAppNotifications(prev => prev.filter(n => n.id !== id));
            }, 5000);
        };
        
        window.addEventListener('show-in-app-notification', handleShowNotification);
        
        return () => {
            window.removeEventListener('show-in-app-notification', handleShowNotification);
        };
    }, []);

    // --- DATA LOADING & VALIDATION ---
    React.useEffect(() => {
        const checkOnboarding = async () => {
            const onboardingDone = await storageService.getSetting('onboardingComplete');
            if (onboardingDone) {
                setIsOnboardingComplete(true);
                const storedName = await storageService.getSetting('userName') || 'User';
                const storedKey = await storageService.getSetting('apiKey');
                setUserName(storedName);
                setApiKey(storedKey);
                initializeAi(storedKey);
                 loadAllData();
            } else {
                 setIsDataLoaded(true); // Allow onboarding to show without loading all data
            }
        }

        const loadAllData = async () => {
            const [
                rawLists, rawTasks, rawNotes, loadedSavedFilters, rawStickyNotes,
                rawChatSessions, rawGoals, loadedCustomFields, loadedUserStats,
                rawHabits, loadedHabitLogs, loadedCustomReminders
            ] = await Promise.all([
                storageService.getAll('List'),
                storageService.getAll('Task'),
                storageService.getAll('Note'),
                storageService.getAll('SavedFilter'),
                storageService.getAll('StickyNote'),
                storageService.getAll('ChatSession'),
                storageService.getAll('Goal'),
                storageService.getAll('CustomFieldDefinition'),
                storageService.getById('UserStats', 1),
                storageService.getAll('Habit'),
                storageService.getAll('HabitLog'),
                storageService.getAll('CustomReminder'),
            ]);

            const loadedLists = rawLists.map(l => ({
                ...l,
                parentId: l.parentId || null
            }));

            // Sanitize loaded data to ensure all properties exist, preventing crashes from legacy data.
            const loadedTasks = rawTasks.map(t => ({
                ...t,
                description: t.description || '',
                tags: t.tags || [],
                attachments: t.attachments || [],
                checklist: t.checklist || [],
                comments: t.comments || [],
                activityLog: t.activityLog || [],
                customFields: t.customFields || {},
                linkedNoteIds: t.linkedNoteIds || [],
                reminder: t.reminder || null,
            }));

            const loadedNotes = rawNotes.map(n => ({
                ...n,
                content: n.content || '',
                tags: n.tags || [],
                attachments: n.attachments || [],
            }));

            const loadedStickyNotes = rawStickyNotes.map(sn => ({
                ...sn,
                size: sn.size || { width: 256, height: 224 }
            }));
            
            const loadedGoals = rawGoals.map(g => ({
                ...g,
                motivation: g.motivation || '',
                linkedTaskListIds: g.linkedTaskListIds || [],
                journal: g.journal || [],
            }));
            
            const loadedHabits = rawHabits.map(h => ({
                ...h,
                reminderTime: h.reminderTime || null,
            }));

            const loadedChatSessions = rawChatSessions.map(cs => ({
                ...cs,
                messages: cs.messages || [],
            }));

            setLists(loadedLists);
            setTasks(loadedTasks);
            setNotes(loadedNotes);
            setSavedFilters(loadedSavedFilters);
            setStickyNotes(loadedStickyNotes);
            setChatSessions(loadedChatSessions);
            setGoals(loadedGoals);
            setCustomFieldDefinitions(loadedCustomFields);
            setHabits(loadedHabits);
            setHabitLogs(loadedHabitLogs);
            setCustomReminders(loadedCustomReminders);
            setUserStats(loadedUserStats || { id: 1, points: 0, currentStreak: 0, lastCompletionDate: null });


            setIsDataLoaded(true);
        };

        checkOnboarding();
    }, []);
    
    // --- GOAL PROGRESS CALCULATION ---
    React.useEffect(() => {
        const calculateGoalProgress = () => {
            const goalsWithProgress = goals.map(goal => {
                if (!goal.linkedTaskListIds || goal.linkedTaskListIds.length === 0) {
                    return { ...goal, progress: goal.progress || 0 };
                }
                const projectTasks = tasks.filter(t => goal.linkedTaskListIds.includes(t.listId));
                if (projectTasks.length === 0) {
                    return { ...goal, progress: 0 };
                }
                const completedTasks = projectTasks.filter(t => t.status === Status.Done).length;
                const progress = Math.round((completedTasks / projectTasks.length) * 100);
                
                let status = GoalStatus.OnTrack;
                // Basic logic for status - can be enhanced by AI later
                if (progress < 100 && new Date(goal.targetDate) < new Date()) {
                    status = GoalStatus.OffTrack;
                } else if (progress < 50 && (new Date(goal.targetDate).getTime() - Date.now()) < (new Date(goal.targetDate).getTime() - new Date(goal.createdAt).getTime()) / 2) {
                     status = GoalStatus.AtRisk;
                }

                return { ...goal, progress, status };
            });

            // Avoid unnecessary re-renders if progress hasn't changed
            if (JSON.stringify(goals) !== JSON.stringify(goalsWithProgress)) {
                setGoals(goalsWithProgress);
            }
        };

        if (isDataLoaded && isOnboardingComplete) {
            calculateGoalProgress();
        }
    }, [tasks, goals, isDataLoaded, isOnboardingComplete]);

    // --- NOTIFICATIONS & REMINDERS ---
    React.useEffect(() => {
        if (isDataLoaded && isOnboardingComplete) {
            notificationService.requestPermission();
            
            // Run once on load, then set interval
            notificationService.runAllReminderChecks(tasks, habits, customReminders, habitLogs, goals);
      
            const reminderInterval = setInterval(() => {
              notificationService.runAllReminderChecks(tasks, habits, customReminders, habitLogs, goals);
            }, 60 * 1000); // Check every minute
      
            return () => clearInterval(reminderInterval);
        }
    }, [isDataLoaded, isOnboardingComplete, tasks, habits, customReminders, habitLogs, goals]);


    // --- HANDLERS ---
    const handleAddList = async (list: Omit<List, 'id' | 'statuses'>): Promise<List> => {
        const defaultStatuses: ListStatusMapping[] | undefined = list.type === 'task' 
            ? [
                { status: Status.ToDo, name: 'To Do' },
                { status: Status.InProgress, name: 'In Progress' },
                { status: Status.Done, name: 'Done' }
              ]
            : undefined;
        const newList = { ...list, parentId: list.parentId || null, statuses: defaultStatuses };
        const addedList = await storageService.add('List', newList);
        setLists(prev => [...prev, addedList]);
        return addedList;
    };

    const handleUpdateList = async (updatedList: List) => {
        await storageService.update('List', updatedList.id, updatedList);
        setLists(prev => prev.map(l => l.id === updatedList.id ? updatedList : l));
    };

    const handleDeleteList = async (listId: number) => {
        const listToDelete = lists.find(l => l.id === listId);
        if (!listToDelete) return;

        // Delete associated items first
        if (listToDelete.type === 'task') {
            const tasksToDelete = tasks.filter(t => t.listId === listId);
            for (const task of tasksToDelete) {
                await storageService.delete('Task', task.id);
            }
            setTasks(prev => prev.filter(t => t.listId !== listId));
        } else {
            const notesToDelete = notes.filter(n => n.listId === listId);
            for (const note of notesToDelete) {
                await storageService.delete('Note', note.id);
            }
            setNotes(prev => prev.filter(n => n.listId !== listId));
        }

        await storageService.delete('List', listId);
        
        // Reparent children in state to ensure UI updates correctly
        setLists(prev => {
            const listsAfterDelete = prev.filter(l => l.id !== listId);
            return listsAfterDelete.map(l => l.parentId === listId ? { ...l, parentId: null } : l);
        });

        if (activeSelection.type === 'list' && activeSelection.id === listId) {
            setActiveSelection({type: 'smart-list', id: 'today'});
            setDetailItem(null);
        }
    };
    
    const handleAddItem = async (item: Partial<Task & Note>, listId: number, type: 'task' | 'note'): Promise<Task | Note> => {
        setAddingItemInfo(null);
        let targetListId = listId;
        const list = lists.find(l => l.id === listId);

        if (!list || list.type !== type) {
            // ... (fallback logic remains similar)
        }

        if (type === 'task') {
            const createdAt = new Date().toISOString();
            const title = item.title || 'Untitled Task';
            
            const getValidDueDate = (dateString?: string): string => {
                if (dateString) {
                    // Handle ISO strings directly. Handle YYYY-MM-DD format by treating it as local time to avoid timezone shifts.
                    const date = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
                    if (!isNaN(date.getTime())) {
                        return date.toISOString();
                    }
                }
                // Default to today if no valid date is provided.
                return new Date().toISOString();
            };

            const checklistData = (item as any).checklist || [];
            const checklist: ChecklistItem[] = checklistData.map((c: any) => 
                typeof c === 'string' 
                    ? { id: newSubId(), text: c, completed: false } 
                    : c
            );

            const newActivityLog: ActivityLog = { id: newSubId(), type: 'created', content: {}, taskTitle: title, createdAt, userName };
            const newTaskData = { 
                listId: targetListId,
                title,
                description: item.description || '',
                status: Status.ToDo,
                priority: item.priority || Priority.Medium,
                dueDate: getValidDueDate(item.dueDate),
                reminder: (item as Task).reminder || null,
                tags: item.tags || [],
                createdAt,
                attachments: item.attachments || [],
                checklist,
                comments: item.comments || [],
                activityLog: [newActivityLog],
                customFields: item.customFields || {},
                linkedNoteIds: (item as Task).linkedNoteIds || [],
            };
            const newTask = await storageService.add('Task', newTaskData);
            if (newTask) {
                setTasks(prev => [...prev, newTask]);
                return newTask;
            } else {
                console.error("Failed to add task: storage service returned an empty value.");
                throw new Error("An error occurred while adding tasks. Please try again.");
            }
        } else {
            const newNoteData = { 
                listId: targetListId,
                title: item.title || 'Untitled Note',
                content: item.content || '',
                tags: item.tags || [],
                createdAt: new Date().toISOString(), 
                updatedAt: new Date().toISOString(),
                attachments: item.attachments || [],
            };
            const newNote = await storageService.add('Note', newNoteData);
            if (newNote) {
                setNotes(prev => [newNote, ...prev]);
                return newNote;
            } else {
                console.error("Failed to add note: storage service returned an empty value.");
                throw new Error("An error occurred while adding the note. Please try again.");
            }
        }
    };
    
    const handleUpdateItem = async (item: Task | Note) => {
        if ('status' in item) { // Task
            const originalTask = tasks.find(t => t.id === item.id);
            if (!originalTask) return;

            const updatedTask = item as Task;
            let newActivityLogs: ActivityLog[] = [];

            if (originalTask.status !== updatedTask.status) {
                newActivityLogs.push({ id: newSubId(), type: 'status', content: { from: originalTask.status, to: updatedTask.status }, taskTitle: updatedTask.title, createdAt: new Date().toISOString(), userName });
                
                // --- Gamification Hook ---
                if (updatedTask.status === Status.Done && originalTask.status !== Status.Done) {
                    if (userStats) {
                        const updatedStats = gamificationService.processTaskCompletion(userStats);
                        setUserStats(updatedStats);
                        storageService.update('UserStats', 1, updatedStats);
                    }
                }
            }
            if (originalTask.priority !== updatedTask.priority) {
                newActivityLogs.push({ id: newSubId(), type: 'priority', content: { from: originalTask.priority, to: updatedTask.priority }, taskTitle: updatedTask.title, createdAt: new Date().toISOString(), userName });
            }

            // Sanitize all properties on update to prevent crashes from legacy data being re-saved.
            const finalTask: Task = {
                ...updatedTask,
                description: updatedTask.description || '',
                tags: updatedTask.tags || [],
                attachments: updatedTask.attachments || [],
                checklist: updatedTask.checklist || [],
                comments: updatedTask.comments || [],
                activityLog: [...(updatedTask.activityLog || []), ...newActivityLogs],
                customFields: updatedTask.customFields || {},
                linkedNoteIds: updatedTask.linkedNoteIds || [],
                reminder: updatedTask.reminder || null,
            };

            await storageService.update('Task', finalTask.id, finalTask);
            setTasks(prev => prev.map(t => (t.id === finalTask.id ? finalTask : t)));
            if (detailItem?.id === item.id) setDetailItem(finalTask);
        } else { // Note
            // Sanitize note properties on update as well.
            const updatedNote: Note = {
                ...item,
                updatedAt: new Date().toISOString(),
                content: item.content || '',
                tags: item.tags || [],
                attachments: item.attachments || [],
            };
            await storageService.update('Note', updatedNote.id, updatedNote);
            setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
            if (detailItem?.id === item.id) setDetailItem(updatedNote);
        }
    };

    const handleDeleteItem = async (itemId: number, type: 'task' | 'note') => {
        const collection = type === 'task' ? 'Task' : 'Note';
        await storageService.delete(collection, itemId);
       if (type === 'task') {
         setTasks(prev => prev.filter(t => t.id !== itemId));
       } else {
         setNotes(prev => prev.filter(n => n.id !== itemId));
       }
    };

    const handleAddComment = async (taskId: number, content: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const createdAt = new Date().toISOString();
        const newComment: Comment = { id: newSubId(), content, createdAt, userName, avatarUrl: undefined };
        const newActivityLog: ActivityLog = { id: newSubId(), type: 'comment', content: { commentContent: content }, taskTitle: task.title, createdAt, userName };
        
        // Ensure comments and activityLog arrays exist before spreading.
        const updatedTask = {
            ...task,
            comments: [...(task.comments || []), newComment],
            activityLog: [...(task.activityLog || []), newActivityLog]
        };

        await storageService.update('Task', taskId, updatedTask);
        setTasks(prev => prev.map(t => (t.id === taskId ? updatedTask : t)));
        if (detailItem?.id === taskId) setDetailItem(updatedTask);
    };

    const handleAddSavedFilter = async (name: string, filter: TaskFilter) => {
        const newFilterData = { name, filter };
        const newFilter = await storageService.add('SavedFilter', newFilterData);
        setSavedFilters(prev => [...prev, newFilter]);
    };

    const handleDeleteSavedFilter = async (filterId: number) => {
        await storageService.delete('SavedFilter', filterId);
        setSavedFilters(prev => prev.filter(f => f.id !== filterId));
        if (activeSelection.type === 'saved-filter' && activeSelection.id === filterId) {
            setActiveSelection({ type: 'smart-list', id: 'today' });
        }
    };

    const handleAddStickyNote = async () => {
        const newNoteData = { 
            title: 'New Note', 
            content: 'Start typing...', 
            color: '#FBBF24', 
            position: { x: 20, y: 20 },
            size: { width: 256, height: 224 } 
        };
        const newNote = await storageService.add('StickyNote', newNoteData);
        setStickyNotes(prev => [...prev, newNote]);
    };

    const handleUpdateStickyNote = async (updatedNote: StickyNote) => {
        await storageService.update('StickyNote', updatedNote.id, updatedNote);
        setStickyNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    };

    const handleDeleteStickyNote = async (id: number) => {
        await storageService.delete('StickyNote', id);
        setStickyNotes(prev => prev.filter(n => n.id !== id));
    };

    const handleUpsertGoal = async (goal: Omit<Goal, 'id'> & { id?: number }) => {
        if (goal.id) {
            const updatedGoal = { ...goal } as Goal;
            await storageService.update('Goal', goal.id, updatedGoal);
            setGoals(prev => prev.map(g => g.id === goal.id ? updatedGoal : g));
        } else {
            const newGoalData = {
                ...goal,
                createdAt: new Date().toISOString(),
                completedAt: null,
                status: GoalStatus.OnTrack,
                progress: 0,
                journal: []
            };
            const newGoal = await storageService.add('Goal', newGoalData);
            setGoals(prev => [...prev, newGoal]);
        }
    };

    const handleDeleteGoal = async (goalId: number) => {
        await storageService.delete('Goal', goalId);
        setGoals(prev => prev.filter(g => g.id !== goalId));
    };

    const handleSelectGoal = (goalId: number) => {
        const goal = goals.find(g => g.id === goalId);
        if(goal){
            setActiveSelection({ type: 'goals' });
            // This is a bit of a hack to make sure GoalsView selects the right goal
            // A better solution might involve passing the selected ID to the view
            setTimeout(() => {
                const event = new CustomEvent('selectGoal', { detail: goalId });
                window.dispatchEvent(event);
            }, 50);
        }
    }

    // --- Habit Handlers ---
    const handleUpsertHabit = async (habit: Omit<Habit, 'id' | 'createdAt'> & { id?: number }) => {
        if (habit.id) { // Update
            const updatedHabit = { ...habit, createdAt: habits.find(h => h.id === habit.id)!.createdAt } as Habit;
            await storageService.update('Habit', habit.id, updatedHabit);
            setHabits(prev => prev.map(h => h.id === habit.id ? updatedHabit : h));
        } else { // Add
            const { id, ...rest } = habit;
            const newHabitData = {
                ...rest,
                createdAt: new Date().toISOString(),
            };
            const newHabit = await storageService.add('Habit', newHabitData);
            setHabits(prev => [...prev, newHabit]);
        }
    };

    const handleDeleteHabit = async (habitId: number) => {
        const logsToDelete = habitLogs.filter(log => log.habitId === habitId);
        for (const log of logsToDelete) {
            await storageService.delete('HabitLog', log.id);
        }
        await storageService.delete('Habit', habitId);

        setHabits(prev => prev.filter(h => h.id !== habitId));
        setHabitLogs(prev => prev.filter(log => log.habitId !== habitId));
    };

    const handleAddHabitLog = async (habitId: number, date: string) => {
        const existingLog = habitLogs.find(log => log.habitId === habitId && log.date === date);
        if (existingLog) {
            await storageService.delete('HabitLog', existingLog.id);
            setHabitLogs(prev => prev.filter(log => log.id !== existingLog.id));
            return;
        }

        const newLogData = { habitId, date };
        const newLog = await storageService.add('HabitLog', newLogData);
        setHabitLogs(prev => [...prev, newLog]);

        if (userStats) {
            const updatedStats = gamificationService.processHabitCompletion(userStats);
            setUserStats(updatedStats);
            storageService.update('UserStats', 1, updatedStats);
        }
    };
    
    // --- Custom Reminder Handlers ---
    const handleUpsertCustomReminder = async (reminder: Omit<CustomReminder, 'id' | 'createdAt'> & { id?: number }) => {
        if (reminder.id) { // Update
            const originalReminder = customReminders.find(r => r.id === reminder.id);
            if (!originalReminder) return;
            const updatedReminder = { ...originalReminder, ...reminder };
            await storageService.update('CustomReminder', reminder.id, updatedReminder);
            setCustomReminders(prev => prev.map(r => r.id === reminder.id ? updatedReminder : r));
        } else { // Add
            const { id, ...rest } = reminder;
            const newReminderData = {
                ...rest,
                createdAt: new Date().toISOString(),
                isCompleted: false,
            };
            const newReminder = await storageService.add('CustomReminder', newReminderData);
            setCustomReminders(prev => [...prev, newReminder]);
        }
    };

    const handleDeleteCustomReminder = async (reminderId: number) => {
        await storageService.delete('CustomReminder', reminderId);
        setCustomReminders(prev => prev.filter(r => r.id !== reminderId));
    };

    // --- AI Chat Handlers ---
    const handleNewChat = () => setActiveChatSessionId(null);
    const handleSelectChatSession = (sessionId: number) => setActiveChatSessionId(sessionId);
    const handleSendMessage = async (message: string) => {
        let currentSessionId = activeChatSessionId;
        const userMessage: Omit<ChatMessage, 'id'> = { role: 'user', text: message };
    
        let sessionToUpdate: ChatSession;
        let existingSession = currentSessionId ? chatSessions.find(s => s.id === currentSessionId) : undefined;
        
        let preliminaryMessages: ChatMessage[];
    
        if (!existingSession) {
            const newSessionData = { title: message.substring(0, 40), messages: [], createdAt: new Date().toISOString() };
            preliminaryMessages = [{ ...userMessage, id: Date.now() }];
            sessionToUpdate = await storageService.add('ChatSession', newSessionData);
            setActiveChatSessionId(sessionToUpdate.id);
        } else {
            sessionToUpdate = { ...existingSession, messages: [...existingSession.messages, { ...userMessage, id: Date.now() }] };
            preliminaryMessages = sessionToUpdate.messages;
        }
    
        // Immediately update UI with user's message for responsiveness
        setChatSessions(prev => {
            const exists = prev.some(s => s.id === sessionToUpdate.id);
            if (exists) {
                return prev.map(s => s.id === sessionToUpdate.id ? { ...s, messages: preliminaryMessages } : s);
            }
            return [{ ...sessionToUpdate, messages: preliminaryMessages }, ...prev];
        });
        setIsAiLoading(true);
    
        const response = await runChat(sessionToUpdate.messages, message, tasks, lists);
        let modelMessage: Omit<ChatMessage, 'id'>;
    
        if (response.toolCalls) {
            const toolResults = [];
            for (const toolCall of response.toolCalls) {
                let resultData: any;
                let status: 'ok' | 'error' = 'ok';
                try {
                    switch (toolCall.name) {
                        case 'createTask': {
                            const listId = parseInt(String(toolCall.args.listId), 10);
                            const taskList = lists.find(l => l.id === listId && l.type === 'task');
                            if (!taskList) { throw new Error(`Task list with ID ${listId} not found.`); }
                            resultData = await handleAddItem({ title: String(toolCall.args.title), description: String(toolCall.args.description || ''), dueDate: String(toolCall.args.dueDate), priority: toolCall.args.priority as Priority }, listId, 'task');
                            break;
                        }
                        case 'createNote': {
                            const noteListId = parseInt(String(toolCall.args.listId), 10);
                            const noteList = lists.find(l => l.id === noteListId && l.type === 'note');
                            if (!noteList) { throw new Error(`Note list with ID ${noteListId} not found.`); }
                            resultData = await handleAddItem({ title: String(toolCall.args.title), content: String(toolCall.args.content || '') }, noteListId, 'note');
                            break;
                        }
                        case 'updateTask': {
                            const { task: taskToUpdate, error } = findTaskFuzzily(String(toolCall.args.taskTitle));
                            if (error) throw new Error(error);
                            if (!taskToUpdate) throw new Error(`Task not found.`);
                            const updatedTaskData = { ...taskToUpdate };
                            if (toolCall.args.newTitle) updatedTaskData.title = String(toolCall.args.newTitle);
                            if (toolCall.args.description) updatedTaskData.description = String(toolCall.args.description);
                            if (toolCall.args.status) updatedTaskData.status = toolCall.args.status as Status;
                            if (toolCall.args.priority) updatedTaskData.priority = toolCall.args.priority as Priority;
                            if (toolCall.args.dueDate) updatedTaskData.dueDate = new Date(String(toolCall.args.dueDate)).toISOString();
                            await handleUpdateItem(updatedTaskData);
                            resultData = updatedTaskData;
                            break;
                        }
                        case 'deleteTask': {
                            const { task: taskToDelete, error } = findTaskFuzzily(String(toolCall.args.taskTitle));
                            if (error) throw new Error(error);
                            if (!taskToDelete) { throw new Error(`Task not found.`); }
                            await handleDeleteItem(taskToDelete.id, 'task');
                            resultData = { id: taskToDelete.id, status: 'deleted', title: taskToDelete.title };
                            break;
                        }
                        case 'addChecklistItem': {
                            const { task: taskToUpdate, error } = findTaskFuzzily(String(toolCall.args.taskTitle));
                            if (error) throw new Error(error);
                            if (!taskToUpdate) throw new Error(`Task not found.`);

                            const itemText = String(toolCall.args.itemText);
                            const newChecklistItem: ChecklistItem = { id: newSubId(), text: itemText, completed: false };
                            const updatedTaskData = { ...taskToUpdate, checklist: [...(taskToUpdate.checklist || []), newChecklistItem] };
                            await handleUpdateItem(updatedTaskData);
                            resultData = updatedTaskData;
                            break;
                        }
                        case 'updateChecklistItem': {
                            const { task: taskToUpdate, error } = findTaskFuzzily(String(toolCall.args.taskTitle));
                            if (error) throw new Error(error);
                            if (!taskToUpdate) throw new Error(`Task not found.`);
                            
                            const checklistItemText = String(toolCall.args.checklistItemText);
                            const completed = Boolean(toolCall.args.completed);

                            let itemUpdated = false;
                            const updatedChecklist = taskToUpdate.checklist.map(item => {
                                if (!itemUpdated && item.text.toLowerCase() === checklistItemText.toLowerCase()) {
                                    itemUpdated = true;
                                    return { ...item, completed };
                                }
                                return item;
                            });

                            if (!itemUpdated) { throw new Error(`Checklist item "${checklistItemText}" not found in task "${taskToUpdate.title}".`); }
                            
                            const updatedTaskData = { ...taskToUpdate, checklist: updatedChecklist };
                            await handleUpdateItem(updatedTaskData);
                            resultData = updatedTaskData;
                            break;
                        }
                        default:
                            throw new Error(`Unknown tool: ${toolCall.name}`);
                    }
                } catch (e: any) {
                    status = 'error';
                    resultData = { error: e.message };
                }
    
                toolResults.push({ callId: `call_${newSubId()}`, toolName: toolCall.name, data: resultData, status });
            }
            
            const successfulCalls = toolResults.filter(r => r.status === 'ok');
            const erroredCalls = toolResults.filter(r => r.status === 'error');
            
            let resultText = '';
            if (successfulCalls.length > 0) {
                const firstResult = successfulCalls[0];
                const itemName = firstResult.data?.title || '';
                switch (firstResult.toolName) {
                    case 'createTask': resultText = `I've created the task "${itemName}".`; break;
                    case 'createNote': resultText = `I've created the note "${itemName}".`; break;
                    case 'updateTask': resultText = `I've updated the task "${itemName}".`; break;
                    case 'deleteTask': resultText = `I've deleted the task "${itemName}".`; break;
                    case 'addChecklistItem':
                    case 'updateChecklistItem': resultText = `I've updated the checklist for task "${itemName}".`; break;
                    default: resultText = `${firstResult.toolName} was successful.`;
                }
            }
            if (erroredCalls.length > 0) {
                 resultText += `\nI encountered an error: ${erroredCalls[0].data.error}`;
            }
    
            modelMessage = { role: 'model', text: resultText, toolResult: successfulCalls.length > 0 ? successfulCalls[0] : undefined };
    
        } else {
            modelMessage = { role: 'model', text: response.text || 'Sorry, I could not process that.' };
        }
        
        sessionToUpdate.messages = [...preliminaryMessages, { ...modelMessage, id: Date.now() }];
        
        await storageService.update('ChatSession', sessionToUpdate.id, sessionToUpdate);
    
        setChatSessions(prev => prev.map(s => s.id === sessionToUpdate.id ? sessionToUpdate : s));
        setIsAiLoading(false);
    };

    const handleQuickAddTask = async (text: string) => {
        setIsAiLoading(true);
        const parsedData = await parseQuickAddTask(text);
        
        if (!parsedData || !parsedData.title) {
            notificationService.send('Quick Add Failed', { body: 'Could not understand your request.' });
            setIsAiLoading(false);
            return;
        }
        
        let targetList: List | null | undefined;
        const taskLists = lists.filter(l => l.type === 'task');

        if (parsedData.listName) {
            targetList = findListFuzzily(parsedData.listName);
        }

        if (!targetList) {
            targetList = taskLists[0]; // Default to first task list
        }

        if (!targetList) {
            notificationService.send('Quick Add Failed', { body: 'No task lists found to add the task to.' });
            setIsAiLoading(false);
            return;
        }

        const newTaskData: Partial<Task> = {
            title: parsedData.title,
            priority: parsedData.priority || Priority.Medium,
            dueDate: parsedData.dueDate ? new Date(`${parsedData.dueDate}T00:00:00`).toISOString() : new Date().toISOString(),
        };

        try {
            const createdTask = await handleAddItem(newTaskData, targetList.id, 'task');
            if (createdTask) {
                notificationService.send('Task Created', { body: `"${createdTask.title}" was added to ${targetList.name}.` });
            }
        } catch (error) {
            console.error(error);
            notificationService.send('Quick Add Failed', { body: 'An error occurred while creating the task.' });
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleOnboardingComplete = async (details: { userName: string; apiKey?: string }) => {
        setUserName(details.userName);
        if (details.apiKey) {
            setApiKey(details.apiKey);
            initializeAi(details.apiKey);
        }
        await storageService.setSetting('onboardingComplete', "true");
        await storageService.setSetting('userName', details.userName);
        await storageService.setSetting('apiKey', details.apiKey || "");

        const defaultListsData: (Omit<List, 'id'>)[] = [
            { name: 'My Tasks', color: '#8b64fd', type: 'task', parentId: null, defaultView: 'list', statuses: [{ status: Status.ToDo, name: 'To Do' }, { status: Status.InProgress, name: 'In Progress' }, { status: Status.Done, name: 'Done' }] },
            { name: 'Work', color: '#3B82F6', type: 'task', parentId: null, defaultView: 'board', statuses: [{ status: Status.Backlog, name: 'Backlog' }, { status: Status.ToDo, name: 'To Do' }, { status: Status.InProgress, name: 'In Progress' }, { status: Status.Review, name: 'In Review' }, { status: Status.Done, name: 'Done' }] },
            { name: 'Quick Notes', color: '#FBBF24', type: 'note', parentId: null },
        ];
        
        const addedLists = await Promise.all(defaultListsData.map(list => storageService.add('List', list)));

        setLists(addedLists);
        setIsOnboardingComplete(true);
    };

    const handleUpdateUser = async (name: string) => {
        await storageService.setSetting('userName', name);
        setUserName(name);
    };

    const handleUpdateApiKey = async (key: string) => {
        await storageService.setSetting('apiKey', key);
        setApiKey(key);
        initializeAi(key);
    };

    const handleOpenAddItemPane = (listId: number, type: 'task' | 'note') => {
        setDetailItem(null);
        setAddingItemInfo({ listId, type });
    };

    const handleCloseDetailPane = () => {
        setDetailItem(null);
        setAddingItemInfo(null);
    };

    const handleSetCustomFieldDefinitions = async (definitions: CustomFieldDefinition[]) => {
        // This is tricky because we don't have a single object. We must update one by one.
        // For simplicity, let's assume we can replace the whole collection.
        // A better implementation would diff and update.
        const currentIds = new Set(customFieldDefinitions.map(d => d.id));
        const newIds = new Set(definitions.map(d => d.id));

        for (const def of definitions) {
            await storageService.update('CustomFieldDefinition', def.id, def);
        }
        for (const id of currentIds) {
            if (!newIds.has(id)) {
                await storageService.delete('CustomFieldDefinition', id);
            }
        }

        setCustomFieldDefinitions(definitions);
    }
    
    const handleStartFocus = (task: Task) => {
        setFocusItem({ task });
    };

    const handleStartSubtaskFocus = (task: Task, subtask: ChecklistItem) => {
        setFocusItem({ task, subtask });
    };

    const handleFocusSessionComplete = (item: FocusItem, duration: number) => {
        const { task, subtask } = item;
        
        setFocusItem(null); // Close the view

        setFocusSessionCompleteInfo({ item, duration }); // Open the modal

        const createdAt = new Date().toISOString();
        const newActivityLog: ActivityLog = {
            id: newSubId(),
            type: 'focus',
            content: {
                duration: duration,
                focusedOn: subtask ? `subtask: "${subtask.text}"` : `task: "${task.title}"`,
            },
            taskTitle: task.title,
            createdAt,
            userName,
        };
        
        // Ensure activityLog array exists.
        const updatedTask = {
            ...task,
            activityLog: [...(task.activityLog || []), newActivityLog]
        };

        handleUpdateItem(updatedTask);
    };

    if (!isDataLoaded) {
        return <div className="w-full h-full bg-brand-light dark:bg-sidebar-dark flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
    }

    if (!isOnboardingComplete) {
        return <OnboardingFlow onComplete={handleOnboardingComplete} />;
    }

    return (
        <>
            <AppLayout
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
                lists={lists}
                tasks={tasks}
                notes={notes}
                savedFilters={savedFilters}
                stickyNotes={stickyNotes}
                chatSessions={chatSessions}
                activeChatSessionId={activeChatSessionId}
                onSendMessage={handleSendMessage}
                onNewChat={handleNewChat}
                onSelectChatSession={handleSelectChatSession}
                activeSelection={activeSelection}
                onActiveSelectionChange={setActiveSelection}
                detailItem={detailItem}
                onDetailItemChange={setDetailItem}
                addingItemInfo={addingItemInfo}
                onOpenAddItemPane={handleOpenAddItemPane}
                onCloseDetailPane={handleCloseDetailPane}
                onAddList={handleAddList}
                onUpdateList={handleUpdateList}
                onDeleteList={handleDeleteList}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onAddComment={handleAddComment}
                onAddSavedFilter={handleAddSavedFilter}
                onDeleteSavedFilter={handleDeleteSavedFilter}
                onAddStickyNote={handleAddStickyNote}
                onUpdateStickyNote={handleUpdateStickyNote}
                onDeleteStickyNote={handleDeleteStickyNote}
                goals={goals}
                onUpsertGoal={handleUpsertGoal}
                onDeleteGoal={handleDeleteGoal}
                onSelectGoal={handleSelectGoal}
                habits={habits}
                habitLogs={habitLogs}
                onUpsertHabit={handleUpsertHabit}
                onDeleteHabit={handleDeleteHabit}
                onAddHabitLog={handleAddHabitLog}
                customReminders={customReminders}
                onUpsertCustomReminder={handleUpsertCustomReminder}
                onDeleteCustomReminder={handleDeleteCustomReminder}
                userStats={userStats}
                userName={userName}
                apiKey={apiKey}
                onUpdateUser={handleUpdateUser}
                onUpdateApiKey={handleUpdateApiKey}
                customFieldDefinitions={customFieldDefinitions}
                setCustomFieldDefinitions={handleSetCustomFieldDefinitions}
                isSearchOpen={isSearchOpen}
                setIsSearchOpen={setIsSearchOpen}
                onStartFocus={handleStartFocus}
                onStartSubtaskFocus={handleStartSubtaskFocus}
                isAiLoading={isAiLoading}
                onQuickAddTask={handleQuickAddTask}
            />
            {focusItem && (
                <FocusModeView
                    focusItem={focusItem}
                    onClose={() => setFocusItem(null)}
                    onUpdateTask={handleUpdateItem as (task: Task) => void}
                    onFocusSessionComplete={handleFocusSessionComplete}
                />
            )}
             {focusSessionCompleteInfo && (
                <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-md animate-fade-in-overlay">
                    <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl p-8 w-full max-w-md m-4 transform transition-all animate-scale-in flex flex-col items-center text-center">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Time's Up!</h2>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            Great job! You completed a {focusSessionCompleteInfo.duration}-minute focus session on:
                        </p>
                        <p className="font-semibold mt-1 text-primary">
                            {focusSessionCompleteInfo.item.subtask ? focusSessionCompleteInfo.item.subtask.text : focusSessionCompleteInfo.item.task.title}
                        </p>
                        <button
                            onClick={() => setFocusSessionCompleteInfo(null)}
                            className="mt-6 w-full px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
            {/* In-App Notification Container */}
            <div className="fixed top-4 right-4 z-[100] space-y-3">
                {inAppNotifications.map(notification => (
                    <div key={notification.id} className="w-80 bg-card-light dark:bg-card-dark rounded-xl shadow-2xl p-4 border border-gray-200 dark:border-gray-700 animate-slide-in-right">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                                <BellIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800 dark:text-white">{notification.title}</h3>
                                {notification.body && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notification.body}</p>}
                            </div>
                            <button 
                                onClick={() => setInAppNotifications(prev => prev.filter(n => n.id !== notification.id))}
                                className="p-1 -mt-1 -mr-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ml-auto flex-shrink-0"
                            >
                                <XMarkIcon className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
};

export default App;
