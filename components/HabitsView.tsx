import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Habit, HabitLog } from '../types';
import { PlusIcon, FireIcon, EllipsisHorizontalIcon, PencilIcon, TrashIcon, CheckIcon, ArchiveBoxIcon, ArchiveBoxXMarkIcon, MinusIcon, CheckBadgeIcon } from './icons';
import AddHabitModal from './AddHabitModal';
import { format, getDay, isToday, addDays } from 'date-fns';
import startOfWeek from 'date-fns/startOfWeek';
import subDays from 'date-fns/subDays';
import * as Hi2 from 'react-icons/hi2';

const getStreak = (logs: HabitLog[], habit: Habit): number => {
    if (!logs || logs.length === 0) return 0;

    let currentStreak = 0;
    let streakDate = new Date();
    const logsByDate = new Set(logs.map(l => l.date));

    while (true) {
        const dateStr = format(streakDate, 'yyyy-MM-dd');
        const dayOfWeek = getDay(streakDate);

        if (new Date(habit.createdAt) > streakDate) break;
        
        const isTargetDay = habit.frequency === 'daily' || (habit.frequency === 'weekly' && habit.targetDays?.includes(dayOfWeek));
        
        if (isTargetDay) {
            const isCompleted = logsByDate.has(dateStr);
            if (isCompleted) {
                currentStreak++;
            } else {
                 if (!isToday(streakDate)) break;
            }
        }
        
        streakDate = subDays(streakDate, 1);
        if (new Date(habit.createdAt) > streakDate) break;
    }
    return currentStreak;
}

