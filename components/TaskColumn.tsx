import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task, Status, Priority, List, ListStatusMapping } from '../types';
import { ClockIcon, PaperClipIcon, ListBulletIcon, EllipsisHorizontalIcon, PlusIcon, TrashIcon, ChatBubbleLeftEllipsisIcon, CrosshairIcon, FlagIcon, LockClosedIcon } from './icons';
import { isToday, isTomorrow, isPast, format, differenceInDays } from 'date-fns';

const statusConfig: Record<Status, { color: string }> = {
  [Status.Backlog]: { color: 'bg-gray-500' },
  [Status.ToDo]: { color: 'bg-blue-500' },
  [Status.InProgress]: { color: 'bg-yellow-500' },
  [Status.Review]: { color: 'bg-purple-500' },
  [Status.Waiting]: { color: 'bg-slate-500' },
  [Status.Done]: { color: 'bg-green-500' },
};

const priorityStyles: Record<Priority, { bg: string, text: string, icon: JSX.Element }> = {
    [Priority.High]: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-200', icon: <FlagIcon className="w-3.5 h-3.5 text-red-500" /> },
    [Priority.Medium]: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-200', icon: <FlagIcon className="w-3.5 h-3.5 text-yellow-500" /> },
    [Priority.Low]: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-200', icon: <FlagIcon className="w-3.5 h-3.5 text-green-500" /> },
};

const formatDueDate = (dueDateString: string) => {
    const date = new Date(dueDateString);
    if (isNaN(date.getTime())) return { text: 'No date', color: 'text-gray-500' };

    if (isToday(date)) return { text: 'Today', color: 'text-primary font-semibold' };
    if (isTomorrow(date)) return { text: 'Tomorrow', color: 'text-blue-500 font-semibold' };
    if (isPast(date)) {
        const daysOverdue = differenceInDays(new Date(), date);
        if (daysOverdue === 0) return { text: 'Yesterday', color: 'text-red-500 font-semibold' };
        return { text: `${daysOverdue}d overdue`, color: 'text-red-500 font-semibold' };
    }
    return { text: format(date, 'MMM d'), color: 'text-gray-500 dark:text-gray-400' };
};

interface TaskCardProps {
    task: Task;
    allTasks: Task[];
    onClick: () => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
    onStartFocus: (task: Task) => void;
    isGhost: boolean;
    isDropped: boolean;
}

