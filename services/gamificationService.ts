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


export const gamificationService = {
    processTaskCompletion(currentStats: UserStats): UserStats {
        return processCompletion(currentStats, POINTS_PER_TASK);
    },

    processHabitCompletion(currentStats: UserStats): UserStats {
        return processCompletion(currentStats, POINTS_PER_HABIT);
    }
};
