import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AppLayout from './components/AppLayout';
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
} from './types';
import { isDate, format } from 'date-fns';
import { runChat } from './services/geminiService';

declare global {
    interface Window {
        electronStore: {
            get: (key: string) => Promise<any>;
            set: (key: string, value: any) => void;
        };
        electron: {
            ipcRenderer: {
                invoke: (channel: string, ...args: any[]) => Promise<any>;
            };
        };
    }
}

const App = () => {
    const isValidDate = (d: any): boolean => {
      return d && isDate(new Date(d));
    };
    
    // --- STATE MANAGEMENT ---
    const [lists, setLists] = useState<List[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
    const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
    const [activeSelection, setActiveSelection] = useState<ActiveSelection>({ type: 'dashboard' });
    const [detailItem, setDetailItem] = useState<Task | Note | null>(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
    
    // --- DATA LOADING & VALIDATION ---
    useEffect(() => {
        const loadAndValidate = async <T,>(key: string, validator: (item: any) => T | null): Promise<T[]> => {
            const data = await window.electronStore.get(key);
            if (!data || !Array.isArray(data)) return [];
            return data.map(item => {
                try {
                    return validator(item);
                } catch(e) {
                    console.error(`Skipping corrupted item in ${key}:`, item, e);
                    return null;
                }
            }).filter((i): i is T => i !== null);
        };

        const loadAllData = async () => {
            const loadedLists = await loadAndValidate('lists', (l: any): List | null => {
                if (!l || typeof l.id !== 'string') return null;
                let statuses = l.statuses;
                if (l.type === 'task') {
                    if (!Array.isArray(statuses) || statuses.length === 0) {
                        statuses = [{ status: Status.ToDo, name: 'To Do' }, { status: Status.InProgress, name: 'In Progress' }, { status: Status.Done, name: 'Done' }];
                    } else if (typeof statuses[0] === 'string') {
                        statuses = statuses.filter((s: any) => Object.values(Status).includes(s)).map((s: Status) => ({ status: s, name: s }));
                    }
                }
                return { id: l.id, name: l.name || 'Untitled List', color: l.color || '#8b64fd', type: l.type || 'task', defaultView: l.defaultView || 'list', statuses };
            });

            if (loadedLists.length === 0) {
                 setLists([
                    { id: '1', name: 'My Tasks', color: '#8b64fd', type: 'task', defaultView: 'list', statuses: [{ status: Status.ToDo, name: 'To Do' }, { status: Status.InProgress, name: 'In Progress' }, { status: Status.Done, name: 'Done' }] },
                    { id: '2', name: 'Personal', color: '#34D399', type: 'task', defaultView: 'board', statuses: [{ status: Status.ToDo, name: 'To Do' }, { status: Status.InProgress, name: 'In Progress' }, { status: Status.Waiting, name: 'Waiting' }, { status: Status.Done, name: 'Done' }] },
                    { id: '3', name: 'Quick Notes', color: '#FBBF24', type: 'note' },
                ]);
            } else {
                setLists(loadedLists);
            }
            
            setTasks(await loadAndValidate('tasks', (t: any) => {
                if (!t || typeof t.id !== 'string') return null;
                return { id: t.id, listId: t.listId || '1', title: t.title || 'Untitled', description: t.description || '', status: Object.values(Status).includes(t.status) ? t.status : Status.ToDo, priority: Object.values(Priority).includes(t.priority) ? t.priority : Priority.Medium, dueDate: isValidDate(t.dueDate) ? new Date(t.dueDate).toISOString() : new Date().toISOString(), tags: t.tags || [], createdAt: isValidDate(t.createdAt) ? new Date(t.createdAt).toISOString() : new Date().toISOString(), attachments: t.attachments || [], checklist: t.checklist || [], comments: t.comments || [] };
            }));
            setNotes(await loadAndValidate('notes', (n: any) => {
                 if (!n || typeof n.id !== 'string') return null;
                 return { id: n.id, listId: n.listId || '3', title: n.title || 'Untitled', content: n.content || '', tags: n.tags || [], createdAt: isValidDate(n.createdAt) ? new Date(n.createdAt).toISOString() : new Date().toISOString(), updatedAt: isValidDate(n.updatedAt) ? new Date(n.updatedAt).toISOString() : new Date().toISOString(), attachments: n.attachments || [] };
            }));
            setSavedFilters(await loadAndValidate('savedFilters', (f: any) => {
                 if (!f || typeof f.id !== 'string' || typeof f.name !== 'string' || typeof f.filter !== 'object') return null;
                 return f as SavedFilter;
            }));
            setStickyNotes(await loadAndValidate('stickyNotes', (n: any) => {
                 if (!n || typeof n.id !== 'string' || typeof n.color !== 'string' || typeof n.position?.x !== 'number' || typeof n.position?.y !== 'number') return null;
                 return n as StickyNote;
            }));
            setChatSessions(await loadAndValidate('chatSessions', (s: any) => {
                 if (!s || typeof s.id !== 'string' || !Array.isArray(s.messages)) return null;
                 return s as ChatSession;
            }));
            setGoals(await loadAndValidate('goals', g => g as Goal));
            setHabits(await loadAndValidate('habits', h => h as Habit));
            setHabitLogs(await loadAndValidate('habitLogs', l => l as HabitLog));

            setIsDataLoaded(true);
        };

        loadAllData();
    }, []);

    // --- LOCALSTORAGE PERSISTENCE ---
    useEffect(() => { if(isDataLoaded) window.electronStore.set('lists', lists); }, [lists, isDataLoaded]);
    useEffect(() => { if(isDataLoaded) window.electronStore.set('tasks', tasks); }, [tasks, isDataLoaded]);
    useEffect(() => { if(isDataLoaded) window.electronStore.set('notes', notes); }, [notes, isDataLoaded]);
    useEffect(() => { if(isDataLoaded) window.electronStore.set('savedFilters', savedFilters); }, [savedFilters, isDataLoaded]);
    useEffect(() => { if(isDataLoaded) window.electronStore.set('stickyNotes', stickyNotes); }, [stickyNotes, isDataLoaded]);
    useEffect(() => { if(isDataLoaded) window.electronStore.set('chatSessions', chatSessions); }, [chatSessions, isDataLoaded]);
    useEffect(() => { if(isDataLoaded) window.electronStore.set('goals', goals); }, [goals, isDataLoaded]);
    useEffect(() => { if(isDataLoaded) window.electronStore.set('habits', habits); }, [habits, isDataLoaded]);
    useEffect(() => { if(isDataLoaded) window.electronStore.set('habitLogs', habitLogs); }, [habitLogs, isDataLoaded]);
    
    // --- HANDLERS ---
    const handleAddList = (list: Omit<List, 'id' | 'statuses'>) => {
        const defaultStatuses: ListStatusMapping[] | undefined = list.type === 'task' 
            ? [
                { status: Status.ToDo, name: 'To Do' },
                { status: Status.InProgress, name: 'In Progress' },
                { status: Status.Done, name: 'Done' }
              ]
            : undefined;
        setLists(prev => [...prev, { ...list, id: uuidv4(), statuses: defaultStatuses }]);
    };
    const handleUpdateList = (updatedList: List) => setLists(prev => prev.map(l => l.id === updatedList.id ? updatedList : l));
    const handleDeleteList = (listId: string) => {
        setLists(prev => prev.filter(l => l.id !== listId));
        setTasks(prev => prev.filter(t => t.listId !== listId));
        setNotes(prev => prev.filter(n => n.listId !== listId));
        
        // If the deleted list was the active selection, reset the view.
        if (activeSelection.type === 'list' && activeSelection.id === listId) {
            setActiveSelection({type: 'smart-list', id: 'today'});
            setDetailItem(null);
        }
    };
    
    const handleAddItem = (item: Partial<Task & Note>, listId: string, type: 'task' | 'note'): Task | Note => {
        let targetListId = listId;
        const list = lists.find(l => l.id === listId);

        // Fallback if listId is invalid or type mismatches
        if (!list || list.type !== type) {
            const fallbackList = lists.find(l => l.type === type);
            if (!fallbackList) {
                const newId = uuidv4();
                const defaultStatuses: ListStatusMapping[] | undefined = type === 'task'
                   ? [
                       { status: Status.ToDo, name: 'To Do' },
                       { status: Status.InProgress, name: 'In Progress' },
                       { status: Status.Done, name: 'Done' }
                     ]
                   : undefined;
                const newFallbackList: List = {
                    id: newId,
                    name: `${type === 'task' ? 'Task' : 'Note'} List`,
                    color: '#8b64fd',
                    type,
                    defaultView: 'list',
                    statuses: defaultStatuses
                };
                setLists(prev => [...prev, newFallbackList]);
                targetListId = newId;
            } else {
                 targetListId = fallbackList.id;
            }
        }


        if (type === 'task') {
            const newTask: Task = { 
                id: uuidv4(),
                listId: targetListId,
                title: item.title || 'Untitled Task',
                description: item.description || '',
                status: Status.ToDo,
                priority: item.priority || Priority.Medium,
                dueDate: isValidDate(item.dueDate) ? new Date(item.dueDate!).toISOString() : new Date().toISOString(),
                tags: item.tags || [],
                createdAt: new Date().toISOString(),
                attachments: item.attachments || [],
                checklist: item.checklist || [],
                comments: item.comments || [],
            };
            setTasks(prev => [...prev, newTask]);
            return newTask;
        } else {
            const newNote: Note = { 
                id: uuidv4(),
                listId: targetListId,
                title: item.title || 'Untitled Note',
                content: item.content || '',
                tags: item.tags || [],
                createdAt: new Date().toISOString(), 
                updatedAt: new Date().toISOString(),
                attachments: item.attachments || [],
            };
            setNotes(prev => [newNote, ...prev]);
            return newNote;
        }
    };
    
    const handleUpdateItem = (item: Task | Note) => {
      if ('status' in item) {
        setTasks(prev => prev.map(t => t.id === item.id ? item : t));
      } else {
        const updatedNote = { ...item, updatedAt: new Date().toISOString() };
        setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
      }
      if (detailItem?.id === item.id) {
        setDetailItem(item);
      }
    };

    const handleDeleteItem = (itemId: string, type: 'task' | 'note') => {
       if (type === 'task') {
         setTasks(prev => prev.filter(t => t.id !== itemId));
       } else {
         setNotes(prev => prev.filter(n => n.id !== itemId));
       }
    };

    const handleAddComment = (taskId: string, content: string) => {
      setTasks(prevTasks =>
        prevTasks.map(task => {
          if (task.id === taskId) {
            const newComment: Comment = {
              id: uuidv4(),
              content,
              createdAt: new Date().toISOString(),
              userName: 'Courtney', // Mocked user
              avatarUrl: undefined
            };
            const updatedTask = { ...task, comments: [...task.comments, newComment] };
            // Also update the detail item if it's the one being commented on
            if (detailItem?.id === taskId) {
                setDetailItem(updatedTask);
            }
            return updatedTask;
          }
          return task;
        })
      );
    };

    const handleAddSavedFilter = (name: string, filter: TaskFilter) => {
        const newFilter: SavedFilter = { id: uuidv4(), name, filter };
        setSavedFilters(prev => [...prev, newFilter]);
    };

    const handleDeleteSavedFilter = (filterId: string) => {
        setSavedFilters(prev => prev.filter(f => f.id !== filterId));
        if (activeSelection.type === 'saved-filter' && activeSelection.id === filterId) {
            setActiveSelection({ type: 'smart-list', id: 'today' });
        }
    };

    const handleAddStickyNote = () => {
        const newNote: StickyNote = {
            id: uuidv4(),
            title: 'New Note',
            content: 'Start typing...',
            color: '#FBBF24', // default yellow
            position: { x: 20, y: 20 }
        };
        setStickyNotes(prev => [...prev, newNote]);
    };

    const handleUpdateStickyNote = (updatedNote: StickyNote) => {
        setStickyNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    };

    const handleDeleteStickyNote = (id: string) => {
        setStickyNotes(prev => prev.filter(n => n.id !== id));
    };

    // --- Momentum Tracker Handlers ---
    const handleUpsertGoal = (goal: Goal) => {
        setGoals(prev => {
            const exists = prev.some(g => g.id === goal.id);
            if (exists) {
                return prev.map(g => g.id === goal.id ? goal : g);
            }
            return [...prev, goal];
        });
    };

    const handleDeleteGoal = (goalId: string) => {
        setGoals(prev => prev.filter(g => g.id !== goalId));
        // Also unlink habits
        setHabits(prev => prev.map(h => h.linkedGoalId === goalId ? { ...h, linkedGoalId: null } : h));
    };
    
    const handleUpsertHabit = (habit: Habit) => {
        setHabits(prev => {
            const exists = prev.some(h => h.id === habit.id);
            if (exists) {
                return prev.map(h => h.id === habit.id ? habit : h);
            }
            return [...prev, habit];
        });
    };

    const handleDeleteHabit = (habitId: string) => {
        setHabits(prev => prev.filter(h => h.id !== habitId));
        // Also delete logs
        setHabitLogs(prev => prev.filter(l => l.habitId !== habitId));
    };

    const handleToggleHabitLog = (habitId: string, date: Date) => {
        const dateString = format(date, 'yyyy-MM-dd');
        const existingLog = habitLogs.find(l => l.habitId === habitId && l.date === dateString);

        if (existingLog) {
            setHabitLogs(prev => prev.filter(l => l.id !== existingLog.id));
        } else {
            const newLog: HabitLog = {
                id: uuidv4(),
                habitId,
                date: dateString,
                completed: true
            };
            setHabitLogs(prev => [...prev, newLog]);
        }
    };

    // --- AI Chat Handlers ---
    const handleNewChat = () => {
        setActiveChatSessionId(null);
    };

    const handleSelectChatSession = (sessionId: string) => {
        setActiveChatSessionId(sessionId);
    };

    const handleSendMessage = async (message: string) => {
        let currentSessionId = activeChatSessionId;
        let sessionToUpdate: ChatSession;
        
        const userMessage: ChatMessage = { id: uuidv4(), role: 'user', text: message };

        if (!currentSessionId) {
            const newId = uuidv4();
            sessionToUpdate = {
                id: newId,
                title: message.substring(0, 40) + (message.length > 40 ? '...' : ''),
                messages: [userMessage],
                createdAt: new Date().toISOString(),
            };
            setActiveChatSessionId(newId);
            setChatSessions(prev => [sessionToUpdate, ...prev]);
        } else {
            const existingSession = chatSessions.find(s => s.id === currentSessionId)!;
            sessionToUpdate = { ...existingSession, messages: [...existingSession.messages, userMessage] };
            setChatSessions(prev => prev.map(s => (s.id === currentSessionId ? sessionToUpdate : s)));
        }

        const response = await runChat(sessionToUpdate.messages, message, tasks, lists);
        let modelMessage: ChatMessage;

        if (response.toolCalls) {
            const toolResults: any[] = [];
            let modelResponseText = "I've completed the following actions:";

            for (const toolCall of response.toolCalls) {
                 if (toolCall.name === 'createTask') {
                    const task = handleAddItem(toolCall.args, String(toolCall.args.listId), 'task');
                    toolResults.push({ callId: toolCall.name, toolName: 'createTask', data: task });
                    modelResponseText = `I've created the task "${task.title}".`;
                } else if (toolCall.name === 'createNote') {
                    const note = handleAddItem(toolCall.args, String(toolCall.args.listId), 'note');
                    toolResults.push({ callId: toolCall.name, toolName: 'createNote', data: note });
                    modelResponseText = `I've created the note "${note.title}".`;
                }
            }
            // Simplified response for single tool call, can be enhanced for multiple
            modelMessage = { id: uuidv4(), role: 'model', text: modelResponseText, toolResult: toolResults.length > 0 ? { ...toolResults[0], status: 'ok'} : undefined };
        } else {
            modelMessage = { id: uuidv4(), role: 'model', text: response.text || 'Sorry, I could not process that.' };
        }
        
        setChatSessions(prev => prev.map(s => s.id === (currentSessionId || sessionToUpdate.id) ? { ...s, messages: [...sessionToUpdate.messages, modelMessage] } : s));
    };


    return (
        <AppLayout
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
        />
    );
};

export default App;
