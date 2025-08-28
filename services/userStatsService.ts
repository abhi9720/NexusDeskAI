
import { storageService } from './storageService';
import { UserStats } from '../types';

const COLLECTION = 'UserStats';

export const userStatsService = {
  getAll: (): Promise<UserStats[]> => storageService.getAll(COLLECTION),
  // UserStats is a single record with id=1, so we use update for both add and update.
  upsert: (data: UserStats): Promise<UserStats> => storageService.update(COLLECTION, 1, data),
};
