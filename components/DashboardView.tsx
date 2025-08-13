import React from 'react';
import { Task, List, Note, Status, Priority } from '../types';
import PomodoroTimer from './PomodoroTimer';
import { SparklesIcon, CheckCircleIcon, ChatBubbleLeftEllipsisIcon, PaperClipIcon, ListBulletIcon } from './icons';
import { isToday } from 'date-fns';
import CalendarWidget from './CalendarWidget';

interface DashboardViewProps {
    tasks: Task[];
    lists: List[];
    notes: Note[];
    onSelectItem: (item: Task | Note) => void;
    onActiveSelectionChange: (selection: any) => void;
}

const WelcomeHeader = ({ onAskAI }: { onAskAI: () => void }) => {
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) {
            return "Good Morning!";
        } else if (hour < 18) {
            return "Good Afternoon!";
        } else {
            return "Good Evening!";
        }
    };

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                    {getGreeting()}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Here's your productivity dashboard for today.
                </p>
            </div>
            <button onClick={onAskAI} className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg shadow-sm hover:bg-primary-dark flex items-center gap-2 transition-transform transform hover:scale-105">
                <SparklesIcon className="w-5 h-5" />
                Ask Prodify AI
            </button>
        </div>
    );
};

const TasksDueToday = ({ tasks, onTaskClick }: { tasks: Task[], onTaskClick: (task: Task) => void }) => {
    const highPriorityTasks = tasks.filter(t => t.priority === Priority.High);
    const otherTasks = tasks.filter(t => t.priority !== Priority.High);

    return (
        <div className="bg-white dark:bg-sidebar-dark p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">Focus for Today</h3>
            {tasks.length === 0 ? (
                <p className="text-sm text-center py-8 text-gray-500 dark:text-gray-400">No tasks due today. Enjoy your day!</p>
            ) : (
                <div className="space-y-3">
                    {[...highPriorityTasks, ...otherTasks].map(task => (
                        <div key={task.id} onClick={() => onTaskClick(task)} className="p-3 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors">
                            <div className="flex-grow">
                                <div className="flex items-center gap-3">
                                    <CheckCircleIcon className="w-5 h-5 text-gray-300 dark:text-gray-600"/>
                                    <span className="text-sm text-gray-700 dark:text-gray-200">{task.title}</span>
                                </div>
                                 <div className="flex items-center space-x-3 text-xs text-gray-400 dark:text-gray-500 mt-1 pl-8">
                                    {task.comments?.length > 0 && (
                                        <div className="flex items-center gap-1">
                                            <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                                            <span>{task.comments.length}</span>
                                        </div>
                                    )}
                                    {task.attachments?.length > 0 && (
                                        <div className="flex items-center gap-1">
                                            <PaperClipIcon className="w-4 h-4" />
                                            <span>{task.attachments.length}</span>
                                        </div>
                                    )}
                                    {task.checklist?.length > 0 && (
                                        <div className="flex items-center gap-1">
                                            <ListBulletIcon className="w-4 h-4" />
                                            <span>{task.checklist.filter(i => i.completed).length}/{task.checklist.length}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {task.priority === Priority.High && <span className="text-xs font-semibold px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300 rounded-md">High</span>}
                                {task.priority === Priority.Medium && <span className="text-xs font-semibold px-2 py-0.5 bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300 rounded-md">Medium</span>}
                                {task.priority === Priority.Low && <span className="text-xs font-semibold px-2 py-0.5 bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300 rounded-md">Low</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ProjectProgress = ({ lists, tasks, onProjectClick }: { lists: List[], tasks: Task[], onProjectClick: (listId: string) => void }) => (
    <div className="bg-white dark:bg-sidebar-dark p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">Project Progress</h3>
        <div className="space-y-4">
            {lists.filter(l => l.type === 'task').slice(0, 4).map(list => {
                const projectTasks = tasks.filter(t => t.listId === list.id);
                const completedTasks = projectTasks.filter(t => t.status === Status.Done).length;
                const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
                
                return (
                    <div key={list.id} onClick={() => onProjectClick(list.id)} className="cursor-pointer group">
                        <div className="flex justify-between items-center text-sm mb-1.5">
                            <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary">{list.name}</span>
                            <span className="text-gray-500 dark:text-gray-400 font-mono">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div className="h-2 rounded-full transition-all" style={{width: `${progress}%`, backgroundColor: list.color}}></div>
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
);

const RecentNotes = ({ notes, onNoteClick }: { notes: Note[], onNoteClick: (note: Note) => void }) => (
    <div className="bg-white dark:bg-sidebar-dark p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50">
        <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">Recent Notes</h3>
        <div className="space-y-3">
            {notes.slice(0, 3).map(note => (
                <div key={note.id} onClick={() => onNoteClick(note)} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:shadow-md transition-shadow">
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{note.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{note.content}</p>
                </div>
            ))}
             {notes.length === 0 && <p className="text-sm text-center py-4 text-gray-500 dark:text-gray-400">No recent notes.</p>}
        </div>
    </div>
);


const DashboardView = ({ tasks, lists, notes, onSelectItem, onActiveSelectionChange }: DashboardViewProps) => {
    
    const tasksDueToday = tasks.filter(t => isToday(new Date(t.dueDate)) && t.status !== Status.Done);
    const recentNotes = [...notes].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const handleAskAI = () => {
        onActiveSelectionChange({ type: 'ai-chat' });
    };

    const handleProjectClick = (listId: string) => {
        onActiveSelectionChange({ type: 'list', id: listId });
    };

    return (
        <div className="p-6 md:p-8 flex-1 overflow-y-auto bg-brand-light dark:bg-brand-dark">
            <header className="mb-8">
                <WelcomeHeader onAskAI={handleAskAI} />
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* Main Column */}
                <div className="xl:col-span-3 space-y-6">
                    <TasksDueToday tasks={tasksDueToday} onTaskClick={onSelectItem} />
                    <ProjectProgress lists={lists} tasks={tasks} onProjectClick={handleProjectClick} />
                    <RecentNotes notes={recentNotes} onNoteClick={onSelectItem} />
                </div>
                {/* Side Column */}
                <div className="xl:col-span-2 space-y-6">
                    <CalendarWidget tasks={tasks} onTaskClick={onSelectItem} />
                    <PomodoroTimer />
                </div>
            </div>
        </div>
    );
};

export default DashboardView;