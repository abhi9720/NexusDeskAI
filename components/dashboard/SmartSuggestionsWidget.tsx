import * as React from 'react';
import { Task, Goal } from '../../types';
import { LightBulbIcon, SparklesIcon } from '../icons';
import { getSmartSuggestions } from '../../services/geminiService';

interface SmartSuggestionsWidgetProps {
  tasks: Task[];
  goals: Goal[];
}

const SmartSuggestionsWidget = ({ tasks, goals }: SmartSuggestionsWidgetProps) => {
    const [suggestions, setSuggestions] = React.useState<string[] | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchSuggestions = async () => {
            setIsLoading(true);
            const result = await getSmartSuggestions(tasks, goals);
            setSuggestions(result);
            setIsLoading(false);
        };
        fetchSuggestions();
    }, [tasks, goals]);
    
    if (isLoading) {
        return (
            <div className="bg-card-light/60 dark:bg-card-dark/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
            </div>
        );
    }
    
    if (!suggestions || suggestions.length === 0) {
        return null;
    }

    return (
        <div className="bg-card-light/60 dark:bg-card-dark/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <LightBulbIcon className="w-6 h-6 text-yellow-500" />
                <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Smart Suggestions</h3>
            </div>
            <ul className="space-y-3">
                {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <div className="w-5 h-5 flex-shrink-0 mt-0.5 rounded-full bg-primary/20 flex items-center justify-center">
                             <SparklesIcon className="w-3 h-3 text-primary" />
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-200">{suggestion}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SmartSuggestionsWidget;