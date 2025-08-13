import React, { useState, useMemo } from 'react';
import { Goal, Habit, HabitLog, Task, List, Status } from '../types';
import { PlusIcon, TrophyIcon, CheckBadgeIcon, PencilIcon, TrashIcon, CheckIcon } from './icons';
import { format, subDays, isSameDay, getDay } from 'date-fns';
import AddGoalModal from './AddGoalModal';
import AddHabitModal from './AddHabitModal';

interface MomentumViewProps {
  goals: Goal[];
  habits: Habit[];
  habitLogs: HabitLog[];
  tasks: Task[];
  lists: List[];
  onUpsertGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onUpsertHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onToggleHabitLog: (habitId: string, date: Date) => void;
}

const MomentumView = (props: MomentumViewProps) => {
  const { goals, habits, habitLogs, tasks, lists, onUpsertGoal, onDeleteGoal, onUpsertHabit, onDeleteHabit, onToggleHabitLog } = props;

  const [isGoalModalOpen, setGoalModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [isHabitModalOpen, setHabitModalOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);

  const openGoalModal = (goal: Goal | null) => {
    setGoalToEdit(goal);
    setGoalModalOpen(true);
  };
  
  const openHabitModal = (habit: Habit | null) => {
    setHabitToEdit(habit);
    setHabitModalOpen(true);
  };

  const dayMap: ('sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat')[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const today = new Date();
  const todayDay = dayMap[getDay(today)];

  const habitsDueToday = useMemo(() => {
    return habits.filter(habit => {
      if (habit.frequency === 'daily') return true;
      if (Array.isArray(habit.frequency)) {
        return habit.frequency.includes(todayDay);
      }
      return false;
    });
  }, [habits, todayDay]);
  
  const last7Days = useMemo(() => {
      return Array.from({ length: 7 }, (_, i) => subDays(today, i)).reverse();
  }, [today]);

  return (
    <div className="p-6 md:p-8 flex-1 overflow-y-auto bg-brand-light dark:bg-brand-dark">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Momentum</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track your long-term goals and daily habits.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => openGoalModal(null)} className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg shadow-sm hover:bg-primary-dark transition-transform transform hover:scale-105">
            <TrophyIcon className="w-5 h-5" />
            <span>Add Goal</span>
          </button>
          <button onClick={() => openHabitModal(null)} className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-transform transform hover:scale-105">
            <CheckBadgeIcon className="w-5 h-5" />
            <span>Add Habit</span>
          </button>
        </div>
      </header>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Goals Column */}
        <div className="xl:col-span-2">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Your Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map(goal => {
              const projectTasks = goal.linkedProjectId ? tasks.filter(t => t.listId === goal.linkedProjectId) : [];
              const completedTasks = projectTasks.filter(t => t.status === Status.Done).length;
              const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
              
              return (
                <div key={goal.id} className="bg-white dark:bg-sidebar-dark p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50 flex flex-col group">
                  {goal.imageUrl && <img src={goal.imageUrl} alt={goal.title} className="w-full h-32 object-cover rounded-lg mb-4" />}
                  <div className="flex-grow">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">{goal.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 h-10 overflow-hidden">{goal.vision}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-sm mb-1.5">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
                      <span className="text-gray-500 dark:text-gray-400 font-mono">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{width: `${progress}%`}}></div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openGoalModal(goal)} className="p-2 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black text-gray-600 dark:text-gray-300"><PencilIcon className="w-4 h-4" /></button>
                      <button onClick={() => onDeleteGoal(goal.id)} className="p-2 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black text-gray-600 dark:text-gray-300"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
             {goals.length === 0 && <p className="text-sm text-center py-8 text-gray-500 dark:text-gray-400 md:col-span-2">No goals yet. Add one to get started!</p>}
          </div>
        </div>
        {/* Habits Column */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-sidebar-dark p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">Today's Habits</h3>
            <div className="space-y-3">
              {habitsDueToday.map(habit => {
                  const log = habitLogs.find(l => l.habitId === habit.id && isSameDay(new Date(l.date), today));
                  return (
                    <label key={habit.id} className="p-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors">
                        <input type="checkbox" checked={!!log} onChange={() => onToggleHabitLog(habit.id, today)} className="h-5 w-5 rounded-md border-gray-300 dark:border-gray-600 text-primary bg-transparent focus:ring-primary-dark focus:ring-2" />
                        <span className="text-sm text-gray-700 dark:text-gray-200">{habit.name}</span>
                    </label>
                  )
              })}
              {habitsDueToday.length === 0 && <p className="text-sm text-center py-8 text-gray-500 dark:text-gray-400">No habits due today.</p>}
            </div>
          </div>
          <div className="bg-white dark:bg-sidebar-dark p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">Weekly Consistency</h3>
            <div className="space-y-4">
                {habits.map(habit => (
                    <div key={habit.id} className="group relative">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{habit.name}</p>
                        <div className="flex justify-between items-center">
                            {last7Days.map(day => {
                                const log = habitLogs.find(l => l.habitId === habit.id && isSameDay(new Date(l.date), day));
                                return (
                                    <div key={day.toISOString()} className="flex flex-col items-center space-y-1">
                                        <span className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${log ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                            {log && <CheckIcon className="w-4 h-4 text-white" />}
                                        </span>
                                        <span className="text-xs text-gray-400">{format(day, 'E')}</span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="absolute top-0 right-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openHabitModal(habit)} className="p-1 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black text-gray-600 dark:text-gray-300"><PencilIcon className="w-4 h-4" /></button>
                            <button onClick={() => onDeleteHabit(habit.id)} className="p-1 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black text-gray-600 dark:text-gray-300"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
                {habits.length === 0 && <p className="text-sm text-center py-8 text-gray-500 dark:text-gray-400">No habits defined yet.</p>}
            </div>
          </div>
        </div>
      </div>
      
      <AddGoalModal 
        isOpen={isGoalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        onSave={onUpsertGoal}
        goalToEdit={goalToEdit}
        taskLists={lists.filter(l => l.type === 'task')}
      />
      <AddHabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setHabitModalOpen(false)}
        onSave={onUpsertHabit}
        habitToEdit={habitToEdit}
        goals={goals}
       />

    </div>
  );
};

export default MomentumView;