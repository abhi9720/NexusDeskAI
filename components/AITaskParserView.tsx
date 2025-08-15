import React, { useState, useEffect } from 'react';
import { List, Task } from '../types';
import { SparklesIcon, CheckIcon } from './icons';
import { parseTasksFromText } from '../services/geminiService';

interface AITaskParserViewProps {
  onAddItem: (item: Partial<Task>, listId: string, type: 'task') => void;
  lists: List[];
}

type ParsedTask = {
    title: string;
    description: string;
}

const AITaskParserView = ({ onAddItem, lists }: AITaskParserViewProps) => {
    const [inputText, setInputText] = useState('');
    const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
    const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
    const [targetListId, setTargetListId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const taskLists = lists.filter(l => l.type === 'task');
        if (taskLists.length > 0) {
            setTargetListId(currentId => {
                const isValid = taskLists.some(l => l.id === currentId);
                return isValid ? currentId : taskLists[0].id;
            });
        } else {
            setTargetListId('');
        }
    }, [lists]);

    const handleParse = async () => {
        if (!inputText.trim()) return;
        setIsLoading(true);
        setError(null);
        setParsedTasks([]);
        setSelectedTasks(new Set());
        
        const result = await parseTasksFromText(inputText);
        if (result) {
            setParsedTasks(result);
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
        if (!targetListId) {
            alert('Please select a list to add tasks to.');
            return;
        }
        const tasksAddedCount = selectedTasks.size;
        selectedTasks.forEach(index => {
            const task = parsedTasks[index];
            if (task) {
                onAddItem(task, targetListId, 'task');
            }
        });

        const remainingTasks = parsedTasks.filter((_, index) => !selectedTasks.has(index));
        setParsedTasks(remainingTasks);
        setSelectedTasks(new Set());
        alert(`${tasksAddedCount} task(s) added successfully!`);
    };

    const taskLists = lists.filter(l => l.type === 'task');

    return (
        <div className="w-full h-full flex flex-col animate-fade-in">
            <header className="p-4 sm:p-6 lg:p-8 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <SparklesIcon className="w-8 h-8 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Parse Tasks from Text</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Paste any text below and let AI extract actionable tasks for you.</p>
                    </div>
                </div>
            </header>
            
            <main className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
                {/* Input Pane */}
                <div className="flex flex-col p-4 border dark:border-gray-700 bg-card-light dark:bg-card-dark rounded-l-xl min-h-0">
                    <label htmlFor="text-input" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Paste your meeting notes or brain dump here:</label>
                    <textarea
                        id="text-input"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="e.g., Remind John to send the deck. Schedule a follow-up for next Tuesday..."
                        className="w-full flex-grow p-3 text-sm rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary resize-none"
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
                <div className="flex flex-col p-4 border dark:border-gray-700 border-l-0 bg-card-light dark:bg-card-dark rounded-r-xl min-h-0">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Parsed Tasks ({selectedTasks.size}/{parsedTasks.length})</h3>
                        <div className="flex items-center gap-2">
                            <label htmlFor="list-select" className="text-xs font-medium">Add to:</label>
                            <select id="list-select" value={targetListId} onChange={e => setTargetListId(e.target.value)} className="form-select text-xs rounded-md py-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary">
                                {taskLists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex-grow bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg overflow-y-auto">
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
                     <button onClick={handleAddTasks} disabled={selectedTasks.size === 0} className="mt-4 w-full px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:bg-primary/70 disabled:cursor-not-allowed">
                        Add {selectedTasks.size} Selected Task(s)
                    </button>
                </div>
            </main>
        </div>
    );
};

export default AITaskParserView;