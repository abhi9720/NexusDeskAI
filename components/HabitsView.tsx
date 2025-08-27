import React, { useState, useRef, useEffect } from 'react';
import { Habit, HabitLog } from '../types';
import { PlusIcon, FireIcon, EllipsisHorizontalIcon, PencilIcon, TrashIcon, CheckIcon } from './icons';
import AddHabitModal from './AddHabitModal';
import { format, getDay, isToday } from 'date-fns';
import startOfDay from 'date-fns/startOfDay';
import subDays from 'date-fns/subDays';
import * as Hi2 from 'react-icons/hi2';

interface HabitCardProps {
    habit: Habit;
    logs: HabitLog[];
    onLogToggle: (habitId: number, date: string) => void;
    onEdit: (habit: Habit) => void;
    onDelete: (habitId: number) => void;
}

const HabitCard = ({ habit, logs, onLogToggle, onEdit, onDelete }: HabitCardProps) => {
    const todayStart = startOfDay(new Date());
    const weekDates = Array.from({ length: 7 }, (_, i) => subDays(todayStart, 6 - i));
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    const logsByDate = new Set(logs.map(l => l.date));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);
    
    let currentStreak = 0;
    let streakDate = new Date();
    while (true) {
        const dateStr = format(streakDate, 'yyyy-MM-dd');
        const dayOfWeek = getDay(streakDate);

        if (new Date(habit.createdAt) > streakDate) {
            break;
        }
        
        const isTargetDay = habit.frequency === 'daily' || (habit.frequency === 'weekly' && habit.targetDays?.includes(dayOfWeek));
        
        if (isTargetDay) {
            const isCompleted = logs.some(l => l.date === dateStr);
            if (isCompleted) {
                currentStreak++;
            } else {
                 if (!isToday(streakDate)) {
                    break;
                 }
            }
        }
        
        streakDate = subDays(streakDate, 1);
        if (new Date(habit.createdAt) > streakDate) break;
    }

    const IconComponent = Hi2[habit.icon as keyof typeof Hi2];

    return (
        <div className="bg-card-light dark:bg-card-dark p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: habit.color }}>
                            {IconComponent && <IconComponent className="w-6 h-6 text-white" />}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-gray-800 dark:text-white truncate" title={habit.name}>{habit.name}</h3>
                             <div className="flex items-center gap-1.5 text-sm text-red-500 font-semibold">
                                <FireIcon className="w-4 h-4" />
                                <span>{currentStreak} Day Streak</span>
                            </div>
                        </div>
                    </div>
                     <div className="relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(p => !p)} className="p-2 -m-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <EllipsisHorizontalIcon className="w-5 h-5" />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700 animate-scale-in origin-top-right">
                                <button onClick={() => { onEdit(habit); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <PencilIcon className="w-4 h-4"/> Edit
                                </button>
                                <button onClick={() => { onDelete(habit.id); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                                    <TrashIcon className="w-4 h-4"/> Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-2">
                <div className="flex justify-between gap-1">
                    {weekDates.map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const isCompleted = logsByDate.has(dateStr);
                        const dayOfWeek = getDay(date);
        
                        const isTargetDay = habit.frequency === 'daily' || (habit.frequency === 'weekly' && habit.targetDays?.includes(dayOfWeek));
                        const isFutureDate = date > todayStart;

                        let style = 'bg-gray-200 dark:bg-gray-700/50';
                        let title = 'Not a target day';
                        let canToggle = false;

                        if (isTargetDay) {
                             canToggle = !isFutureDate;
                             title = `Target day: ${format(date, 'MMM d')}`;
                            if (isCompleted) {
                                style = 'bg-primary text-white';
                                title = `Completed on ${format(date, 'MMM d')}`;
                            } else if (isFutureDate) {
                                style = 'bg-gray-200/50 dark:bg-gray-700/30 border-2 border-dashed border-gray-300 dark:border-gray-600';
                                title = `Upcoming: ${format(date, 'MMM d')}`;
                            } else {
                                style = 'bg-gray-300/80 dark:bg-gray-600/80 hover:bg-primary/50';
                                title = isToday(date) ? 'Mark as complete' : 'Mark as complete (missed)';
                            }
                        }
                        
                        return (
                            <div key={dateStr} className="text-center flex-1">
                                <span className="text-xs text-gray-400">{format(date, 'E')}</span>
                                <button 
                                    onClick={() => canToggle && onLogToggle(habit.id, dateStr)}
                                    className={`w-full h-8 mt-1 rounded-md flex items-center justify-center ${style} ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed'} transition-colors`}
                                    title={title}
                                >
                                    {isCompleted && <CheckIcon className="w-5 h-5"/>}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

interface HabitsViewProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  onUpsertHabit: (habit: Omit<Habit, 'id' | 'createdAt'> & { id?: number }) => void;
  onDeleteHabit: (habitId: number) => void;
  onAddHabitLog: (habitId: number, date: string) => void;
}

const HabitsView = ({ habits, habitLogs, onUpsertHabit, onDeleteHabit, onAddHabitLog }: HabitsViewProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);

    const handleOpenModal = (habit?: Habit) => {
        setHabitToEdit(habit || null);
        setIsModalOpen(true);
    };

    const handleDelete = (habitId: number) => {
        if (window.confirm("Are you sure you want to delete this habit? This cannot be undone.")) {
            onDeleteHabit(habitId);
        }
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full animate-fade-in">
            <header className="flex-shrink-0 flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Habit Tracker</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all transform hover:scale-105 shadow-md"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>New Habit</span>
                </button>
            </header>

            <div className="flex-grow overflow-y-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min pb-4">
                {habits.map(habit => (
                    <HabitCard 
                        key={habit.id} 
                        habit={habit}
                        logs={habitLogs.filter(log => log.habitId === habit.id)}
                        onLogToggle={onAddHabitLog}
                        onEdit={handleOpenModal}
                        onDelete={handleDelete}
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