

import React, { useState, useMemo, useEffect } from 'react';
import { List, Task, Note, ActiveSelection, SavedFilter, TaskFilter } from '../types';
import TaskListView from './TaskListView';
import TaskBoardView from './TaskBoardView';
import TaskCalendarView from './TaskCalendarView';
import NoteListView from './NoteListView';
import TaskFilterBar from './TaskFilterBar';
import SaveFilterModal from './SaveFilterModal';
import AddItemModal from './AddItemModal';
import { QueueListIcon, ViewColumnsIcon, CalendarDaysIcon, PlusIcon } from './icons';
import { isWithinInterval, addDays, startOfDay, isToday as isTodayFns } from 'date-fns';

interface MainContentViewProps {
  activeSelection: ActiveSelection;
  lists: List[];
  tasks: Task[];
  notes: Note[];
  savedFilters: SavedFilter[];
  onSelectItem: (item: Task | Note) => void;
  onUpdateItem: (item: Task | Note) => void;
  onAddSavedFilter: (name: string, filter: TaskFilter) => void;
  onAddItem: (item: Omit<Task, 'id'|'createdAt'> | Omit<Note, 'id'|'createdAt'|'updatedAt'>, listId: string, type: 'task' | 'note') => void;
}

const MainContentView = (props: MainContentViewProps) => {
  const { activeSelection, lists, tasks, notes, savedFilters, onSelectItem, onUpdateItem, onAddSavedFilter, onAddItem } = props;
  const [taskViewType, setTaskViewType] = useState<'list' | 'board' | 'calendar' | 'bi-weekly'>('list');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>({ keyword: '', status: 'all', priority: 'all' });
  const [isSaveFilterModalOpen, setIsSaveFilterModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  const { title, items, type, isTaskView, currentList } = useMemo(() => {
    let title: string = 'Tasks';
    let items: Task[] | Note[] = [];
    let type: 'task' | 'note' = 'task';
    let isTaskView = true;
    let currentList: List | undefined = undefined;

    switch(activeSelection.type) {
        case 'smart-list':
            if (activeSelection.id === 'today') {
                title = 'Today';
                items = tasks.filter(t => isTodayFns(new Date(t.dueDate)));
            } else if (activeSelection.id === 'next-7-days') {
                title = 'Next 7 Days';
                const todayStart = startOfDay(new Date());
                const next7DaysEnd = addDays(todayStart, 7);
                items = tasks.filter(t => isWithinInterval(new Date(t.dueDate), { start: todayStart, end: next7DaysEnd }));
            }
            type = 'task';
            break;
        case 'list':
            const list = lists.find(l => l.id === activeSelection.id);
            if (list) {
                title = list.name;
                type = list.type;
                currentList = list;
                items = type === 'task' ? tasks.filter(t => t.listId === list.id) : notes.filter(n => n.listId === list.id);
            }
            break;
        case 'tag':
            title = `#${activeSelection.id}`;
            const taskTags = tasks.filter(t => t.tags.includes(activeSelection.id));
            const noteTags = notes.filter(n => n.tags.includes(activeSelection.id));
            if (taskTags.length > 0) { // Prioritize showing tasks if tag is on both
                items = taskTags;
                type = 'task';
            } else {
                items = noteTags;
                type = 'note';
            }
            break;
        case 'calendar':
             title = 'Calendar';
             items = tasks;
             type = 'task';
             break;
        case 'saved-filter':
            const savedFilter = savedFilters.find(f => f.id === activeSelection.id);
            if (savedFilter) {
                title = savedFilter.name;
                setTaskFilter(savedFilter.filter);
            }
            items = tasks; // The filtering is applied below
            type = 'task';
            break;
        default:
             title = "Today";
             items = tasks.filter(t => isTodayFns(new Date(t.dueDate)));
             type = 'task';
    }
    
    isTaskView = type === 'task';
    return { title, items, type, isTaskView, currentList };
  }, [activeSelection, lists, tasks, notes, savedFilters]);

  const filteredTasks = useMemo(() => {
    if (!isTaskView) return [];
    return (items as Task[]).filter(task => {
        const keywordMatch = taskFilter.keyword
            ? task.title.toLowerCase().includes(taskFilter.keyword.toLowerCase()) || 
              task.description.toLowerCase().includes(taskFilter.keyword.toLowerCase())
            : true;
        const priorityMatch = taskFilter.priority === 'all' || task.priority === taskFilter.priority;
        const statusMatch = taskFilter.status === 'all' || task.status === taskFilter.status;
        return keywordMatch && priorityMatch && statusMatch;
      });
  }, [items, isTaskView, taskFilter]);

  useEffect(() => {
    if (activeSelection.type === 'calendar') {
        setTaskViewType('calendar');
    } else if (activeSelection.type === 'list') {
        const list = lists.find(l => l.id === activeSelection.id);
        if (list?.type === 'task' && ['list', 'board', 'calendar', 'bi-weekly'].includes(list.defaultView || '')) {
            setTaskViewType(list.defaultView as 'list' | 'board' | 'calendar' | 'bi-weekly');
        } else {
            setTaskViewType('list');
        }
    } else {
        setTaskViewType('list');
    }
    
    if (activeSelection.type !== 'saved-filter') {
        setTaskFilter({ keyword: '', status: 'all', priority: 'all' });
    }
  }, [activeSelection, lists]);

  const handleSaveFilter = (name: string) => {
    onAddSavedFilter(name, taskFilter);
    setIsSaveFilterModalOpen(false);
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-brand-light dark:bg-brand-dark">
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700/80">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h2>
        <div className="flex items-center space-x-2">
            {isTaskView && activeSelection.type !== 'calendar' && (
                <div className="flex items-center bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg">
                    <button onClick={() => setTaskViewType('list')} className={`p-1.5 rounded-md ${taskViewType === 'list' ? 'bg-white dark:bg-gray-800 shadow' : 'text-gray-500 dark:text-gray-400'}`} aria-label="List View">
                        <QueueListIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={() => setTaskViewType('board')} className={`p-1.5 rounded-md ${taskViewType === 'board' ? 'bg-white dark:bg-gray-800 shadow' : 'text-gray-500 dark:text-gray-400'}`} aria-label="Board View">
                        <ViewColumnsIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={() => setTaskViewType('calendar')} className={`p-1.5 rounded-md ${taskViewType === 'calendar' ? 'bg-white dark:bg-gray-800 shadow' : 'text-gray-500 dark:text-gray-400'}`} aria-label="Calendar View">
                        <CalendarDaysIcon className="w-5 h-5"/>
                    </button>
                </div>
            )}
            {currentList && (
                 <button
                    onClick={() => setIsAddItemModalOpen(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all transform hover:scale-105 shadow-sm text-sm"
                >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add {currentList.type === 'task' ? 'Task' : 'Note'}</span>
                </button>
            )}
        </div>
      </header>
      
      {isTaskView && (
        <TaskFilterBar
            filter={taskFilter}
            onFilterChange={setTaskFilter}
            onSaveFilter={() => setIsSaveFilterModalOpen(true)}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {isTaskView ? (
            taskViewType === 'list' ? (
                <TaskListView tasks={filteredTasks} onSelectTask={onSelectItem} onUpdateTask={onUpdateItem} />
            ) : taskViewType === 'board' ? (
                <TaskBoardView tasks={filteredTasks} onSelectTask={onSelectItem} onUpdateTask={onUpdateItem} />
            ) : (
                <TaskCalendarView tasks={filteredTasks} onSelectTask={onSelectItem} />
            )
        ) : (
            <NoteListView notes={items as Note[]} onSelectNote={onSelectItem} />
        )}
      </div>

      <SaveFilterModal 
        isOpen={isSaveFilterModalOpen}
        onClose={() => setIsSaveFilterModalOpen(false)}
        onSave={handleSaveFilter}
      />
      {isAddItemModalOpen && currentList && (
          <AddItemModal
            isOpen={isAddItemModalOpen}
            onClose={() => setIsAddItemModalOpen(false)}
            onAddItem={onAddItem}
            listId={currentList.id}
            listType={currentList.type}
          />
      )}
    </div>
  );
};

export default MainContentView;