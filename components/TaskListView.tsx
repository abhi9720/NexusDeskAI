import React, { useMemo } from 'react';
import { Task, Status, Priority } from '../types';
import { ClockIcon } from './icons';
import { isToday, isTomorrow, isPast, format } from 'date-fns';

interface TaskListViewProps {
    tasks: Task[];
    onSelectTask: (task: Task) => void;
    onUpdateTask: (task: Task) => void;
}

const priorityColors: Record<Priority, { dot: string, text: string }> = {
    [Priority.High]: { dot: 'bg-red-500', text: 'text-red-500' },
    [Priority.Medium]: { dot: 'bg-yellow-500', text: 'text-yellow-500' },
    [Priority.Low]: { dot: 'bg-green-500', text: 'text-green-500' },
};

const TaskListItem = ({ task, onUpdate, onSelect }: { task: Task; onUpdate: (task: Task) => void; onSelect: (task: Task) => void; }) => {
    const handleToggleComplete = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const newStatus = e.target.checked ? Status.Done : Status.ToDo;
        onUpdate({ ...task, status: newStatus });
    };

    const dueDate = new Date(task.dueDate);
    const isOverdue = isPast(dueDate) && !isToday(dueDate) && task.status !== Status.Done;

    return (
        <div onClick={() => onSelect(task)} className="flex items-start p-3 pl-4 border-b border-gray-200 dark:border-gray-700/60 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 group cursor-pointer" >
            <input 
                type="checkbox"
                checked={task.status === Status.Done}
                onChange={handleToggleComplete}
                className="h-5 w-5 rounded-md border-gray-300 dark:border-gray-600 text-primary bg-transparent focus:ring-primary-dark focus:ring-2 mt-0.5 mr-4 flex-shrink-0"
                aria-label={`Mark task ${task.title} as ${task.status === Status.Done ? 'not complete' : 'complete'}`}
            />
            <div className="flex-grow">
                <p className={`text-gray-800 dark:text-gray-100 ${task.status === Status.Done ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>{task.title}</p>
                <div className="flex items-center text-xs space-x-3 text-gray-500 dark:text-gray-400 mt-1">
                     <span className={`flex items-center space-x-1 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span>{format(dueDate, 'MMM d')}</span>
                    </span>
                    <div className="flex items-center space-x-1">
                        <span className={`w-2 h-2 rounded-full ${priorityColors[task.priority].dot}`}></span>
                        <span>{task.priority}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TaskListGroup = ({ title, tasks, onUpdate, onSelect }: { title: string, tasks: Task[], onUpdate: (task: Task) => void; onSelect: (task: Task) => void; }) => {
    if (tasks.length === 0) return null;
    return (
        <div className="mb-4">
            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 px-4 py-2">{title}</h3>
            {tasks.map(task => (
                <TaskListItem key={task.id} task={task} onUpdate={onUpdate} onSelect={onSelect} />
            ))}
        </div>
    )
};


const TaskListView = ({ tasks, onSelectTask, onUpdateTask }: TaskListViewProps) => {

    const groupedTasks = useMemo(() => {
        const groups: Record<string, Task[]> = { overdue: [], today: [], tomorrow: [], upcoming: [], completed: [] };
        
        tasks.forEach(task => {
            if (task.status === Status.Done) {
                groups.completed.push(task);
                return;
            }
            const dueDate = new Date(task.dueDate);
            if (isPast(dueDate) && !isToday(dueDate)) {
                groups.overdue.push(task);
            } else if (isToday(dueDate)) {
                groups.today.push(task);
            } else if (isTomorrow(dueDate)) {
                groups.tomorrow.push(task);
            } else {
                groups.upcoming.push(task);
            }
        });

        // Sort tasks within each group by priority
        for (const key in groups) {
            groups[key].sort((a,b) => {
                const priorityOrder = { [Priority.High]: 0, [Priority.Medium]: 1, [Priority.Low]: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });
        }
        return groups;
      }, [tasks]);

    return (
        <div className="p-2">
            <TaskListGroup title="Overdue" tasks={groupedTasks.overdue} onUpdate={onUpdateTask} onSelect={onSelectTask} />
            <TaskListGroup title="Today" tasks={groupedTasks.today} onUpdate={onUpdateTask} onSelect={onSelectTask} />
            <TaskListGroup title="Tomorrow" tasks={groupedTasks.tomorrow} onUpdate={onUpdateTask} onSelect={onSelectTask} />
            <TaskListGroup title="Upcoming" tasks={groupedTasks.upcoming} onUpdate={onUpdateTask} onSelect={onSelectTask} />
            <TaskListGroup title="Completed" tasks={groupedTasks.completed} onUpdate={onUpdateTask} onSelect={onSelectTask} />
        </div>
    );
};

export default TaskListView;