
import { storageService } from './storageService';
import { Goal } from '../types';

const COLLECTION = 'Goal';

export const goalService = {
  getAll: (): Promise<Goal[]> => storageService.getAll(COLLECTION),
  add: (data: Omit<Goal, 'id'>): Promise<Goal> => storageService.add(COLLECTION, data),
  update: (data: Goal): Promise<Goal> => storageService.update(COLLECTION, data.id, data),
  delete: (id: number): Promise<void> => storageService.delete(COLLECTION, id),
};
