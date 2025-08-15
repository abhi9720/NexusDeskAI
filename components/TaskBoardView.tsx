import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task, Status, Priority, List, ListStatusMapping } from '../types';
import { ClockIcon, PaperClipIcon, ListBulletIcon, EllipsisHorizontalIcon, PlusIcon, TrashIcon, ChatBubbleLeftEllipsisIcon, CrosshairIcon } from './icons';

interface TaskBoardViewProps {
    tasks: Task[];
    list?: List;
    onSelectTask: (task: Task) => void;
    onUpdateTask: (task: Task) => void;
    onUpdateList?: (list: List) => void;
    onStartFocus: (task: Task) => void;
}

const statusConfig: Record<Status, { color: string }> = {
  [Status.Backlog]: { color: 'bg-gray-500' },
  [Status.ToDo]: { color: 'bg-blue-500' },
  [Status.InProgress]: { color: 'bg-yellow-500' },
  [Status.Review]: { color: 'bg-purple-500' },
  [Status.Waiting]: { color: 'bg-slate-500' },
  [Status.Done]: { color: 'bg-green-500' },
};

const priorityColors: Record<Priority, { dot: string, text: string }> = {
    [Priority.High]: { dot: 'bg-red-500', text: 'text-red-500' },
    [Priority.Medium]: { dot: 'bg-yellow-500', text: 'text-yellow-500' },
    [Priority.Low]: { dot: 'bg-green-500', text: 'text-green-500' },
};

const TaskCard = ({ task, onClick, onDragStart, onStartFocus }: { task: Task; onClick: () => void; onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void; onStartFocus: (task: Task) => void; }) => {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    const isOverdue = dueDate < today && task.status !== Status.Done;

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, String(task.id))}
            onClick={onClick}
            className="p-4 mb-4 bg-card-light dark:bg-card-dark rounded-lg shadow-md cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group relative"
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
            <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <span className={`flex items-center space-x-1.5 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                    <ClockIcon className="w-4 h-4" />
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                </span>
                <div className="flex items-center space-x-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${priorityColors[task.priority].dot}`}></span>
                    <span className={`font-medium ${priorityColors[task.priority].text}`}>{task.priority}</span>
                </div>
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

interface TaskColumnProps {
    mapping: ListStatusMapping;
    tasks: Task[];
    list?: List;
    onCardClick: (task: Task) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, status: Status) => void;
    onUpdateList?: (list: List) => void;
    onUpdateColumnName: (status: Status, newName: string) => void;
    onStartFocus: (task: Task) => void;
}

const TaskColumn = ({ mapping, tasks, list, onCardClick, onDragStart, onDrop, onUpdateList, onUpdateColumnName, onStartFocus }: TaskColumnProps) => {
    const [isOver, setIsOver] = useState(false);
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
            onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
            onDragLeave={() => setIsOver(false)}
            onDrop={(e) => { onDrop(e, mapping.status); setIsOver(false); }}
            className={`flex-shrink-0 w-80 p-3 bg-gray-100 dark:bg-gray-900 rounded-xl transition-colors h-full ${isOver ? 'bg-primary/10' : ''}`}
        >
            <div className="flex items-center space-x-2 mb-4 px-1">
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
            <div className="space-y-4 h-[calc(100%-40px)] overflow-y-auto pr-1 -mr-2">
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={() => onCardClick(task)} onDragStart={onDragStart} onStartFocus={onStartFocus} />
                ))}
            </div>
        </div>
    );
};

const AddColumn = ({ list, onUpdateList }: { list: List; onUpdateList: (list: List) => void; }) => {
    const [isAdding, setIsAdding] = useState(false);
    const addColumnRef = useRef<HTMLDivElement>(null);
    
    const availableStatuses = Object.values(Status).filter(
        s => !list.statuses?.some(mapping => mapping.status === s)
    );
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addColumnRef.current && !addColumnRef.current.contains(event.target as Node)) {
                setIsAdding(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [addColumnRef]);

    const handleAddStatus = (status: Status) => {
        const newMapping: ListStatusMapping = { status, name: status };
        const updatedStatuses = [...(list.statuses || []), newMapping];
        onUpdateList({ ...list, statuses: updatedStatuses });
        setIsAdding(false);
    }
    
    if (availableStatuses.length === 0) return null;
    
    return (
        <div className="flex-shrink-0 w-80 p-3" ref={addColumnRef}>
            {isAdding ? (
                <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold p-1 text-gray-500 dark:text-gray-400">Select status to add</p>
                    {availableStatuses.map(s => (
                        <button key={s} onClick={() => handleAddStatus(s)} className="w-full text-left text-sm p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200">{s}</button>
                    ))}
                </div>
            ) : (
                <button 
                    onClick={() => setIsAdding(true)}
                    className="w-full h-12 flex items-center justify-center text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add column
                </button>
            )}
        </div>
    );
}

const TaskBoardView = ({ tasks, list, onSelectTask, onUpdateTask, onUpdateList, onStartFocus }: TaskBoardViewProps) => {

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: Status) => {
        const taskId = e.dataTransfer.getData('taskId');
        const taskToMove = tasks.find(t => t.id === parseInt(taskId, 10));
        if (taskToMove && taskToMove.status !== newStatus) {
            onUpdateTask({ ...taskToMove, status: newStatus });
        }
    };

    const handleUpdateColumnName = (statusToUpdate: Status, newName: string) => {
        if (list && onUpdateList && list.statuses) {
            const updatedStatuses = list.statuses.map(mapping => 
                mapping.status === statusToUpdate ? { ...mapping, name: newName } : mapping
            );
            onUpdateList({ ...list, statuses: updatedStatuses });
        }
    };

    const columnsToDisplay = useMemo(() => {
        // For a specific list with customizable statuses
        if (list?.statuses) {
            return list.statuses;
        }
        // For smart lists (like 'Today'), show all statuses that have tasks
        const statusesWithTasks = new Set(tasks.map(t => t.status));
        return Object.values(Status)
            .filter(s => statusesWithTasks.has(s))
            .map(s => ({ status: s, name: s }));

    }, [list, tasks]);

    const tasksByStatus = useMemo(() => {
        return tasks.reduce((acc, task) => {
          acc[task.status] = acc[task.status] || [];
          acc[task.status].push(task);
          return acc;
        }, {} as Record<Status, Task[]>);
      }, [tasks]);


    return (
        <div className="flex-grow flex space-x-6 p-4 overflow-x-auto h-full">
            {columnsToDisplay.map(mapping => (
                <TaskColumn
                    key={mapping.status}
                    mapping={mapping}
                    tasks={tasksByStatus[mapping.status] || []}
                    list={list}
                    onCardClick={onSelectTask}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    onUpdateList={onUpdateList}
                    onUpdateColumnName={handleUpdateColumnName}
                    onStartFocus={onStartFocus}
                />
            ))}
            {list && onUpdateList && (
                <AddColumn list={list} onUpdateList={onUpdateList} />
            )}
        </div>
    );
};

export default TaskBoardView;