import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen bg-base-100 text-base-content">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-base-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;