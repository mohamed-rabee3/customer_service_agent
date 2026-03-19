// src/services/toolsService.ts
import api from './api';

export const toolsAPI = {
  getPermissionsByInteraction: (interactionId: string) =>
    api.get(`/tools/permissions/interaction/${interactionId}`),

  respondToPermission: (permissionId: string, response: string) =>
    api.post(`/tools/permissions/${permissionId}/respond`, { response }),
};
