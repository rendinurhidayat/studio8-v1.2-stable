
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Booking } from '../../types';

interface BookingChartProps {
    bookings: Booking[];
}

const BookingChart: React.FC<BookingChartProps> = ({ bookings }) => {
    const processData = (bookings: Booking[]) => {
        const data: { [key: string]: number } = {
            'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0
        };
        
        const today = new Date();
        const oneWeekAgo = new Date(today.setDate(today.getDate() - 7));

        bookings.forEach(booking => {
            const bookingDate = new Date(booking.createdAt);
            if (bookingDate >= oneWeekAgo) {
                const day = bookingDate.toLocaleDateString('en-US', { weekday: 'short' });
                if (data[day] !== undefined) {
                    data[day]++;
                }
            }
        });
        
        const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return dayOrder.map(day => ({ name: day, bookings: data[day] }));
    };

    const chartData = processData(bookings);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--tw-colors-base-200)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--tw-colors-muted)' }} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--tw-colors-muted)' }} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        borderColor: 'var(--tw-colors-base-200)',
                        color: 'var(--tw-colors-base-content)'
                    }} 
                />
                <Bar dataKey="bookings" fill="var(--tw-colors-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default BookingChart;