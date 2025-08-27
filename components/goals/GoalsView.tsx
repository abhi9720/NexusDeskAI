import React, { useState, useMemo, useEffect } from 'react';
import { Goal, Task, List, Status, Note } from '../../types';
import { TrophyIcon, PlusIcon, SparklesIcon, PencilIcon } from '../icons';
import GoalDetailView from './GoalDetailView';
import CreateGoalWizard from './CreateGoalWizard';
import CreateManualGoalModal from './CreateManualGoalModal';


interface GoalsViewProps {
  goals: Goal[];
  tasks: Task[];
  lists: List[];
  onUpsertGoal: (goal: Omit<Goal, 'id'> & { id?: number }) => void;
  onDeleteGoal: (goalId: number) => void;
  onAddItem: (item: Partial<Task>, listId: number, type: 'task') => void;
  onAddList: (list: Omit<List, 'id' | 'statuses'>) => Promise<List>;
  onSelectItem: (item: Task | Note) => void;
}

const GoalsView = (props: GoalsViewProps) => {
  const { goals, tasks, lists, onUpsertGoal, onDeleteGoal, onAddItem, onAddList, onSelectItem } = props;
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [wizardMode, setWizardMode] = useState<'ai' | 'manual' | null>(null);
  const [isChoiceModalOpen, setChoiceModalOpen] = useState(false);

  useEffect(() => {
    const handleSelectGoalEvent = (event: CustomEvent) => {
      setSelectedGoalId(event.detail);
    };
    window.addEventListener('selectGoal', handleSelectGoalEvent as EventListener);
    return () => {
      window.removeEventListener('selectGoal', handleSelectGoalEvent as EventListener);
    }
  }, []);

  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [goals]);

  useEffect(() => {
    if (selectedGoalId === null && sortedGoals.length > 0) {
      setSelectedGoalId(sortedGoals[0].id);
    }
  }, [sortedGoals, selectedGoalId]);


  const selectedGoal = useMemo(() => {
    return sortedGoals.find(g => g.id === selectedGoalId) || null;
  }, [selectedGoalId, sortedGoals]);


  const handleStartWizard = (mode: 'ai' | 'manual') => {
    setChoiceModalOpen(false);
    setWizardMode(mode);
  };

  const handleCloseWizards = () => {
    setWizardMode(null);
  }

  return (
    <div className="flex h-full bg-brand-light dark:bg-brand-dark">
      {/* Sidebar for Goals */}
      <aside className="w-1/4 h-full bg-sidebar-light dark:bg-sidebar-dark p-4 border-r border-gray-200 dark:border-gray-700/80 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Goals</h2>
          <button onClick={() => setChoiceModalOpen(true)} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto space-y-2">
          {sortedGoals.map(goal => (
            <button
              key={goal.id}
              onClick={() => setSelectedGoalId(goal.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${selectedGoalId === goal.id ? 'bg-primary/10 text-primary' : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}`}
            >
              <p className="font-semibold truncate">{goal.title}</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${goal.progress || 0}%` }}></div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="w-3/4 h-full overflow-y-auto">
        {selectedGoal ? (
          <GoalDetailView
            key={selectedGoal.id}
            goal={selectedGoal}
            tasks={tasks.filter(t => (selectedGoal.linkedTaskListIds || []).includes(t.listId))}
            onDelete={() => {
                onDeleteGoal(selectedGoal.id);
                setSelectedGoalId(null);
            }}
            onSelectItem={onSelectItem as (task: Task) => void}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <TrophyIcon className="w-24 h-24 text-gray-300 dark:text-gray-600" />
            <h3 className="mt-4 text-xl font-semibold text-gray-800 dark:text-white">No Goal Selected</h3>
            <p className="text-gray-500 dark:text-gray-400">Select a goal from the list or create a new one to get started.</p>
          </div>
        )}
      </main>
      
      {isChoiceModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-sm" onClick={() => setChoiceModalOpen(false)}>
            <div className="bg-card-light dark:bg-card-dark rounded-xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
                 <h3 className="text-lg font-semibold text-center">How would you like to create your goal?</h3>
                 <div className="flex gap-4">
                     <button onClick={() => handleStartWizard('ai')} className="flex-1 flex flex-col items-center p-6 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20">
                         <SparklesIcon className="w-8 h-8 mb-2"/>
                         <span className="font-semibold">Plan with AI</span>
                         <span className="text-xs">Let AI help you refine and plan.</span>
                     </button>
                     <button onClick={() => handleStartWizard('manual')} className="flex-1 flex flex-col items-center p-6 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600">
                          <PencilIcon className="w-8 h-8 mb-2"/>
                          <span className="font-semibold">Create Manually</span>
                          <span className="text-xs">For when you have a clear plan.</span>
                     </button>
                 </div>
            </div>
        </div>
      )}

      {wizardMode === 'ai' && (
          <CreateGoalWizard 
            onClose={handleCloseWizards}
            onGoalCreate={onUpsertGoal}
            onTasksCreate={onAddItem}
            lists={lists}
            onAddList={onAddList}
          />
      )}
       {wizardMode === 'manual' && (
          <CreateManualGoalModal
            onClose={handleCloseWizards}
            onUpsertGoal={onUpsertGoal}
            lists={lists}
          />
      )}
    </div>
  );
};

export default GoalsView;