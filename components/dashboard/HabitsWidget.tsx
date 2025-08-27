import * as React from 'react';
import { Habit, HabitLog } from '../../types';
import { CheckBadgeIcon } from '../icons';
import { format, getDay } from 'date-fns';

interface HabitsWidgetProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  onAddHabitLog: (habitId: number, date: string) => void;
}

const HabitsWidget = ({ habits, habitLogs, onAddHabitLog }: HabitsWidgetProps) => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const dayOfWeek = getDay(today); // Sunday = 0, Monday = 1, etc.

    const todaysHabits = React.useMemo(() => {
        return habits.filter(habit => {
            if (habit.frequency === 'daily') {
                return true;
            }
            if (habit.frequency === 'weekly') {
                return habit.targetDays?.includes(dayOfWeek);
            }
            return false;
        });
    }, [habits, dayOfWeek]);

    const completedHabitIds = React.useMemo(() => {
        return new Set(
            habitLogs
                .filter(log => log.date === todayStr)
                .map(log => log.habitId)
        );
    }, [habitLogs, todayStr]);

    const handleToggle = (habitId: number) => {
        onAddHabitLog(habitId, todayStr);
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
                        const isCompleted = completedHabitIds.has(habit.id);
                        return (
                            <div
                                key={habit.id}
                                onClick={() => handleToggle(habit.id)}
                                className={`p-3 flex items-center gap-3 rounded-lg transition-all cursor-pointer ${isCompleted ? 'bg-green-100/60 dark:bg-green-900/40' : 'bg-white/50 dark:bg-black/20 hover:bg-primary/5 dark:hover:bg-primary/10'}`}
                            >
                                <div className={`w-6 h-6 flex-shrink-0 rounded-md flex items-center justify-center transition-colors border-2 ${isCompleted ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                                    {isCompleted && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className={`flex-grow text-sm text-gray-700 dark:text-gray-200 truncate ${isCompleted ? 'line-through opacity-70' : ''}`}>
                                    {habit.name}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default HabitsWidget;
