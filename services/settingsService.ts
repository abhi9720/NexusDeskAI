
import { storageService } from './storageService';

export const settingsService = {
  getSetting: (key: string): Promise<any> => storageService.getSetting(key),
  setSetting: (key: string, value: any): Promise<void> => storageService.setSetting(key, value),
};
