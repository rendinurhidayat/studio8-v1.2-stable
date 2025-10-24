import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import NotificationBell from '../common/NotificationBell';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b border-base-200">
      <div className="text-2xl font-bold text-primary">
        Studio <span className="text-accent">8</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
            <p className="font-semibold text-base-content">Hai, {user?.name?.split(' ')[0]} 👋</p>
            <p className="text-xs text-muted">{user?.role}</p>
        </div>
        <NotificationBell />
        <button
          onClick={logout}
          title="Logout"
          className="p-2 text-muted rounded-full hover:bg-error/10 hover:text-error focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error transition-colors"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;