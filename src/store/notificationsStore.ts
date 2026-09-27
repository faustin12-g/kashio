import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { NotificationLogEntry } from '../models/types';
import {
  clearAllNotifications,
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../repositories/notificationLogRepository';

interface NotificationsState {
  items: NotificationLogEntry[];
  unreadCount: number;
  isLoaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  markRead: (db: SQLiteDatabase, id: string) => Promise<void>;
  markAllRead: (db: SQLiteDatabase) => Promise<void>;
  clearAll: (db: SQLiteDatabase) => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  unreadCount: 0,
  isLoaded: false,

  load: async (db) => {
    const [items, unreadCount] = await Promise.all([listNotifications(db), countUnreadNotifications(db)]);
    set({ items, unreadCount, isLoaded: true });
  },

  markRead: async (db, id) => {
    await markNotificationRead(db, id);
    await get().load(db);
  },

  markAllRead: async (db) => {
    await markAllNotificationsRead(db);
    await get().load(db);
  },

  clearAll: async (db) => {
    await clearAllNotifications(db);
    await get().load(db);
  },
}));
