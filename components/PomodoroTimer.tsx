import * as React from 'react';
import { ClockIcon } from './icons';
import { notificationService } from '../services/notificationService';

const CircularProgress = ({ percentage, time }: { percentage: number; time: string }) => {
    const radius = 90;
    const strokeWidth = 12;
    const innerRadius = radius - strokeWidth / 2;
    const circumference = 2 * Math.PI * innerRadius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-56 h-56">
            <svg className="w-full h-full" viewBox="0 0 200 200">
                <circle
                    className="text-gray-200/70 dark:text-gray-700/50"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={innerRadius}
                    cx="100"
                    cy="100"
                />
                <circle
                    className="text-primary"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={innerRadius}
                    cx="100"
                    cy="100"
                    transform="rotate(-90 100 100)"
                    style={{ transition: 'stroke-dashoffset 0.3s linear' }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                 <span className="text-5xl font-bold text-gray-900 dark:text-white tracking-wider font-mono">
                    {time}
                </span>
            </div>
        </div>
    );
};

interface PomodoroTimerProps {
    onComplete?: (durationMinutes: number) => void;
}

const PomodoroTimer = ({ onComplete }: PomodoroTimerProps) => {
    const [durationMinutes, setDurationMinutes] = React.useState(25);
    const [time, setTime] = React.useState(25 * 60);
    const [isActive, setIsActive] = React.useState(false);

    const duration = durationMinutes * 60;

    React.useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (isActive && time > 0) {
            interval = setInterval(() => {
                setTime(t => t - 1);
            }, 1000);
        } else if (isActive && time === 0) {
            if (onComplete) {
                onComplete(durationMinutes);
            } else {
                notificationService.send('Pomodoro Finished!', { body: 'Time for a short break.' });
            }
            setIsActive(false);
            setTime(duration);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, time, duration, onComplete, durationMinutes]);
    
    React.useEffect(() => {
        notificationService.requestPermission();
    }, []);

    const handleDurationChange = (minutes: number) => {
        if (isActive) setIsActive(false);
        const newMinutes = Math.max(1, minutes); // min 1 minute
        setDurationMinutes(newMinutes);
        setTime(newMinutes * 60);
    };

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
        <div className="p-6 rounded-2xl bg-card-light/60 dark:bg-card-dark/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg animate-fade-in flex flex-col items-center">
            <div className="flex items-center space-x-3 mb-6">
                <ClockIcon className="w-6 h-6 text-primary" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Pomodoro Timer</h3>
            </div>

            <CircularProgress percentage={(time / duration) * 100} time={formatTime(time)} />
            
            <div className="my-6 space-y-4 w-full text-center">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Set Duration (minutes)</label>
                <div className="flex justify-center items-center gap-2 mt-2">
                    {[15, 25, 45].map(minutes => (
                         <button
                            key={minutes}
                            onClick={() => handleDurationChange(minutes)}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                                durationMinutes === minutes && !isActive
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            {minutes}
                        </button>
                    ))}
                     <input
                        type="number"
                        value={durationMinutes}
                        onChange={(e) => handleDurationChange(parseInt(e.target.value, 10))}
                        className="w-16 p-1.5 text-center text-sm font-semibold rounded-lg bg-gray-200 dark:bg-gray-700/50 border-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                        min="1"
                    />
                </div>
            </div>
            
            <div className="flex justify-center space-x-4">
                <button
                    onClick={toggleTimer}
                    className={`px-10 py-3 text-base rounded-lg font-semibold text-white transition-transform transform hover:scale-105 ${isActive ? 'bg-accent hover:bg-pink-600' : 'bg-primary hover:bg-primary-dark'}`}
                >
                    {isActive ? 'Pause' : (time > 0 && time < duration) ? 'Resume' : 'Start'}
                </button>
                <button
                    onClick={resetTimer}
                    className="px-8 py-3 text-base rounded-lg font-semibold text-gray-700 bg-gray-200 dark:bg-gray-600 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-transform transform hover:scale-105"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};

export default PomodoroTimer;