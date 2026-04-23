import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, Store, BarChart3, Cloud, CheckCircle2, UserCircle, Settings as SettingsIcon } from 'lucide-react';
import HomeRoute from '../pages/Home';
import CustomersRoute from '../pages/Customers';
import OrderDetailsRoute from '../pages/OrderDetails';
import ReportsRoute from '../pages/Reports';
import SettingsRoute from '../pages/Settings';
import { useStore } from '../store';
import { useState, useEffect } from 'react';
import { runInitialSync, startRealtimeSync } from '../sync';
import { onAuthStateChanged, auth, signIn } from '../firebase';

export default function Layout() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error' | 'active'>('idle');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setSyncStatus('active');
        // Initial setup for existing logged in users on reload
        startRealtimeSync(user.uid);
      } else {
        setIsAuthenticated(false);
        setSyncStatus('idle');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSyncButton = async () => {
    if (isAuthenticated) {
      // Already active, just show success temporarily
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('active'), 2000);
      return;
    }
    
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus('idle');
    try {
      await signIn();
      // NOTE: We do not call initialSync or startRealtimeSync here.
      // The `onAuthStateChanged` hook above will trigger automatically once signIn() succeeds.
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-gray-200">
      <div className="w-full max-w-md bg-gray-50 flex flex-col h-screen min-h-[100dvh] relative shadow-2xl ring-1 ring-gray-900/5">
        
        {/* Header */}
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between z-10 shadow-sm relative">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
              <Store className="w-4 h-4" />
            </div>
            <h1 className="font-bold text-lg text-gray-900">Noor Store</h1>
          </div>
          <button 
            onClick={handleSyncButton}
            disabled={isSyncing}
            className={`p-2 border rounded-full transition-all flex items-center gap-2 text-xs font-bold ${
              syncStatus === 'active' || syncStatus === 'success' ? 'bg-green-50 text-green-600 border-green-200' : 
              syncStatus === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 
              'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
            title={isAuthenticated ? "المزامنة اللحظية مفعلة" : "تفعيل المزامنة السحابية"}
          >
            {isSyncing ? (
              <>
                <span>جاري الربط...</span>
                <Cloud className="w-4 h-4 animate-spin" />
              </>
            ) : syncStatus === 'active' ? (
              <>
                <span className="hidden sm:inline">متصل</span>
                <Cloud className="w-4 h-4" />
              </>
            ) : syncStatus === 'success' ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
              </>
            ) : syncStatus === 'error' ? (
              <>
                <span>فشل</span>
                <Cloud className="w-4 h-4 text-red-500" />
              </>
            ) : (
              <>
                <span>مزامنة</span>
                <UserCircle className="w-4 h-4" />
              </>
            )}
          </button>
        </header>

        {/* Main Content Area */}
        <main id="main-scroll-container" className="flex-1 overflow-y-auto no-scrollbar pb-20 relative">
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/customers" element={<CustomersRoute />} />
            <Route path="/reports" element={<ReportsRoute />} />
            <Route path="/order/:id" element={<OrderDetailsRoute />} />
            <Route path="/settings" element={<SettingsRoute />} />
          </Routes>
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-20 pb-safe">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 ${
                isActive ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium">الطلبات</span>
          </NavLink>

          <NavLink
            to="/customers"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 ${
                isActive ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <Users className="w-6 h-6" />
            <span className="text-[10px] font-medium">العملاء</span>
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 ${
                isActive ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-[10px] font-medium">التقارير</span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 ${
                isActive ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <SettingsIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">الإعدادات</span>
          </NavLink>
        </nav>

      </div>
    </div>
  );
}
