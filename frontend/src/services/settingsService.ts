// src/services/settingsService.ts
import api from './api';

export const settingsAPI = {
  // حفظ كل الإعدادات 
  save: (data: {
    companyName: string;
    supportEmail: string;
    logo?: string | null;
    language: string;
    emailNotif: boolean;
    pushNotif: boolean;
    inAppNotif: boolean;
    twoFactor: boolean;
    maxActiveConversations: number;
    autoAssign: boolean;
  }) => api.put('/settings', data), // أو post لو أول مرة
};