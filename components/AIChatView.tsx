import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChatSession, Task, Note, ActiveSelection } from '../types';
import { SparklesIcon, ArrowUpIcon, UserCircleIcon, PlusIcon, HistoryIcon, EllipsisHorizontalIcon, MicrophoneIcon } from './icons';
import VoiceInputModal from './VoiceInputModal';

// In-browser speech recognition can be inconsistent, so we declare the type to avoid TS errors
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
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

interface AIChatViewProps {
    activeSession: ChatSession | null;
    sessions: ChatSession[];
    onSendMessage: (message: string) => Promise<void>;
    onNewChat: () => void;
    onSelectChatSession: (sessionId: number) => void;
    onAddItem: (item: Partial<Task & Note>, listId: number, type: 'task' | 'note') => Promise<Task | Note>;
    onDetailItemChange: (item: Task | Note | null) => void;
    onActiveSelectionChange: (selection: ActiveSelection) => void;
    activeSelection: ActiveSelection;
}

const WelcomeScreen = ({ onExampleClick }: { onExampleClick: (prompt: string) => void }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-6 shadow-lg">
        <SparklesIcon className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white">How can I help you?</h2>
      <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">I can create tasks and notes for you. Try saying or typing:</p>
      <button 
        onClick={() => onExampleClick("Create a task to design the new homepage by tomorrow")}
        className="text-sm text-gray-700 dark:text-gray-200 mt-4 font-mono p-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        "Create a task to design the new homepage by tomorrow"
      </button>
    </div>
);

const AIChatView = ({ activeSession, sessions, onSendMessage, onNewChat, onSelectChatSession, onAddItem, onDetailItemChange, onActiveSelectionChange, activeSelection }: AIChatViewProps) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const historyMenuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const chatHistory = useMemo(() => {
        return sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [sessions]);

    const messages = useMemo(() => {
        return activeSession ? activeSession.messages : [];
    }, [activeSession]);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        if (!isLoading) {
            setInput('');
        }
    }, [isLoading]);
    
     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (historyMenuRef.current && !historyMenuRef.current.contains(event.target as Node)) {
                setIsHistoryOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [historyMenuRef]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        
        const messageToSend = input;
        setInput('');
        setIsLoading(true);
        await onSendMessage(messageToSend);
        setIsLoading(false);
    };
    
    const handleViewItem = (item: Task | Note) => {
        onDetailItemChange(item);
        if (activeSelection.type !== 'list' || activeSelection.id !== item.listId) {
             onActiveSelectionChange({ type: 'list', id: item.listId });
        }
    };

    const handleExampleClick = (prompt: string) => {
        if (isLoading) return;
        setInput(prompt);
    };

    const handleTranscriptComplete = (transcript: string) => {
        setInput(transcript);
        setIsVoiceModalOpen(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-brand-dark">
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700/80">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Prodify AI</h2>
                <div className="flex items-center space-x-2">
                    <button onClick={onNewChat} title="New Chat" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <PlusIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div className="relative" ref={historyMenuRef}>
                        <button onClick={() => setIsHistoryOpen(prev => !prev)} title="History" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                             <HistoryIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                        {isHistoryOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20 border border-gray-200 dark:border-gray-700 animate-fade-in">
                                <p className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Recent Chats</p>
                                {chatHistory.slice(0, 5).map(session => (
                                    <button 
                                        key={session.id}
                                        onClick={() => {
                                            onSelectChatSession(session.id);
                                            setIsHistoryOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 truncate"
                                    >
                                        {session.title}
                                    </button>
                                ))}
                                {chatHistory.length === 0 && <p className="px-4 py-2 text-sm text-gray-500">No history yet.</p>}
                            </div>
                        )}
                    </div>
                     <button title="More options" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                         <EllipsisHorizontalIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                 {messages.length === 0 && !isLoading && <WelcomeScreen onExampleClick={handleExampleClick} />}
                {messages.map(msg => (
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
                {isLoading && activeSession && (
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
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e as any);
                            }
                        }}
                        placeholder="Make it more detailed according to 'Product Launch project'"
                        className="w-full pl-12 pr-12 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border-transparent focus:ring-2 focus:ring-primary resize-none"
                        rows={1}
                        disabled={isLoading}
                    />
                     <button
                        type="button"
                        onClick={() => setIsVoiceModalOpen(true)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
                        title="Use voice input"
                    >
                        <MicrophoneIcon className="w-5 h-5" />
                    </button>
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center justify-center transition-colors"
                    >
                        <ArrowUpIcon className="w-5 h-5 text-white" />
                    </button>
                </form>
            </div>
            <VoiceInputModal
                isOpen={isVoiceModalOpen}
                onClose={() => setIsVoiceModalOpen(false)}
                onComplete={handleTranscriptComplete}
            />
        </div>
    );
};

export default AIChatView;