import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, Task, Note, ActiveSelection, Priority, Status } from '../types';
import { runChat } from '../services/geminiService';
import { SparklesIcon, ArrowUpIcon, UserCircleIcon, CheckCircleIcon } from './icons';

interface AIChatViewProps {
    history: ChatMessage[];
    setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    onAddItem: (item: Partial<Task & Note>, listId: string, type: 'task' | 'note') => Task | Note;
    onDetailItemChange: (item: Task | Note | null) => void;
    onActiveSelectionChange: (selection: ActiveSelection) => void;
    activeSelection: ActiveSelection;
}

const CreatedItemCard = ({ item, onView }: { item: Task | Note, onView: () => void }) => {
  const isTask = 'status' in item;
  return (
    <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 my-2 border border-gray-200 dark:border-gray-600">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
        {isTask ? 'Task Created' : 'Note Created'}
      </p>
      <h4 className="font-semibold text-gray-800 dark:text-white">{item.title}</h4>
      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
        {isTask ? (item as Task).description : (item as Note).content}
      </p>
      <button onClick={onView} className="text-sm font-semibold text-primary mt-2 hover:underline">
        View {isTask ? 'Task' : 'Note'}
      </button>
    </div>
  )
}

const AIChatView = ({ history, setHistory, onAddItem, onDetailItemChange, onActiveSelectionChange, activeSelection }: AIChatViewProps) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [history]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { id: uuidv4(), role: 'user', text: input };
        const newHistory = [...history, userMessage];
        setHistory(newHistory);
        setInput('');
        setIsLoading(true);

        try {
            const response = await runChat(newHistory, input);

            if (response.toolCalls) {
                // Handle function calls
                const toolResults: any[] = [];
                for (const toolCall of response.toolCalls) {
                    if (toolCall.name === 'createTask') {
                        const task = onAddItem(toolCall.args, '1', 'task');
                        toolResults.push({ callId: toolCall.name, toolName: 'createTask', data: task });
                    } else if (toolCall.name === 'createNote') {
                        const note = onAddItem(toolCall.args, '3', 'note');
                        toolResults.push({ callId: toolCall.name, toolName: 'createNote', data: note });
                    }
                }
                const modelMessage: ChatMessage = {
                  id: uuidv4(),
                  role: 'model',
                  text: "Got it! I've created the following items for you.",
                  toolResult: { ...toolResults[0], status: 'ok'} // Simplified for one tool call for now
                };
                setHistory(prev => [...prev, modelMessage]);

            } else if (response.text) {
                const modelMessage: ChatMessage = { id: uuidv4(), role: 'model', text: response.text };
                setHistory(prev => [...prev, modelMessage]);
            }

        } catch (error) {
            console.error("Error communicating with AI:", error);
            const errorMessage: ChatMessage = {
                id: uuidv4(),
                role: 'model',
                text: 'Sorry, I encountered an error. Please try again.'
            };
            setHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleViewItem = (item: Task | Note) => {
        onDetailItemChange(item);
        if (activeSelection.type !== 'list' || activeSelection.id !== item.listId) {
             onActiveSelectionChange({ type: 'list', id: item.listId });
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-brand-dark">
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700/80">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Prodify AI</h2>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                {history.map((msg, index) => (
                    <div key={msg.id} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                         {msg.role === 'model' && (
                             <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                 <SparklesIcon className="w-5 h-5 text-white" />
                             </div>
                         )}
                        <div className={`max-w-xl rounded-lg p-4 ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-800 rounded-bl-none'}`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            {msg.toolResult?.data && (
                              <CreatedItemCard item={msg.toolResult.data} onView={() => handleViewItem(msg.toolResult.data)} />
                            )}
                        </div>
                        {msg.role === 'user' && (
                             <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                 <UserCircleIcon className="w-6 h-6 text-gray-500" />
                             </div>
                         )}
                    </div>
                ))}
                {isLoading && (
                     <div className="flex items-start gap-4">
                         <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 animate-pulse">
                             <SparklesIcon className="w-5 h-5 text-white" />
                         </div>
                         <div className="max-w-xl rounded-lg p-4 bg-gray-100 dark:bg-gray-800 rounded-bl-none">
                             <div className="flex items-center space-x-2">
                                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                             </div>
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700/80">
                <form onSubmit={handleSendMessage} className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                handleSendMessage(e);
                            }
                        }}
                        placeholder="Make it more detailed according to 'Product Launch project'"
                        className="w-full pl-4 pr-12 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border-transparent focus:ring-2 focus:ring-primary resize-none"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center justify-center transition-colors"
                    >
                        <ArrowUpIcon className="w-5 h-5 text-white" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIChatView;