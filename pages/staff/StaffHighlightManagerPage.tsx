import AdminHighlightManagerPage from '../admin/AdminHighlightManagerPage';

// Staff has the same highlight management capabilities as Admin.
// Re-using the Admin component to avoid code duplication.
const StaffHighlightManagerPage = () => {
    return <AdminHighlightManagerPage />;
};

export default StaffHighlightManagerPage;