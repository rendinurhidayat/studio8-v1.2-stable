import React from 'react';
import AdminCertificatesPage from '../admin/AdminCertificatesPage';

const StaffCertificatesPage = () => {
  // Staff can reuse the same component as Admin for certificate management
  return <AdminCertificatesPage />;
};

export default StaffCertificatesPage;