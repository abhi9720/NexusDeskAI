import React, { useState, useMemo } from 'react';
import { Task, Status, Priority } from '../types';
import { ClockIcon, PaperClipIcon, ListBulletIcon } from './icons';

interface TaskBoardViewProps {
    tasks: Task[];
    onSelectTask: (task: Task) => void;
    onUpdateTask: (task: Task) => void;
}

const statusConfig: Record<Status, { title: string, color: string }> = {
  [Status.ToDo]: { title: 'To Do', color: 'bg-blue-500' },
  [Status.InProgress]: { title: 'In Progress', color: 'bg-yellow-500' },
  [Status.Done]: { title: 'Done', color: 'bg-green-500' },
};

const priorityColors: Record<Priority, { dot: string, text: string }> = {
    [Priority.High]: { dot: 'bg-red-500', text: 'text-red-500' },
    [Priority.Medium]: { dot: 'bg-yellow-500', text: 'text-yellow-500' },
    [Priority.Low]: { dot: 'bg-green-500', text: 'text-green-500' },
};

const TaskCard = ({ task, onClick, onDragStart }: { task: Task; onClick: () => void; onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void; }) => {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    const isOverdue = dueDate < today && task.status !== Status.Done;

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            onClick={onClick}
            className="p-4 mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
            role="button"
            aria-label={`View task: ${task.title}`}
        >
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
    status: Status;
    tasks: Task[];
    onCardClick: (task: Task) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, status: Status) => void;
}

const TaskColumn = ({ status, tasks, onCardClick, onDragStart, onDrop }: TaskColumnProps) => {
    const [isOver, setIsOver] = useState(false);
    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
            onDragLeave={() => setIsOver(false)}
            onDrop={(e) => { onDrop(e, status); setIsOver(false); }}
            className={`flex-shrink-0 w-80 p-3 bg-gray-100 dark:bg-gray-900 rounded-xl transition-colors h-full ${isOver ? 'bg-primary/20' : ''}`}
        >
            <div className="flex items-center space-x-2 mb-4 px-1">
                <span className={`w-3 h-3 rounded-full ${statusConfig[status].color}`}></span>
                <h3 className="font-bold text-gray-800 dark:text-white">{statusConfig[status].title}</h3>
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5">{tasks.length}</span>
            </div>
            <div className="space-y-4 h-[calc(100%-40px)] overflow-y-auto">
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={() => onCardClick(task)} onDragStart={onDragStart} />
                ))}
            </div>
        </div>
    );
};

const TaskBoardView = ({ tasks, onSelectTask, onUpdateTask }: TaskBoardViewProps) => {

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: Status) => {
        const taskId = e.dataTransfer.getData('taskId');
        const taskToMove = tasks.find(t => t.id === taskId);
        if (taskToMove && taskToMove.status !== newStatus) {
            onUpdateTask({ ...taskToMove, status: newStatus });
        }
    };

    const tasksByStatus = useMemo(() => {
        const sortedTasks = [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return sortedTasks.reduce((acc, task) => {
          acc[task.status] = acc[task.status] || [];
          acc[task.status].push(task);
          return acc;
        }, {} as Record<Status, Task[]>);
      }, [tasks]);


    return (
        <div className="flex-grow flex space-x-6 p-4 overflow-x-auto h-full">
            {Object.values(Status).map(status => (
                <TaskColumn
                    key={status}
                    status={status}
                    tasks={tasksByStatus[status] || []}
                    onCardClick={onSelectTask}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                />
            ))}
        </div>
    );
};

export default TaskBoardView;