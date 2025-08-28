import { UserStats } from '../types';
import { isToday, isYesterday } from 'date-fns';
import startOfDay from 'date-fns/startOfDay';

const POINTS_PER_TASK = 10;
const POINTS_PER_HABIT = 5;

const processCompletion = (currentStats: UserStats, pointsToAdd: number): UserStats => {
    const today = startOfDay(new Date());
    const lastCompletion = currentStats.lastCompletionDate ? new Date(currentStats.lastCompletionDate) : null;

    const newPoints = currentStats.points + pointsToAdd;

    // If something was already completed today, just add points and return
    if (lastCompletion && isToday(lastCompletion)) {
        return { ...currentStats, points: newPoints };
    }

    // Otherwise, update streak too
    let newStreak = currentStats.currentStreak;
    if (lastCompletion && isYesterday(lastCompletion)) {
        newStreak += 1; // Continue the streak
    } else {
        newStreak = 1; // Start a new streak
    }
    
    return {
        ...currentStats,
        points: newPoints,
        currentStreak: newStreak,
        lastCompletionDate: today.toISOString(),
    };
};

const reverseCompletion = (currentStats: UserStats, pointsToSubtract: number, hasOtherCompletionsToday: boolean): UserStats => {
    const newPoints = Math.max(0, currentStats.points - pointsToSubtract);
    const lastCompletion = currentStats.lastCompletionDate ? new Date(currentStats.lastCompletionDate) : null;

    // If there are other completions today, or if the last completion wasn't today, only points are affected.
    if (hasOtherCompletionsToday || !lastCompletion || !isToday(lastCompletion)) {
        return {
            ...currentStats,
            points: newPoints,
        };
    }
    
    // This was the last completion for today. Reset streak-related fields.
    // This is a simplification; a perfect revert isn't possible without historical data.
    return {
        ...currentStats,
        points: newPoints,
        currentStreak: 0,
        lastCompletionDate: null,
    };
};


export const gamificationService = {
    processTaskCompletion(currentStats: UserStats): UserStats {
        return processCompletion(currentStats, POINTS_PER_TASK);
    },

    processHabitCompletion(currentStats: UserStats): UserStats {
        return processCompletion(currentStats, POINTS_PER_HABIT);
    },

    reverseTaskCompletion(currentStats: UserStats, hasOtherCompletionsToday: boolean): UserStats {
        return reverseCompletion(currentStats, POINTS_PER_TASK, hasOtherCompletionsToday);
    },

    reverseHabitCompletion(currentStats: UserStats, hasOtherCompletionsToday: boolean): UserStats {
        return reverseCompletion(currentStats, POINTS_PER_HABIT, hasOtherCompletionsToday);
    }
};