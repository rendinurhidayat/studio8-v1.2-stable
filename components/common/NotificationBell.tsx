import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { Bell, Check, Info, AlertTriangle } from 'lucide-react';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import id from 'date-fns/locale/id';

const NotificationBell = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const typeIcons = {
        success: <Check size={16} className="text-success" />,
        info: <Info size={16} className="text-accent" />,
        warning: <AlertTriangle size={16} className="text-warning" />,
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-muted rounded-full hover:bg-base-200 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors"
                aria-label={`Notifikasi, ${unreadCount} belum dibaca`}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-error text-white text-xs items-center justify-center">{unreadCount}</span>
                    </span>
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-base-200 z-50 overflow-hidden">
                    <div className="flex justify-between items-center p-3 border-b border-base-200">
                        <h3 className="font-semibold text-base-content">Notifikasi</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs font-medium text-accent hover:underline">
                                Tandai semua dibaca
                            </button>
                        )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map(notif => (
                                <div key={notif.id} className={`p-3 border-b border-base-200 last:border-b-0 hover:bg-base-100 ${!notif.read ? 'bg-blue-50' : ''}`}>
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-1">{typeIcons[notif.type]}</div>
                                        <div className="flex-1">
                                            <p className="text-sm text-base-content">{notif.message}</p>
                                            <p className="text-xs text-muted mt-1">
                                                {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: id })}
                                            </p>
                                        </div>
                                        {!notif.read && (
                                            <button onClick={() => markAsRead(notif.id)} title="Tandai dibaca" className="flex-shrink-0 p-1">
                                                <span className="block h-2.5 w-2.5 bg-accent rounded-full"></span>
                                            </button>
                                        )}
                                    </div>
                                    {notif.link && (
                                        <Link to={notif.link} onClick={() => setIsOpen(false)} className="block text-right text-xs font-semibold text-accent hover:underline mt-1">
                                            Lihat Detail
                                        </Link>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center p-8 text-sm text-muted">
                                Tidak ada notifikasi.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;