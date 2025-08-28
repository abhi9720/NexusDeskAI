import * as React from 'react';
import { Task, List, Note, Status, Priority, Goal, GoalInsight, GoalStatus, Habit, HabitLog } from '../types';
import PomodoroTimer from './PomodoroTimer';
import { SparklesIcon, ChatBubbleLeftEllipsisIcon, PaperClipIcon, ListBulletIcon, LightBulbIcon, FlagIcon } from './icons';
import { isToday } from 'date-fns';
import CalendarWidget from './CalendarWidget';
import HeadsUpWidget from './dashboard/HeadsUpWidget';
import { getGoalInsights, getMotivationalNudge } from '../services/geminiService';
import SmartSuggestionsWidget from './dashboard/SmartSuggestionsWidget';
import HabitsWidget from './dashboard/HabitsWidget';

interface DashboardViewProps {
    tasks: Task[];
    lists: List[];
    notes: Note[];
    goals: Goal[];
    habits: Habit[];
    habitLogs: HabitLog[];
    onSelectItem: (item: Task | Note) => void;
    onActiveSelectionChange: (selection: any) => void;
    onSelectGoal: (goalId: number) => void;
    onUpdateItem: (item: Task) => void;
    onAddHabitLog: (habitId: number, date: string) => void;
}

const WelcomeHeader = ({ onAskAI, nudge }: { onAskAI: () => void, nudge: string | null }) => {
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning!";
        if (hour < 18) return "Good Afternoon!";
        return "Good Evening!";
    };

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                    {getGreeting()}
                </h1>
                {nudge ? (
                    <div className="mt-2 flex items-start gap-3 max-w-lg">
                        <LightBulbIcon className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                           <span className="font-semibold text-gray-700 dark:text-gray-300">Prodify AI says:</span> {nudge}
                        </p>
                    </div>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Here's your productivity dashboard for today.
                    </p>
                )}
            </div>
            <button 
                onClick={onAskAI} 
                className="px-5 py-2.5 text-sm font-semibold bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark flex items-center gap-2 transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/50 animate-pulse-subtle"
            >
                <SparklesIcon className="w-5 h-5" />
                Ask Prodify AI
            </button>
        </div>
    );
};

