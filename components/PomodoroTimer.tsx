import React, { useState, useEffect } from 'react';
import { ClockIcon } from './icons';

const PomodoroTimer = () => {
    const [duration, setDuration] = useState(25 * 60); // Default 25 minutes
    const [time, setTime] = useState(duration);
    const [isActive, setIsActive] = useState(false);
    const [customMinutes, setCustomMinutes] = useState('25');

    const quickPicks = [
        { label: '15 min', value: 15 },
        { label: '25 min', value: 25 },
        { label: '45 min', value: 45 },
    ];

    // Update time when duration changes, but only if timer isn't running
    useEffect(() => {
        if (!isActive) {
            setTime(duration);
            setCustomMinutes(String(duration / 60));
        }
    }, [duration]);

    const handleSetDuration = (minutes: number) => {
        if (minutes > 0) {
            setDuration(minutes * 60);
            setIsActive(false); // Reset active state on new duration
        }
    };

    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (/^\d*$/.test(val)) { // only allow digits
            setCustomMinutes(val);
            const minutes = parseInt(val, 10);
            if (!isNaN(minutes) && minutes > 0) {
                handleSetDuration(minutes);
            }
        }
    };

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (isActive && time > 0) {
            interval = setInterval(() => {
                setTime(t => t - 1);
            }, 1000);
        } else if (isActive && time === 0) {
            new Notification('Pomodoro Finished!', { body: 'Time for a short break.' });
            setIsActive(false);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, time]);

    useEffect(() => {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const toggleTimer = () => {
        if (time === 0) {
            setTime(duration);
        }
        setIsActive(!isActive);
    };

    const resetTimer = () => {
        setIsActive(false);
        setTime(duration);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="p-6 rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-white/20 dark:border-black/20 shadow-lg animate-fade-in">
            <div className="flex items-center space-x-3">
                <ClockIcon className="w-6 h-6 text-primary" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Pomodoro Timer</h3>
            </div>

            {!isActive && (
                <div className="my-6 space-y-4 transition-all duration-300 animate-fade-in">
                    <div className="flex justify-center gap-2">
                        {quickPicks.map(pick => (
                            <button
                                key={pick.value}
                                onClick={() => handleSetDuration(pick.value)}
                                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${duration === pick.value * 60
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {pick.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Custom:</span>
                        <input
                            type="text"
                            value={customMinutes}
                            onChange={handleCustomChange}
                            aria-label="Custom minutes"
                            className="w-16 px-2 py-1 text-center rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-gray-600 dark:text-gray-400">min</span>
                    </div>
                </div>
            )}

            <div className="text-center my-6">
                <p className="text-6xl font-bold text-gray-900 dark:text-white tracking-wider">
                    {formatTime(time)}
                </p>
            </div>
            <div className="flex justify-center space-x-4">
                <button
                    onClick={toggleTimer}
                    className={`px-6 py-2 rounded-lg font-semibold text-white transition-transform transform hover:scale-105 ${isActive ? 'bg-accent hover:bg-pink-600' : 'bg-primary hover:bg-primary-dark'}`}
                >
                    {isActive ? 'Pause' : (time > 0 && time < duration) ? 'Resume' : 'Start'}
                </button>
                <button
                    onClick={resetTimer}
                    className="px-6 py-2 rounded-lg font-semibold text-gray-700 bg-gray-200 dark:bg-gray-600 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-transform transform hover:scale-105"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};

export default PomodoroTimer;