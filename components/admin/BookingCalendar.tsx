
import React, { useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent, Views } from 'react-big-calendar';
// FIX: Use named imports for date-fns functions
import { format, getDay, parse, startOfWeek } from 'date-fns';
import id from 'date-fns/locale/id';
import { Booking, BookingStatus } from '../../types';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'id': id,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface BookingCalendarProps {
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
}

// Define a more specific type for events to include the original booking
interface CalendarEvent extends BigCalendarEvent {
  resource: Booking;
}

const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3b82f6'; // Default blue for confirmed
    switch (event.resource.bookingStatus) {
        case BookingStatus.Pending:
            backgroundColor = '#f59e0b'; // amber-500
            break;
        case BookingStatus.InProgress:
            backgroundColor = '#6366f1'; // indigo-500
            break;
        case BookingStatus.Completed:
            backgroundColor = '#16a34a'; // green-600
            break;
        case BookingStatus.Cancelled:
            backgroundColor = '#6b7280'; // gray-500
            break;
        case BookingStatus.RescheduleRequested:
            backgroundColor = '#f97316'; // orange-500
            break;
    }
    return {
        style: {
            backgroundColor,
            borderRadius: '5px',
            opacity: 0.8,
            color: 'white',
            border: '0px',
            display: 'block'
        }
    };
};

const BookingCalendar: React.FC<BookingCalendarProps> = ({ bookings, onSelectBooking }) => {
    const events = useMemo((): CalendarEvent[] => {
        return bookings.map(booking => {
            const startDate = new Date(booking.bookingDate);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Assume 1 hour duration
            return {
                title: `${booking.clientName} - ${booking.package.name}`,
                start: startDate,
                end: endDate,
                resource: booking,
            };
        });
    }, [bookings]);

    const handleSelectEvent = (event: CalendarEvent) => {
        onSelectBooking(event.resource);
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md h-[75vh]">
            <Calendar<CalendarEvent>
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                messages={{
                    next: "Berikutnya",
                    previous: "Sebelumnya",
                    today: "Hari Ini",
                    month: "Bulan",
                    week: "Minggu",
                    day: "Hari",
                    agenda: "Agenda",
                    date: "Tanggal",
                    time: "Waktu",
                    event: "Sesi",
                }}
                culture='id'
                views={[Views.MONTH, Views.WEEK, Views.DAY]}
            />
        </div>
    );
};

export default BookingCalendar;
