import * as React from 'react';
import { Habit, HabitLog } from '../../types';
import { CheckBadgeIcon, FireIcon } from '../icons';
import { format, getDay, isToday, isSameDay } from 'date-fns';
import subDays from 'date-fns/subDays';

interface HabitsWidgetProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  onAddHabitLog: (habitId: number, date: string, value?: number) => void;
}

const HabitsWidget = ({ habits, habitLogs, onAddHabitLog }: HabitsWidgetProps) => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const dayOfWeek = getDay(today);

    const todaysHabits = React.useMemo(() => {
        return habits.filter(habit => {
            if (habit.isArchived) return false;
            
            if (habit.frequency === 'daily') {
                return true;
            }
            if (habit.frequency === 'weekly') {
                return habit.targetDays?.includes(dayOfWeek);
            }
            if (habit.frequency === 'x_times_per_week') {
                // This is a simplification for the widget. More complex logic would be needed
                // to check if the goal for the week has been met. For now, show it daily.
                return true; 
            }
            return false;
        });
    }, [habits, dayOfWeek]);

    const logsForToday = React.useMemo(() => {
        return new Map(
            habitLogs
                .filter(log => log.date === todayStr)
                .map(log => [log.habitId, log])
        );
    }, [habitLogs, todayStr]);

    const handleLog = (habit: Habit) => {
        if (habit.type === 'binary') {
            onAddHabitLog(habit.id, todayStr, logsForToday.has(habit.id) ? 0 : 1);
        } else {
            // For quantitative, this would typically open a modal or inline input.
            // For simplicity in the widget, we can increment by 1 or a default step.
            const currentValue = logsForToday.get(habit.id)?.completedValue || 0;
            onAddHabitLog(habit.id, todayStr, currentValue + 1);
        }
    };

    return (
        <div className="bg-card-light/60 dark:bg-card-dark/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <CheckBadgeIcon className="w-6 h-6 text-primary" />
                <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Today's Habits</h3>
            </div>
            {todaysHabits.length === 0 ? (
                <p className="text-sm text-center py-8 text-gray-500 dark:text-gray-400">No habits scheduled for today.</p>
            ) : (
                <div className="space-y-3">
                    {todaysHabits.map(habit => {
                        const log = logsForToday.get(habit.id);
                        const isCompleted = !!log && (habit.type === 'binary' ? log.completedValue === 1 : (log.completedValue || 0) >= (habit.goalValue || 1));
                        
                        return (
                            <div
                                key={habit.id}
                                onClick={() => handleLog(habit)}
                                className={`p-3 flex items-center gap-3 rounded-lg transition-all cursor-pointer ${isCompleted ? 'bg-green-100/60 dark:bg-green-900/40' : 'bg-white/50 dark:bg-black/20 hover:bg-primary/5 dark:hover:bg-primary/10'}`}
                            >
                                <div className={`w-6 h-6 flex-shrink-0 rounded-md flex items-center justify-center transition-colors border-2 ${isCompleted ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                                    {isCompleted && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <span className={`text-sm text-gray-700 dark:text-gray-200 truncate ${isCompleted ? 'line-through opacity-70' : ''}`}>
                                        {habit.name}
                                    </span>
                                </div>
                                {habit.type === 'quantitative' && (
                                     <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                        {log?.completedValue || 0} / {habit.goalValue} {habit.goalUnit}
                                     </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default HabitsWidget;
