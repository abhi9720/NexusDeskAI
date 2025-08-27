import * as React from 'react';
import { Task, Goal, GoalInsight, Status } from '../../types';
import { ExclamationTriangleIcon, FlagIcon, TrophyIcon, CheckCircleIcon } from '../icons';
import { formatDistanceToNow, isPast, isToday, addDays, isWithinInterval, differenceInDays } from 'date-fns';
import startOfDay from 'date-fns/startOfDay';

interface HeadsUpWidgetProps {
  tasks: Task[];
  goals: Goal[];
  insights: Map<number, GoalInsight>;
  isLoading: boolean;
  onSelectItem: (task: Task) => void;
  onSelectGoal: (goalId: number) => void;
}

const HeadsUpWidget = ({ tasks, goals, insights, isLoading, onSelectItem, onSelectGoal }: HeadsUpWidgetProps) => {
    
    const { overdueTasks, atRiskTasks } = React.useMemo(() => {
        const today = startOfDay(new Date());
        const riskDateLimit = addDays(today, 3); // Tasks due in the next 3 days

        const overdue: Task[] = [];
        const atRisk: Task[] = [];

        tasks.forEach(task => {
            if (task.status === Status.Done) return;
            
            const dueDate = new Date(task.dueDate);
            if (isNaN(dueDate.getTime())) return;

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

    const atRiskGoals = React.useMemo(() => {
        return goals.filter(g => {
            const insight = insights.get(g.id);
            return insight && (insight.riskLevel === 'Medium' || insight.riskLevel === 'High');
        });
    }, [goals, insights]);

    if (isLoading) {
        return (
            <div className="bg-card-light/60 dark:bg-card-dark/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg rounded-2xl p-6">
                 <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4 animate-pulse"></div>
                 <div className="space-y-2">
                     <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                     <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                 </div>
            </div>
        )
    }

    if (overdueTasks.length === 0 && atRiskTasks.length === 0 && atRiskGoals.length === 0) {
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
        } else {
            return `${formatDistanceToNow(date, { addSuffix: true })}`;
        }
    };

    return (
         <div className="bg-card-light/60 dark:bg-card-dark/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
                <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Heads Up!</h3>
            </div>
            <div className="space-y-4">
                {overdueTasks.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Overdue Tasks</h4>
                        <div className="space-y-2">
                            {overdueTasks.slice(0, 2).map(task => (
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
                            {atRiskTasks.slice(0, 2).map(task => (
                                <div key={task.id} onClick={() => onSelectItem(task)} className="p-3 flex justify-between items-center bg-yellow-50/50 dark:bg-yellow-900/20 hover:bg-yellow-100/80 dark:hover:bg-yellow-900/40 rounded-lg cursor-pointer transition-colors">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{task.title}</span>
                                    <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">{getDueDateText(task.dueDate, true)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                 {atRiskGoals.length > 0 && (
                     <div>
                        <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">Goals At Risk</h4>
                        <div className="space-y-2">
                            {atRiskGoals.slice(0, 2).map(goal => {
                                const insight = insights.get(goal.id);
                                const isHighRisk = insight?.riskLevel === 'High';
                                return (
                                <div key={goal.id} onClick={() => onSelectGoal(goal.id)} className={`p-3 rounded-lg cursor-pointer transition-colors ${isHighRisk ? 'bg-red-50/50 dark:bg-red-900/20' : 'bg-yellow-50/50 dark:bg-yellow-900/20'}`}>
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{goal.title}</p>
                                        <span className={`text-xs font-bold flex-shrink-0 ml-2 ${isHighRisk ? 'text-red-500' : 'text-yellow-500'}`}>{insight?.riskLevel} Risk</span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{insight?.riskReasoning}</p>
                                </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HeadsUpWidget;