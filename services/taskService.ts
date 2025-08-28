
import { storageService } from './storageService';
import { Task } from '../types';

const COLLECTION = 'Task';

export const taskService = {
  getAll: (): Promise<Task[]> => storageService.getAll(COLLECTION),
  getById: (id: number): Promise<Task> => storageService.getById(COLLECTION, id),
  add: (data: Omit<Task, 'id'>): Promise<Task> => storageService.add(COLLECTION, data),
  update: (data: Task): Promise<Task> => storageService.update(COLLECTION, data.id, data),
  delete: (id: number): Promise<void> => storageService.delete(COLLECTION, id),
};
