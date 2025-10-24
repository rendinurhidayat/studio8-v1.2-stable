
import { Notification, UserRole } from '../types';

type NotificationPayload = Omit<Notification, 'id' | 'timestamp' | 'read'>;
type Listener = (data: NotificationPayload) => void;

class NotificationService {
    private listeners: Listener[] = [];

    subscribe(listener: Listener): void {
        this.listeners.push(listener);
    }

    unsubscribe(listener: Listener): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    notify(data: NotificationPayload): void {
        this.listeners.forEach(listener => listener(data));
    }
}

export const notificationService = new NotificationService();
