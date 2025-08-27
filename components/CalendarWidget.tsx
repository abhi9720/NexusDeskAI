import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import {
  format,
  eachDayOfInterval,
  addWeeks,
  isSameDay,
  isToday,
  addDays,
} from 'date-fns';
import startOfWeek from 'date-fns/startOfWeek';
import subWeeks from 'date-fns/subWeeks';
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, EllipsisHorizontalIcon, VideoIcon, ChatBubbleLeftEllipsisIcon, PaperClipIcon, ListBulletIcon } from './icons';

interface CalendarWidgetProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const TaskEventCard = ({ task, onClick }: { task: Task; onClick: (task: Task) => void }) => {
  return (
    <div
      onClick={() => onClick(task)}
      className="p-3 bg-white dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-700/60 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 dark:text-white truncate">{task.title}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isToday(new Date(task.dueDate)) ? 'Today' : format(new Date(task.dueDate), 'MMM d')} • Priority: {task.priority}
          </p>
        </div>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2">
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </button>
      </div>
       <div className="flex items-center space-x-3 text-xs text-gray-400 dark:text-gray-500 mt-2 pt-2 border-t border-gray-200/80 dark:border-gray-700/60">
          {task.comments?.length > 0 && (
              <div className="flex items-center gap-1">
                  <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                  <span>{task.comments.length}</span>
              </div>
          )}
          {task.attachments?.length > 0 && (
              <div className="flex items-center gap-1">
                  <PaperClipIcon className="w-4 h-4" />
                  <span>{task.attachments.length}</span>
              </div>
          )}
          {task.checklist?.length > 0 && (
              <div className="flex items-center gap-1">
                  <ListBulletIcon className="w-4 h-4" />
                  <span>{task.checklist.filter(i => i.completed).length}/{task.checklist.length}</span>
              </div>
          )}
      </div>
      
      {task.tags.includes('meeting') && (
        <div className="mt-3">
             <button className="flex items-center gap-2 text-sm font-semibold px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600">
                <VideoIcon className="w-4 h-4 text-green-500"/>
                <span>Join Meeting</span>
             </button>
        </div>
      )}
    </div>
  );
};


const CalendarWidget = ({ tasks, onTaskClick }: CalendarWidgetProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
    return eachDayOfInterval({ start: start, end: addDays(start, 6) });
  }, [currentDate]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
        try {
            const dayKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
            if (!map.has(dayKey)) map.set(dayKey, []);
            map.get(dayKey)?.push(task);
        } catch {}
    });
    return map;
  }, [tasks]);

  const selectedDayTasks = useMemo(() => {
    const dayKey = format(selectedDate, 'yyyy-MM-dd');
    const tasksForDay = tasksByDay.get(dayKey) || [];
    return tasksForDay.sort((a,b) => { // Sort by priority
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [tasksByDay, selectedDate]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1);
    setCurrentDate(newDate);
    setSelectedDate(startOfWeek(newDate, { weekStartsOn: 0 }));
  };
  
  const handleSelectDate = (day: Date) => {
    setSelectedDate(day);
  };

  return (
    <div className="bg-card-light/70 dark:bg-card-dark/70 backdrop-blur-md p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20 dark:border-black/20">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarDaysIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{format(currentDate, 'MMMM')}</span>
            <button onClick={() => navigateWeek('prev')} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button onClick={() => navigateWeek('next')} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <ChevronRightIcon className="w-5 h-5" />
            </button>
        </div>
      </header>

      <div className="flex justify-between items-center space-x-1 sm:space-x-2 mb-6">
        {weekDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const hasTasks = tasksByDay.has(dayKey);
          return (
            <button
                key={day.toISOString()}
                onClick={() => handleSelectDate(day)}
                className={`w-full flex flex-col items-center py-2 px-1 rounded-lg transition-all duration-200 relative
                ${isSameDay(day, selectedDate)
                    ? 'bg-primary text-white shadow-lg transform scale-105'
                    : 'hover:bg-primary/10 dark:hover:bg-primary/20'
                }
                ${isToday(day) && !isSameDay(day, selectedDate)
                    ? 'text-primary dark:text-primary-light'
                    : ''
                }
                `}
            >
                <span className="text-xs opacity-80">{format(day, 'E')}</span>
                <span className="font-semibold text-lg mt-1">{format(day, 'd')}</span>
                {hasTasks && <div className={`absolute bottom-1 h-1 w-1 rounded-full ${isSameDay(day, selectedDate) ? 'bg-white' : 'bg-primary'}`}></div>}
            </button>
          )
        })}
      </div>

      <div className="space-y-3 min-h-[150px] max-h-[300px] overflow-y-auto pr-2 -mr-2">
        {selectedDayTasks.length > 0 ? (
          selectedDayTasks.map(task => (
            <TaskEventCard key={task.id} task={task} onClick={onTaskClick} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-sm text-gray-500 dark:text-gray-400 py-6">
            <p>No events for {format(selectedDate, 'MMM d')}.</p>
            <p className="text-xs mt-1">Enjoy your day!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarWidget;