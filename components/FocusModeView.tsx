import React from 'react';
import { Task, Status } from '../types';
import PomodoroTimer from './PomodoroTimer';
import { XMarkIcon, CheckCircleIcon } from './icons';

interface FocusModeViewProps {
    task: Task;
    onClose: () => void;
    onUpdateTask: (task: Task) => void;
}

const FocusModeView = ({ task, onClose, onUpdateTask }: FocusModeViewProps) => {

    const handleUpdateStatus = (status: Status) => {
        onUpdateTask({ ...task, status });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-brand-light dark:bg-brand-dark z-50 flex flex-col items-center justify-center p-8 animate-fade-in">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <XMarkIcon className="w-8 h-8 text-gray-600 dark:text-gray-300" />
            </button>

            <div className="w-full max-w-2xl text-center">
                <p className="text-lg text-gray-500 dark:text-gray-400 mb-2">Focusing on:</p>
                <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-12 truncate">{task.title}</h1>
            </div>

            <PomodoroTimer />

            <div className="mt-12 flex items-center space-x-4">
                 <button 
                    onClick={() => handleUpdateStatus(Status.InProgress)}
                    className="px-6 py-3 font-semibold text-gray-700 bg-gray-200 dark:bg-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-transform transform hover:scale-105"
                >
                    Mark as In Progress & Exit
                </button>
                <button 
                    onClick={() => handleUpdateStatus(Status.Done)}
                    className="flex items-center gap-2 px-6 py-3 font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-transform transform hover:scale-105"
                >
                    <CheckCircleIcon className="w-5 h-5"/>
                    Mark as Complete & Exit
                </button>
            </div>
        </div>
    );
};

export default FocusModeView;
