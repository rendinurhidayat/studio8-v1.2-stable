export var UserRole;
(function (UserRole) {
    UserRole["Admin"] = "Admin";
    UserRole["Staff"] = "Staff";
    UserRole["Videografer"] = "Videografer";
    UserRole["Fotografer"] = "Fotografer";
    UserRole["EditorFoto"] = "Editor Foto";
    UserRole["EditorVideo"] = "Editor Video";
    UserRole["EditorAcara"] = "Editor Acara";
    UserRole["Desain"] = "Desain";
    UserRole["AnakMagang"] = "Anak Magang";
    UserRole["AnakPKL"] = "Anak PKL";
})(UserRole || (UserRole = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["Pending"] = "Pending";
    PaymentStatus["Paid"] = "Paid";
    PaymentStatus["Failed"] = "Failed";
})(PaymentStatus || (PaymentStatus = {}));
export var PaymentHistoryStatus;
(function (PaymentHistoryStatus) {
    PaymentHistoryStatus["Pending"] = "Pending";
    PaymentHistoryStatus["DPPaid"] = "DP Paid";
    PaymentHistoryStatus["Completed"] = "Completed";
    PaymentHistoryStatus["Cancelled"] = "Cancelled";
})(PaymentHistoryStatus || (PaymentHistoryStatus = {}));
export var BookingStatus;
(function (BookingStatus) {
    BookingStatus["Pending"] = "Pending";
    BookingStatus["Confirmed"] = "Confirmed";
    BookingStatus["InProgress"] = "In Progress";
    BookingStatus["Completed"] = "Completed";
    BookingStatus["Cancelled"] = "Cancelled";
    BookingStatus["RescheduleRequested"] = "Reschedule Requested";
})(BookingStatus || (BookingStatus = {}));
export var TransactionType;
(function (TransactionType) {
    TransactionType["Income"] = "Income";
    TransactionType["Expense"] = "Expense";
})(TransactionType || (TransactionType = {}));
export var InventoryStatus;
(function (InventoryStatus) {
    InventoryStatus["Available"] = "Tersedia";
    InventoryStatus["UnderRepair"] = "Perbaikan";
    InventoryStatus["Missing"] = "Hilang";
})(InventoryStatus || (InventoryStatus = {}));
export var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["Present"] = "Present";
    AttendanceStatus["Absent"] = "Absent";
    AttendanceStatus["Leave"] = "Leave";
})(AttendanceStatus || (AttendanceStatus = {}));
export var InternMood;
(function (InternMood) {
    InternMood["Baik"] = "Baik";
    InternMood["Netral"] = "Netral";
    InternMood["Lelah"] = "Lelah";
})(InternMood || (InternMood = {}));
export var ReportStatus;
(function (ReportStatus) {
    ReportStatus["Dikirim"] = "Dikirim";
})(ReportStatus || (ReportStatus = {}));
export var SponsorshipStatus;
(function (SponsorshipStatus) {
    SponsorshipStatus["Pending"] = "Pending";
    SponsorshipStatus["Approved"] = "Approved";
    SponsorshipStatus["Rejected"] = "Rejected";
    SponsorshipStatus["Negotiation"] = "Negotiation";
    SponsorshipStatus["MoUDrafted"] = "MoU Drafted";
    SponsorshipStatus["AwaitingSignature"] = "Awaiting Signature";
    SponsorshipStatus["Active"] = "Active";
})(SponsorshipStatus || (SponsorshipStatus = {}));
export var QuizCategory;
(function (QuizCategory) {
    QuizCategory["Fotografi"] = "Fotografi";
    QuizCategory["Videografi"] = "Videografi";
    QuizCategory["Marketing"] = "Marketing";
})(QuizCategory || (QuizCategory = {}));
export var ForumCategory;
(function (ForumCategory) {
    ForumCategory["Fotografi"] = "Fotografi";
    ForumCategory["Videografi"] = "Videografi";
    ForumCategory["Marketing"] = "Marketing";
    ForumCategory["Tips & Trik"] = "Tips & Trik";
    ForumCategory["Lainnya"] = "Lainnya";
})(ForumCategory || (ForumCategory = {}));
export var JobType;
(function (JobType) {
    JobType["FullTime"] = "Full-time";
    JobType["PartTime"] = "Part-time";
    JobType["Freelance"] = "Freelance";
    JobType["Internship"] = "Internship";
})(JobType || (JobType = {}));
