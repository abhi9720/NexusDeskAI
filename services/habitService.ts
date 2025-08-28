
import { storageService } from './storageService';
import { Habit, HabitLog } from '../types';

const HABIT_COLLECTION = 'Habit';
const LOG_COLLECTION = 'HabitLog';

export const habitService = {
  // Habits
  getAllHabits: (): Promise<Habit[]> => storageService.getAll(HABIT_COLLECTION),
  addHabit: (data: Omit<Habit, 'id'>): Promise<Habit> => storageService.add(HABIT_COLLECTION, data),
  updateHabit: (data: Habit): Promise<Habit> => storageService.update(HABIT_COLLECTION, data.id, data),
  deleteHabit: (id: number): Promise<void> => storageService.delete(HABIT_COLLECTION, id),

  // Logs
  getAllLogs: (): Promise<HabitLog[]> => storageService.getAll(LOG_COLLECTION),
  addLog: (data: Omit<HabitLog, 'id'>): Promise<HabitLog> => storageService.add(LOG_COLLECTION, data),
  updateLog: (data: HabitLog): Promise<HabitLog> => storageService.update(LOG_COLLECTION, data.id, data),
  deleteLog: (id: number): Promise<void> => storageService.delete(LOG_COLLECTION, id),
};
