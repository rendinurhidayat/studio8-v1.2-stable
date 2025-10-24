

import React, { useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
// FIX: Switched to default imports from date-fns subpaths to resolve module export errors.
import { format, getDay } from 'date-fns';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import id from 'date-fns/locale/id';
import { Booking, BookingStatus } from '../../types';

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

// Define a more specific type for calendar events for clarity
interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: Booking;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ bookings, onSelectBooking }) => {
  const events = useMemo(() => {
    return bookings.map((booking): CalendarEvent => {
      const eventDate = booking.bookingStatus === BookingStatus.RescheduleRequested && booking.rescheduleRequestDate
          ? booking.rescheduleRequestDate
          : booking.bookingDate;

      return {
        title: `${booking.clientName} - ${booking.package.name}`,
        start: eventDate,
        end: new Date(eventDate.getTime() + 60 * 60 * 1000), // Assume 1 hour duration
        resource: booking,
      };
    });
  }, [bookings]);

  const eventPropGetter = (event: CalendarEvent) => {
    const status = event.resource.bookingStatus;
    let className = 'rbc-event ';
    if (status === BookingStatus.Confirmed) {
      className += 'bg-blue-500';
    } else if (status === BookingStatus.RescheduleRequested) {
      className += 'bg-orange-500';
    } else if (status === BookingStatus.InProgress) {
        className += 'bg-indigo-500';
    } else {
      className += 'bg-gray-500';
    }
    return { className };
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md" style={{ height: '75vh' }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={(event) => onSelectBooking(event.resource)}
        eventPropGetter={eventPropGetter}
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
            event: "Acara",
        }}
      />
    </div>
  );
};

export default BookingCalendar;
