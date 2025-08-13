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
  ChatMessage,
  Goal,
  Habit,
  HabitLog,
} from './types';
import { isDate, format } from 'date-fns';

const App = () => {
    const isValidDate = (d: any): boolean => {
      return d && isDate(new Date(d));
    };

    const validateAndMigrateArray = <T extends { id: string }>(
        key: string,
        validator: (item: any) => T | null
    ): T[] => {
        const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        if (!saved) return [];
        
        try {
            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed)) return [];

            const validatedItems: T[] = [];
            for (const item of parsed) {
                try {
                    const validated = validator(item);
                    if (validated) {
                        validatedItems.push(validated);
                    }
                } catch (e) {
                    console.error(`Skipping corrupted item in ${key}:`, item, e);
                }
            }
            return validatedItems;
        } catch (e) {
            console.error(`Failed to parse ${key} from localStorage`, e);
            return [];
        }
    };
    
    // --- STATE MANAGEMENT ---
    const [lists, setLists] = useState<List[]>(() => validateAndMigrateArray<List>('lists', (l: any) => {
        if (!l || typeof l.id !== 'string') return null;
        return {
            id: l.id,
            name: typeof l.name === 'string' ? l.name : 'Untitled List',
            color: typeof l.color === 'string' ? l.color : '#8b64fd',
            type: l.type === 'task' || l.type === 'note' ? l.type : 'task',
            defaultView: l.defaultView && ['list', 'board', 'calendar', 'bi-weekly'].includes(l.defaultView) ? l.defaultView : 'list',
        };
    }));

    const [tasks, setTasks] = useState<Task[]>(() => validateAndMigrateArray<Task>('tasks', (t: any) => {
        if (!t || typeof t.id !== 'string') return null;
        return {
            id: t.id,
            listId: typeof t.listId === 'string' ? t.listId : '1',
            title: typeof t.title === 'string' ? t.title : 'Untitled Task',
            description: typeof t.description === 'string' ? t.description : '',
            status: Object.values(Status).includes(t.status) ? t.status : Status.ToDo,
            priority: Object.values(Priority).includes(t.priority) ? t.priority : Priority.Medium,
            dueDate: isValidDate(t.dueDate) ? new Date(t.dueDate).toISOString() : new Date().toISOString(),
            tags: Array.isArray(t.tags) ? t.tags.filter((tag: any): tag is string => typeof tag === 'string') : [],
            createdAt: isValidDate(t.createdAt) ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
            attachments: Array.isArray(t.attachments) ? t.attachments.map((a: any) => {
                if (!a || typeof a !== 'object' || typeof a.id !== 'string') return null;
                return {
                    id: a.id,
                    name: typeof a.name === 'string' ? a.name : 'attachment',
                    type: typeof a.type === 'string' ? a.type : 'application/octet-stream',
                    url: typeof a.url === 'string' ? a.url : ''
                }
            }).filter((a): a is Attachment => a !== null) : [],
            checklist: Array.isArray(t.checklist) ? t.checklist.map((ci: any) => {
                if (!ci || typeof ci !== 'object' || typeof ci.id !== 'string') return null;
                return {
                    id: ci.id,
                    text: typeof ci.text === 'string' ? ci.text : 'checklist item',
                    completed: typeof ci.completed === 'boolean' ? ci.completed : false,
                }
            }).filter((ci): ci is ChecklistItem => ci !== null) : [],
        };
    }));
    
    const [notes, setNotes] = useState<Note[]>(() => validateAndMigrateArray<Note>('notes', (n: any) => {
        if (!n || typeof n.id !== 'string') return null;
        return {
            id: n.id,
            listId: typeof n.listId === 'string' ? n.listId : '2',
            title: typeof n.title === 'string' ? n.title : 'Untitled Note',
            content: typeof n.content === 'string' ? n.content : '',
            tags: Array.isArray(n.tags) ? n.tags.filter((tag: any): tag is string => typeof tag === 'string') : [],
            createdAt: isValidDate(n.createdAt) ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: isValidDate(n.updatedAt) ? new Date(n.updatedAt).toISOString() : new Date().toISOString(),
            attachments: Array.isArray(n.attachments) ? n.attachments.map((a: any) => {
                if (!a || typeof a !== 'object' || typeof a.id !== 'string') return null;
                 return {
                    id: a.id,
                    name: typeof a.name === 'string' ? a.name : 'attachment',
                    type: typeof a.type === 'string' ? a.type : 'application/octet-stream',
                    url: typeof a.url === 'string' ? a.url : ''
                }
            }).filter((a): a is Attachment => a !== null) : [],
        }
    }));

    const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => validateAndMigrateArray<SavedFilter>('savedFilters', (f: any) => {
        if (!f || typeof f.id !== 'string' || typeof f.name !== 'string' || typeof f.filter !== 'object') return null;
        if (
            typeof f.filter.keyword === 'string' &&
            (f.filter.status === 'all' || Object.values(Status).includes(f.filter.status)) &&
            (f.filter.priority === 'all' || Object.values(Priority).includes(f.filter.priority))
        ) {
            return f as SavedFilter;
        }
        return null;
    }));

    const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(() => validateAndMigrateArray<StickyNote>('stickyNotes', (n: any) => {
        if (
            !n || typeof n.id !== 'string' ||
            typeof n.color !== 'string' || typeof n.position?.x !== 'number' || typeof n.position?.y !== 'number'
        ) return null;
        
        return {
            id: n.id,
            title: typeof n.title === 'string' ? n.title : 'Sticky Note',
            content: typeof n.content === 'string' ? n.content : '',
            color: n.color,
            position: n.position
        }
    }));
    
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => validateAndMigrateArray<ChatMessage>('chatHistory', (m: any) => {
        if (!m || typeof m.id !== 'string' || (m.role !== 'user' && m.role !== 'model') || typeof m.text !== 'string') {
            return null;
        }
        return m as ChatMessage;
    }));

    const [goals, setGoals] = useState<Goal[]>(() => validateAndMigrateArray<Goal>('goals', (g: any) => {
      if (!g || typeof g.id !== 'string') return null;
      return {
        id: g.id,
        title: typeof g.title === 'string' ? g.title : 'Untitled Goal',
        vision: typeof g.vision === 'string' ? g.vision : '',
        targetDate: isValidDate(g.targetDate) ? new Date(g.targetDate).toISOString() : new Date().toISOString(),
        linkedProjectId: typeof g.linkedProjectId === 'string' ? g.linkedProjectId : null,
        imageUrl: typeof g.imageUrl === 'string' ? g.imageUrl : undefined,
      };
    }));

    const [habits, setHabits] = useState<Habit[]>(() => validateAndMigrateArray<Habit>('habits', (h: any) => {
      if (!h || typeof h.id !== 'string') return null;
      return {
        id: h.id,
        name: typeof h.name === 'string' ? h.name : 'New Habit',
        frequency: h.frequency || 'daily',
        linkedGoalId: typeof h.linkedGoalId === 'string' ? h.linkedGoalId : null,
      }
    }));

    const [habitLogs, setHabitLogs] = useState<HabitLog[]>(() => validateAndMigrateArray<HabitLog>('habitLogs', (l: any) => {
      if (!l || typeof l.id !== 'string' || typeof l.date !== 'string') return null;
      return {
        id: l.id,
        habitId: typeof l.habitId === 'string' ? l.habitId : '',
        date: l.date,
        completed: typeof l.completed === 'boolean' ? l.completed : false,
      }
    }));


    const [activeSelection, setActiveSelection] = useState<ActiveSelection>({ type: 'dashboard' });
    const [detailItem, setDetailItem] = useState<Task | Note | null>(null);

    // --- LOCALSTORAGE PERSISTENCE ---
    useEffect(() => { localStorage.setItem('lists', JSON.stringify(lists)); }, [lists]);
    useEffect(() => { localStorage.setItem('tasks', JSON.stringify(tasks)); }, [tasks]);
    useEffect(() => { localStorage.setItem('notes', JSON.stringify(notes)); }, [notes]);
    useEffect(() => { localStorage.setItem('savedFilters', JSON.stringify(savedFilters)); }, [savedFilters]);
    useEffect(() => { localStorage.setItem('stickyNotes', JSON.stringify(stickyNotes)); }, [stickyNotes]);
    useEffect(() => { localStorage.setItem('chatHistory', JSON.stringify(chatHistory)); }, [chatHistory]);
    useEffect(() => { localStorage.setItem('goals', JSON.stringify(goals)); }, [goals]);
    useEffect(() => { localStorage.setItem('habits', JSON.stringify(habits)); }, [habits]);
    useEffect(() => { localStorage.setItem('habitLogs', JSON.stringify(habitLogs)); }, [habitLogs]);


    // Add default lists if none exist
    useEffect(() => {
        if (lists.length === 0) {
            setLists([
                { id: '1', name: 'My Tasks', color: '#8b64fd', type: 'task', defaultView: 'list' },
                { id: '2', name: 'Personal', color: '#34D399', type: 'task', defaultView: 'board' },
                { id: '3', name: 'Quick Notes', color: '#FBBF24', type: 'note' },
            ]);
        }
    }, []);
    
    // --- HANDLERS ---
    const handleAddList = (list: Omit<List, 'id'>) => setLists(prev => [...prev, { ...list, id: uuidv4() }]);
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
                 const newFallbackList = { id: uuidv4(), name: `${type === 'task' ? 'Task' : 'Note'} List`, color: '#8b64fd', type };
                 handleAddList(newFallbackList);
                 targetListId = newFallbackList.id;
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


    return (
        <AppLayout
            lists={lists}
            tasks={tasks}
            notes={notes}
            savedFilters={savedFilters}
            stickyNotes={stickyNotes}
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
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