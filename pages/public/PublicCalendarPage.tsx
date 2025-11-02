import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getBookings } from '../../services/api';
import { Booking, BookingStatus } from '../../types';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import getDay from 'date-fns/getDay';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import id from 'date-fns/locale/id';
import { Home, ArrowRight, Camera } from 'lucide-react';

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

const PublicCalendarPage = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const bookingsData = await getBookings();
            // Filter for publicly relevant statuses
            const relevantBookings = bookingsData.filter(b => 
                [BookingStatus.Confirmed, BookingStatus.InProgress, BookingStatus.Completed].includes(b.bookingStatus)
            );
            setBookings(relevantBookings);
            setLoading(false);
        };
        fetchData();
    }, []);

    const bookedDates = useMemo(() => {
        const dates = new Set<string>();
        bookings.forEach(booking => {
            // Store date as YYYY-MM-DD string for easy lookup
            dates.add(format(new Date(booking.bookingDate), 'yyyy-MM-dd'));
        });
        return dates;
    }, [bookings]);

    const dayPropGetter = (date: Date) => {
        const dateString = format(date, 'yyyy-MM-dd');
        if (bookedDates.has(dateString)) {
            return {
                className: 'bg-red-100 text-red-800',
                style: {
                    backgroundColor: '#fee2e2',
                },
            };
        }
        return {};
    };
    
    // Create minimal events for display, protecting client info
    const events = useMemo(() => bookings.map(booking => {
        const bookingDate = new Date(booking.bookingDate);
        return {
            title: 'Booked',
            start: bookingDate,
            end: new Date(bookingDate.getTime() + 60 * 60 * 1000), // 1 hour session
        }
    }), [bookings]);
    
    const eventPropGetter = (event: any) => {
        return {
            style: {
                backgroundColor: '#dc2626', // red-600
                borderColor: '#b91c1c', // red-700
            }
        };
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-block mb-4">
                        <Camera className="mx-auto h-12 w-12 text-blue-600 hover:text-blue-700 transition-colors" />
                    </Link>
                    <h1 className="text-4xl font-extrabold text-gray-800">
                        Kalender Ketersediaan
                    </h1>
                    <p className="mt-2 text-md text-gray-500">
                        Lihat jadwal yang sudah terisi. Tanggal yang kosong berarti masih tersedia.
                    </p>
                </div>

                <div className="flex justify-center items-center gap-6 mb-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white border rounded"></div>
                        <span>Tersedia</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100 rounded"></div>
                        <span>Sudah Dibooking</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200" style={{ height: '65vh' }}>
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500">Memuat kalender...</p>
                        </div>
                    ) : (
                        <Calendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            dayPropGetter={dayPropGetter}
                            eventPropGetter={eventPropGetter}
                            views={[Views.MONTH, Views.WEEK, Views.DAY]}
                            defaultView={Views.MONTH}
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
                            tooltipAccessor={(event: any) => `Sesi dibooking pada ${format(event.start!, 'HH:mm')}`}
                        />
                    )}
                </div>
                
                <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                     <Link to="/pesan-sesi" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105">
                        Pesan Sesi Sekarang <ArrowRight size={20} />
                    </Link>
                    <Link to="/" className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2">
                        <Home size={16}/> Kembali ke Beranda
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PublicCalendarPage;