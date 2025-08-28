import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task, Status, Priority } from '../types';
import { format, isPast, isToday } from 'date-fns';
import { FilterIcon, ArrowUpIcon, ArrowDownIcon } from './icons';

const priorityCellColors: Record<Priority, string> = {
    [Priority.High]: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    [Priority.Medium]: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
    [Priority.Low]: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
};

type SortableHeaderProps = {
    children: React.ReactNode;
    sortKey: keyof Task;
    sortConfig: { key: keyof Task | null; direction: 'ascending' | 'descending' };
    setSortConfig: (config: { key: keyof Task | null; direction: 'ascending' | 'descending' }) => void;
};

const SortableHeader: React.FC<SortableHeaderProps> = ({ children, sortKey, sortConfig, setSortConfig }) => {
    const isSorted = sortConfig.key === sortKey;
    const direction = isSorted ? sortConfig.direction : 'ascending';

    const handleClick = () => {
        const newDirection = isSorted && direction === 'ascending' ? 'descending' : 'ascending';
        setSortConfig({ key: sortKey, direction: newDirection });
    };

    return (
        <button className="flex items-center gap-1 group" onClick={handleClick}>
            <span>{children}</span>
            {isSorted ? (
                direction === 'ascending' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
            ) : (
                <ArrowUpIcon className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />
            )}
        </button>
    );
};

type FilterableHeaderProps = {
    children: React.ReactNode;
    filterKey: 'status' | 'priority';
    filters: { status: Status | 'all'; priority: Priority | 'all' };
    setFilters: React.Dispatch<React.SetStateAction<{ status: Status | 'all'; priority: Priority | 'all' }>>;
    options: string[];
};

const FilterableHeader: React.FC<FilterableHeaderProps> = ({ children, filterKey, filters, setFilters, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleFilterChange = (value: string) => {
        setFilters(prev => ({ ...prev, [filterKey]: value }));
        setIsOpen(false);
    };

    return (
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
            <span>{children}</span>
            <button onClick={() => setIsOpen(p => !p)} className="p-1 rounded-md hover:bg-primary/20">
                <FilterIcon className="w-4 h-4" />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-40 bg-card-light dark:bg-card-dark rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                    <button onClick={() => handleFilterChange('all')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">All</button>
                    {options.map(option => (
                        <button key={option} onClick={() => handleFilterChange(option)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">{option}</button>
                    ))}
                </div>
            )}
        </div>
    );
};

const TaskTableView = ({ tasks, onSelectTask }: { tasks: Task[]; onSelectTask: (task: Task) => void }) => {
    const [filters, setFilters] = useState<{ status: Status | 'all'; priority: Priority | 'all' }>({ status: 'all', priority: 'all' });
    const [sortConfig, setSortConfig] = useState<{ key: keyof Task | null; direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });

    const filteredAndSortedTasks = useMemo(() => {
        let filtered = [...tasks];
        if (filters.status !== 'all') {
            filtered = filtered.filter(task => task.status === filters.status);
        }
        if (filters.priority !== 'all') {
            filtered = filtered.filter(task => task.priority === filters.priority);
        }

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key!] < b[sortConfig.key!]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key!] > b[sortConfig.key!]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return filtered;
    }, [tasks, filters, sortConfig]);

    return (
        <div className="p-4 overflow-auto h-full">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300">
                        <th className="p-3 font-semibold text-left"><SortableHeader sortKey="title" sortConfig={sortConfig} setSortConfig={setSortConfig}>Title</SortableHeader></th>
                        <th className="p-3 font-semibold text-left">Description</th>
                        <th className="p-3 font-semibold text-left"><FilterableHeader filterKey="status" filters={filters} setFilters={setFilters} options={Object.values(Status)}>Status</FilterableHeader></th>
                        <th className="p-3 font-semibold text-left"><FilterableHeader filterKey="priority" filters={filters} setFilters={setFilters} options={Object.values(Priority)}>Priority</FilterableHeader></th>
                        <th className="p-3 font-semibold text-left"><SortableHeader sortKey="dueDate" sortConfig={sortConfig} setSortConfig={setSortConfig}>Due Date</SortableHeader></th>
                        <th className="p-3 font-semibold text-left"><SortableHeader sortKey="createdAt" sortConfig={sortConfig} setSortConfig={setSortConfig}>Created At</SortableHeader></th>
                        <th className="p-3 font-semibold text-left">Tags</th>
                        <th className="p-3 font-semibold text-left">Checklist</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-sidebar-dark">
                    {filteredAndSortedTasks.map(task => {
                        const isOverdue = isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== Status.Done;
                        const checklistProgress = task.checklist.length > 0 ? `${task.checklist.filter(i => i.completed).length}/${task.checklist.length}` : 'N/A';
                        return (
                            <tr key={task.id} onClick={() => onSelectTask(task)} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                                <td className="p-3 text-gray-800 dark:text-gray-100">{task.title}</td>
                                <td className="p-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">{task.description.replace(/<[^>]*>?/gm, '')}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-100">{task.status}</td>
                                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityCellColors[task.priority]}`}>{task.priority}</span></td>
                                <td className={`p-3 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-800 dark:text-gray-100'}`}>{format(new Date(task.dueDate), 'yyyy-MM-dd')}</td>
                                <td className="p-3 text-gray-500 dark:text-gray-400">{format(new Date(task.createdAt), 'yyyy-MM-dd')}</td>
                                <td className="p-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">{task.tags.join(', ')}</td>
                                <td className="p-3 text-gray-500 dark:text-gray-400">{checklistProgress}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default TaskTableView;
