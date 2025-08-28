import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task, Status, List, ListStatusMapping } from '../types';
import { EllipsisHorizontalIcon, PlusIcon } from './icons';
import TaskColumn from './TaskColumn';

interface TaskBoardViewProps {
    tasks: Task[];
    allTasks: Task[];
    list?: List;
    onSelectTask: (task: Task) => void;
    onUpdateTask: (task: Task) => void;
    onUpdateList?: (list: List) => void;
    onStartFocus: (task: Task) => void;
}

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

const TaskBoardView = ({ tasks, allTasks, list, onSelectTask, onUpdateTask, onUpdateList, onStartFocus }: TaskBoardViewProps) => {
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [droppedTaskId, setDroppedTaskId] = useState<string | null>(null);
    const [taskDragOverColumn, setTaskDragOverColumn] = useState<Status | null>(null);
    const [draggedColumn, setDraggedColumn] = useState<Status | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<Status | null>(null);

    const handleTaskDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        setDraggedTaskId(taskId);
    };

    const handleTaskDragEnd = () => {
        setDraggedTaskId(null);
    };

    const handleColumnDragStart = (e: React.DragEvent<HTMLDivElement>, status: Status) => {
        e.dataTransfer.setData('columnStatus', status);
        setDraggedColumn(status);
    };

    const handleColumnDragEnd = () => {
        setDraggedColumn(null);
        setDragOverColumn(null);
    };

    const handleGenericDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleGenericDragEnter = (e: React.DragEvent<HTMLDivElement>, status: Status) => {
        e.preventDefault();
        if (draggedTaskId) {
            setTaskDragOverColumn(status);
        } else if (draggedColumn && draggedColumn !== status) {
            setDragOverColumn(status);
        }
    };

    const handleGenericDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setTaskDragOverColumn(null);
        setDragOverColumn(null);
    };
    
    const handleGenericDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: Status) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        const draggedStatus = e.dataTransfer.getData('columnStatus') as Status;

        setTaskDragOverColumn(null);
        setDragOverColumn(null);

        if (taskId) {
            const taskToMove = tasks.find(t => t.id === parseInt(taskId, 10));
            setDraggedTaskId(null);
            if (taskToMove && taskToMove.status !== targetStatus) {
                onUpdateTask({ ...taskToMove, status: targetStatus });
                setDroppedTaskId(taskId);
                setTimeout(() => setDroppedTaskId(null), 200);
            }
        } else if (draggedStatus) {
            if (!draggedStatus || draggedStatus === targetStatus || !list || !onUpdateList || !list.statuses) {
                setDraggedColumn(null);
                return;
            }

            const statuses = list.statuses;
            const draggedIndex = statuses.findIndex(s => s.status === draggedStatus);
            const targetIndex = statuses.findIndex(s => s.status === targetStatus);

            if (draggedIndex === -1 || targetIndex === -1) return;

            const newStatuses = [...statuses];
            const [draggedItem] = newStatuses.splice(draggedIndex, 1);
            newStatuses.splice(targetIndex, 0, draggedItem);

            onUpdateList({ ...list, statuses: newStatuses });
            setDraggedColumn(null);
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
        if (list?.statuses) {
            return list.statuses;
        }
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
        <div className="overflow-x-auto h-full p-4" onDragEnd={handleTaskDragEnd}>
            <div className="flex space-x-6 h-full w-max">
                {columnsToDisplay.map(mapping => (
                    <div
                        key={mapping.status}
                        className="relative"
                        onDrop={(e) => handleGenericDrop(e, mapping.status)}
                        onDragOver={handleGenericDragOver}
                        onDragEnter={(e) => handleGenericDragEnter(e, mapping.status)}
                        onDragLeave={handleGenericDragLeave}
                        onDragEnd={handleColumnDragEnd}
                    >
                        <div className={`transition-all duration-200 ${draggedColumn === mapping.status ? 'opacity-40 scale-95' : 'opacity-100 scale-100'} h-full`}>
                            <TaskColumn
                                mapping={mapping}
                                tasks={tasksByStatus[mapping.status] || []}
                                allTasks={allTasks}
                                list={list}
                                onCardClick={onSelectTask}
                                onUpdateList={onUpdateList}
                                onUpdateColumnName={handleUpdateColumnName}
                                onStartFocus={onStartFocus}
                                draggedTaskId={draggedTaskId}
                                droppedTaskId={droppedTaskId}
                                onDragStart={handleTaskDragStart}
                                isTaskDragOver={taskDragOverColumn === mapping.status}
                                isDraggable={!!(list && onUpdateList)}
                                onHeaderDragStart={(e) => handleColumnDragStart(e, mapping.status)}
                            />
                        </div>
                        {dragOverColumn === mapping.status && (
                            <div className="absolute top-0 -left-3 w-1.5 h-full bg-primary rounded-full z-20 pointer-events-none"></div>
                        )}
                    </div>
                ))}
                {list && onUpdateList && (
                    <AddColumn list={list} onUpdateList={onUpdateList} />
                )}
            </div>
        </div>
    );
};

export default TaskBoardView;
