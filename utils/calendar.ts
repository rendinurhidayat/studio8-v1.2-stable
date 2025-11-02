import { Booking } from '../types';
import { format } from 'date-fns';

/**
 * Generates a Google Calendar event creation link from a booking object.
 * @param booking The booking object.
 * @returns A URL string to create a Google Calendar event.
 */
export const generateGoogleCalendarLink = (booking: Booking): string => {
  const startTime = new Date(booking.bookingDate);
  // Assuming a 1-hour session duration for the calendar event
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

  // Format dates to Google Calendar's required format (ISO 8601 without hyphens or colons)
  const formatDateForGoogle = (date: Date) => {
    return format(date, "yyyyMMdd'T'HHmmss'Z'");
  };

  const url = new URL('https://www.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', `Sesi Foto: ${booking.clientName} - ${booking.package.name}`);
  url.searchParams.set('dates', `${formatDateForGoogle(startTime)}/${formatDateForGoogle(endTime)}`);
  
  const details = `
Booking untuk: ${booking.clientName}
Kode Booking: ${booking.bookingCode}
Paket: ${booking.package.name} (${booking.selectedSubPackage.name})
Jumlah Orang: ${booking.numberOfPeople}
Total Harga: Rp ${booking.totalPrice.toLocaleString('id-ID')}
Sisa Pembayaran: Rp ${booking.remainingBalance.toLocaleString('id-ID')}

Kontak Klien:
Email: ${booking.clientEmail}
Telepon: ${booking.clientPhone}

Catatan:
${booking.notes || 'Tidak ada catatan.'}
  `.trim();

  url.searchParams.set('details', details);
  url.searchParams.set('location', 'Studio 8, Banjar, Jawa Barat');

  return url.toString();
};