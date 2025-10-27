

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Notification, UserRole } from '../types';
import { notificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const stored = localStorage.getItem('studio8_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  
  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: `notif-${new Date().getTime()}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  }, []);
  
  useEffect(() => {
    localStorage.setItem('studio8_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const handleNewNotification = (data: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        // Only add notification if the logged in user is the recipient
        if (user && user.role === data.recipient) {
             addNotification(data);
        }
    };

    notificationService.subscribe(handleNewNotification);
    return () => notificationService.unsubscribe(handleNewNotification);
  }, [addNotification, user]);


  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filteredNotifications = user 
    ? notifications.filter(n => n.recipient === user.role)
    : [];

  const filteredUnreadCount = filteredNotifications.filter(n => !n.read).length;


  return (
    <NotificationContext.Provider value={{ notifications: filteredNotifications, unreadCount: filteredUnreadCount, markAsRead, markAllAsRead, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};