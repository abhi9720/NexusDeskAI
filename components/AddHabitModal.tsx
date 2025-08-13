import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Habit, Goal, HabitFrequency } from '../types';
import { XMarkIcon, CheckBadgeIcon } from './icons';

interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habit: Habit) => void;
  habitToEdit: Habit | null;
  goals: Goal[];
}

type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
const weekdays: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const AddHabitModal = ({ isOpen, onClose, onSave, habitToEdit, goals }: AddHabitModalProps) => {
  const [name, setName] = useState('');
  const [frequencyType, setFrequencyType] = useState<'daily' | 'weekly'>('daily');
  const [selectedDays, setSelectedDays] = useState<Set<Day>>(new Set());
  const [linkedGoalId, setLinkedGoalId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setName(habitToEdit.name);
        setLinkedGoalId(habitToEdit.linkedGoalId);
        if (habitToEdit.frequency === 'daily') {
          setFrequencyType('daily');
          setSelectedDays(new Set());
        } else {
          setFrequencyType('weekly');
          setSelectedDays(new Set(habitToEdit.frequency as Day[]));
        }
      } else {
        setName('');
        setFrequencyType('daily');
        setSelectedDays(new Set());
        setLinkedGoalId(null);
      }
    }
  }, [isOpen, habitToEdit]);

  if (!isOpen) return null;

  const toggleDay = (day: Day) => {
    const newDays = new Set(selectedDays);
    if (newDays.has(day)) {
      newDays.delete(day);
    } else {
      newDays.add(day);
    }
    setSelectedDays(newDays);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let frequency: HabitFrequency;
    if (frequencyType === 'daily') {
        frequency = 'daily';
    } else {
        if (selectedDays.size === 0) {
            alert('Please select at least one day for a weekly habit.');
            return;
        }
        frequency = Array.from(selectedDays);
    }

    const habitData: Habit = {
      id: habitToEdit?.id || uuidv4(),
      name,
      frequency,
      linkedGoalId,
    };
    onSave(habitData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-brand-light dark:bg-brand-dark rounded-2xl shadow-2xl p-8 w-full max-w-md m-4 transform transition-all animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <CheckBadgeIcon className="w-6 h-6 text-primary" />
            {habitToEdit ? 'Edit Habit' : 'Add New Habit'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
            <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="habit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Habit Name</label>
            <input type="text" id="habit-name" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary" placeholder="e.g., Meditate for 10 minutes" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frequency</label>
            <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="frequency" value="daily" checked={frequencyType === 'daily'} onChange={() => setFrequencyType('daily')} className="form-radio text-primary focus:ring-primary" />
                    <span className="text-sm">Daily</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="frequency" value="weekly" checked={frequencyType === 'weekly'} onChange={() => setFrequencyType('weekly')} className="form-radio text-primary focus:ring-primary" />
                    <span className="text-sm">Weekly</span>
                </label>
            </div>
            {frequencyType === 'weekly' && (
                <div className="mt-4 flex justify-between space-x-1">
                    {weekdays.map(day => (
                        <button key={day} type="button" onClick={() => toggleDay(day)} className={`w-10 h-10 rounded-full text-xs font-semibold uppercase transition-colors ${selectedDays.has(day) ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                            {day}
                        </button>
                    ))}
                </div>
            )}
          </div>
          <div>
            <label htmlFor="habit-linked-goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link to Goal (Optional)</label>
            <select id="habit-linked-goal" value={linkedGoalId || ''} onChange={e => setLinkedGoalId(e.target.value || null)} className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary">
              <option value="">None</option>
              {goals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
            </select>
          </div>
          <div className="flex justify-end pt-4">
            <button type="submit" className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors transform hover:scale-105">
              {habitToEdit ? 'Save Changes' : 'Add Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddHabitModal;
