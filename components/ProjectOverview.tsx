import React, { useMemo } from 'react';
import { Task, Status, Priority, List, ActivityLog, ActivityType } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { PlusIcon, CheckCircleIcon, ChatBubbleLeftEllipsisIcon, FlagIcon, ClockIcon, ListBulletIcon } from './icons';

const CircularProgress = ({ percentage }: { percentage: number }) => {
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-36 h-36 flex-shrink-0">
            <svg className="w-full h-full" viewBox="0 0 130 130">
                <circle
                    className="text-gray-200 dark:text-gray-700"
                    strokeWidth="12"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="65"
                    cy="65"
                />
                <circle
                    className="text-primary"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="65"
                    cy="65"
                    transform="rotate(-90 65 65)"
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-gray-800 dark:text-white">
                {Math.round(percentage)}%
            </span>
        </div>
    );
};


const StatCard = ({ title, value, icon, colorClass }: { title: string; value: string | number; icon: React.ReactNode; colorClass: string; }) => (
    <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-semibold">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
);

const PriorityBar = ({ priority, count, total, color }: { priority: Priority; count: number; total: number; color: string; }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between items-center mb-1 text-xs">
                <span className="font-semibold text-gray-600 dark:text-gray-300">{priority}</span>
                <span className="text-gray-500 dark:text-gray-400">{count}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: color }}></div>
            </div>
        </div>
    );
};

const ActivityItem = ({ icon, text, time }: { icon: React.ReactNode; text: React.ReactNode; time: string; }) => (
    <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
            {icon}
        </div>
        <div className="flex-grow">
            <p className="text-sm text-gray-700 dark:text-gray-300">{text}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{time}</p>
        </div>
    </div>
);


const ListOverview = ({ tasks, list }: { tasks: Task[], list?: List }) => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === Status.Done).length;
    const inProgressTasks = tasks.filter(t => t.status === Status.InProgress).length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueTasks = tasks.filter(t => new Date(t.dueDate) < today && t.status !== Status.Done).length;

    const priorities = {
        High: tasks.filter(t => t.priority === Priority.High).length,
        Medium: tasks.filter(t => t.priority === Priority.Medium).length,
        Low: tasks.filter(t => t.priority === Priority.Low).length,
    };
    
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const activityFeed = useMemo(() => {
        const allActivities = tasks.flatMap(task => task.activityLog || []);
        
        return allActivities
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 7);
    }, [tasks]);

    const getActivityIcon = (type: ActivityType) => {
        switch (type) {
            case 'created':
                return <PlusIcon className="w-4 h-4 text-blue-500" />;
            case 'comment':
                return <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-green-500" />;
            case 'status':
                return <ClockIcon className="w-4 h-4 text-purple-500" />;
            case 'priority':
                return <FlagIcon className="w-4 h-4 text-yellow-500" />;
            default:
                return <CheckCircleIcon className="w-4 h-4 text-gray-500" />;
        }
    };

    const getActivityText = (activity: ActivityLog): React.ReactNode => {
        const taskTitle = <span className="font-semibold text-gray-800 dark:text-white">{activity.taskTitle}</span>;
        const user = <span className="font-semibold">{activity.userName}</span>;
        switch (activity.type) {
            case 'created':
                return <>{user} created task: {taskTitle}</>;
            case 'comment':
                return <>{user} commented on {taskTitle}: <span className="italic text-gray-600 dark:text-gray-400">"{activity.content.commentContent?.substring(0, 30)}..."</span></>;
            case 'status':
                return <>{user} changed status of {taskTitle} from '{activity.content.from}' to '{activity.content.to}'</>;
            case 'priority':
                return <>{user} changed priority of {taskTitle} from '{activity.content.from}' to '{activity.content.to}'</>;
            default:
                return <>Activity on {taskTitle}</>;
        }
    };

    return (
        <div className="p-4 md:p-8 flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div className="flex items-center gap-4">
                    <CircularProgress percentage={completionPercentage} />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{list ? list.name : 'List'} Overview</h2>
                        <p className="text-gray-500 dark:text-gray-400">Here's a snapshot of your list's progress.</p>
                    </div>
                </div>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Tasks" value={totalTasks} colorClass="bg-blue-100 dark:bg-blue-500/20" icon={<ListBulletIcon className="w-6 h-6 text-blue-500" />} />
                <StatCard title="Completed" value={completedTasks} colorClass="bg-green-100 dark:bg-green-500/20" icon={<CheckCircleIcon className="w-6 h-6 text-green-500" />} />
                <StatCard title="In Progress" value={inProgressTasks} colorClass="bg-yellow-100 dark:bg-yellow-500/20" icon={<ClockIcon className="w-6 h-6 text-yellow-500" />} />
                <StatCard title="Overdue" value={overdueTasks} colorClass="bg-red-100 dark:bg-red-500/20" icon={<FlagIcon className="w-6 h-6 text-red-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white dark:bg-sidebar-dark p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Priority Breakdown</h3>
                    <div className="space-y-4">
                        <PriorityBar priority={Priority.High} count={priorities.High} total={totalTasks} color="#EF4444" />
                        <PriorityBar priority={Priority.Medium} count={priorities.Medium} total={totalTasks} color="#F59E0B" />
                        <PriorityBar priority={Priority.Low} count={priorities.Low} total={totalTasks} color="#22C55E" />
                    </div>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-sidebar-dark p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {activityFeed.length > 0 ? activityFeed.map((activity) => (
                            <ActivityItem
                                key={activity.id}
                                icon={getActivityIcon(activity.type)}
                                text={getActivityText(activity)}
                                time={formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                            />
                        )) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No recent activity to show.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ListOverview;