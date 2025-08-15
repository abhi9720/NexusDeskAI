import React, { useState, useEffect } from 'react';
import { Goal, List } from '../types';
import { XMarkIcon, CrosshairIcon } from './icons';
import { format } from 'date-fns';

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Omit<Goal, 'id'> & { id?: number }) => void;
  goalToEdit: Goal | null;
  taskLists: List[];
}

const AddGoalModal = ({ isOpen, onClose, onSave, goalToEdit, taskLists }: AddGoalModalProps) => {
  const [title, setTitle] = useState('');
  const [vision, setVision] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [linkedProjectId, setLinkedProjectId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (goalToEdit) {
        setTitle(goalToEdit.title);
        setVision(goalToEdit.vision);
        setTargetDate(format(new Date(goalToEdit.targetDate), 'yyyy-MM-dd'));
        setLinkedProjectId(goalToEdit.linkedProjectId);
        setImageUrl(goalToEdit.imageUrl || '');
      } else {
        setTitle('');
        setVision('');
        setTargetDate('');
        setLinkedProjectId(null);
        setImageUrl('');
      }
    }
  }, [isOpen, goalToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetDate) {
      alert("Please provide a title and a target date.");
      return;
    }
    
    const goalData = {
      title,
      vision,
      targetDate: new Date(targetDate).toISOString(),
      linkedProjectId,
      imageUrl: imageUrl || undefined,
    };

    if (goalToEdit) {
        onSave({ ...goalToEdit, ...goalData });
    } else {
        onSave(goalData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-brand-light dark:bg-brand-dark rounded-2xl shadow-2xl p-8 w-full max-w-lg m-4 transform transition-all animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <CrosshairIcon className="w-6 h-6 text-primary" />
            {goalToEdit ? 'Edit Goal' : 'Add New Goal'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
            <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="goal-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Title</label>
            <input type="text" id="goal-title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary" placeholder="e.g., Run a 10k race" />
          </div>
          <div>
            <label htmlFor="goal-vision" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vision / "The Why"</label>
            <textarea id="goal-vision" value={vision} onChange={e => setVision(e.target.value)} rows={3} className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary" placeholder="What's your motivation for this goal?" />
          </div>
          <div>
            <label htmlFor="goal-target-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Date</label>
            <input type="date" id="goal-target-date" value={targetDate} onChange={e => setTargetDate(e.target.value)} required className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary" />
          </div>
          <div>
            <label htmlFor="goal-linked-project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link to Project (for auto-progress)</label>
            <select id="goal-linked-project" value={linkedProjectId || ''} onChange={e => setLinkedProjectId(e.target.value ? Number(e.target.value) : null)} className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary">
              <option value="">None</option>
              {taskLists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="goal-image-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image URL (Optional)</label>
            <input type="text" id="goal-image-url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary" placeholder="https://example.com/image.png" />
          </div>
          <div className="flex justify-end pt-4">
            <button type="submit" className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors transform hover:scale-105">
              {goalToEdit ? 'Save Changes' : 'Add Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGoalModal;