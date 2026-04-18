import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ChangePasswordModal from './ChangePasswordModal';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 print:block">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible">
        <div className="print:hidden">
          <Header />
        </div>
        <main className="flex-1 overflow-auto bg-slate-900 relative print:overflow-visible print:bg-white">
          <Outlet />
          {user?.must_change_password && (
            <ChangePasswordModal 
              isOpen={true} 
              onClose={() => {}} 
              required={true} 
            />
          )}
        </main>
      </div>
    </div>
  );
}
