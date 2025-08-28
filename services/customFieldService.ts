
import { storageService } from './storageService';
import { CustomFieldDefinition } from '../types';

const COLLECTION = 'CustomFieldDefinition';

export const customFieldService = {
  getAll: (): Promise<CustomFieldDefinition[]> => storageService.getAll(COLLECTION),
  add: (data: Omit<CustomFieldDefinition, 'id'>): Promise<CustomFieldDefinition> => storageService.add(COLLECTION, data),
  // Deleting all and re-adding is handled in App.tsx for simplicity.
  delete: (id: number): Promise<void> => storageService.delete(COLLECTION, id),
};
