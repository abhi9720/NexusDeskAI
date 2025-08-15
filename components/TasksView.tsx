import * as React from 'react';
import { Task, Status, Priority, TaskFilter } from '../types';
import AddTaskModal from './AddTaskModal';
import TaskModal from './TaskModal';
import { PlusIcon, ClockIcon, PaperClipIcon, ListBulletIcon, XMarkIcon, ViewColumnsIcon, QueueListIcon } from './icons';

interface TasksViewProps {
  tasks: Task[];
  onAddTask: (task: Partial<Task>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
  taskFilter: TaskFilter;
  setTaskFilter: (update: React.SetStateAction<TaskFilter>) => void;
}

const statusConfig: Record<Status, { title: string, color: string }> = {
  [Status.Backlog]: { title: 'Backlog', color: 'bg-gray-500' },
  [Status.ToDo]: { title: 'To Do', color: 'bg-blue-500' },
  [Status.InProgress]: { title: 'In Progress', color: 'bg-yellow-500' },
  [Status.Review]: { title: 'Review', color: 'bg-purple-500' },
  [Status.Waiting]: { title: 'Waiting', color: 'bg-slate-500' },
  [Status.Done]: { title: 'Done', color: 'bg-green-500' },
};

const priorityColors: Record<Priority, { dot: string, text: string }> = {
    [Priority.High]: { dot: 'bg-red-500', text: 'text-red-500' },
    [Priority.Medium]: { dot: 'bg-yellow-500', text: 'text-yellow-500' },
    [Priority.Low]: { dot: 'bg-green-500', text: 'text-green-500' },
};

// --- Board View Components ---
const TaskCard = ({ task, onClick, onDragStart }: { task: Task; onClick: () => void; onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void; }) => {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    const isOverdue = dueDate < today && task.status !== Status.Done;

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, String(task.id))}
            onClick={onClick}
            className="p-4 mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
            role="button"
            aria-label={`View task: ${task.title}`}
        >
            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">{task.title}</h4>
            <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <span className={`flex items-center space-x-1.5 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                    <ClockIcon className="w-4 h-4" />
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                </span>
                <div className="flex items-center space-x-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${priorityColors[task.priority].dot}`}></span>
                    <span className={`font-medium ${priorityColors[task.priority].text}`}>{task.priority}</span>
                </div>
            </div>
             <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-gray-400 dark:text-gray-500">
                {task.attachments?.length > 0 && (
                     <div className="flex items-center gap-1">
                        <PaperClipIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">{task.attachments.length}</span>
                    </div>
                )}
                {task.checklist?.length > 0 && (
                     <div className="flex items-center gap-1">
                        <ListBulletIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">
                            {task.checklist.filter(i => i.completed).length}/{task.checklist.length}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

interface TaskColumnProps {
    status: Status;
    tasks: Task[];
    onCardClick: (task: Task) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, status: Status) => void;
}

const TaskColumn = ({ status, tasks, onCardClick, onDragStart, onDrop }: TaskColumnProps) => {
    const [isOver, setIsOver] = React.useState(false);
    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
            onDragLeave={() => setIsOver(false)}
            onDrop={(e) => { onDrop(e, status); setIsOver(false); }}
            className={`flex-shrink-0 w-80 p-3 bg-gray-100 dark:bg-gray-900 rounded-xl transition-colors ${isOver ? 'bg-primary/20' : ''}`}
        >
            <div className="flex items-center space-x-2 mb-4 px-1">
                <span className={`w-3 h-3 rounded-full ${statusConfig[status].color}`}></span>
                <h3 className="font-bold text-gray-800 dark:text-white">{statusConfig[status].title}</h3>
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5">{tasks.length}</span>
            </div>
            <div className="space-y-4 min-h-[100px]">
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={() => onCardClick(task)} onDragStart={onDragStart} />
                ))}
            </div>
        </div>
    );
};


