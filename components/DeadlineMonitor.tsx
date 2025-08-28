import * as React from 'react';
import { Task, Status } from '../types';
import { ExclamationTriangleIcon } from './icons';
// FIX: Import 'startOfDay' from its submodule 'date-fns/startOfDay'.
import { formatDistanceToNow, isPast, isToday, addDays, isWithinInterval, differenceInDays } from 'date-fns';
import startOfDay from 'date-fns/startOfDay';

interface DeadlineMonitorProps {
    tasks: Task[];
    onSelectItem: (task: Task) => void;
}

const DeadlineMonitor = ({ tasks, onSelectItem }: DeadlineMonitorProps) => {

    const { overdueTasks, atRiskTasks } = React.useMemo(() => {
        const today = startOfDay(new Date());
        const riskDateLimit = addDays(today, 3); // Tasks due in the next 3 days

        const overdue: Task[] = [];
        const atRisk: Task[] = [];

        tasks.forEach(task => {
            if (task.status === Status.Done) return;
            
            const dueDate = new Date(task.dueDate);
            if (isNaN(dueDate.getTime())) return; // Skip if date is invalid

            if (isPast(dueDate) && !isToday(dueDate)) {
                overdue.push(task);
            } else if (
                isWithinInterval(dueDate, { start: today, end: riskDateLimit }) &&
                (task.status === Status.ToDo || task.status === Status.Backlog)
            ) {
                atRisk.push(task);
            }
        });

        return { overdueTasks: overdue, atRiskTasks: atRisk };
    }, [tasks]);
    
    if (overdueTasks.length === 0 && atRiskTasks.length === 0) {
        return null;
    }

    const getDueDateText = (dueDateString: string, isAtRisk: boolean) => {
        const date = new Date(dueDateString);
        if (isNaN(date.getTime())) return 'Invalid Date';

        const today = startOfDay(new Date());
        if (isAtRisk) {
            if (isToday(date)) return 'Due Today';
            const diff = differenceInDays(date, today);
            return `Due in ${diff + 1} day${diff + 1 > 1 ? 's' : ''}`;
        } else { // Overdue
            return `${formatDistanceToNow(date, { addSuffix: true })}`.replace('about ', '');
        }
    };

    return (
        <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
                <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Heads Up!</h3>
            </div>
            <div className="space-y-4">
                {overdueTasks.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Overdue Tasks</h4>
                        <div className="space-y-2">
                            {overdueTasks.map(task => (
                                <div key={task.id} onClick={() => onSelectItem(task)} className="p-3 flex justify-between items-center bg-red-50/50 dark:bg-red-900/20 hover:bg-red-100/80 dark:hover:bg-red-900/40 rounded-lg cursor-pointer transition-colors">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{task.title}</span>
                                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">{getDueDateText(task.dueDate, false)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {atRiskTasks.length > 0 && (
                     <div>
                        <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">Tasks At Risk</h4>
                        <div className="space-y-2">
                            {atRiskTasks.map(task => (
                                <div key={task.id} onClick={() => onSelectItem(task)} className="p-3 flex justify-between items-center bg-yellow-50/50 dark:bg-yellow-900/20 hover:bg-yellow-100/80 dark:hover:bg-yellow-900/40 rounded-lg cursor-pointer transition-colors">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{task.title}</span>
                                    <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">{getDueDateText(task.dueDate, true)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeadlineMonitor;