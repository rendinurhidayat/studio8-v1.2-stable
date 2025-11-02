// --- Global Type Declarations ---
// These types support globally available libraries.
declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
        firebaseConfig?: any;
        appConfig?: {
            googleMapsReviewUrl: string;
            vapidPublicKey: string;
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
  EditorAcara = 'Editor Acara',
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

export enum AttendanceStatus {
    Present = 'Present',
    Absent = 'Absent',
    Leave = 'Leave',
}

export enum InternMood {
    Baik = 'Baik',
    Netral = 'Netral',
    Lelah = 'Lelah',
}

export enum ReportStatus {
    Dikirim = 'Dikirim',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  username?: string;
  password?: string;
  asalSekolah?: string;
  jurusan?: string;
  startDate?: string; // ISO 8601 string
  endDate?: string; // ISO 8601 string
  totalPoints?: number;
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
    imageUrls?: string[];
    isGroupPackage?: boolean;
    recommendedAddOnIds?: string[];
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

export interface CartItem {
  id: string; 
  pkg: Package;
  subPkg: SubPackage;
  addOns: SubAddOn[];
  packageId: string;
  subPackageId: string;
  subAddOnIds: string[];
}

export interface Booking {
  id: string;
  bookingCode: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  bookingDate: string; // ISO 8601 string
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
  createdAt: string; // ISO 8601 string
  paymentProofUrl?: string;
  rescheduleRequestDate?: string; // ISO 8601 string
  notes?: string;
  googleDriveLink?: string;
  discountAmount?: number;
  discountReason?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  pointsValue?: number; // Rupiah value of redeemed points
  referralCodeUsed?: string;
  promoCodeUsed?: string;
  extraPersonCharge?: number;

  // Institutional Booking Fields
  bookingType?: 'institutional' | 'individual';
  institutionName?: string;
  picName?: string;
  picContact?: string;
  numberOfParticipants?: number;
  activityType?: string;
  requestLetterUrl?: string;
  paymentMode?: 'dp' | 'lunas' | 'termin';
  dueDate?: string; // ISO 8601 string
  agreementUrl?: string;
}

export enum SponsorshipStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Negotiation = 'Negotiation',
  MoUDrafted = 'MoU Drafted',
  AwaitingSignature = 'Awaiting Signature',
  Active = 'Active',
}


export interface Sponsorship {
  id: string;
  eventName: string;
  institutionName: string;
  picName: string;
  picContact: string;
  partnershipType: string;
  benefits: string;
  proposalUrl: string;
  status: SponsorshipStatus;
  createdAt: string; // ISO 8601 string
  agreementUrl?: string; // MoU URL
}

export interface CollaborationActivity {
  id: string;
  timestamp: string; // ISO 8601 string
  action: string;
  details?: string;
  userName: string;
}

export interface Transaction {
  id: string;
  date: string; // ISO 8601 string
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
  firstBooking: string; // ISO 8601 string
  lastBooking: string; // ISO 8601 string
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
  description?: string;
  completed: boolean;
  assigneeId: string;
  assigneeName: string;
  creatorId: string;
  creatorName: string;
  createdAt: string; // ISO 8601 string
  dueDate?: string; // ISO 8601 string
  progress?: number; // 0-100
}

export interface Expense {
    id: string;
    date: string; // ISO 8601 string
    description: string;
    amount: number;
    addedBy: string;
}

export interface Feedback {
  id: string; // Booking ID
  nama: string;
  rating: number;
  komentar: string;
  tanggal: string; // ISO 8601 string
  publish: boolean;
}

export interface MentorFeedback {
  id: string;
  taskId: string;
  taskTitle: string;
  feedback: string;
  rating: number;
  date: string; // ISO 8601 string
  mentorId: string;
  mentorName: string;
}

export interface FeedbackAnalysis {
    overallSentiment: string;
    positivePoints: string[];
    areasForImprovement: string[];
    actionableSuggestions: string[];
}

export interface Insight {
    id: string;
    date: string; // ISO 8601 string
    insight: string;
}

export interface AIInsight {
  id: string;
  type: 'produktif' | 'santai' | 'tidak fokus' | 'default';
  insight: string;
  date: string; // ISO 8601 string
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  timestamp: string; // ISO string
  read: boolean;
  link?: string;
  recipient: UserRole.Admin | UserRole.Staff | UserRole.AnakMagang | UserRole.AnakPKL;
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
    bankAccounts?: {
        bankName: string;
        accountNumber: string;
        accountHolder: string;
    }[];
    dana: boolean;
    danaNumber?: string;
    shopeepay: boolean;
    shopeepayNumber?: string;
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

export interface Partner {
    id: string;
    name: string;
    logoUrl: string;
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
    partners?: Partner[];
    landingPageImages?: {
        hero?: string[];
        about?: string;
    };
}

export interface ActivityLog {
    id: string;
    timestamp: string; // ISO 8601 string
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
    lastChecked: string | null; // ISO 8601 string
    notes?: string;
}

export interface Asset {
  id: string;
  url: string; // Cloudinary URL
  publicId: string; // Cloudinary public ID for deletion
  fileName: string;
  fileType: 'image' | 'video';
  category: string;
  tags: string[];
  uploadedBy: string; // User's name
  uploadedById: string; // User's ID
  uploadedAt: string; // ISO 8601 string
}

export interface Attendance {
    id: string;
    userId: string;
    date: string; // YYYY-MM-DD
    checkInTime: string; // ISO 8601 string
    checkOutTime?: string; // ISO 8601 string
    status: AttendanceStatus;
}

export interface DailyReport {
    id: string;
    userId: string;
    date: string; // YYYY-MM-DD
    content: string;
    mood: InternMood;
    status: ReportStatus;
    blockers?: string;
    submittedAt: string; // ISO 8601 string
    mentorFeedback?: string;
}

export interface InternReport {
  id: string;
  fileName: string;
  downloadUrl: string;
  generatedAt: string; // ISO 8601 string
  generatedBy: string; // mentor's name
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: string; // ISO 8601 string
}

export interface ChatRoom {
    id: string; // user1Id_user2Id (sorted)
    participantIds: string[];
    participantInfo: {
        [key: string]: { // userId
            name: string;
            email: string;
            photoURL?: string;
        }
    };
    lastMessage?: {
        text: string;
        timestamp: string; // ISO 8601 string
        senderId: string;
    };
    createdAt: string; // ISO 8601 string
}

export interface HighlightWork {
  id: string;
  title: string;
  author: string;
  major?: string;
  mentor?: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl: string;
  type: 'Video' | 'Image' | 'Design';
  highlightDate: string; // ISO 8601 string
  category: 'Client' | 'PKL' | 'Event' | 'BTS';
  instagramUrl?: string;
}

export interface Certificate {
  id: string; // The certificate ID, e.g. CERT-S8-XYZ123
  studentName: string;
  major: string;
  period: string; // e.g., "2 Feb 2026 - 30 Mei 2026"
  mentor: string;
  issuedDate: string; // ISO 8601 string
  certificateUrl: string; // URL to the PDF on Cloudinary
  qrValidationUrl: string; // Public URL for validation
  verified: boolean; // Always true upon creation
}

export interface DailyProgressTask {
  title: string;
  status: 'done' | 'in_progress' | 'pending';
}

export interface DailyProgress {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  tasks: DailyProgressTask[];
  note: string;
  documentationUrl?: string;
  weekNumber: number;
  submittedAt: string; // ISO 8601 string
}

export interface WeeklyEvaluation {
  id: string;
  studentId: string;
  week: number;
  criteria: {
    discipline: number;
    creativity: number;
    teamwork: number;
    initiative: number;
  };
  mentorNote: string;
  averageScore: number;
  mentorId: string;
  mentorName: string;
  date: string; // ISO 8601 string
}

export type BadgeIconName = 'CheckCircle' | 'TrendingUp' | 'Zap' | 'ShieldCheck';

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: BadgeIconName;
}

export enum QuizCategory {
    Fotografi = 'Fotografi',
    Videografi = 'Videografi',
    Marketing = 'Marketing',
}

export interface QuizQuestion {
    id: string;
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
    explanation?: string;
    imageUrl?: string;
}

export interface Quiz {
    id: string;
    title: string;
    category: QuizCategory;
    questions: QuizQuestion[];
    createdBy: string; // userId
    createdAt: string; // ISO 8601 string
    timeLimit?: number; // Time limit in minutes
    isMonthlyExam?: boolean;
}

export interface QuizResult {
    id: string;
    quizId: string;
    quizTitle: string;
    studentId: string;
    studentName: string;
    score: number; // Percentage
    answers: {
        questionId: string;
        questionText: string;
        selectedAnswerIndex: number;
        correctAnswerIndex: number;
        isCorrect: boolean;
    }[];
    submittedAt: string; // ISO 8601 string
    quiz?: Quiz; // Optional: Embed the full quiz for review
    aiFeedback?: string; // AI-generated overall feedback
}

export interface PracticalClass {
    id: string;
    topic: string;
    description: string;
    classDate: string; // ISO 8601 string
    mentorName: string;
    maxParticipants: number;
    registeredInternIds: string[];
}

export enum ForumCategory {
    Fotografi = 'Fotografi',
    Videografi = 'Videografi',
    Marketing = 'Marketing',
    'Tips & Trik' = 'Tips & Trik',
    Lainnya = 'Lainnya',
}

export interface ForumThread {
    id: string;
    title: string;
    category: ForumCategory;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: string; // ISO 8601 string
    replyCount: number;
    lastReplyAt?: string; // ISO 8601 string
}

export interface ForumReply {
    id: string;
    threadId: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: string; // ISO 8601 string
}

export enum JobType {
    FullTime = 'Full-time',
    PartTime = 'Part-time',
    Freelance = 'Freelance',
    Internship = 'Internship',
}

export interface JobPost {
    id: string;
    title: string;
    company: string;
    location: string;
    type: JobType;
    description: string;
    applyLink: string;
    postedById: string;
    postedByName: string;
    createdAt: string; // ISO 8601 string
}

export interface CommunityEvent {
    id: string;
    title: string;
    description: string;
    eventDate: string; // ISO 8601 string
    location: string;
    createdById: string;
    createdByName: string;
    createdAt: string; // ISO 8601 string
}

export interface ImageUpload {
    id: string;
    file: File;
    preview: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
}