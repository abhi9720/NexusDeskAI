import React from 'react';
import { Goal, GoalInsight } from '../../types';
import { TrophyIcon, ExclamationTriangleIcon } from '../icons';

interface GoalHealthWidgetProps {
  goals: Goal[];
  insights: Map<number, GoalInsight>;
  isLoading: boolean;
  onSelectGoal: (goalId: number) => void;
}

const GoalHealthWidget = ({ goals, insights, isLoading, onSelectGoal }: GoalHealthWidgetProps) => {
  const atRiskGoals = goals.filter(g => {
    const insight = insights.get(g.id);
    return insight && (insight.riskLevel === 'Medium' || insight.riskLevel === 'High');
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
                 <div key={i} className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700/50 animate-pulse">
                     <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                     <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mt-2"></div>
                 </div>
            ))}
        </div>
      );
    }

    if (atRiskGoals.length === 0) {
      return (
        <div className="text-center py-6">
          <TrophyIcon className="w-8 h-8 mx-auto text-green-500" />
          <p className="text-sm font-semibold mt-2 text-gray-700 dark:text-gray-200">All goals are on track!</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Keep up the great work.</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {atRiskGoals.map(goal => {
          const insight = insights.get(goal.id);
          const isHighRisk = insight?.riskLevel === 'High';
          return (
            <div
              key={goal.id}
              onClick={() => onSelectGoal(goal.id)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                isHighRisk 
                ? 'bg-red-50/80 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' 
                : 'bg-yellow-50/80 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
              }`}
            >
              <div className="flex justify-between items-start">
                  <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{goal.title}</p>
                   <span className={`text-xs font-bold flex-shrink-0 ml-2 ${isHighRisk ? 'text-red-500' : 'text-yellow-500'}`}>{insight?.riskLevel} Risk</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{insight?.riskReasoning}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50">
      <div className="flex items-center gap-3 mb-4">
        <ExclamationTriangleIcon className="w-6 h-6 text-primary" />
        <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Goal Health</h3>
      </div>
      {renderContent()}
    </div>
  );
};

export default GoalHealthWidget;
