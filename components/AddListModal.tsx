import React, { useState, useEffect } from 'react';
import { List } from '../types';
import { XMarkIcon } from './icons';

interface AddListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddList: (list: Omit<List, 'id' | 'statuses'>) => void;
  onUpdateList: (list: List) => void;
  listToEdit?: List | null;
  defaultType?: 'task' | 'note';
}

const colorOptions = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E', '#10B981',
  '#06B6D4', '#3B82F6', '#8b64fd', '#A78BFA', '#EC4899', '#78716C'
];

const AddListModal = ({ isOpen, onClose, onAddList, onUpdateList, listToEdit, defaultType = 'task' }: AddListModalProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(colorOptions[8]);
  const [type, setType] = useState<'task' | 'note'>(defaultType);
  const [defaultView, setDefaultView] = useState<'list' | 'board' | 'calendar'>('list');

  useEffect(() => {
    if (isOpen) {
        if (listToEdit) {
            setName(listToEdit.name);
            setColor(listToEdit.color);
            setType(listToEdit.type);
            setDefaultView(listToEdit.defaultView || 'list');
        } else {
            setName('');
            setColor(colorOptions[8]);
            setType(defaultType);
            setDefaultView('list');
        }
    }
  }, [isOpen, listToEdit, defaultType]);


  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (listToEdit) {
        onUpdateList({ ...listToEdit, name, color, type, defaultView: type === 'task' ? defaultView : undefined });
    } else {
        onAddList({ name, color, type, defaultView: type === 'task' ? defaultView : undefined });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl p-8 w-full max-w-md m-4 transform transition-all animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{listToEdit ? 'Edit List' : `Add ${type === 'task' ? 'Task' : 'Note'} List`}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
            <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="list-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">List Name</label>
            <input
              type="text"
              id="list-name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., Project Phoenix"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">List Color</label>
            <div className="grid grid-cols-6 gap-2">
              {colorOptions.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-full transition-transform transform hover:scale-110 flex-shrink-0 ${color === c ? 'ring-2 ring-offset-2 ring-offset-card-light dark:ring-offset-card-dark ring-primary' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>
          {type === 'task' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default View</label>
              <select
                  value={defaultView}
                  onChange={e => setDefaultView(e.target.value as 'list' | 'board' | 'calendar')}
                  className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary"
              >
                  <option value="list">List</option>
                  <option value="board">Board</option>
                  <option value="calendar">Calendar</option>
              </select>
            </div>
          )}
          <div className="flex justify-end pt-4 space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                Cancel
            </button>
            <button type="submit" className="px-5 py-2 text-sm bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors transform hover:scale-105">
              {listToEdit ? 'Save Changes' : 'Add List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddListModal;