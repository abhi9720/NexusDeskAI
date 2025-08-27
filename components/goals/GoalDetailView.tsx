import React, { useState, useEffect } from 'react';
import { Goal, Task, Status, GoalInsight } from '../../types';
import { TrophyIcon, TrashIcon, LightBulbIcon, DocumentTextIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '../icons';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { getGoalInsights } from '../../services/geminiService';


interface GoalDetailViewProps {
  goal: Goal;
  tasks: Task[];
  onDelete: () => void;
  onSelectItem: (task: Task) => void;
}

const GoalDetailView = ({ goal, tasks, onDelete, onSelectItem }: GoalDetailViewProps) => {
    const [activeTab, setActiveTab] = useState<'plan' | 'insights' | 'journal'>('plan');

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete the goal: "${goal.title}"?`)) {
            onDelete();
        }
    }

    const tasksByStatus = tasks.reduce((acc, task) => {
        if (!acc[task.status]) acc[task.status] = [];
        acc[task.status].push(task);
        return acc;
    }, {} as Record<Status, Task[]>);

    return (
        <div className="p-6 md:p-8 flex flex-col h-full animate-fade-in">
            {/* Header */}
            <header className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{goal.title}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">"{goal.motivation}"</p>
                    </div>
                    <button onClick={handleDelete} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" aria-label="Delete Goal">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="mt-4">
                    <div className="flex justify-between items-center text-sm mb-1.5">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
                        <span className="text-gray-500 dark:text-gray-400 font-mono">{goal.progress || 0}% Complete</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div className="bg-primary h-3 rounded-full transition-all" style={{width: `${goal.progress || 0}%`}}></div>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1.5 text-gray-400 dark:text-gray-500">
                        <span>Created: {format(new Date(goal.createdAt), 'MMM d, yyyy')}</span>
                        <span>Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')} ({formatDistanceToNowStrict(new Date(goal.targetDate))} left)</span>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                <TabButton name="Plan & Progress" tab="plan" activeTab={activeTab} setActiveTab={setActiveTab} icon={<TrophyIcon className="w-5 h-5"/>} />
                <TabButton name="AI Insights" tab="insights" activeTab={activeTab} setActiveTab={setActiveTab} icon={<LightBulbIcon className="w-5 h-5"/>} />
                <TabButton name="Journal" tab="journal" activeTab={activeTab} setActiveTab={setActiveTab} icon={<DocumentTextIcon className="w-5 h-5"/>} />
            </div>

            {/* Tab Content */}
            <div className="flex-grow overflow-y-auto">
                {activeTab === 'plan' && <PlanTab tasksByStatus={tasksByStatus} onSelectItem={onSelectItem} />}
                {activeTab === 'insights' && <InsightsTab goal={goal} tasks={tasks} />}
                {activeTab === 'journal' && <JournalTab />}
            </div>
        </div>
    );
};

const TabButton = ({ name, tab, activeTab, setActiveTab, icon }: { name: string, tab: string, activeTab: string, setActiveTab: (t: any) => void, icon: React.ReactNode }) => (
    <button
        onClick={() => setActiveTab(tab)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}
    >
        {icon}
        {name}
    </button>
);

const PlanTab = ({ tasksByStatus, onSelectItem }: { tasksByStatus: Record<Status, Task[]>; onSelectItem: (task: Task) => void; }) => {
    const statusOrder: Status[] = [Status.InProgress, Status.ToDo, Status.Done, Status.Backlog, Status.Review, Status.Waiting];
    return (
        <div className="space-y-6">
            {statusOrder.map(status => (
                tasksByStatus[status] && tasksByStatus[status].length > 0 && (
                    <div key={status}>
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{status} ({tasksByStatus[status].length})</h4>
                        <div className="space-y-2">
                            {tasksByStatus[status].map(task => (
                                <div 
                                    key={task.id} 
                                    onClick={() => onSelectItem(task)}
                                    className="p-3 bg-white dark:bg-sidebar-dark rounded-lg border border-gray-200 dark:border-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <p className="text-sm text-gray-800 dark:text-gray-200">{task.title}</p>
                                    <span className="text-xs text-gray-400">{format(new Date(task.dueDate), 'MMM d')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            ))}
        </div>
    );
};

const InsightsTab = ({ goal, tasks }: { goal: Goal, tasks: Task[] }) => {
    const [insights, setInsights] = useState<GoalInsight | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            setIsLoading(true);
            const result = await getGoalInsights(goal, tasks);
            setInsights(result);
            setIsLoading(false);
        };
        fetchInsights();
    }, [goal, tasks]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
    }

    if (!insights) {
        return <div className="text-center text-gray-500">Could not generate AI insights for this goal.</div>
    }
    
    const riskStyles = {
        'Low': { icon: <CheckCircleIcon className="w-5 h-5 text-green-500"/>, text: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
        'Medium': { icon: <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500"/>, text: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
        'High': { icon: <ExclamationTriangleIcon className="w-5 h-5 text-red-500"/>, text: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
    }
    const currentRisk = riskStyles[insights.riskLevel];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${currentRisk.bg}`}>
                <h4 className="font-semibold text-gray-800 dark:text-white">Risk Assessment</h4>
                <p className={`text-sm font-semibold mt-2 flex items-center gap-2 ${currentRisk.text}`}>
                    {currentRisk.icon} {insights.riskLevel} Risk
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{insights.riskReasoning}</p>
            </div>
             <div className="p-4 bg-white dark:bg-sidebar-dark rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-800 dark:text-white">Next Best Action</h4>
                <p className="text-sm text-primary mt-2">"{insights.nextActionSuggestion}"</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Completing this task will have the biggest impact on your progress right now.</p>
            </div>
        </div>
    );
};

const JournalTab = () => (
     <div className="p-4 bg-white dark:bg-sidebar-dark rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col items-center justify-center">
        <DocumentTextIcon className="w-16 h-16 text-gray-300 dark:text-gray-600"/>
        <h4 className="font-semibold text-gray-800 dark:text-white mt-4">Journaling Coming Soon</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Reflect on your progress and capture key learnings.</p>
    </div>
);


export default GoalDetailView;