import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
// FIX: Import functions not available in top-level 'date-fns' from their submodules.
import {
  format,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  isSameDay,
  isToday,
  isSameMonth,
  endOfMonth,
  addMonths,
  addDays,
} from 'date-fns';
import startOfWeek from 'date-fns/startOfWeek';
import subWeeks from 'date-fns/subWeeks';
import startOfMonth from 'date-fns/startOfMonth';
import subMonths from 'date-fns/subMonths';

interface TaskCalendarViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

const TaskCalendarView = ({ tasks, onSelectTask }: TaskCalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'bi-weekly'>('week');

  const { days, headerText } = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return {
        days: eachDayOfInterval({ start, end }),
        headerText: `${format(start, 'MMM d')} - ${format(end, isSameMonth(start, end) ? 'd, yyyy' : 'MMM d, yyyy')}`
      };
    } else if (viewMode === 'bi-weekly') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = addDays(start, 13);
      return {
        days: eachDayOfInterval({ start, end }),
        headerText: `${format(start, 'MMM d')} - ${format(end, isSameMonth(start, end) ? 'd, yyyy' : 'MMM d, yyyy')}`
      };
    } else { // month view
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const monthGridStart = startOfWeek(start, { weekStartsOn: 0 });
      const monthGridEnd = endOfWeek(end, { weekStartsOn: 0 });
      return {
        days: eachDayOfInterval({ start: monthGridStart, end: monthGridEnd }),
        headerText: format(currentDate, 'MMMM yyyy')
      };
    }
  }, [currentDate, viewMode]);
  
  const navigate = (direction: 'next' | 'prev' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    const modifier = direction === 'next' ? 1 : -1;
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, modifier));
    } else if (viewMode === 'bi-weekly') {
        setCurrentDate(addWeeks(currentDate, modifier * 2));
    } else {
      setCurrentDate(addMonths(currentDate, modifier));
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-4 flex flex-col h-full bg-white dark:bg-brand-dark">
      <header className="flex-shrink-0 flex items-center justify-between mb-4 px-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          {headerText}
        </h3>
        <div className="flex items-center space-x-2">
          <div className="p-1 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center text-sm">
             <button onClick={() => setViewMode('week')} className={`px-3 py-1 rounded-md transition-colors ${viewMode === 'week' ? 'bg-white dark:bg-gray-800 shadow-sm font-semibold' : 'text-gray-600 dark:text-gray-300'}`}>Week</button>
             <button onClick={() => setViewMode('bi-weekly')} className={`px-3 py-1 rounded-md transition-colors ${viewMode === 'bi-weekly' ? 'bg-white dark:bg-gray-800 shadow-sm font-semibold' : 'text-gray-600 dark:text-gray-300'}`}>Bi-weekly</button>
             <button onClick={() => setViewMode('month')} className={`px-3 py-1 rounded-md transition-colors ${viewMode === 'month' ? 'bg-white dark:bg-gray-800 shadow-sm font-semibold' : 'text-gray-600 dark:text-gray-300'}`}>Month</button>
          </div>
          <button onClick={() => navigate('prev')} className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Previous">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button onClick={() => navigate('today')} className="px-3 py-1 text-sm font-semibold rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">Today</button>
          <button onClick={() => navigate('next')} className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Next">
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col">
        {(viewMode === 'month' || viewMode === 'bi-weekly') && (
           <div className="grid grid-cols-7">
              {dayNames.map(day => (
                 <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">
                    {day}
                 </div>
              ))}
           </div>
        )}
        <div className={`flex-1 grid grid-cols-7 ${viewMode === 'month' ? 'grid-rows-6' : viewMode === 'bi-weekly' ? 'grid-rows-2' : ''} ${viewMode !== 'week' ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
          {days.map(day => {
            const tasksForDay = tasks.filter(task => {
                try { return isSameDay(new Date(task.dueDate), day); } catch { return false; }
            });
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <div key={day.toString()} className={`border-r border-b border-gray-200 dark:border-gray-700 flex flex-col
                ${viewMode === 'week' ? 'border-t border-l' : ''}
                ${viewMode === 'month' && !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/20' : ''}
              `}>
                 {viewMode === 'week' ? (
                    <div className="text-center p-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{format(day, 'EEE')}</p>
                      <p className={`text-lg font-semibold mt-1 ${isToday(day) ? 'flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white mx-auto' : 'text-gray-700 dark:text-gray-200'}`}>
                        {format(day, 'd')}
                      </p>
                    </div>
                  ) : (
                    <p className={`text-sm self-start m-1 ${isToday(day) ? 'bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center' : ''} ${viewMode === 'month' && !isCurrentMonth ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                      {format(day, 'd')}
                    </p>
                  )}
                <div className="p-1 flex-1 overflow-y-auto space-y-1">
                   {tasksForDay.map(task => (
                    <button 
                      key={task.id} 
                      onClick={() => onSelectTask(task)}
                      className="w-full text-left text-xs p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary-dark dark:text-primary-light truncate"
                    >
                      {task.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TaskCalendarView;