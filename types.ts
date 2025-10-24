// --- Global Type Declarations ---
// These types support the configuration objects injected via index.html,
// allowing for type-safe access across the application.
declare global {
    interface Window {
        firebaseConfig?: {
            apiKey: string;
            authDomain: string;
            projectId: string;
            storageBucket: string;
            messagingSenderId: string;
            appId: string;
            measurementId: string;
        };
        appConfig?: {
            googleMapsReviewUrl: string;
        };
    }
}


export enum UserRole {
  Admin = 'Admin',
  Staff = 'Staff',
  Videografer = 'Videografer',
  Fotografer = 'Fotografer',
  EditorFoto = 'Editor Foto',
  EditorVideo = 'Editor Video',
  Desain = 'Desain',
  AnakMagang = 'Anak Magang',
  AnakPKL = 'Anak PKL',
}

export enum PaymentStatus {
  Pending = 'Pending',
  Paid = 'Paid',
  Failed = 'Failed',
}

export enum PaymentHistoryStatus {
    Pending = 'Pending',
    DPPaid = 'DP Paid',
    Completed = 'Completed',
    Cancelled = 'Cancelled'
}

export enum BookingStatus {
  Pending = 'Pending',
  Confirmed = 'Confirmed',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  RescheduleRequested = 'Reschedule Requested',
}

export enum TransactionType {
  Income = 'Income',
  Expense = 'Expense',
}

export enum InventoryStatus {
    Available = 'Tersedia',
    UnderRepair = 'Perbaikan',
    Missing = 'Hilang',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  username?: string;
  password?: string;
  asalSekolah?: string;
  jurusan?: string;
}

export interface SubPackage {
    id: string;
    name: string;
    price: number;
    description?: string;
}

export interface Package {
    id: string;
    name: string;
    description: string;
    subPackages: SubPackage[];
    type?: 'Studio' | 'Outdoor';
    imageUrl?: string;
    isGroupPackage?: boolean;
}

export interface SubAddOn {
    id: string;
    name: string;
    price: number;
}

export interface AddOn {
    id: string;
    name: string;
    subAddOns: SubAddOn[];
}

export interface Booking {
  id: string;
  bookingCode: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  bookingDate: Date;
  package: Package;
  selectedSubPackage: SubPackage;
  addOns: AddOn[];
  selectedSubAddOns: SubAddOn[];
  numberOfPeople: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  totalPrice: number;
  remainingBalance: number;
  createdAt: Date;
  paymentProofUrl?: string;
  rescheduleRequestDate?: Date;
  notes?: string;
  googleDriveLink?: string;
  discountAmount?: number;
  discountReason?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  pointsValue?: number; // Rupiah value of redeemed points
  referralCodeUsed?: string;
  extraPersonCharge?: number;
}

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  type: TransactionType;
  amount: number;
  bookingId?: string; // Link to booking
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  firstBooking: Date;
  lastBooking: Date;
  totalBookings: number;
  totalSpent: number;
  loyaltyPoints: number;
  referralCode: string;
  referredBy?: string;
  loyaltyTier?: string; // e.g., "Gold"
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  assigneeId: string;
  assigneeName: string;
  creatorId: string;
  creatorName: string;
  createdAt: Date;
}

export interface Expense {
    id: string;
    date: Date;
    description: string;
    amount: number;
    addedBy: string;
}

export interface Feedback {
  id: string; // Booking ID
  nama: string;
  rating: number;
  komentar: string;
  tanggal: Date;
  publish: boolean;
}

export interface FeedbackAnalysis {
  overallSentiment: string;
  positivePoints: string[];
  areasForImprovement: string[];
  actionableSuggestions: string[];
}

export interface Insight {
    id: string;
    date: Date;
    insight: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  timestamp: string; // ISO string
  read: boolean;
  link?: string;
  recipient: UserRole.Admin | UserRole.Staff;
}

export interface Promo {
    id: string;
    code: string;
    description: string;
    discountPercentage: number;
    isActive: boolean;
}

export interface OperationalHours {
    weekday: { open: string; close: string };
    weekend: { open: string; close: string };
}

export interface FeatureToggles {
    chatbot: boolean;
    publicFeedback: boolean;
    publicCalendar: boolean;
}

export interface PaymentMethods {
    qris: boolean;
    qrisImage?: string;
    bankTransfer: boolean;
    dana: boolean;
    shopeepay: boolean;
}

export interface LoyaltyTier {
    id: string;
    name: string;
    bookingThreshold: number; // Minimum bookings to reach this tier
    discountPercentage: number;
}

export interface LoyaltySettings {
    pointsPerRupiah: number; // e.g., 0.001 points per Rp 1
    rupiahPerPoint: number; // e.g., Rp 100 per point for redemption
    referralBonusPoints: number; // Points for both referrer and referred
    firstBookingReferralDiscount: number; // Flat Rupiah discount for first booking via referral
    loyaltyTiers: LoyaltyTier[];
}


export interface SystemSettings {
    operationalHours: OperationalHours;
    featureToggles: FeatureToggles;
    paymentMethods: PaymentMethods;
    contact: {
        whatsapp: string;
        instagram: string;
    };
    loyaltySettings: LoyaltySettings;
}

export interface ActivityLog {
    id: string;
    timestamp: Date;
    userId: string;
    userName: string;
    action: string;
    details: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    status: InventoryStatus;
    lastChecked: Date | null;
    notes?: string;
}