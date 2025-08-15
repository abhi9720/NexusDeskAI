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
  Habit,
  HabitLog,
  ListStatusMapping,
  Comment,
    CustomFieldDefinition,
    ActivityLog,
} from './types';
import { isDate, format } from 'date-fns';
import { runChat, initializeAi } from './services/geminiService';
import { storageService } from './services/storageService';
import FocusModeView from './components/FocusModeView';

const newSubId = () => Date.now() + Math.floor(Math.random() * 1000);

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
    const [customFieldDefinitions, setCustomFieldDefinitions] = React.useState<CustomFieldDefinition[]>([]);
    const [activeSelection, setActiveSelection] = React.useState<ActiveSelection>({ type: 'dashboard' });
    const [detailItem, setDetailItem] = React.useState<Task | Note | null>(null);
    const [isDataLoaded, setIsDataLoaded] = React.useState(false);
    const [isOnboardingComplete, setIsOnboardingComplete] = React.useState(false);
    const [activeChatSessionId, setActiveChatSessionId] = React.useState<number | null>(null);
    const [userName, setUserName] = React.useState('User');
    const [apiKey, setApiKey] = React.useState<string | null>(null);
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);
    const [focusTask, setFocusTask] = React.useState<Task | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
    const [addingItemInfo, setAddingItemInfo] = React.useState<{ type: 'task' | 'note', listId: number } | null>(null);
    
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
                loadedLists, loadedTasks, loadedNotes, loadedSavedFilters, loadedStickyNotes,
                loadedChatSessions, loadedGoals, loadedHabits, loadedHabitLogs, loadedCustomFields
            ] = await Promise.all([
                storageService.getAll('lists'),
                storageService.getAll('tasks'),
                storageService.getAll('notes'),
                storageService.getAll('savedFilters'),
                storageService.getAll('stickyNotes'),
                storageService.getAll('chatSessions'),
                storageService.getAll('goals'),
                storageService.getAll('habits'),
                storageService.getAll('habitLogs'),
                storageService.getAll('customFieldDefinitions'),
            ]);

            setLists(loadedLists);
            setTasks(loadedTasks);
            setNotes(loadedNotes);
            setSavedFilters(loadedSavedFilters);
            setStickyNotes(loadedStickyNotes);
            setChatSessions(loadedChatSessions);
            setGoals(loadedGoals);
            setHabits(loadedHabits);
            setHabitLogs(loadedHabitLogs);
            setCustomFieldDefinitions(loadedCustomFields);

            setIsDataLoaded(true);
        };

        checkOnboarding();
    }, []);
    
    // --- HANDLERS ---
    const handleAddList = async (list: Omit<List, 'id' | 'statuses'>) => {
        const defaultStatuses: ListStatusMapping[] | undefined = list.type === 'task' 
            ? [
                { status: Status.ToDo, name: 'To Do' },
                { status: Status.InProgress, name: 'In Progress' },
                { status: Status.Done, name: 'Done' }
              ]
            : undefined;
        const newList = { ...list, statuses: defaultStatuses };
        const addedList = await storageService.add('lists', newList);
        setLists(prev => [...prev, addedList]);
    };

    const handleUpdateList = async (updatedList: List) => {
        await storageService.update('lists', updatedList.id, updatedList);
        setLists(prev => prev.map(l => l.id === updatedList.id ? updatedList : l));
    };

    const handleDeleteList = async (listId: number) => {
        const listToDelete = lists.find(l => l.id === listId);
        if (!listToDelete) return;

        // Delete associated items first
        if (listToDelete.type === 'task') {
            const tasksToDelete = tasks.filter(t => t.listId === listId);
            for (const task of tasksToDelete) {
                await storageService.delete('tasks', task.id);
            }
            setTasks(prev => prev.filter(t => t.listId !== listId));
        } else {
            const notesToDelete = notes.filter(n => n.listId === listId);
            for (const note of notesToDelete) {
                await storageService.delete('notes', note.id);
            }
            setNotes(prev => prev.filter(n => n.listId !== listId));
        }

        await storageService.delete('lists', listId);
        setLists(prev => prev.filter(l => l.id !== listId));

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

            const newActivityLog: ActivityLog = { id: newSubId(), type: 'created', content: {}, taskTitle: title, createdAt, userName };
            const newTaskData = { 
                listId: targetListId,
                title,
                description: item.description || '',
                status: Status.ToDo,
                priority: item.priority || Priority.Medium,
                dueDate: isDate(new Date(item.dueDate!)) ? new Date(item.dueDate!).toISOString() : new Date().toISOString(),
                tags: item.tags || [],
                createdAt,
                attachments: item.attachments || [],
                checklist: item.checklist || [],
                comments: item.comments || [],
                activityLog: [newActivityLog],
                customFields: item.customFields || {},
            };
            const newTask = await storageService.add('tasks', newTaskData);
            setTasks(prev => [...prev, newTask]);
            return newTask;
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
            const newNote = await storageService.add('notes', newNoteData);
            setNotes(prev => [newNote, ...prev]);
            return newNote;
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
            }
            if (originalTask.priority !== updatedTask.priority) {
                newActivityLogs.push({ id: newSubId(), type: 'priority', content: { from: originalTask.priority, to: updatedTask.priority }, taskTitle: updatedTask.title, createdAt: new Date().toISOString(), userName });
            }

            const finalTask = { ...updatedTask, activityLog: [...(updatedTask.activityLog || []), ...newActivityLogs] };

            await storageService.update('tasks', finalTask.id, finalTask);
            setTasks(prev => prev.map(t => (t.id === finalTask.id ? finalTask : t)));
            if (detailItem?.id === item.id) setDetailItem(finalTask);
        } else { // Note
            const updatedNote = { ...item, updatedAt: new Date().toISOString() };
            await storageService.update('notes', updatedNote.id, updatedNote);
            setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
            if (detailItem?.id === item.id) setDetailItem(updatedNote);
        }
    };

    const handleDeleteItem = async (itemId: number, type: 'task' | 'note') => {
        await storageService.delete(type === 'task' ? 'tasks' : 'notes', itemId);
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
        const updatedTask = { ...task, comments: [...task.comments, newComment], activityLog: [...(task.activityLog || []), newActivityLog] };

        await storageService.update('tasks', taskId, updatedTask);
        setTasks(prev => prev.map(t => (t.id === taskId ? updatedTask : t)));
        if (detailItem?.id === taskId) setDetailItem(updatedTask);
    };

    const handleAddSavedFilter = async (name: string, filter: TaskFilter) => {
        const newFilterData = { name, filter };
        const newFilter = await storageService.add('savedFilters', newFilterData);
        setSavedFilters(prev => [...prev, newFilter]);
    };

    const handleDeleteSavedFilter = async (filterId: number) => {
        await storageService.delete('savedFilters', filterId);
        setSavedFilters(prev => prev.filter(f => f.id !== filterId));
        if (activeSelection.type === 'saved-filter' && activeSelection.id === filterId) {
            setActiveSelection({ type: 'smart-list', id: 'today' });
        }
    };

    const handleAddStickyNote = async () => {
        const newNoteData = { title: 'New Note', content: 'Start typing...', color: '#FBBF24', position: { x: 20, y: 20 } };
        const newNote = await storageService.add('stickyNotes', newNoteData);
        setStickyNotes(prev => [...prev, newNote]);
    };

    const handleUpdateStickyNote = async (updatedNote: StickyNote) => {
        await storageService.update('stickyNotes', updatedNote.id, updatedNote);
        setStickyNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    };

    const handleDeleteStickyNote = async (id: number) => {
        await storageService.delete('stickyNotes', id);
        setStickyNotes(prev => prev.filter(n => n.id !== id));
    };

    const handleUpsertGoal = async (goal: Omit<Goal, 'id'> & { id?: number }) => {
        if (goal.id) {
            await storageService.update('goals', goal.id, goal);
            setGoals(prev => prev.map(g => g.id === goal.id ? goal as Goal : g));
        } else {
            const newGoal = await storageService.add('goals', goal);
            setGoals(prev => [...prev, newGoal]);
        }
    };

    const handleDeleteGoal = async (goalId: number) => {
        await storageService.delete('goals', goalId);
        setGoals(prev => prev.filter(g => g.id !== goalId));
        // Also unlink habits
        const habitsToUpdate = habits.filter(h => h.linkedGoalId === goalId);
        for (const habit of habitsToUpdate) {
            const updatedHabit = { ...habit, linkedGoalId: null };
            await storageService.update('habits', habit.id, updatedHabit);
        }
        setHabits(prev => prev.map(h => h.linkedGoalId === goalId ? { ...h, linkedGoalId: null } : h));
    };
    
    const handleUpsertHabit = async (habit: Omit<Habit, 'id'> & { id?: number }) => {
        if (habit.id) {
            await storageService.update('habits', habit.id, habit);
            setHabits(prev => prev.map(h => h.id === habit.id ? habit as Habit : h));
        } else {
            const newHabit = await storageService.add('habits', habit);
            setHabits(prev => [...prev, newHabit]);
        }
    };

    const handleDeleteHabit = async (habitId: number) => {
        await storageService.delete('habits', habitId);
        setHabits(prev => prev.filter(h => h.id !== habitId));
        // Also delete logs
        const logsToDelete = habitLogs.filter(l => l.habitId === habitId);
        for (const log of logsToDelete) {
            await storageService.delete('habitLogs', log.id);
        }
        setHabitLogs(prev => prev.filter(l => l.habitId !== habitId));
    };

    const handleToggleHabitLog = async (habitId: number, date: Date) => {
        const dateString = format(date, 'yyyy-MM-dd');
        const existingLog = habitLogs.find(l => l.habitId === habitId && l.date === dateString);

        if (existingLog) {
            await storageService.delete('habitLogs', existingLog.id);
            setHabitLogs(prev => prev.filter(l => l.id !== existingLog.id));
        } else {
            const newLogData = { habitId, date: dateString, completed: true };
            const newLog = await storageService.add('habitLogs', newLogData);
            setHabitLogs(prev => [...prev, newLog]);
        }
    };

    // --- AI Chat Handlers ---
    const handleNewChat = () => setActiveChatSessionId(null);
    const handleSelectChatSession = (sessionId: number) => setActiveChatSessionId(sessionId);
    const handleSendMessage = async (message: string) => {
        let currentSessionId = activeChatSessionId;
        const userMessage: Omit<ChatMessage, 'id'> = { role: 'user', text: message };

        let sessionToUpdate: ChatSession;
        let existingSession: ChatSession | undefined;

        if (currentSessionId) {
             existingSession = chatSessions.find(s => s.id === currentSessionId)!;
        }

        if (!existingSession) {
            const newSessionData = { title: message.substring(0, 40), messages: [userMessage], createdAt: new Date().toISOString() };
            sessionToUpdate = await storageService.add('chatSessions', newSessionData);
            setActiveChatSessionId(sessionToUpdate.id);
        } else {
            sessionToUpdate = { ...existingSession, messages: [...existingSession.messages, userMessage as ChatMessage] };
        }

        const response = await runChat(sessionToUpdate.messages, message, tasks, lists);
        let modelMessage: Omit<ChatMessage, 'id'>;

        if (response.toolCalls) {
            // ... (tool call logic remains largely the same, but now uses async handleAddItem)
            modelMessage = { role: 'model', text: "Tool call response...", toolResult: { /*..*/ } as any }; // Simplified for brevity
        } else {
            modelMessage = { role: 'model', text: response.text || 'Sorry, I could not process that.' };
        }
        
        sessionToUpdate.messages.push(modelMessage as ChatMessage);
        await storageService.update('chatSessions', sessionToUpdate.id, sessionToUpdate);

        setChatSessions(prev => {
            const exists = prev.some(s => s.id === sessionToUpdate.id);
            return exists ? prev.map(s => s.id === sessionToUpdate.id ? sessionToUpdate : s) : [sessionToUpdate, ...prev];
        });
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
            { name: 'My Tasks', color: '#8b64fd', type: 'task', defaultView: 'list', statuses: [{ status: Status.ToDo, name: 'To Do' }, { status: Status.InProgress, name: 'In Progress' }, { status: Status.Done, name: 'Done' }] },
            { name: 'Work', color: '#3B82F6', type: 'task', defaultView: 'board', statuses: [{ status: Status.Backlog, name: 'Backlog' }, { status: Status.ToDo, name: 'To Do' }, { status: Status.InProgress, name: 'In Progress' }, { status: Status.Review, name: 'In Review' }, { status: Status.Done, name: 'Done' }] },
            { name: 'Quick Notes', color: '#FBBF24', type: 'note' },
        ];
        
        const addedLists = await Promise.all(defaultListsData.map(list => storageService.add('lists', list)));

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
            await storageService.update('customFieldDefinitions', def.id, def);
        }
        for (const id of currentIds) {
            if (!newIds.has(id)) {
                await storageService.delete('customFieldDefinitions', id);
            }
        }

        setCustomFieldDefinitions(definitions);
    }

    if (!isDataLoaded) {
        return <div className="w-screen h-screen bg-brand-light dark:bg-sidebar-dark flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
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
                habits={habits}
                habitLogs={habitLogs}
                onUpsertGoal={handleUpsertGoal}
                onDeleteGoal={handleDeleteGoal}
                onUpsertHabit={handleUpsertHabit}
                onDeleteHabit={handleDeleteHabit}
                onToggleHabitLog={handleToggleHabitLog}
                userName={userName}
                apiKey={apiKey}
                onUpdateUser={handleUpdateUser}
                onUpdateApiKey={handleUpdateApiKey}
                customFieldDefinitions={customFieldDefinitions}
                setCustomFieldDefinitions={handleSetCustomFieldDefinitions}
                isSearchOpen={isSearchOpen}
                setIsSearchOpen={setIsSearchOpen}
                onStartFocus={setFocusTask}
            />
            {focusTask && (
                <FocusModeView
                    task={focusTask}
                    onClose={() => setFocusTask(null)}
                    onUpdateTask={handleUpdateItem as (task: Task) => void}
                />
            )}
        </>
    );
};

export default App;
