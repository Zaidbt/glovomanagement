// Permission system configuration
export const PERMISSIONS = {
  // Store permissions
  STORE_VIEW: "store.view",
  STORE_CREATE: "store.create",
  STORE_UPDATE: "store.update",
  STORE_DELETE: "store.delete",

  // User permissions
  USER_VIEW: "user.view",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",

  // Order permissions
  ORDER_VIEW: "order.view",
  ORDER_MANAGE: "order.manage",
  ORDER_UPDATE_STATUS: "order.update_status",

  // WhatsApp permissions
  WHATSAPP_SEND: "whatsapp.send",
  WHATSAPP_VIEW: "whatsapp.view",
  WHATSAPP_CONVERSATIONS_VIEW: "whatsapp.conversations.view",
  WHATSAPP_MESSAGES_VIEW: "whatsapp.messages.view",
  WHATSAPP_MESSAGES_SEND: "whatsapp.messages.send",

  // Attribution permissions
  ATTRIBUTION_MANAGE: "attribution.manage",
} as const;

export const ROLE_PERMISSIONS = {
  ADMIN: Object.values(PERMISSIONS),
  COLLABORATEUR: [
    PERMISSIONS.STORE_VIEW,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_MANAGE,
    PERMISSIONS.WHATSAPP_SEND,
    PERMISSIONS.WHATSAPP_VIEW,
    PERMISSIONS.WHATSAPP_CONVERSATIONS_VIEW,
    PERMISSIONS.WHATSAPP_MESSAGES_VIEW,
    PERMISSIONS.WHATSAPP_MESSAGES_SEND,
  ],
  FOURNISSEUR: [PERMISSIONS.ORDER_VIEW],
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type UserRole = keyof typeof ROLE_PERMISSIONS;

// Fonction pour vérifier les permissions
export function hasPermission(permission: Permission): boolean {
  // Pour l'instant, retourner true (à implémenter avec la session utilisateur)
  // TODO: Implémenter avec la session utilisateur réelle
  console.log("Checking permission:", permission);
  return true;
}
