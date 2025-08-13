import React from 'react';
import { Task, List, Status, Priority } from '../types';
import { SparklesIcon, PlusIcon, CheckCircleIcon, EllipsisHorizontalIcon, ClockIcon } from './icons';
import { format, isToday, isSameDay } from 'date-fns';

interface DashboardProps {
    tasks: Task[];
    lists: List[];
    onTaskClick: (task: Task) => void;
    onProjectClick: (listId: string) => void;
}

const Dashboard = ({ tasks, lists, onTaskClick, onProjectClick }: DashboardProps) => {

    const today = new Date();
    const tasksDueToday = tasks.filter(t => isSameDay(new Date(t.dueDate), today) && t.status !== Status.Done);
    const highPriorityTasks = tasks.filter(t => t.priority === Priority.High && t.status !== Status.Done);

    return (
        <div className="p-6 md:p-8 flex-1 overflow-y-auto bg-brand-light dark:bg-brand-dark">
            <header className="mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                            Hello, Courtney
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                           How can I help you today?
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg shadow-sm hover:bg-primary-dark flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4" /> Ask AI
                        </button>
                        <button className="px-4 py-2 text-sm font-semibold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600">
                            Get tasks updates
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* My Tasks */}
                    <div className="bg-white dark:bg-sidebar-dark p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-800 dark:text-white">My Tasks</h3>
                            <div className="flex items-center space-x-2">
                                <button className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><PlusIcon className="w-4 h-4"/></button>
                                <button className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><EllipsisHorizontalIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {highPriorityTasks.slice(0, 3).map(task => (
                                <div key={task.id} onClick={() => onTaskClick(task)} className="p-2 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <CheckCircleIcon className="w-5 h-5 text-gray-300 dark:text-gray-600"/>
                                        <span className="text-sm text-gray-700 dark:text-gray-200">{task.title}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-semibold px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300 rounded-md">{task.priority}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(task.dueDate), 'MMM d')}</span>
                                    </div>
                                </div>
                            ))}
                            {tasksDueToday.length > 0 && (
                                <div className="text-sm p-2 font-semibold text-gray-500 dark:text-gray-400">
                                  <span className="font-bold text-primary">{tasksDueToday.length} more task{tasksDueToday.length > 1 ? 's' : ''}</span> due today
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Emails & Messages */}
                    <div className="bg-white dark:bg-sidebar-dark p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                         <h3 className="font-semibold text-gray-800 dark:text-white mb-4">My Goals</h3>
                        <div className="space-y-3">
                            {tasks.slice(0,3).map(task => (
                                <div key={task.id}>
                                    <div className="flex justify-between items-center text-sm mb-1">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{task.title}</span>
                                        <span className="text-gray-500 dark:text-gray-400">{Math.round(Math.random()*100)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                        <div className="bg-primary h-1.5 rounded-full" style={{width: `${Math.round(Math.random()*100)}%`}}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Right Column */}
                <div className="space-y-6">
                    {/* Projects */}
                     <div className="bg-white dark:bg-sidebar-dark p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-800 dark:text-white">Projects</h3>
                            <button className="text-sm font-semibold text-primary">Recents</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {lists.filter(l => l.type==='task').slice(0,4).map(list => (
                                <div key={list.id} onClick={() => onProjectClick(list.id)} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:shadow-lg transition-shadow">
                                     <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{backgroundColor: `${list.color}20`}}>
                                        <span className="w-4 h-4 rounded-full" style={{backgroundColor: list.color}}></span>
                                    </div>
                                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{list.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{tasks.filter(t => t.listId === list.id).length} tasks</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Calendar */}
                    <div className="bg-white dark:bg-sidebar-dark p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-800 dark:text-white">Calendar</h3>
                            <span className="text-sm font-semibold text-gray-800 dark:text-white">{format(today, 'MMMM')}</span>
                        </div>
                         {tasksDueToday.length > 0 ? (
                            <div className="space-y-3">
                                {tasksDueToday.slice(0, 2).map(task => (
                                <div key={task.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex items-center gap-3">
                                    <ClockIcon className="w-5 h-5 text-primary"/>
                                    <div>
                                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{task.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">10:00 - 11:00 AM</p>
                                    </div>
                                </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No tasks due today.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
