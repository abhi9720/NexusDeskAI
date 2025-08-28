
import { storageService } from './storageService';
import { CustomReminder } from '../types';

const COLLECTION = 'CustomReminder';

export const reminderService = {
  getAll: (): Promise<CustomReminder[]> => storageService.getAll(COLLECTION),
  add: (data: Omit<CustomReminder, 'id'>): Promise<CustomReminder> => storageService.add(COLLECTION, data),
  update: (data: CustomReminder): Promise<CustomReminder> => storageService.update(COLLECTION, data.id, data),
  delete: (id: number): Promise<void> => storageService.delete(COLLECTION, id),
};
