

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    getBookings, 
    confirmBooking, 
    deleteBooking, 
    updateBooking,
    getPackages, 
    getAddOns,
    calculateDpAmount
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Booking, BookingStatus, PaymentStatus, Package, AddOn, SubPackage, SubAddOn } from '../../types';
import { Edit, Trash2, CheckCircle, MoreVertical, XCircle, DollarSign, Loader2, User, Mail, Phone, Download, FileText, Printer, MessageSquare, AlertTriangle, Clock, Calendar as CalendarIcon, List, Link as LinkIcon } from 'lucide-react';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import Modal from '../../components/common/Modal';
import BookingCalendar from '../../components/admin/BookingCalendar';
import { generateGoogleCalendarLink } from '../../utils/calendar';
import InvoiceModal from '../../components/admin/InvoiceModal';
// FIX: Use named import for date-fns format function
import { format } from 'date-fns';
import id from 'date-fns/locale/id';


const StatusBadge: React.FC<{ status: string, type: 'booking' | 'payment' }> = ({ status, type }) => {
    const bookingStatusColors: { [key: string]: string } = {
        [BookingStatus.Pending]: 'bg-yellow-100 text-yellow-800',
        [BookingStatus.Confirmed]: 'bg-blue-100 text-blue-800',
        [BookingStatus.InProgress]: 'bg-indigo-100 text-indigo-800',
        [BookingStatus.Completed]: 'bg-green-100 text-green-800',
        [BookingStatus.Cancelled]: 'bg-gray-100 text-gray-800',
        [BookingStatus.RescheduleRequested]: 'bg-orange-100 text-orange-800',
    };

    const paymentStatusColors: { [key: string]: string } = {
        [PaymentStatus.Paid]: 'bg-green-100 text-green-800',
        [PaymentStatus.Pending]: 'bg-yellow-100 text-yellow-800',
        [PaymentStatus.Failed]: 'bg-red-100 text-red-800',
    };

    const colors = type === 'booking' ? bookingStatusColors : paymentStatusColors;
    const colorClass = colors[status] || 'bg-gray-100 text-gray