const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-card-light/60 dark:bg-card-dark/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg rounded-2xl p-6 ${className}`}>
        {children}
    </div>
);

const priorityBorder: Record<Priority, string> = {
    [Priority.High]: 'border-l-red-500',
    [Priority.Medium]: 'border-l-yellow-500',
    [Priority.Low]: 'border-l-green-500',
};

const priorityStyles: Record<Priority, { bg: string, text: string, icon: JSX.Element }> = {
    [Priority.High]: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-200', icon: <FlagIcon className="w-3.5 h-3.5 text-red-500" /> },
    [Priority.Medium]: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-200', icon: <FlagIcon className="w-3.5 h-3.5 text-yellow-500" /> },
    [Priority.Low]: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-200', icon: <FlagIcon className="w-3.5 h-3.5 text-green-500" /> },
};

const TasksDueToday = ({ tasks, onTaskClick, onUpdateItem }: { tasks: Task[], onTaskClick: (task: Task) => void, onUpdateItem: (task: Task) => void }) => {
    
    const handleToggleComplete = (e: React.MouseEvent, task: Task) => {
        e.stopPropagation();
        onUpdateItem({ ...task, status: task.status === Status.Done ? Status.ToDo : Status.Done });
    };

    return (
        <GlassCard>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">Focus for Today</h3>
            {tasks.length === 0 ? (
                <p className="text-sm text-center py-8 text-gray-500 dark:text-gray-400">No tasks due today. Enjoy your day!</p>
            ) : (
                <div className="space-y-3">
                    {tasks.map(task => {
                        const priorityStyle = priorityStyles[task.priority];
                        return (
                            <div key={task.id} className={`p-3 flex items-center bg-white/50 dark:bg-black/20 hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg transition-all border-l-4 ${priorityBorder[task.priority]} hover:shadow-md transform hover:-translate-y-0.5`}>
                                <div onClick={(e) => handleToggleComplete(e, task)} className="p-2 cursor-pointer">
                                    <div className={`w-5 h-5 flex-shrink-0 border-2 rounded-md flex items-center justify-center ${task.status === Status.Done ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                                        {task.status === Status.Done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                </div>
                                <div onClick={() => onTaskClick(task)} className="flex-grow cursor-pointer min-w-0">
                                    <span className={`text-sm text-gray-700 dark:text-gray-200 truncate ${task.status === Status.Done ? 'line-through opacity-60' : ''}`}>{task.title}</span>
                                     <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold ${priorityStyle.bg} ${priorityStyle.text}`}>
                                            {priorityStyle.icon}
                                            <span>{task.priority}</span>
                                        </span>
                                        {task.comments?.length > 0 && <div className="flex items-center gap-1"><ChatBubbleLeftEllipsisIcon className="w-4 h-4" /><span>{task.comments.length}</span></div>}
                                        {task.attachments?.length > 0 && <div className="flex items-center gap-1"><PaperClipIcon className="w-4 h-4" /><span>{task.attachments.length}</span></div>}
                                        {task.checklist?.length > 0 && <div className="flex items-center gap-1"><ListBulletIcon className="w-4 h-4" /><span>{task.checklist.filter(i => i.completed).length}/{task.checklist.length}</span></div>}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </GlassCard>
    );
};

const TaskListProgress = ({ lists, tasks, onListClick }: { lists: List[], tasks: Task[], onListClick: (listId: number) => void }) => (
    <GlassCard>
        <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">Task List Progress</h3>
        <div className="space-y-4">
            {lists.filter(l => l.type === 'task').slice(0, 4).map(list => {
                const projectTasks = tasks.filter(t => t.listId === list.id);
                const completedTasks = projectTasks.filter(t => t.status === Status.Done).length;
                const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
                
                return (
                    <div key={list.id} onClick={() => onListClick(list.id)} className="cursor-pointer group p-2 rounded-lg hover:bg-white/50 dark:hover:bg-black/20 transition-colors">
                        <div className="flex justify-between items-center text-sm mb-1.5">
                            <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary">{list.name}</span>
                            <span className="text-gray-500 dark:text-gray-400 font-mono">{completedTasks}/{projectTasks.length} tasks</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div className="h-2 rounded-full transition-all" style={{width: `${progress}%`, backgroundColor: list.color}}></div>
                        </div>
                    </div>
                )
            })}
        </div>
    </GlassCard>
);

const RecentNotes = ({ notes, onNoteClick }: { notes: Note[], onNoteClick: (note: Note) => void }) => (
    <GlassCard>
        <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">Recent Notes</h3>
        <div className="space-y-3">
            {notes.slice(0, 3).map(note => (
                <div key={note.id} onClick={() => onNoteClick(note)} className="p-3 rounded-lg bg-white/50 dark:bg-black/20 cursor-pointer hover:shadow-md transition-all hover:bg-primary/5 dark:hover:bg-primary/10 transform hover:-translate-y-0.5">
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{note.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{note.content.replace(/<[^>]*>?/gm, '')}</p>
                </div>
            ))}
             {notes.length === 0 && <p className="text-sm text-center py-4 text-gray-500 dark:text-gray-400">No recent notes.</p>}
        </div>
    </GlassCard>
);


const DashboardView = ({ tasks, lists, notes, goals, habits, habitLogs, onSelectItem, onActiveSelectionChange, onSelectGoal, onUpdateItem, onAddHabitLog }: DashboardViewProps) => {
    
    const [goalInsights, setGoalInsights] = React.useState<Map<number, GoalInsight>>(new Map());
    const [isLoadingInsights, setIsLoadingInsights] = React.useState(true);
    const [motivationalNudge, setMotivationalNudge] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchInsights = async () => {
            setIsLoadingInsights(true);
            const activeGoals = goals.filter(g => g.status !== GoalStatus.Completed);
            const insightsMap = new Map<number, GoalInsight>();

            for (const goal of activeGoals) {
                const relatedTasks = tasks.filter(t => goal.linkedTaskListIds.includes(t.listId));
                const insight = await getGoalInsights(goal, relatedTasks);
                if (insight) {
                    insightsMap.set(goal.id, insight);
                }
            }
            setGoalInsights(insightsMap);
            setIsLoadingInsights(false);
        };

        if (goals.length > 0) {
            fetchInsights();
        } else {
            setIsLoadingInsights(false);
        }
    }, [goals, tasks]);
    
    React.useEffect(() => {
        const fetchNudge = async () => {
            const nudge = await getMotivationalNudge(tasks, goals);
            setMotivationalNudge(nudge);
        };
        fetchNudge();
    }, [tasks, goals]);
    
    const tasksDueToday = tasks.filter(t => isToday(new Date(t.dueDate)) && t.status !== Status.Done);
    const recentNotes = [...notes].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const handleAskAI = () => onActiveSelectionChange({ type: 'ai-chat' });
    const handleListClick = (listId: number) => onActiveSelectionChange({ type: 'list', id: listId });

    return (
        <div className="p-6 md:p-8 flex-1 overflow-y-auto">
            <header className="mb-8">
                <WelcomeHeader onAskAI={handleAskAI} nudge={motivationalNudge} />
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <SmartSuggestionsWidget tasks={tasks} goals={goals} />
                    <TasksDueToday tasks={tasksDueToday} onTaskClick={onSelectItem} onUpdateItem={onUpdateItem} />
                    <HeadsUpWidget
                        tasks={tasks}
                        goals={goals}
                        insights={goalInsights}
                        isLoading={isLoadingInsights}
                        onSelectItem={onSelectItem}
                        onSelectGoal={onSelectGoal}
                    />
                    <TaskListProgress lists={lists} tasks={tasks} onListClick={handleListClick} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <HabitsWidget habits={habits} habitLogs={habitLogs} onAddHabitLog={onAddHabitLog} />
                    <CalendarWidget tasks={tasks} onTaskClick={onSelectItem} />
                    <RecentNotes notes={recentNotes} onNoteClick={onSelectItem} />
                    <PomodoroTimer />
                </div>
            </div>
        </div>
    );
};

export default DashboardView;