const HabitCard = ({ habit, logs, onLog, onEdit, onDelete, onArchiveToggle }: { habit: Habit; logs: HabitLog[]; onLog: (habitId: number, date: string, value?: number) => void; onEdit: (habit: Habit) => void; onDelete: (habitId: number) => void; onArchiveToggle: (habit: Habit) => void; }) => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [editingLog, setEditingLog] = useState<{ date: string; value: number | string } | null>(null);
    
    const logsByDate = useMemo(() => new Map(logs.map(l => [l.date, l])), [logs]);
    const currentStreak = useMemo(() => getStreak(logs, habit), [logs, habit]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const IconComponent = Hi2[habit.icon as keyof typeof Hi2];

    const handleLogInput = (date: string) => {
        if (!editingLog) return;
        const value = typeof editingLog.value === 'string' ? parseFloat(editingLog.value) : editingLog.value;
        if (!isNaN(value)) {
            onLog(habit.id, date, value);
        }
        setEditingLog(null);
    };

    const getHabitInfoText = (h: Habit): string | null => {
        const infoParts: string[] = [];
        if (h.type === 'quantitative' && h.goalValue) {
            infoParts.push(`${h.goalValue} ${h.goalUnit || ''}`.trim());
        }

        switch (h.frequency) {
            case 'daily':
                // FIX: This comparison appears to be unintentional because the types '"daily"' and '"weekly"' have no overlap.
                if (h.type === 'quantitative') {
                    infoParts.push('Daily');
                }
                break;
            case 'weekly':
                if (h.targetDays && h.targetDays.length > 0 && h.targetDays.length < 7) {
                    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    infoParts.push([...h.targetDays].sort((a,b) => a-b).map(d => daysOfWeek[d]).join(', '));
                } else {
                     infoParts.push('Daily');
                }
                break;
            case 'x_times_per_week':
                infoParts.push(`${h.frequencyValue || 1}x a week`);
                break;
        }
        
        if (infoParts.length === 1 && infoParts[0] === 'Daily' && h.type === 'binary') {
            return null;
        }
        
        return infoParts.join(' • ') || null;
    };
    
    const habitInfo = getHabitInfoText(habit);

    return (
        <div className="bg-card-light dark:bg-card-dark p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: habit.color }}>
                        {IconComponent && <IconComponent className="w-6 h-6 text-white" />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-white truncate" title={habit.name}>{habit.name}</h3>
                         <div className="flex items-center gap-1.5 text-sm text-red-500 font-semibold">
                            <FireIcon className="w-4 h-4" />
                            <span>{currentStreak} day streak</span>
                        </div>
                        {habitInfo && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <CheckBadgeIcon className="w-4 h-4" />
                                <span>{habitInfo}</span>
                            </div>
                        )}
                    </div>
                </div>
                 <div className="relative" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(p => !p)} className="p-2 -m-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <EllipsisHorizontalIcon className="w-5 h-5" />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700 animate-scale-in origin-top-right py-1">
                            <button onClick={() => { onEdit(habit); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"><PencilIcon className="w-4 h-4"/> Edit</button>
                            <button onClick={() => { onArchiveToggle(habit); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700">{habit.isArchived ? <ArchiveBoxXMarkIcon className="w-4 h-4"/> : <ArchiveBoxIcon className="w-4 h-4"/>} {habit.isArchived ? 'Unarchive' : 'Archive'}</button>
                            <button onClick={() => { onDelete(habit.id); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><TrashIcon className="w-4 h-4"/> Delete</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-between gap-1 mt-auto">
                {weekDates.map(date => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const log = logsByDate.get(dateStr);
                    const isCompleted = !!log && (habit.type === 'binary' ? log.completedValue === 1 : (log.completedValue || 0) >= (habit.goalValue || 1));
                    const isTodayDate = isToday(date);
                    const isPastDay = !isTodayDate && date < new Date();
                    const dayOfWeekForDate = getDay(date);
                    const isTargetDay = habit.frequency === 'daily' || (habit.frequency === 'weekly' && habit.targetDays?.includes(dayOfWeekForDate));
                    const isMissed = isPastDay && isTargetDay && !isCompleted;

                    let buttonClass = 'w-full h-8 mt-1 rounded-md flex items-center justify-center text-xs font-semibold transition-colors';
                    let buttonContent: React.ReactNode = null;

                    if (isCompleted) {
                        buttonClass += ' bg-primary text-white';
                        buttonContent = <CheckIcon className="w-5 h-5"/>;
                    } else if (isMissed) {
                        buttonClass += ' bg-red-200/60 dark:bg-red-900/40 cursor-not-allowed';
                        buttonContent = <MinusIcon className="w-4 h-4 text-red-600 dark:text-red-400"/>;
                    } else if (isTodayDate) {
                        buttonClass += ' bg-gray-200 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600';
                        if (habit.type === 'quantitative') {
                            buttonContent = <span className="text-gray-700 dark:text-gray-200">{log?.completedValue || '0'}</span>;
                        } else {
                            buttonContent = <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>;
                        }
                    } else { // Future day, or non-target past day
                        buttonClass += ' bg-gray-200 dark:bg-gray-700/50 cursor-not-allowed';
                        if (habit.type === 'quantitative') {
                            buttonContent = <span className="text-gray-500 dark:text-gray-400">{log?.completedValue || '0'}</span>;
                        }
                    }
                    
                    return (
                        <div key={dateStr} className="text-center flex-1">
                            <span className="text-xs text-gray-400">{format(date, 'E')}</span>
                            {editingLog?.date === dateStr ? (
                                <input
                                    type="number"
                                    autoFocus
                                    value={editingLog.value}
                                    onChange={e => setEditingLog({...editingLog, value: e.target.value})}
                                    onBlur={() => handleLogInput(dateStr)}
                                    onKeyDown={e => e.key === 'Enter' && handleLogInput(dateStr)}
                                    className="w-full h-8 mt-1 rounded-md text-center bg-white dark:bg-gray-700 border-primary ring-1 ring-primary"
                                />
                            ) : (
                                <button
                                    onClick={() => {
                                        if (!isTodayDate) return;
                                        if (habit.type === 'binary') {
                                            onLog(habit.id, dateStr);
                                        } else {
                                            setEditingLog({date: dateStr, value: log?.completedValue || '' });
                                        }
                                    }}
                                    className={buttonClass}
                                >
                                    {buttonContent}
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
}


const HabitsView = ({ habits, habitLogs, onUpsertHabit, onDeleteHabit, onAddHabitLog }: { habits: Habit[]; habitLogs: HabitLog[]; onUpsertHabit: (habit: Omit<Habit, 'id' | 'createdAt'> & { id?: number }) => void; onDeleteHabit: (habitId: number) => void; onAddHabitLog: (habitId: number, date: string, value?: number) => void; }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    const handleOpenModal = (habit?: Habit) => {
        setHabitToEdit(habit || null);
        setIsModalOpen(true);
    };

    const handleDelete = (habitId: number) => {
        if (window.confirm("Are you sure you want to delete this habit? This cannot be undone.")) {
            onDeleteHabit(habitId);
        }
    }

    const handleArchiveToggle = (habit: Habit) => {
        onUpsertHabit({ ...habit, isArchived: !habit.isArchived });
    };

    const handleLog = (habitId: number, date: string, value?: number) => {
        onAddHabitLog(habitId, date, value);
    }
    
    const { activeHabits, archivedHabits } = useMemo(() => {
        const active: Habit[] = [];
        const archived: Habit[] = [];
        habits.forEach(h => (h.isArchived ? archived : active).push(h));
        return { activeHabits: active, archivedHabits: archived };
    }, [habits]);

    const habitsToDisplay = showArchived ? archivedHabits : activeHabits;

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full animate-fade-in">
            <header className="flex-shrink-0 flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Habit Tracker</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowArchived(s => !s)} className="px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-200/50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">{showArchived ? 'Show Active' : 'Show Archived'}</button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all transform hover:scale-105 shadow-md"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>New Habit</span>
                    </button>
                </div>
            </header>

            <div className="flex-grow overflow-y-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min pb-4">
                {habitsToDisplay.map(habit => (
                    <HabitCard 
                        key={habit.id} 
                        habit={habit}
                        logs={habitLogs.filter(log => log.habitId === habit.id)}
                        onLog={handleLog}
                        onEdit={handleOpenModal}
                        onDelete={handleDelete}
                        onArchiveToggle={handleArchiveToggle}
                    />
                ))}
                {habits.length === 0 && (
                    <div className="lg:col-span-2 xl:col-span-3 h-full flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
                        <p>No habits yet. Click "New Habit" to build a new routine!</p>
                    </div>
                )}
            </div>

            <AddHabitModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={onUpsertHabit}
                habitToEdit={habitToEdit}
            />
        </div>
    );
};

export default HabitsView;
