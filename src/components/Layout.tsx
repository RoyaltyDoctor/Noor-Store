import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, Search, Plus } from 'lucide-react';
import HomeRoute from '../pages/Home';
import CustomersRoute from '../pages/Customers';
import OrderDetailsRoute from '../pages/OrderDetails';
import { useStore } from '../store';

export default function Layout() {
  const navigate = useNavigate();
  const addOrder = useStore(s => s.addOrder);
  const customers = useStore(s => s.customers);

  const handleQuickAddOrder = () => {
    // Quick add opens dialog or directly creates if we have a default customer?
    // Let's just navigate to a "new" action or pick first customer to jump quick, then user changes.
    // Actually, Better to just prompt or use a floating action button on Home screen instead.
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-gray-200">
      <div className="w-full max-w-md bg-gray-50 flex flex-col h-screen min-h-[100dvh] relative shadow-2xl ring-1 ring-gray-900/5">
        
        {/* Header */}
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
              N
            </div>
            <h1 className="font-bold text-lg text-gray-900">وسيطة برو</h1>
          </div>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <Search className="w-5 h-5" />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-20 relative">
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/customers" element={<CustomersRoute />} />
            <Route path="/order/:id" element={<OrderDetailsRoute />} />
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
        </nav>

      </div>
    </div>
  );
}
