import React, { useState, useEffect } from 'react';
import { List, Task } from '../types';
import { XMarkIcon, SparklesIcon, ListBulletIcon, CheckIcon } from './icons';
import { parseTasksFromText } from '../services/geminiService';

interface AITaskParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: Partial<Task>, listId: number, type: 'task') => void;
  lists: List[];
}

type ParsedTask = {
    title: string;
    description: string;
}

const AITaskParserModal = ({ isOpen, onClose, onAddItem, lists }: AITaskParserModalProps) => {
    const [inputText, setInputText] = useState('');
    const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
    const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
    const [targetListId, setTargetListId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const taskLists = lists.filter(l => l.type === 'task');
            if (taskLists.length > 0) {
                const isTargetListValid = taskLists.some(list => list.id === targetListId);
                if (targetListId === null || !isTargetListValid) {
                    setTargetListId(taskLists[0].id);
                }
            } else {
                setTargetListId(null);
            }
        } else {
            // Reset all state on close for a fresh start next time
            setInputText('');
            setParsedTasks([]);
            setSelectedTasks(new Set());
            setTargetListId(null);
            setIsLoading(false);
            setError(null);
        }
    }, [isOpen, lists]);


    if (!isOpen) return null;

    const handleParse = async () => {
        if (!inputText.trim()) return;
        setIsLoading(true);
        setError(null);
        setParsedTasks([]);
        setSelectedTasks(new Set());
        
        const result = await parseTasksFromText(inputText);
        if (result) {
            setParsedTasks(result);
            // Pre-select all parsed tasks
            setSelectedTasks(new Set(result.map((_, index) => index)));
        } else {
            setError('Failed to parse tasks. Please check your API key and try again.');
        }
        setIsLoading(false);
    };

    const handleToggleTask = (index: number) => {
        const newSelection = new Set(selectedTasks);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedTasks(newSelection);
    };

    const handleAddTasks = () => {
        if (targetListId === null) {
            alert('Please select a list to add tasks to.');
            return;
        }
        selectedTasks.forEach(index => {
            const task = parsedTasks[index];
            if (task) {
                onAddItem(task, targetListId, 'task');
            }
        });
        onClose();
    };

    const taskLists = lists.filter(l => l.type === 'task');

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-sm" onClick={onClose}>
            <div className="bg-brand-light dark:bg-brand-dark rounded-2xl shadow-2xl w-full max-w-4xl m-4 h-[90vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="w-6 h-6 text-primary" />
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Parse Tasks from Text</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
                        <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </button>
                </header>

                <main className="flex-grow grid grid-cols-2 gap-0 overflow-hidden">
                    {/* Input Pane */}
                    <div className="flex flex-col p-4 border-r border-gray-200 dark:border-gray-700 min-h-0">
                        <label htmlFor="text-input" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Paste your meeting notes or brain dump here:</label>
                        <textarea
                            id="text-input"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="e.g., Remind John to send the deck. Schedule a follow-up for next Tuesday..."
                            className="w-full flex-grow p-3 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary resize-none"
                        />
                         <button onClick={handleParse} disabled={isLoading || !inputText.trim()} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:bg-primary/70 disabled:cursor-not-allowed">
                             {isLoading ? (
                                <>
                                 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                 <span>Parsing...</span>
                                </>
                             ) : (
                                <>
                                 <SparklesIcon className="w-5 h-5" />
                                 <span>Parse with AI</span>
                                </>
                             )}
                        </button>
                    </div>

                    {/* Output Pane */}
                    <div className="flex flex-col p-4 min-h-0">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Parsed Tasks ({selectedTasks.size}/{parsedTasks.length})</h3>
                        <div className="flex-grow bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg overflow-y-auto">
                            {isLoading && (
                                <div className="flex items-center justify-center h-full text-gray-500">Parsing in progress...</div>
                            )}
                            {error && (
                                <div className="flex items-center justify-center h-full text-red-500 p-4">{error}</div>
                            )}
                            {!isLoading && !error && parsedTasks.length === 0 && (
                                 <div className="flex items-center justify-center h-full text-gray-500 text-center p-4">
                                     <p>Your parsed tasks will appear here.</p>
                                </div>
                            )}
                            <div className="space-y-2 p-2">
                                {parsedTasks.map((task, index) => (
                                    <div key={index} onClick={() => handleToggleTask(index)} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <div className={`w-5 h-5 rounded-md flex-shrink-0 mt-1 flex items-center justify-center border-2 transition-colors ${selectedTasks.has(index) ? 'bg-primary border-primary' : 'bg-transparent border-gray-400'}`}>
                                            {selectedTasks.has(index) && <CheckIcon className="w-3 h-3 text-white" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-white">{task.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{task.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
                
                <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                         <label htmlFor="list-select" className="text-sm font-medium">Add to list:</label>
                         <select id="list-select" value={targetListId || ''} onChange={e => setTargetListId(Number(e.target.value))} className="form-select text-sm rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary">
                            {taskLists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
                         </select>
                    </div>
                    <button onClick={handleAddTasks} disabled={selectedTasks.size === 0} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:bg-primary/70 disabled:cursor-not-allowed">
                        Add {selectedTasks.size} Task(s)
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AITaskParserModal;