const TaskCard = ({ task, allTasks, onClick, onDragStart, onStartFocus, isGhost, isDropped }: TaskCardProps) => {
    const dueDateInfo = formatDueDate(task.dueDate);
    const priorityStyle = priorityStyles[task.priority];

    const isBlocked = useMemo(() => {
        if (!task.dependencyIds || task.dependencyIds.length === 0) {
            return false;
        }
        return task.dependencyIds.some(depId => {
            const dependency = allTasks.find(t => t.id === depId);
            return dependency && dependency.status !== Status.Done;
        });
    }, [task.dependencyIds, allTasks]);

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, String(task.id))}
            onClick={onClick}
            className={`p-4 mb-4 bg-card-light dark:bg-card-dark rounded-lg shadow-md cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group relative ${isGhost ? 'opacity-40' : ''} ${isDropped ? 'animate-scale-in' : ''}`}
            role="button"
            aria-label={`View task: ${task.title}`}
        >
            <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onStartFocus(task); }}
                    className="p-1 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 text-gray-600 dark:text-gray-300"
                    title="Focus on this task"
                >
                    <CrosshairIcon className="w-4 h-4" />
                </button>
            </div>
            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">{task.title}</h4>
            
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs">
                {isBlocked && (
                    <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400" title="This task is blocked by other tasks.">
                        <LockClosedIcon className="w-4 h-4" />
                    </div>
                 )}
                <span className={`flex items-center space-x-1.5 ${dueDateInfo.color}`}>
                    <ClockIcon className="w-4 h-4" />
                    <span>{dueDateInfo.text}</span>
                </span>
                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold ${priorityStyle.bg} ${priorityStyle.text}`}>
                    {priorityStyle.icon}
                    <span>{task.priority}</span>
                </span>
            </div>

             <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-gray-400 dark:text-gray-500">
                {task.comments?.length > 0 && (
                     <div className="flex items-center gap-1">
                        <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">{task.comments.length}</span>
                    </div>
                )}
                {task.attachments?.length > 0 && (
                     <div className="flex items-center gap-1">
                        <PaperClipIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">{task.attachments.length}</span>
                    </div>
                )}
                {task.checklist?.length > 0 && (
                     <div className="flex items-center gap-1">
                        <ListBulletIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">
                            {task.checklist.filter(i => i.completed).length}/{task.checklist.length}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export interface TaskColumnProps {
    mapping: ListStatusMapping;
    tasks: Task[];
    allTasks: Task[];
    list?: List;
    onCardClick: (task: Task) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
    onUpdateList?: (list: List) => void;
    onUpdateColumnName: (status: Status, newName: string) => void;
    onStartFocus: (task: Task) => void;
    draggedTaskId: string | null;
    droppedTaskId: string | null;
    isTaskDragOver: boolean;
    isDraggable: boolean;
    onHeaderDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}

const TaskColumn = ({ mapping, tasks, allTasks, list, onCardClick, onDragStart, onUpdateList, onUpdateColumnName, onStartFocus, draggedTaskId, droppedTaskId, isTaskDragOver, isDraggable, onHeaderDragStart }: TaskColumnProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [columnName, setColumnName] = useState(mapping.name);
    const menuRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setColumnName(mapping.name);
    }, [mapping.name]);

    useEffect(() => {
        if (isEditingName) {
            nameInputRef.current?.focus();
            nameInputRef.current?.select();
        }
    }, [isEditingName]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    const handleRemoveColumn = () => {
        if (list && onUpdateList && list.statuses && list.statuses.length > 1) {
            const updatedStatuses = list.statuses.filter(m => m.status !== mapping.status);
            onUpdateList({ ...list, statuses: updatedStatuses });
        }
        setIsMenuOpen(false);
    };
    
    const handleNameBlur = () => {
        setIsEditingName(false);
        if (columnName.trim() && columnName !== mapping.name) {
            onUpdateColumnName(mapping.status, columnName.trim());
        } else {
            setColumnName(mapping.name); // Revert if empty or unchanged
        }
    };

    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleNameBlur();
        } else if (e.key === 'Escape') {
            setColumnName(mapping.name);
            setIsEditingName(false);
        }
    };


    return (
        <div
            className={`flex-shrink-0 w-80 p-3 bg-gray-100 dark:bg-sidebar-dark rounded-xl transition-colors h-full flex flex-col ${isTaskDragOver ? 'bg-primary/10' : ''}`}
        >
            <div
                draggable={isDraggable}
                onDragStart={onHeaderDragStart}
                className={`flex items-center space-x-2 mb-4 px-1 flex-shrink-0 ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
                <span className={`w-3 h-3 rounded-full ${statusConfig[mapping.status].color}`}></span>
                {isEditingName ? (
                    <input
                        ref={nameInputRef}
                        value={columnName}
                        onChange={(e) => setColumnName(e.target.value)}
                        onBlur={handleNameBlur}
                        onKeyDown={handleNameKeyDown}
                        className="font-bold text-gray-800 dark:text-white bg-transparent border-b border-primary focus:outline-none w-full"
                    />
                ) : (
                    <h3
                        onClick={() => list && onUpdateList && setIsEditingName(true)}
                        className={`font-bold text-gray-800 dark:text-white truncate ${list && onUpdateList ? 'cursor-pointer' : ''}`}
                    >
                        {mapping.name}
                    </h3>
                )}
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5">{tasks.length}</span>
                 {list && onUpdateList && (
                    <div className="relative ml-auto" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-md">
                            <EllipsisHorizontalIcon className="w-5 h-5" />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                                <button onClick={handleRemoveColumn} disabled={list.statuses?.length === 1} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <TrashIcon className="w-4 h-4"/>
                                    Remove Column
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="space-y-4 flex-grow overflow-y-auto pr-1 -mr-2">
                {tasks.map(task => (
                    <TaskCard 
                        key={task.id} 
                        task={task} 
                        allTasks={allTasks}
                        onClick={() => onCardClick(task)} 
                        onDragStart={onDragStart} 
                        onStartFocus={onStartFocus}
                        isGhost={draggedTaskId === String(task.id)}
                        isDropped={droppedTaskId === String(task.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default TaskColumn;
