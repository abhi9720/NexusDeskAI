import React, { useMemo } from 'react';
import { Task, Status, Priority } from '../types';
import { ClockIcon, ChatBubbleLeftEllipsisIcon, PaperClipIcon, ListBulletIcon, CrosshairIcon, FlagIcon, LockClosedIcon } from './icons';
import { isToday, isTomorrow, isPast, format, differenceInDays } from 'date-fns';

interface TaskListViewProps {
    tasks: Task[];
    allTasks: Task[];
    onSelectTask: (task: Task) => void;
    groupBy: 'default' | 'priority' | 'status' | 'tag';
    onStartFocus: (task: Task) => void;
}

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

const priorityStyles: Record<Priority, { bg: string, text: string, icon: JSX.Element }> = {
    [Priority.High]: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-200', icon: <FlagIcon className="w-3.5 h-3.5 text-red-500" /> },
    [Priority.Medium]: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-200', icon: <FlagIcon className="w-3.5 h-3.5 text-yellow-500" /> },
    [Priority.Low]: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-200', icon: <FlagIcon className="w-3.5 h-3.5 text-green-500" /> },
};

const TaskListItem = ({ task, allTasks, onSelect, onStartFocus }: { task: Task; allTasks: Task[]; onSelect: (task: Task) => void; onStartFocus: (task: Task) => void; }) => {
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
        <div onClick={() => onSelect(task)} className="flex items-start p-3 pl-4 border-b border-gray-200 dark:border-gray-700/60 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 group cursor-pointer" >
            <div className="flex-grow">
                <p className={`text-gray-800 dark:text-gray-100 ${task.status === Status.Done ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>{task.title}</p>
                 <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
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
                    {task.comments?.length > 0 && (
                        <div className="flex items-center gap-1">
                            <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                            <span>{task.comments.length}</span>
                        </div>
                    )}
                    {task.attachments?.length > 0 && (
                        <div className="flex items-center gap-1">
                            <PaperClipIcon className="w-4 h-4" />
                            <span>{task.attachments.length}</span>
                        </div>
                    )}
                    {task.checklist?.length > 0 && (
                        <div className="flex items-center gap-1">
                            <ListBulletIcon className="w-4 h-4" />
                            <span>{task.checklist.filter(i => i.completed).length}/{task.checklist.length}</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="ml-auto flex-shrink-0 flex items-center self-center pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onStartFocus(task); }}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                    title="Focus on this task"
                >
                    <CrosshairIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const TaskListGroup = ({ title, tasks, allTasks, onSelect, onStartFocus }: { title: string, tasks: Task[], allTasks: Task[], onSelect: (task: Task) => void; onStartFocus: (task: Task) => void; }) => {
    if (tasks.length === 0) return null;
    return (
        <div className="mb-4">
            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 px-4 py-2">{title}</h3>
            {tasks.map(task => (
                <TaskListItem key={task.id} task={task} allTasks={allTasks} onSelect={onSelect} onStartFocus={onStartFocus} />
            ))}
        </div>
    )
};


const TaskListView = ({ tasks, allTasks, onSelectTask, groupBy, onStartFocus }: TaskListViewProps) => {

    const groupedTasks = useMemo(() => {
        if (groupBy === 'priority') {
            const groups: { [key: string]: Task[] } = {};
            tasks.forEach(task => {
                if (!groups[task.priority]) groups[task.priority] = [];
                groups[task.priority].push(task);
            });
            return groups;
        } else if (groupBy === 'status') {
            const groups: { [key: string]: Task[] } = {};
             tasks.forEach(task => {
                if (!groups[task.status]) groups[task.status] = [];
                groups[task.status].push(task);
            });
            return groups;
        } else if (groupBy === 'tag') {
            const tagGroups: { [key: string]: Task[] } = { 'Untagged': [] };
            tasks.forEach(task => {
                if (task.tags.length === 0) {
                    tagGroups['Untagged'].push(task);
                } else {
                    task.tags.forEach(tag => {
                        const groupKey = `#${tag}`;
                        if (!tagGroups[groupKey]) tagGroups[groupKey] = [];
                        tagGroups[groupKey].push(task);
                    });
                }
            });
            return tagGroups;
        } else { // default
            const dateGroups: Record<string, Task[]> = { overdue: [], today: [], tomorrow: [], upcoming: [], completed: [] };
            tasks.forEach(task => {
                 if (task.status === Status.Done) {
                    dateGroups.completed.push(task);
                    return;
                }
                const dueDate = new Date(task.dueDate);
                if (isNaN(dueDate.getTime())) return; // Skip invalid dates
                
                if (isPast(dueDate) && !isToday(dueDate)) {
                    dateGroups.overdue.push(task);
                } else if (isToday(dueDate)) {
                    dateGroups.today.push(task);
                } else if (isTomorrow(dueDate)) {
                    dateGroups.tomorrow.push(task);
                } else {
                    dateGroups.upcoming.push(task);
                }
            });
            return dateGroups;
        }
    }, [tasks, groupBy]);
    
    const groupOrder = useMemo(() => {
        switch (groupBy) {
            case 'priority':
                return [Priority.High, Priority.Medium, Priority.Low];
            case 'status':
                return [Status.Backlog, Status.ToDo, Status.InProgress, Status.Review, Status.Waiting, Status.Done];
            case 'tag':
                const sortedTags = Object.keys(groupedTasks).sort();
                if (sortedTags.includes('Untagged')) {
                    return [...sortedTags.filter(t => t !== 'Untagged'), 'Untagged'];
                }
                return sortedTags;
            case 'default':
            default:
                return ['overdue', 'today', 'tomorrow', 'upcoming', 'completed'];
        }
    }, [groupBy, groupedTasks]);

    return (
        <div className="p-2">
            {groupOrder.map(groupKey => {
                const tasksInGroup = groupedTasks[groupKey];
                if (!tasksInGroup || tasksInGroup.length === 0) return null;
                const title = groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
                return (
                    <TaskListGroup 
                        key={groupKey}
                        title={title} 
                        tasks={tasksInGroup} 
                        allTasks={allTasks}
                        onSelect={onSelectTask} 
                        onStartFocus={onStartFocus}
                    />
                );
            })}
        </div>
    );
};

export default TaskListView;
