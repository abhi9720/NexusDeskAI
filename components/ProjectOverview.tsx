import React from 'react';
import { Task, Status } from '../types';

const CircularProgress = ({ percentage }: { percentage: number }) => {
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-36 h-36">
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

const StatCard = ({ title, value, color }: { title: string, value: number, color: string }) => (
    <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 border-l-4" style={{ borderLeftColor: color }}>
        <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-semibold">{title}</p>
        <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
    </div>
);

const ProjectOverview = ({ tasks }: { tasks: Task[] }) => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === Status.Done).length;
    const inProgressTasks = tasks.filter(t => t.status === Status.InProgress).length;
    const waitingTasks = tasks.filter(t => t.status === Status.Waiting || t.status === Status.ToDo).length;

    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
        <div className="p-4 md:p-8 flex justify-center animate-fade-in">
            <div className="w-full max-w-2xl bg-white dark:bg-sidebar-dark/50 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700/50 flex flex-col items-center gap-6">
                 <CircularProgress percentage={completionPercentage} />
                 <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Projects</h2>
                 <div className="w-full grid grid-cols-2 gap-4">
                    <StatCard title="TOTAL" value={totalTasks} color="#3B82F6" />
                    <StatCard title="COMPLETED" value={completedTasks} color="#F97316" />
                    <StatCard title="IN PROGRESS" value={inProgressTasks} color="#EC4899" />
                    <StatCard title="WAITING" value={waitingTasks} color="#8b64fd" />
                </div>
            </div>
        </div>
    );
};

export default ProjectOverview;
