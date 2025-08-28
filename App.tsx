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
  StickyNoteBoard,
  StickyNoteLink,
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
import { isToday as isTodayFns, format } from 'date-fns';
import { runChat, initializeAi, parseQuickAddTask } from './services/geminiService';
import { notificationService } from './services/notificationService';
import { gamificationService } from './services/gamificationService';
import FocusModeView from './components/FocusModeView';
import { CheckCircleIcon, BellIcon, XMarkIcon } from './components/icons';
import { listService } from './services/listService';
import { taskService } from './services/taskService';
import { noteService } from './services/noteService';
import { savedFilterService } from './services/savedFilterService';
import { stickyNoteService } from './services/stickyNoteService';
import { chatService } from './services/chatService';
import { goalService } from './services/goalService';
import { customFieldService } from './services/customFieldService';
import { userStatsService } from './services/userStatsService';
import { habitService } from './services/habitService';
import { reminderService } from './services/reminderService';
import { settingsService } from './services/settingsService';


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
    const [stickyNoteBoards, setStickyNoteBoards] = React.useState<StickyNoteBoard[]>([]);
    const [stickyNoteLinks, setStickyNoteLinks] = React.useState<StickyNoteLink[]>([]);
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
            // Global Search
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                setIsSearchOpen(prev => !prev);
            }

            // New Task
            if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
                event.preventDefault();
                let targetListId: number | undefined;

                if (activeSelection.type === 'list') {
                    const currentList = lists.find(l => l.id === activeSelection.id);
                    if (currentList?.type === 'task') {
                        targetListId = currentList.id;
                    }
                }

                if (!targetListId) {
                    const firstTaskList = lists.find(l => l.type === 'task');
                    if (firstTaskList) {
                        targetListId = firstTaskList.id;
                    }
                }

                if (targetListId) {
                    setDetailItem(null);
                    setAddingItemInfo({ listId: targetListId, type: 'task' });
                } else {
                    console.warn("Ctrl+N pressed but no task list found to add to.");
                }
            }

            // View Navigation
            if ((event.metaKey || event.ctrlKey)) {
                let newSelection: ActiveSelection | null = null;
                switch(event.key) {
                    case '1': newSelection = { type: 'dashboard' }; break;
                    case '2': newSelection = { type: 'smart-list', id: 'today' }; break;
                    case '3': newSelection = { type: 'ai-chat' }; break;
                    case '4': newSelection = { type: 'goals' }; break;
                    case '5': newSelection = { type: 'habits' }; break;
                    case '6': newSelection = { type: 'settings' }; break;
                    default: break;
                }

                if (newSelection) {
                    event.preventDefault();
                    setActiveSelection(newSelection);
                    setDetailItem(null);
                    setAddingItemInfo(null);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeSelection, lists]);


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
    const loadAllData = React.useCallback(async () => {
        const [
            rawLists, rawTasks, rawNotes, loadedSavedFilters, rawStickyNotes,
            rawStickyNoteBoards, rawChatSessions, rawGoals, loadedCustomFields, loadedUserStats,
            rawHabits, loadedHabitLogs, loadedCustomReminders, rawStickyNoteLinks
        ] = await Promise.all([
            listService.getAll(),
            taskService.getAll(),
            noteService.getAll(),
            savedFilterService.getAll(),
            stickyNoteService.getAllNotes(),
            stickyNoteService.getAllBoards(),
            chatService.getAll(),
            goalService.getAll(),
            customFieldService.getAll(),
            userStatsService.getAll(),
            habitService.getAllHabits(),
            habitService.getAllLogs(),
            reminderService.getAll(),
            stickyNoteService.getAllLinks()
        ]);
        
        let finalLists = rawLists;

        if (rawLists.length === 0) {
            console.log("No lists found, creating default lists.");
            const defaultTaskStatuses: ListStatusMapping[] = [
                { status: Status.ToDo, name: 'To Do' },
                { status: Status.InProgress, name: 'In Progress' },
                { status: Status.Done, name: 'Done' }
            ];

            const defaultListsToAdd: Omit<List, 'id'>[] = [
                {
                    name: 'My Tasks',
                    color: '#3B82F6',
                    type: 'task',
                    parentId: null,
                    defaultView: 'board',
                    statuses: defaultTaskStatuses
                },
                {
                    name: 'Personal',
                    color: '#84CC16',
                    type: 'task',
                    parentId: null,
                    defaultView: 'list',
                    statuses: defaultTaskStatuses
                },
                {
                    name: 'Notes',
                    color: '#F97316',
                    type: 'note',
                    parentId: null
                }
            ];

            const addedLists = await Promise.all(
                defaultListsToAdd.map(list => listService.add(list))
            );
            finalLists = addedLists;
        }
        
        setLists(finalLists.map(l => ({ ...l, parentId: l.parentId ?? null })));
        setTasks(rawTasks.map(t => ({
            ...t,
            tags: t.tags || [],
            attachments: t.attachments || [],
            checklist: t.checklist || [],
            comments: t.comments || [],
            activityLog: t.activityLog || [],
            customFields: t.customFields || {},
            linkedNoteIds: t.linkedNoteIds || [],
            dependencyIds: t.dependencyIds || [],
            blockingIds: t.blockingIds || [],
        })));
        setNotes(rawNotes.map(n => ({
            ...n,
            tags: n.tags || [],
            attachments: n.attachments || [],
        })));
        setSavedFilters(loadedSavedFilters);
        setStickyNotes(rawStickyNotes.map(sn => ({ ...sn, position: sn.position || { x: 50, y: 50 }, size: sn.size || { width: 250, height: 200 } })));
        setStickyNoteBoards(rawStickyNoteBoards);
        setStickyNoteLinks(rawStickyNoteLinks);
        setChatSessions(rawChatSessions.map(cs => ({ ...cs, messages: cs.messages || [] })));
        setGoals(rawGoals.map(g => ({ ...g, journal: g.journal || [] })));
        setCustomFieldDefinitions(loadedCustomFields);
        setUserStats(loadedUserStats[0] || { id: 1, points: 0, currentStreak: 0, lastCompletionDate: null });
        setHabits(rawHabits);
        setHabitLogs(loadedHabitLogs);
        setCustomReminders(loadedCustomReminders);

        const loadedApiKey = await settingsService.getSetting('apiKey');
        const loadedUserName = await settingsService.getSetting('userName');
        const onboarding = await settingsService.getSetting('onboardingComplete');
        setApiKey(loadedApiKey);
        setUserName(loadedUserName || 'User');
        initializeAi(loadedApiKey);
        setIsOnboardingComplete(onboarding == true);
        setIsDataLoaded(true);

    }, []);

    React.useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // --- REMINDER CHECKS ---
    React.useEffect(() => {
        notificationService.requestPermission();
        const interval = setInterval(() => {
            notificationService.runAllReminderChecks(tasks, habits, customReminders, habitLogs, goals);
        }, 60 * 1000); // Check every minute

        return () => clearInterval(interval);
    }, [tasks, habits, customReminders, habitLogs, goals]);

    // --- HANDLER FUNCTIONS ---
    
    // Onboarding
    const handleOnboardingComplete = async (details: { userName: string; apiKey?: string }) => {
        await settingsService.setSetting('onboardingComplete', 'true');
        await handleUpdateUser(details.userName);
        if (details.apiKey) {
           await handleUpdateApiKey(details.apiKey);
        }
        setIsOnboardingComplete(true);
    };

    // Lists
    const handleAddList = async (listData: Omit<List, 'id' | 'statuses'>) => {
        const listPayload: Omit<List, 'id'> = {
            ...listData,
            statuses: listData.type === 'task'
                ? [
                    { status: Status.ToDo, name: 'To Do' },
                    { status: Status.InProgress, name: 'In Progress' },
                    { status: Status.Done, name: 'Done' }
                  ]
                : undefined
        };
        const addedList = await listService.add(listPayload);
        setLists(prev => [...prev, addedList]);
        return addedList;
    };
    const handleUpdateList = (updatedList: List) => {
        listService.update(updatedList).then(() => {
            setLists(prev => prev.map(l => l.id === updatedList.id ? updatedList : l));
        });
    };
    const handleDeleteList = (listId: number) => {
        listService.delete(listId).then(() => {
            setLists(prev => prev.filter(l => l.id !== listId));
            // Also delete associated tasks/notes
            setTasks(prev => prev.filter(t => t.listId !== listId));
            setNotes(prev => prev.filter(n => n.listId !== listId));
            setActiveSelection({ type: 'dashboard' });
        });
    };

    // Tasks & Notes
    const handleAddItem = async (itemData: Partial<Task & Note>, listId: number, type: 'task' | 'note'): Promise<Task | Note> => {
        const now = new Date().toISOString();
        const baseItem = {
            ...itemData,
            listId,
            createdAt: now,
            tags: itemData.tags || [],
            attachments: itemData.attachments || [],
        };

        if (type === 'task') {
            const newItem: Omit<Task, 'id'> = {
                title: itemData.title || 'New Task',
                description: itemData.description || '',
                status: itemData.status || Status.ToDo,
                priority: itemData.priority || Priority.Medium,
                dueDate: itemData.dueDate || new Date().toISOString(),
                checklist: itemData.checklist || [],
                comments: [],
                activityLog: [{ id: newSubId(), type: 'created', content: {}, taskTitle: itemData.title || '', createdAt: now, userName }],
                customFields: {},
                ...baseItem,
            };
            const addedTask = await taskService.add(newItem);
            setTasks(prev => [...prev, addedTask]);
            return addedTask;
        } else {
            const newItem: Omit<Note, 'id'> = {
                title: itemData.title || 'New Note',
                content: itemData.content || '',
                updatedAt: now,
                ...baseItem,
            };
            const addedNote = await noteService.add(newItem);
            setNotes(prev => [...prev, addedNote]);
            return addedNote;
        }
    };
    
    const handleUpdateItem = (item: Task | Note) => {
        const isTask = 'status' in item;
    
        // Check for incomplete dependencies before marking a task as done
        if (isTask) {
            const taskToUpdate = item as Task;
            const originalTask = tasks.find(t => t.id === taskToUpdate.id);
            
            // Check if status is being changed TO 'Done'
            if (originalTask && taskToUpdate.status === Status.Done && originalTask.status !== Status.Done) {
                const dependencyIds = originalTask.dependencyIds || [];
                if (dependencyIds.length > 0) {
                    const incompleteDependencies = dependencyIds
                        .map(id => tasks.find(t => t.id === id))
                        .filter(dep => dep && dep.status !== Status.Done);
    
                    if (incompleteDependencies.length > 0) {
                        const incompleteTaskTitles = incompleteDependencies.map(dep => `"${dep?.title}"`).join(', ');
                        alert(`Cannot complete this task. The following prerequisite tasks must be completed first: ${incompleteTaskTitles}.`);
                        return; // Abort the update
                    }
                }
            }
        }
    
        const updatedItem = { ...item };
        if (!isTask) {
            (updatedItem as Note).updatedAt = new Date().toISOString();
        }

        // If the item being updated is the one in the detail pane, update the detail pane as well.
        if (detailItem && detailItem.id === item.id) {
            setDetailItem(updatedItem);
        }
    
        if (isTask) {
            taskService.update(updatedItem as Task).then(() => {
                setTasks(prev => prev.map(t => t.id === item.id ? (updatedItem as Task) : t));
            });
        } else {
            noteService.update(updatedItem as Note).then(() => {
                setNotes(prev => prev.map(n => n.id === item.id ? (updatedItem as Note) : n));
            });
        }
    };
    
    const handleDeleteItem = (itemId: number, type: 'task' | 'note') => {
        const service = type === 'task' ? taskService : noteService;
        service.delete(itemId).then(() => {
            if (type === 'task') {
                setTasks(prev => prev.filter(t => t.id !== itemId));
            } else {
                setNotes(prev => prev.filter(n => n.id !== itemId));
            }
        });
    };

    const handleAddComment = (taskId: number, content: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const newComment: Comment = { id: newSubId(), content, createdAt: new Date().toISOString(), userName, avatarUrl: '' };
            const newActivity: ActivityLog = { id: newSubId(), type: 'comment', content: { commentContent: content }, taskTitle: task.title, createdAt: new Date().toISOString(), userName };

            const updatedTask = { 
                ...task, 
                comments: [...task.comments, newComment],
                activityLog: [...task.activityLog, newActivity]
            };
            handleUpdateItem(updatedTask);
        }
    };

    // Habits
    const handleUpsertHabit = (habit: Omit<Habit, 'id' | 'createdAt'> & { id?: number }) => {
        if (habit.id) { // Update
            habitService.updateHabit(habit as Habit).then(() => {
                setHabits(prev => prev.map(h => h.id === habit.id ? (habit as Habit) : h));
            });
        } else { // Add
            const newHabit = { ...habit, createdAt: new Date().toISOString() };
            habitService.addHabit(newHabit as Omit<Habit, 'id'>).then(addedHabit => {
                setHabits(prev => [...prev, addedHabit]);
            });
        }
    };

    const handleDeleteHabit = (habitId: number) => {
        habitService.deleteHabit(habitId).then(() => {
            setHabits(prev => prev.filter(h => h.id !== habitId));
            setHabitLogs(prev => prev.filter(log => log.habitId !== habitId));
        });
    };
    
    // FIX: The handleAddHabitLog function is updated to correctly support both binary (toggle) and quantitative (set value) habits.
    const handleAddHabitLog = (habitId: number, date: string, value?: number) => {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;

        const existingLog = habitLogs.find(log => log.habitId === habitId && log.date === date);

        if (habit.type === 'binary') {
            if (existingLog) {
                // Toggle off: delete the log
                habitService.deleteLog(existingLog.id).then(() => {
                    setHabitLogs(prev => prev.filter(l => l.id !== existingLog.id));
                });
            } else {
                // Toggle on: add a new log with value 1
                const newLog: Omit<HabitLog, 'id'> = { habitId, date, completedValue: 1 };
                habitService.addLog(newLog).then(addedLog => {
                    setHabitLogs(prev => [...prev, addedLog]);
                });
            }
        } else { // Quantitative
            if (existingLog) {
                if (value === undefined || value <= 0) {
                    // If new value is 0 or undefined, remove the log
                    habitService.deleteLog(existingLog.id).then(() => {
                        setHabitLogs(prev => prev.filter(l => l.id !== existingLog.id));
                    });
                } else {
                    // Update existing log with the new value
                    const updatedLog = { ...existingLog, completedValue: value };
                    habitService.updateLog(updatedLog).then(() => {
                        setHabitLogs(prev => prev.map(l => l.id === existingLog.id ? updatedLog : l));
                    });
                }
            } else if (value !== undefined && value > 0) {
                // Create new log if one doesn't exist and value is positive
                const newLog: Omit<HabitLog, 'id'> = { habitId, date, completedValue: value };
                habitService.addLog(newLog).then(addedLog => {
                    setHabitLogs(prev => [...prev, addedLog]);
                });
            }
        }
    };

    // Goals
    const handleUpsertGoal = (goalData: Omit<Goal, 'id'> & { id?: number }) => {
        if (goalData.id) { // Update
            goalService.update(goalData as Goal).then(() => {
                setGoals(prev => prev.map(g => g.id === goalData.id ? (goalData as Goal) : g));
            });
        } else { // Add
            const newGoal: Omit<Goal, 'id'> = {
                ...goalData,
                createdAt: new Date().toISOString(),
                completedAt: null,
                status: GoalStatus.OnTrack,
                progress: 0,
                journal: [],
            };
            goalService.add(newGoal).then(addedGoal => {
                setGoals(prev => [...prev, addedGoal]);
            });
        }
    };
    const handleDeleteGoal = (goalId: number) => {
        goalService.delete(goalId).then(() => {
            setGoals(prev => prev.filter(g => g.id !== goalId));
        });
    };

    // Sticky Notes
    const handleAddStickyNoteBoard = async (name: string): Promise<StickyNoteBoard> => {
        const newBoard: Omit<StickyNoteBoard, 'id'> = { name, createdAt: new Date().toISOString() };
        const addedBoard = await stickyNoteService.addBoard(newBoard);
        setStickyNoteBoards(prev => [...prev, addedBoard]);
        return addedBoard;
    };
    const handleUpdateStickyNoteBoard = (board: StickyNoteBoard) => {
        stickyNoteService.updateBoard(board).then(() => {
            setStickyNoteBoards(prev => prev.map(b => b.id === board.id ? board : b));
        });
    };
    const handleDeleteStickyNoteBoard = (boardId: number) => {
        stickyNoteService.deleteBoard(boardId).then(() => {
            setStickyNoteBoards(prev => prev.filter(b => b.id !== boardId));
            setStickyNotes(prev => prev.filter(n => n.boardId !== boardId));
        });
    };
    const handleAddStickyNote = (boardId: number) => {
        const newNote: Omit<StickyNote, 'id'> = { boardId, title: 'New Note', content: '', color: '#FBBF24', position: { x: 50, y: 50 }, size: { width: 250, height: 200 } };
        stickyNoteService.addNote(newNote).then(addedNote => {
            setStickyNotes(prev => [...prev, addedNote]);
        });
    };
    const handleUpdateStickyNote = (note: StickyNote) => {
        stickyNoteService.updateNote(note).then(() => {
            setStickyNotes(prev => prev.map(n => n.id === note.id ? note : n));
        });
    };
    const handleDeleteStickyNote = (id: number) => {
        stickyNoteService.deleteNote(id).then(() => {
            setStickyNotes(prev => prev.filter(n => n.id !== id));
        });
    };
    const handleAddStickyNoteLink = (link: Omit<StickyNoteLink, 'id'>) => {
        stickyNoteService.addLink(link).then(addedLink => {
            setStickyNoteLinks(prev => [...prev, addedLink]);
        });
    };
    const handleUpdateStickyNoteLink = (link: StickyNoteLink) => {
        stickyNoteService.updateLink(link).then(() => {
            setStickyNoteLinks(prev => prev.map(l => l.id === link.id ? link : l));
        });
    };
    const handleDeleteStickyNoteLink = (id: number) => {
        stickyNoteService.deleteLink(id).then(() => {
            setStickyNoteLinks(prev => prev.filter(l => l.id !== id));
        });
    };


    // AI Chat
    const handleNewChat = () => {
        setActiveChatSessionId(null);
    };

    const handleSendMessage = async (message: string) => {
        setIsAiLoading(true);
        let currentSession = activeChatSessionId ? chatSessions.find(s => s.id === activeChatSessionId) : null;
        
        // Create a new session if one doesn't exist
        if (!currentSession) {
            const newSessionData: Omit<ChatSession, 'id'> = {
                title: message.substring(0, 30),
                messages: [],
                createdAt: new Date().toISOString(),
            };
            currentSession = await chatService.add(newSessionData);
            setChatSessions(prev => [...prev, currentSession!]);
            setActiveChatSessionId(currentSession!.id);
        }

        const userMessage: ChatMessage = { id: newSubId(), role: 'user', text: message };
        let updatedMessages = [...currentSession!.messages, userMessage];
        
        // Immediately update UI with user's message
        setChatSessions(prev => prev.map(s => s.id === currentSession!.id ? { ...s, messages: updatedMessages } : s));
        
        // Get AI response
        const { text, toolCalls } = await runChat(updatedMessages, message, tasks, lists);
        let modelResponse: ChatMessage = { id: newSubId(), role: 'model', text: text || '' };
        
        if (toolCalls && toolCalls.length > 0) {
            modelResponse.toolCalls = toolCalls;
            // For simplicity, we process the first valid tool call.
            const call = toolCalls[0];
            let resultData: any = { error: "Tool not implemented" };
            let status: 'ok' | 'error' = 'error';

            try {
                if (call.name === 'createTask') {
                    // FIX: Argument of type 'unknown' is not assignable to parameter of type 'string'.
                    const listId = call.args.listId || findListFuzzily(call.args.listName as string)?.id || (lists.find(l=>l.type === 'task')?.id);
                    if (!listId) throw new Error("Could not find a valid list to create the task in.");
                    const taskData: Partial<Task> = {
                        // FIX: Type 'unknown' is not assignable to type 'string'.
                        title: call.args.title as string,
                        // FIX: Type 'unknown' is not assignable to type 'string'.
                        description: call.args.description as string,
                        // FIX: Type 'unknown' is not assignable to type 'string'.
                        dueDate: call.args.dueDate as string || new Date().toISOString(),
                        // FIX: Type 'unknown' is not assignable to type 'Priority'.
                        priority: call.args.priority as Priority || Priority.Medium,
                    };
                    resultData = await handleAddItem(taskData, Number(listId), 'task');
                    status = 'ok';
                } else if (call.name === 'updateTask') {
                    // FIX: Argument of type 'unknown' is not assignable to parameter of type 'string'.
                    const { task, error } = findTaskFuzzily(call.args.taskTitle as string);
                    if (error) throw new Error(error);
                    if (task) {
                        const updatedTask = { ...task, ...call.args };
                        handleUpdateItem(updatedTask);
                        resultData = updatedTask;
                        status = 'ok';
                    } else {
                         throw new Error(`Task '${call.args.taskTitle as string}' not found.`);
                    }
                } else if (call.name === 'addChecklistItem') {
                    // FIX: Argument of type 'unknown' is not assignable to parameter of type 'string'.
                    const { task, error } = findTaskFuzzily(call.args.taskTitle as string);
                    if (error) throw new Error(error);
                    if (task) {
                        const newItem: ChecklistItem = { id: newSubId(), text: call.args.itemText as string, completed: false };
                        const updatedTask = { ...task, checklist: [...task.checklist, newItem] };
                        handleUpdateItem(updatedTask);
                        resultData = updatedTask;
                        status = 'ok';
                    } else {
                         throw new Error(`Task '${call.args.taskTitle as string}' not found.`);
                    }
                }
            } catch (e) {
                console.error("Tool call failed:", e);
                // FIX: Argument of type 'unknown' is not assignable to parameter of type 'string'. Safely access error message.
                resultData = { error: e instanceof Error ? e.message : String(e) };
            }

            modelResponse.toolResult = { callId: "1", toolName: call.name, data: resultData, status };
        }

        updatedMessages = [...updatedMessages, modelResponse];
        
        // Update session with both user and model messages
        const updatedSession = { ...currentSession, messages: updatedMessages };
        await chatService.update(updatedSession);
        setChatSessions(prev => prev.map(s => s.id === currentSession!.id ? updatedSession : s));
        setIsAiLoading(false);
    };
    
    const handleQuickAddTask = async (text: string) => {
        setIsAiLoading(true);
        try {
            const parsed = await parseQuickAddTask(text);
            if (!parsed) throw new Error("Could not parse the task.");
            
            const listName = parsed.listName;
            let targetListId: number | null = null;

            if (listName) {
                const foundList = findListFuzzily(listName);
                if (foundList) {
                    targetListId = foundList.id;
                } else {
                    const newList = await handleAddList({ name: listName, color: '#8b64fd', type: 'task', parentId: null });
                    targetListId = newList.id;
                }
            } else {
                targetListId = lists.find(l => l.type === 'task')?.id || null;
                if (!targetListId) {
                    const newList = await handleAddList({ name: 'Inbox', color: '#8b64fd', type: 'task', parentId: null });
                    targetListId = newList.id;
                }
            }

            const taskData: Partial<Task> = {
                title: parsed.title,
                priority: parsed.priority || Priority.Medium,
                dueDate: parsed.dueDate || new Date().toISOString(),
            };
            await handleAddItem(taskData, targetListId, 'task');

        } catch(e) {
            console.error("Quick add failed:", e);
            // FIX: Argument of type 'unknown' is not assignable to parameter of type 'string'. Safely access error message.
            const message = e instanceof Error ? e.message : String(e);
            alert(`Quick Add Failed: ${message}`);
        } finally {
            setIsAiLoading(false);
        }
    };

    // User & Settings
    const handleUpdateUser = async (name: string) => {
        await settingsService.setSetting('userName', name);
        setUserName(name);
    };
    const handleUpdateApiKey = async (key: string) => {
        await settingsService.setSetting('apiKey', key);
        setApiKey(key);
        initializeAi(key);
    };
    
    if (!isDataLoaded) {
        return <div className="flex items-center justify-center h-full">Loading...</div>;
    }
    
    if (!isOnboardingComplete) {
        return <OnboardingFlow onComplete={handleOnboardingComplete} />;
    }
    
    if (focusItem) {
        return <FocusModeView 
            focusItem={focusItem}
            onClose={() => setFocusItem(null)}
            onUpdateTask={handleUpdateItem as (t:Task)=>void}
            onFocusSessionComplete={(item, duration) => {
                const activity: ActivityLog = {
                    id: newSubId(),
                    type: 'focus',
                    content: { duration, focusedOn: item.subtask ? `subtask "${item.subtask.text}"` : 'the task' },
                    taskTitle: item.task.title,
                    createdAt: new Date().toISOString(),
                    userName: userName,
                };
                const updatedTask = { ...item.task, activityLog: [...item.task.activityLog, activity] };
                handleUpdateItem(updatedTask);
                setFocusSessionCompleteInfo({ item, duration });
                setFocusItem(null);
            }}
        />
    }

    return (
        <>
            <AppLayout
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={() => setIsSidebarCollapsed(p => !p)}
                lists={lists}
                tasks={tasks}
                notes={notes}
                savedFilters={savedFilters}
                stickyNotes={stickyNotes}
                stickyNoteBoards={stickyNoteBoards}
                stickyNoteLinks={stickyNoteLinks}
                chatSessions={chatSessions}
                activeChatSessionId={activeChatSessionId}
                onSendMessage={handleSendMessage}
                onNewChat={handleNewChat}
                onSelectChatSession={setActiveChatSessionId}
                activeSelection={activeSelection}
                onActiveSelectionChange={setActiveSelection}
                detailItem={detailItem}
                onDetailItemChange={setDetailItem}
                addingItemInfo={addingItemInfo}
                onOpenAddItemPane={(listId, type) => { setDetailItem(null); setAddingItemInfo({ listId, type }); }}
                onCloseDetailPane={() => { setDetailItem(null); setAddingItemInfo(null); }}
                onAddList={handleAddList}
                onUpdateList={handleUpdateList}
                onDeleteList={handleDeleteList}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onAddComment={handleAddComment}
                onAddSavedFilter={(name, filter) => {
                    savedFilterService.add({ name, filter }).then(newFilter => {
                        setSavedFilters(prev => [...prev, newFilter]);
                    });
                }}
                onDeleteSavedFilter={(id) => {
                    savedFilterService.delete(id).then(() => {
                        setSavedFilters(prev => prev.filter(f => f.id !== id));
                    });
                }}
                onAddStickyNoteBoard={handleAddStickyNoteBoard}
                onUpdateStickyNoteBoard={handleUpdateStickyNoteBoard}
                onDeleteStickyNoteBoard={handleDeleteStickyNoteBoard}
                onAddStickyNote={handleAddStickyNote}
                onUpdateStickyNote={handleUpdateStickyNote}
                onDeleteStickyNote={handleDeleteStickyNote}
                onAddStickyNoteLink={handleAddStickyNoteLink}
                onUpdateStickyNoteLink={handleUpdateStickyNoteLink}
                onDeleteStickyNoteLink={handleDeleteStickyNoteLink}
                goals={goals}
                onUpsertGoal={handleUpsertGoal}
                onDeleteGoal={handleDeleteGoal}
                onSelectGoal={(goalId) => {
                    setActiveSelection({ type: 'goals' });
                    // This is a bit of a hack to ensure the detail view updates
                    setTimeout(() => window.dispatchEvent(new CustomEvent('selectGoal', { detail: goalId })), 50);
                }}
                habits={habits}
                habitLogs={habitLogs}
                onUpsertHabit={handleUpsertHabit}
                onDeleteHabit={handleDeleteHabit}
                onAddHabitLog={handleAddHabitLog}
                customReminders={customReminders}
                onUpsertCustomReminder={(r) => {
                    if (r.id) {
                        reminderService.update(r as CustomReminder).then(() => {
                           setCustomReminders(p => p.map(pr => pr.id === r.id ? (r as CustomReminder) : pr));
                        });
                    } else {
                        const newR = { ...r, createdAt: new Date().toISOString(), isCompleted: false };
                         reminderService.add(newR as Omit<CustomReminder, 'id'>).then(added => {
                           setCustomReminders(p => [...p, added]);
                        });
                    }
                }}
                onDeleteCustomReminder={(id) => {
                    reminderService.delete(id).then(() => {
                        setCustomReminders(p => p.filter(pr => pr.id !== id));
                    });
                }}
                userStats={userStats}
                userName={userName}
                apiKey={apiKey}
                onUpdateUser={handleUpdateUser}
                onUpdateApiKey={handleUpdateApiKey}
                customFieldDefinitions={customFieldDefinitions}
                setCustomFieldDefinitions={(defs) => {
                    // This is a batch operation, simpler to clear and re-add.
                    customFieldService.getAll().then(allFields => {
                        Promise.all(allFields.map(f => customFieldService.delete(f.id))).then(() => {
                            Promise.all(defs.map(d => customFieldService.add(d as Omit<CustomFieldDefinition, 'id'>))).then(() => {
                                setCustomFieldDefinitions(defs);
                            });
                        });
                    });
                }}
                isSearchOpen={isSearchOpen}
                setIsSearchOpen={setIsSearchOpen}
                onStartFocus={(task) => setFocusItem({ task })}
                onStartSubtaskFocus={(task, subtask) => setFocusItem({ task, subtask })}
                isAiLoading={isAiLoading}
                onQuickAddTask={handleQuickAddTask}
            />
            {focusSessionCompleteInfo && (
                 <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-md animate-fade-in-overlay" onClick={() => setFocusSessionCompleteInfo(null)}>
                    <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl p-8 w-full max-w-sm m-4 transform transition-all animate-scale-in flex flex-col items-center text-center">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mb-4"/>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Focus Session Complete!</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Great work! You completed a {focusSessionCompleteInfo.duration}-minute focus session on "{focusSessionCompleteInfo.item.subtask?.text || focusSessionCompleteInfo.item.task.title}".
                        </p>
                         <button onClick={() => setFocusSessionCompleteInfo(null)} className="mt-6 w-full px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark">Continue</button>
                    </div>
                 </div>
            )}
             <div className="fixed top-4 right-4 z-50 w-full max-w-sm space-y-2">
                {inAppNotifications.map(n => (
                    <div key={n.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex items-start gap-3 border border-gray-200 dark:border-gray-700 animate-slide-in-right">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <BellIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-grow">
                            <p className="font-semibold text-gray-800 dark:text-white">{n.title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{n.body}</p>
                        </div>
                        <button onClick={() => setInAppNotifications(prev => prev.filter(p => p.id !== n.id))} className="p-1 -m-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <XMarkIcon className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
};

export default App;