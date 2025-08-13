import React from 'react';
import { ChatMessage, Task, Note, ActiveSelection } from '../types';
import { SparklesIcon, UserCircleIcon, CheckCircleIcon } from './icons';

const CreatedItemCard = ({ item, onView }: { item: Task | Note, onView: () => void }) => {
  const isTask = 'status' in item;
  return (
    <div className="bg-gray-200 dark:bg-gray-700/80 rounded-lg p-3 my-2 border border-gray-300 dark:border-gray-600/50">
      <div className="flex items-center gap-2 mb-1">
        <CheckCircleIcon className="w-4 h-4 text-green-500"/>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {isTask ? 'Task Created' : 'Note Created'}
        </p>
      </div>
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

interface ChatMessageProps {
  message: ChatMessage;
  onViewItem: (item: Task | Note) => void;
}


const ChatMessageComponent = ({ message, onViewItem }: ChatMessageProps) => {
    return (
         <div className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
             {message.role === 'model' && (
                 <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                     <SparklesIcon className="w-5 h-5 text-white" />
                 </div>
             )}
            <div className={`max-w-xl rounded-lg p-4 ${message.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-800 rounded-bl-none'}`}>
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.toolResult?.data && (
                  <CreatedItemCard item={message.toolResult.data} onView={() => onViewItem(message.toolResult.data)} />
                )}
            </div>
            {message.role === 'user' && (
                 <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                     <UserCircleIcon className="w-6 h-6 text-gray-500" />
                 </div>
             )}
        </div>
    );
};

export default ChatMessageComponent;