// --- List View Components ---
const TaskListItem = ({ task, onUpdate, onSelect }: { task: Task; onUpdate: (task: Task) => void; onSelect: (task: Task) => void; }) => {
    const handleToggleComplete = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStatus = e.target.checked ? Status.Done : Status.ToDo;
        onUpdate({ ...task, status: newStatus });
    };

    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    const isOverdue = dueDate < today && task.status !== Status.Done;
    
    return (
        <div className="flex items-center p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 group" >
            <input 
                type="checkbox"
                checked={task.status === Status.Done}
                onChange={handleToggleComplete}
                className="h-5 w-5 rounded-full border-gray-300 dark:border-gray-600 text-primary focus:ring-primary focus:ring-2 mr-4 flex-shrink-0"
                aria-label={`Mark task ${task.title} as ${task.status === Status.Done ? 'not complete' : 'complete'}`}
            />
            <div onClick={() => onSelect(task)} className="flex-grow cursor-pointer">
                <p className={`text-gray-800 dark:text-gray-100 ${task.status === Status.Done ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>{task.title}</p>
                <div className="flex items-center text-xs space-x-3 text-gray-500 dark:text-gray-400 mt-1">
                     <span className={`flex items-center space-x-1 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    </span>
                    <div className="flex items-center space-x-1">
                        <span className={`w-2 h-2 rounded-full ${priorityColors[task.priority].dot}`}></span>
                        <span>{task.priority}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TaskListGroup = ({ title, tasks, onUpdate, onSelect }: { title: string, tasks: Task[], onUpdate: (task: Task) => void; onSelect: (task: Task) => void; }) => {
    if (tasks.length === 0) return null;
    return (
        <div className="mb-6">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 px-3 mb-2">{title} ({tasks.length})</h3>
            {tasks.map(task => (
                <TaskListItem key={task.id} task={task} onUpdate={onUpdate} onSelect={onSelect} />
            ))}
        </div>
    )
};


const TasksView = ({ tasks, onAddTask, onUpdateTask, onDeleteTask, taskFilter, setTaskFilter }: TasksViewProps) => {
  const [view, setView] = React.useState<'board' | 'list'>('board');
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  React.useEffect(() => {
    if (selectedTask) {
        const updatedTask = tasks.find(t => t.id === selectedTask.id);
        if (updatedTask) {
            setSelectedTask(updatedTask);
        } else {
            setSelectedTask(null);
        }
    }
  }, [tasks, selectedTask?.id]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: Status) => {
    const taskId = e.dataTransfer.getData('taskId');
    const taskToMove = tasks.find(t => t.id === parseInt(taskId, 10));
    if (taskToMove && taskToMove.status !== newStatus) {
      onUpdateTask({ ...taskToMove, status: newStatus });
    }
  };

  const filteredTasks = React.useMemo(() => {
    return tasks.filter(task => {
        const keywordMatch = taskFilter.keyword
            ? task.title.toLowerCase().includes(taskFilter.keyword.toLowerCase()) || 
              task.description.toLowerCase().includes(taskFilter.keyword.toLowerCase())
            : true;

        const priorityMatch = taskFilter.priority === 'all' || task.priority === taskFilter.priority;
        const statusMatch = taskFilter.status === 'all' || task.status === taskFilter.status;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isOverdue = task.status !== Status.Done && new Date(task.dueDate) < today;
        const overdueMatch = taskFilter.overdue ? isOverdue : true;

        return keywordMatch && priorityMatch && statusMatch && overdueMatch;
      });
  }, [tasks, taskFilter]);

  const tasksByStatus = React.useMemo(() => {
    const sortedTasks = [...filteredTasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sortedTasks.reduce((acc, task) => {
      acc[task.status] = acc[task.status] || [];
      acc[task.status].push(task);
      return acc;
    }, {} as Record<Status, Task[]>);
  }, [filteredTasks]);

  const groupedTasksForList = React.useMemo(() => {
    const groups = { overdue: [] as Task[], today: [] as Task[], tomorrow: [] as Task[], upcoming: [] as Task[], completed: [] as Task[] };
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    
    filteredTasks.forEach(task => {
        if (task.status === Status.Done) {
            groups.completed.push(task);
            return;
        }
        const dueDate = new Date(task.dueDate); dueDate.setHours(0,0,0,0);
        if (dueDate < today) {
            groups.overdue.push(task);
        } else if (dueDate.getTime() === today.getTime()) {
            groups.today.push(task);
        } else if (dueDate.getTime() === tomorrow.getTime()) {
            groups.tomorrow.push(task);
        } else {
            groups.upcoming.push(task);
        }
    });
    return groups;
  }, [filteredTasks]);

  const clearFilters = () => {
    setTaskFilter({ status: 'all', priority: 'all', keyword: '', overdue: false });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in h-[calc(100vh-64px)] flex flex-col">
        <header className="flex-shrink-0 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Tasks</h2>
                    <div className="flex items-center bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                        <button onClick={() => setView('board')} className={`p-1.5 rounded-md ${view === 'board' ? 'bg-white dark:bg-gray-800 shadow' : 'text-gray-500 dark:text-gray-400'}`} aria-label="Board View">
                            <ViewColumnsIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={() => setView('list')} className={`p-1.5 rounded-md ${view === 'list' ? 'bg-white dark:bg-gray-800 shadow' : 'text-gray-500 dark:text-gray-400'}`} aria-label="List View">
                            <QueueListIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => setIsAddTaskModalOpen(true)}
                    className="flex-shrink-0 flex items-center space-x-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all transform hover:scale-105 shadow-md"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Task</span>
                </button>
            </div>
            <div className="flex flex-wrap gap-4 w-full p-3 bg-gray-100/50 dark:bg-gray-800/20 rounded-lg items-center">
                <input 
                    type="text"
                    placeholder="Filter by keyword..."
                    value={taskFilter.keyword}
                    onChange={e => setTaskFilter(prev => ({...prev, keyword: e.target.value}))}
                    className="flex-grow pl-4 pr-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    aria-label="Filter tasks by keyword"
                />
                <select
                    value={taskFilter.status}
                    onChange={e => setTaskFilter(prev => ({...prev, status: e.target.value as Status | 'all'}))}
                    className="w-full sm:w-auto appearance-none pl-4 pr-10 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    aria-label="Filter tasks by status"
                >
                    <option value="all">All Statuses</option>
                    {Object.values(Status).map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
                <select
                    value={taskFilter.priority}
                    onChange={e => setTaskFilter(prev => ({...prev, priority: e.target.value as Priority | 'all'}))}
                    className="w-full sm:w-auto appearance-none pl-4 pr-10 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    aria-label="Filter tasks by priority"
                >
                    <option value="all">All Priorities</option>
                    {Object.values(Priority).map(p => (<option key={p} value={p}>{p}</option>))}
                </select>
                <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={taskFilter.overdue || false} onChange={e => setTaskFilter(prev => ({...prev, overdue: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                    <span>Overdue Only</span>
                </label>
                <button onClick={clearFilters} className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors">
                    <XMarkIcon className="w-4 h-4" />
                    <span>Clear</span>
                </button>
            </div>
        </header>

        {view === 'board' ? (
             <div className="flex-grow flex space-x-6 pb-4 overflow-x-auto">
                {Object.values(Status).map(status => (
                    <TaskColumn
                        key={status}
                        status={status}
                        tasks={tasksByStatus[status] || []}
                        onCardClick={setSelectedTask}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                    />
                ))}
            </div>
        ) : (
            <div className="flex-grow overflow-y-auto">
                <TaskListGroup title="Overdue" tasks={groupedTasksForList.overdue} onUpdate={onUpdateTask} onSelect={setSelectedTask} />
                <TaskListGroup title="Today" tasks={groupedTasksForList.today} onUpdate={onUpdateTask} onSelect={setSelectedTask} />
                <TaskListGroup title="Tomorrow" tasks={groupedTasksForList.tomorrow} onUpdate={onUpdateTask} onSelect={setSelectedTask} />
                <TaskListGroup title="Upcoming" tasks={groupedTasksForList.upcoming} onUpdate={onUpdateTask} onSelect={setSelectedTask} />
                <TaskListGroup title="Completed" tasks={groupedTasksForList.completed} onUpdate={onUpdateTask} onSelect={setSelectedTask} />
            </div>
        )}
       
        <AddTaskModal
            isOpen={isAddTaskModalOpen}
            onClose={() => setIsAddTaskModalOpen(false)}
            onAddTask={(task) => onAddTask(task)}
        />
        <TaskModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
        />
    </div>
  );
};

export default TasksView;