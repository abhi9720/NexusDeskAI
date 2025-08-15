import React, { useState, useMemo, useEffect, useRef } from 'react';
import { List, Task, Note, ActiveSelection, SavedFilter, TaskFilter, Priority, Status, CustomFieldDefinition } from '../types';
import TaskListView from './TaskListView';
import TaskBoardView from './TaskBoardView';
import NoteListView from './NoteListView';
import TaskFilterBar from './TaskFilterBar';
import SaveFilterModal from './SaveFilterModal';
import ProjectOverview from './ProjectOverview';
import TaskCalendarView from './TaskCalendarView';
import { QueueListIcon, ViewColumnsIcon, PlusIcon, DashboardIcon, FilterIcon, GroupByIcon, SortIcon, CalendarDaysIcon, CheckIcon } from './icons';
import { isWithinInterval, addDays, startOfDay, isToday as isTodayFns } from 'date-fns';

const DropdownMenuItem = ({ label, current, value, set, setOpen }: { label:string, current: string, value: string, set: (s:any)=>void, setOpen: (b:boolean)=>void }) => {
    const isActive = current === value;
    return (
        <button
            onClick={() => { set(value); setOpen(false); }}
            className={`w-full text-left px-4 py-2 text-sm flex justify-between items-center ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
            <span>{label}</span>
            {isActive && <CheckIcon className="w-4 h-4" />}
        </button>
    )
};

interface MainContentViewProps {
  activeSelection: ActiveSelection;
  lists: List[];
  tasks: Task[];
  notes: Note[];
  savedFilters: SavedFilter[];
  onSelectItem: (item: Task | Note) => void;
  onUpdateItem: (item: Task | Note) => void;
  onAddSavedFilter: (name: string, filter: TaskFilter) => void;
  onAddItem: (item: Partial<Task & Note>, listId: number, type: 'task' | 'note') => void;
  onUpdateList: (list: List) => void;
  onStartFocus: (task: Task) => void;
  onOpenAddItemPane: (listId: number, type: 'task' | 'note') => void;
  customFieldDefinitions: CustomFieldDefinition[];
}

const MainContentView = (props: MainContentViewProps) => {
  const { activeSelection, lists, tasks, notes, savedFilters, onSelectItem, onUpdateItem, onAddSavedFilter, onAddItem, onUpdateList, onStartFocus, onOpenAddItemPane, customFieldDefinitions } = props;
  const [viewType, setViewType] = useState<'overview' | 'board' | 'list' | 'calendar'>('board');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>({ keyword: '', status: 'all', priority: 'all' });
  const [isSaveFilterModalOpen, setIsSaveFilterModalOpen] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [sortType, setSortType] = useState<'default' | 'priority' | 'dueDate'>('default');
  const [groupBy, setGroupBy] = useState<'default' | 'priority' | 'status' | 'tag'>('default');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
              setIsSortMenuOpen(false);
          }
           if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
              setIsGroupMenuOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sortMenuRef, groupMenuRef]);

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

  const sortedTasks = useMemo(() => {
      if (!isTaskView) return [];
      const tasksToSort = [...filteredTasks];

      switch (sortType) {
          case 'priority':
              const priorityOrder = { [Priority.High]: 0, [Priority.Medium]: 1, [Priority.Low]: 2 };
              tasksToSort.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
              break;
          case 'dueDate':
              tasksToSort.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
              break;
          default:
              tasksToSort.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              break;
      }
      return tasksToSort;
  }, [filteredTasks, isTaskView, sortType]);


  useEffect(() => {
    let newViewType: 'overview' | 'board' | 'list' | 'calendar' = 'board';

    if (activeSelection.type === 'calendar') {
        newViewType = 'calendar';
    } else if (activeSelection.type === 'list') {
        const list = lists.find(l => l.id === activeSelection.id);
        if (list?.type === 'task') {
            const dv = list.defaultView;
            if (dv === 'board' || dv === 'list' || dv === 'calendar') {
                newViewType = dv;
            }
        }
    } else if (activeSelection.type === 'smart-list' && activeSelection.id === 'today') {
        // If 'Today' is selected and current view is calendar, switch it. Otherwise respect current view.
        if (viewType === 'calendar') {
            setViewType('board');
        }
    }
    
    setViewType(newViewType);
    
    if (activeSelection.type !== 'saved-filter') {
        setTaskFilter({ keyword: '', status: 'all', priority: 'all' });
    }
    setIsFilterVisible(false);
    setGroupBy('default');
  }, [activeSelection]);

  const handleSaveFilter = (name: string) => {
    onAddSavedFilter(name, taskFilter);
    setIsSaveFilterModalOpen(false);
  }
  
  const handleCloseFilter = () => {
    setIsFilterVisible(false);
    setTaskFilter({ keyword: '', status: 'all', priority: 'all' });
  };

  const HeaderTab = ({ icon, label, type }: { icon: React.ReactNode, label: string, type: typeof viewType }) => {
        const isActive = viewType === type;
        return (
            <button 
                onClick={() => setViewType(type)}
                className={`flex items-center space-x-2 px-3 py-2 border-b-2 text-sm transition-colors ${
                    isActive
                        ? 'border-primary text-primary font-semibold'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
                {icon}
                <span>{label}</span>
            </button>
        );
    };
    
    const HeaderAction = ({ icon, label, onClick, isActive }: { icon: React.ReactNode, label: string, onClick?: () => void, isActive?: boolean }) => (
         <button onClick={onClick} className={`flex items-center space-x-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
            isActive
            ? 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
         }`}>
            {icon}
            <span>{label}</span>
        </button>
    );

    const isFilterActive = useMemo(() => 
        taskFilter.keyword !== '' || taskFilter.priority !== 'all' || taskFilter.status !== 'all'
    , [taskFilter]);

    const isSortActive = sortType !== 'default';
    const isGroupActive = groupBy !== 'default';

    const renderContent = () => {
        if (!isTaskView) {
            return <NoteListView notes={items as Note[]} onSelectNote={onSelectItem} />;
        }
        
        switch (viewType) {
            case 'overview':
                return <ProjectOverview tasks={sortedTasks} list={currentList} />;
            case 'board':
                return <TaskBoardView tasks={sortedTasks} list={currentList} onSelectTask={onSelectItem} onUpdateTask={onUpdateItem} onUpdateList={onUpdateList} onStartFocus={onStartFocus} />;
            case 'list':
                return <TaskListView tasks={sortedTasks} onSelectTask={onSelectItem} onUpdateTask={onUpdateItem} groupBy={groupBy} onStartFocus={onStartFocus} />;
            case 'calendar':
                return <TaskCalendarView tasks={sortedTasks} onSelectTask={onSelectItem} />;
            default:
                return <TaskBoardView tasks={sortedTasks} list={currentList} onSelectTask={onSelectItem} onUpdateTask={onUpdateItem} onUpdateList={onUpdateList} onStartFocus={onStartFocus} />;
        }
    };

  return (
    <div className="flex-1 flex flex-col h-full bg-brand-light dark:bg-brand-dark">
      {isTaskView ? (
          <>
            <div className="flex-shrink-0 px-4 pt-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
            </div>
            <header className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 mt-2 border-b border-gray-200 dark:border-gray-700/80">
                <div className="flex items-center">
                    {activeSelection.type !== 'calendar' && (
                        <>
                            {currentList && <HeaderTab icon={<DashboardIcon className="w-5 h-5" />} label="Overview" type="overview" />}
                            <HeaderTab icon={<ViewColumnsIcon className="w-5 h-5" />} label="Board" type="board" />
                            <HeaderTab icon={<QueueListIcon className="w-5 h-5" />} label="List" type="list" />
                            {(activeSelection.type !== 'smart-list' || activeSelection.id !== 'today') && (
                                <HeaderTab icon={<CalendarDaysIcon className="w-5 h-5" />} label="Calendar" type="calendar" />
                            )}
                        </>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    {viewType !== 'overview' && (
                        <>
                            <HeaderAction 
                                icon={<FilterIcon className="w-5 h-5" />} 
                                label="Filter" 
                                onClick={() => setIsFilterVisible(!isFilterVisible)}
                                isActive={isFilterActive}
                            />
                            {viewType === 'list' && (
                                <div className="relative" ref={groupMenuRef}>
                                    <HeaderAction 
                                        icon={<GroupByIcon className="w-5 h-5" />} 
                                        label="Group by" 
                                        onClick={() => setIsGroupMenuOpen(prev => !prev)}
                                        isActive={isGroupActive}
                                    />
                                    {isGroupMenuOpen && (
                                        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20 border border-gray-200 dark:border-gray-700">
                                            <DropdownMenuItem label="Default" current={groupBy} value="default" set={setGroupBy} setOpen={setIsGroupMenuOpen} />
                                            <DropdownMenuItem label="By Priority" current={groupBy} value="priority" set={setGroupBy} setOpen={setIsGroupMenuOpen} />
                                            <DropdownMenuItem label="By Status" current={groupBy} value="status" set={setGroupBy} setOpen={setIsGroupMenuOpen} />
                                            <DropdownMenuItem label="By Tag" current={groupBy} value="tag" set={setGroupBy} setOpen={setIsGroupMenuOpen} />
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="relative" ref={sortMenuRef}>
                                <HeaderAction 
                                    icon={<SortIcon className="w-5 h-5" />} 
                                    label="Sort" 
                                    onClick={() => setIsSortMenuOpen(prev => !prev)}
                                    isActive={isSortActive}
                                />
                                {isSortMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20 border border-gray-200 dark:border-gray-700">
                                        <DropdownMenuItem label="Default" current={sortType} value="default" set={setSortType} setOpen={setIsSortMenuOpen} />
                                        <DropdownMenuItem label="By Priority" current={sortType} value="priority" set={setSortType} setOpen={setIsSortMenuOpen} />
                                        <DropdownMenuItem label="By Due Date" current={sortType} value="dueDate" set={setSortType} setOpen={setIsSortMenuOpen} />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    {currentList && (
                        <button
                            onClick={() => onOpenAddItemPane(currentList.id, currentList.type)}
                            className="flex items-center space-x-2 ml-2 px-3 py-1.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all transform hover:scale-105 shadow-sm text-sm"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Add {currentList.type === 'task' ? 'Task' : 'Note'}</span>
                        </button>
                    )}
                </div>
            </header>
            {isFilterVisible && (
                    <TaskFilterBar
                    filter={taskFilter}
                    onFilterChange={setTaskFilter}
                    onClose={handleCloseFilter}
                    onSaveFilter={() => setIsSaveFilterModalOpen(true)}
                />
            )}
          </>
      ) : (
          <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700/80">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h2>
            {currentList && (
                <button
                    onClick={() => onOpenAddItemPane(currentList.id, currentList.type)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all transform hover:scale-105 shadow-sm text-sm"
                >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add {currentList.type === 'task' ? 'Task' : 'Note'}</span>
                </button>
            )}
        </header>
      )}

      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>

      <SaveFilterModal 
        isOpen={isSaveFilterModalOpen}
        onClose={() => setIsSaveFilterModalOpen(false)}
        onSave={handleSaveFilter}
      />
    </div>
  );
};

export default MainContentView;