

import React, { useState, useEffect } from 'react';
import { getEvents } from '../../services/api';
import { CommunityEvent, UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Loader2, PlusCircle, MapPin, Clock } from 'lucide-react';
import format from 'date-fns/format';
import id from 'date-fns/locale/id';
import CreateEventModal from './CreateEventModal';

const EventList = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState<CommunityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const canCreateEvent = user?.role === UserRole.Admin || user?.role === UserRole.Staff;

    const fetchData = async () => {
        setLoading(true);
        setEvents(await getEvents());
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEventCreated = () => {
        setIsModalOpen(false);
        fetchData();
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-primary">Event Komunitas</h3>
                {canCreateEvent && (
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90">
                        <PlusCircle size={16} /> Buat Event Baru
                    </button>
                )}
            </div>

            {events.length === 0 ? (
                <p className="text-center text-muted p-8">Belum ada event yang akan datang.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {events.map((event, index) => (
                         <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-base-100 p-4 rounded-lg border border-base-200"
                        >
                            <p className="text-sm font-bold text-accent">{format(new Date(event.eventDate), 'd MMM yyyy, HH:mm', { locale: id })}</p>
                            <h4 className="font-semibold text-primary mt-1">{event.title}</h4>
                            <p className="text-sm text-muted mt-2">{event.description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted mt-3 pt-3 border-t">
                                <MapPin size={12} /> {event.location}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
            {canCreateEvent && <CreateEventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onEventCreated={handleEventCreated} />}
        </div>
    );
};

export default EventList;
