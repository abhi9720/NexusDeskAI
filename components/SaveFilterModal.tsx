import React, { useState } from 'react';
import { XMarkIcon } from './icons';

interface SaveFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
}

const SaveFilterModal = ({ isOpen, onClose, onSave }: SaveFilterModalProps) => {
    const [name, setName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave(name.trim());
        setName('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-md" onClick={onClose}>
            <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl p-8 w-full max-w-sm m-4 animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Save Filter</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
                        <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="filter-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter Name</label>
                        <input
                            type="text"
                            id="filter-name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary"
                            placeholder="e.g., High Priority Bugs"
                        />
                    </div>
                    <div className="flex justify-end pt-2 space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SaveFilterModal;