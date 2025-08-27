import React, { useState } from 'react';
import { CustomReminder } from '../types';
import { BellIcon, PlusIcon, TrashIcon, CheckCircleIcon, ClockIcon, CheckIcon } from './icons';
import { format, isPast } from 'date-fns';

interface RemindersViewProps {
  reminders: CustomReminder[];
  onUpsertReminder: (reminder: Omit<CustomReminder, 'id' | 'createdAt' | 'isCompleted'> & { id?: number, isCompleted?: boolean }) => void;
  onDeleteReminder: (reminderId: number) => void;
}

const RemindersView = ({ reminders, onUpsertReminder, onDeleteReminder }: RemindersViewProps) => {
    const [newReminderTitle, setNewReminderTitle] = useState('');
    const [newReminderDate, setNewReminderDate] = useState('');
    const [newReminderTime, setNewReminderTime] = useState('');

    const handleAddReminder = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReminderTitle.trim() || !newReminderDate || !newReminderTime) {
            alert('Please fill out all fields for the reminder.');
            return;
        }
        const remindAt = new Date(`${newReminderDate}T${newReminderTime}`).toISOString();
        onUpsertReminder({ title: newReminderTitle, remindAt });
        setNewReminderTitle('');
        setNewReminderDate('');
        setNewReminderTime('');
    };
    
    const handleToggleComplete = (reminder: CustomReminder) => {
        onUpsertReminder({ ...reminder, isCompleted: !reminder.isCompleted });
    };

    const upcomingReminders = reminders.filter(r => !r.isCompleted && !isPast(new Date(r.remindAt))).sort((a,b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
    const pastReminders = reminders.filter(r => r.isCompleted || isPast(new Date(r.remindAt))).sort((a,b) => new Date(b.remindAt).getTime() - new Date(a.remindAt).getTime());

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
            <header className="flex-shrink-0 flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <BellIcon className="w-8 h-8 text-primary"/>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Reminders</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your custom, one-off reminders.</p>
                    </div>
                </div>
            </header>

            <form onSubmit={handleAddReminder} className="mb-6 flex-shrink-0 flex flex-col sm:flex-row gap-2 p-4 bg-card-light dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50">
                <input
                    type="text"
                    value={newReminderTitle}
                    onChange={e => setNewReminderTitle(e.target.value)}
                    placeholder="Remind me to..."
                    className="flex-grow form-input rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary"
                />
                <input
                    type="date"
                    value={newReminderDate}
                    onChange={e => setNewReminderDate(e.target.value)}
                    className="form-input rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary"
                />
                <input
                    type="time"
                    value={newReminderTime}
                    onChange={e => setNewReminderTime(e.target.value)}
                    className="form-input rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary"
                />
                <button type="submit" className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2">
                    <PlusIcon className="w-5 h-5"/>
                    <span>Add</span>
                </button>
            </form>

            <div className="flex-grow overflow-y-auto">
                {upcomingReminders.length > 0 && <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Upcoming</h3>}
                <div className="space-y-2 mb-6">
                    {upcomingReminders.map(r => (
                        <ReminderItem key={r.id} reminder={r} onToggle={handleToggleComplete} onDelete={onDeleteReminder} />
                    ))}
                </div>
                {pastReminders.length > 0 && <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Past & Completed</h3>}
                <div className="space-y-2">
                    {pastReminders.map(r => (
                        <ReminderItem key={r.id} reminder={r} onToggle={handleToggleComplete} onDelete={onDeleteReminder} />
                    ))}
                </div>
                 {reminders.length === 0 && (
                    <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                        <p>No custom reminders yet. Add one above to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ReminderItem = ({ reminder, onToggle, onDelete }: { reminder: CustomReminder; onToggle: (r: CustomReminder) => void; onDelete: (id: number) => void; }) => {
    const isPastReminder = !reminder.isCompleted && isPast(new Date(reminder.remindAt));
    return (
        <div className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${reminder.isCompleted ? 'bg-green-50 dark:bg-green-900/20' : isPastReminder ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-sidebar-dark'}`}>
            <button onClick={() => onToggle(reminder)}>
                 <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-colors ${reminder.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-400'}`}>
                    {reminder.isCompleted && <CheckIcon className="w-4 h-4 text-white" />}
                </div>
            </button>
            <div className="flex-grow">
                <p className={`text-sm ${reminder.isCompleted ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>{reminder.title}</p>
                <div className={`text-xs flex items-center gap-1 ${isPastReminder ? 'text-red-500 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                    <ClockIcon className="w-3 h-3" />
                    <span>{format(new Date(reminder.remindAt), 'MMM d, yyyy @ h:mm a')}</span>
                </div>
            </div>
            <button onClick={() => onDelete(reminder.id)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
        </div>
    )
}

export default RemindersView;