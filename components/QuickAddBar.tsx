import * as React from 'react';
import { BoltIcon } from './icons';

interface QuickAddBarProps {
    onQuickAddTask: (text: string) => Promise<void>;
    disabled: boolean;
}

const QuickAddBar = ({ onQuickAddTask, disabled }: QuickAddBarProps) => {
    const [input, setInput] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || disabled || isSubmitting) return;
        
        setIsSubmitting(true);
        const textToParse = input;
        setInput('');
        try {
            await onQuickAddTask(textToParse);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full">
            <BoltIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={disabled || isSubmitting}
                placeholder="Quick Add Task..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-white/50 dark:bg-black/20 border border-gray-300/50 dark:border-gray-700/50 focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                aria-label="Quick add task with natural language"
                title="e.g., Deploy to prod tomorrow p1 #ProjectX"
            />
        </form>
    );
};

export default QuickAddBar;
