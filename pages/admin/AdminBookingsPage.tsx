



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
import format from 'date-fns/format';


const StatusBadge: React.FC<{ status: string, type: 'booking' | 'payment' }> = ({ status, type }) => {
    const