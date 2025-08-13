import React from 'react';
import { TaskFilter, Status, Priority } from '../types';
import { XMarkIcon } from './icons';

interface TaskFilterBarProps {
    filter: TaskFilter;
    onFilterChange: React.Dispatch<React.SetStateAction<TaskFilter>>;
    onSaveFilter: () => void;
}

const TaskFilterBar = ({ filter, onFilterChange, onSaveFilter }: TaskFilterBarProps) => {
    
    const clearFilters = () => {
        onFilterChange({ status: 'all', priority: 'all', keyword: '', overdue: false });
    }

    return (
        <div className="flex-shrink-0 flex flex-wrap gap-4 w-full p-3 bg-gray-100/50 dark:bg-gray-800/20 items-center border-b border-gray-200 dark:border-gray-700/80">
            <input 
                type="text"
                placeholder="Filter by keyword..."
                value={filter.keyword}
                onChange={e => onFilterChange(prev => ({...prev, keyword: e.target.value}))}
                className="flex-grow pl-4 pr-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
                aria-label="Filter tasks by keyword"
            />
            <select
                value={filter.status}
                onChange={e => onFilterChange(prev => ({...prev, status: e.target.value as Status | 'all'}))}
                className="w-full sm:w-auto appearance-none pl-4 pr-10 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
                aria-label="Filter tasks by status"
            >
                <option value="all">All Statuses</option>
                {Object.values(Status).map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
            <select
                value={filter.priority}
                onChange={e => onFilterChange(prev => ({...prev, priority: e.target.value as Priority | 'all'}))}
                className="w-full sm:w-auto appearance-none pl-4 pr-10 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
                aria-label="Filter tasks by priority"
            >
                <option value="all">All Priorities</option>
                {Object.values(Priority).map(p => (<option key={p} value={p}>{p}</option>))}
            </select>
            <button onClick={onSaveFilter} className="px-3 py-2 text-sm text-primary bg-primary/10 hover:bg-primary/20 rounded-lg font-semibold transition-colors">
                Save Filter
            </button>
            <button onClick={clearFilters} className="p-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

export default TaskFilterBar;