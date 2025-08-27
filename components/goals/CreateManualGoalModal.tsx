import React, { useState, useEffect } from 'react';
import { Goal, List } from '../../types';
import { XMarkIcon, ChevronRightIcon } from '../icons';

interface CreateManualGoalModalProps {
  onClose: () => void;
  onUpsertGoal: (goal: Omit<Goal, 'id'> & { id?: number }) => void;
  lists: List[];
}

const CreateManualGoalModal = ({ onClose, onUpsertGoal, lists }: CreateManualGoalModalProps) => {
  const [title, setTitle] = useState('');
  const [motivation, setMotivation] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [linkedTaskListIds, setLinkedTaskListIds] = useState<number[]>([]);
  
  const taskLists = lists.filter(l => l.type === 'task');

  // Set a default project if none is selected
  useEffect(() => {
      if (linkedTaskListIds.length === 0 && taskLists.length > 0) {
          setLinkedTaskListIds([taskLists[0].id]);
      }
  }, [taskLists]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetDate || linkedTaskListIds.length === 0) {
        alert("Please fill out the title, target date, and link at least one task list.");
        return;
    };

    const newGoal = {
        title,
        motivation,
        targetDate: new Date(`${targetDate}T00:00:00`).toISOString(),
        linkedTaskListIds,
    };
    onUpsertGoal(newGoal as any);
    onClose();
  };

  const handleProjectLinkToggle = (listId: number) => {
    setLinkedTaskListIds(prev => {
        if(prev.includes(listId)) {
            return prev.filter(id => id !== listId);
        } else {
            return [...prev, listId];
        }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-md animate-fade-in-overlay" onClick={onClose}>
      <div className="bg-page dark:bg-page-dark rounded-2xl w-full max-w-lg animate-scale-in" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold">Create a New Goal</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><XMarkIcon className="w-6 h-6" /></button>
        </header>
        
        <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                 <div>
                    <label htmlFor="goal-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Title</label>
                    <input id="goal-title" type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full form-input mt-1 rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary"/>
                </div>
                <div>
                    <label htmlFor="goal-motivation" className="block text-sm font-medium">Motivation (Why?)</label>
                    <textarea id="goal-motivation" value={motivation} onChange={e => setMotivation(e.target.value)} rows={2} className="w-full form-textarea mt-1 rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary"/>
                </div>
                 <div>
                    <label htmlFor="goal-date" className="block text-sm font-medium">Target Date</label>
                    <input id="goal-date" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} required className="w-full form-input mt-1 rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-2">Link to Task List(s)</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto p-2 border rounded-md border-gray-300 dark:border-gray-600">
                        {taskLists.map(list => (
                            <label key={list.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer">
                                <input type="checkbox" checked={linkedTaskListIds.includes(list.id)} onChange={() => handleProjectLinkToggle(list.id)} className="h-4 w-4 rounded form-checkbox text-primary"/>
                                <span className="text-sm">{list.name}</span>
                            </label>
                        ))}
                         {taskLists.length === 0 && <p className="text-xs text-center text-gray-500">No task lists available. Please create one first.</p>}
                    </div>
                </div>
            </div>
            <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button type="submit" className="flex items-center space-x-2 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark">
                    <span>Create Goal</span>
                </button>
            </footer>
        </form>
      </div>
    </div>
  );
};

export default CreateManualGoalModal;