import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Store,
  BarChart3,
  Cloud,
  CheckCircle2,
  UserCircle,
  Settings as SettingsIcon,
  ShoppingCart,
} from "lucide-react";
import HomeRoute from "../pages/Home";
import CustomersRoute from "../pages/Customers";
import OrderDetailsRoute from "../pages/OrderDetails";
import ReportsRoute from "../pages/Reports";
import SettingsRoute from "../pages/Settings";
import BatchesRoute from "../pages/Batches";
import BatchDetailsRoute from "../pages/BatchDetails";
import { useStore } from "../store";
import { useState, useEffect } from "react";
import { runInitialSync, startRealtimeSync, stopRealtimeSync } from "../sync";
import { onAuthStateChanged, auth, signIn } from "../firebase";

export default function Layout() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "success" | "error" | "active"
  >("idle");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [autoSync, setAutoSync] = useState(() => {
    return localStorage.getItem("autoSync") === "true";
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setSyncStatus("active");
        if (localStorage.getItem("autoSync") === "true") {
          startRealtimeSync(user.uid);
        }
      } else {
        setIsAuthenticated(false);
        setSyncStatus("idle");
        stopRealtimeSync();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSyncButton = async () => {
    if (isAuthenticated) {
      if (!autoSync) {
        // Manual one-time sync if auto-sync is off
        if (isSyncing) return;
        setIsSyncing(true);
        try {
          if (auth.currentUser) {
            await runInitialSync(auth.currentUser.uid);
            setSyncStatus("success");
            setTimeout(() => setSyncStatus("active"), 2000);
          }
        } catch (e) {
          console.error("Manual sync error:", e);
          setSyncStatus("error");
          setTimeout(() => setSyncStatus("active"), 4000);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setSyncStatus("success");
        setTimeout(() => setSyncStatus("active"), 2000);
      }
      return;
    }

    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus("idle");
    try {
      await signIn();
    } catch (e) {
      console.error(e);
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleAutoSync = () => {
    const newVal = !autoSync;
    setAutoSync(newVal);
    localStorage.setItem("autoSync", String(newVal));

    setToastMessage(
      newVal ? "تم تفعيل المزامنة التلقائية" : "تم تعطيل المزامنة التلقائية",
    );
    setTimeout(() => setToastMessage(null), 3500);

    // Apply immediate effect if authenticated
    if (auth.currentUser) {
      if (newVal) {
        startRealtimeSync(auth.currentUser.uid);
      } else {
        stopRealtimeSync();
      }
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-gray-200 dark:bg-gray-600">
      <div className="w-full max-w-md bg-gray-50 flex flex-col h-screen min-h-[100dvh] relative shadow-2xl ring-1 ring-gray-900/5 dark:bg-gray-900 dark:shadow-none dark:bg-gray-800">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-4 flex items-center gap-2 whitespace-nowrap dark:shadow-none">
            {autoSync ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Cloud className="w-4 h-4 text-gray-400" />
            )}
            {toastMessage}
          </div>
        )}

        {/* Header */}
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between z-10 shadow-sm relative dark:bg-gray-800 dark:border-gray-700 dark:shadow-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
              <Store className="w-4 h-4" />
            </div>
            <h1 className="font-bold text-lg text-gray-900 flex flex-col dark:text-white">
              Noor Store
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <label
                className="flex items-center gap-1.5 cursor-pointer"
                title="المزامنة الفورية"
              >
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={toggleAutoSync}
                  className="rounded text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer dark:text-green-400"
                />
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                  تلقائي
                </span>
              </label>
            )}
            <button
              onClick={handleSyncButton}
              disabled={isSyncing}
              className={`p-2 border rounded-full transition-all flex items-center gap-2 text-xs font-bold ${
                syncStatus === "active" || syncStatus === "success"
                  ? "bg-green-50 text-green-600 dark:text-green-400 border-green-200"
                  : syncStatus === "error"
                    ? "bg-red-50 text-red-600 dark:text-red-400 border-red-200 dark:bg-red-900/40"
                    : "bg-gray-50 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700"
              }`}
              title={
                isAuthenticated
                  ? autoSync
                    ? "المزامنة اللحظية مفعلة"
                    : "حفظ المزامنة يدوياً"
                  : "تفعيل المزامنة السحابية"
              }
            >
              {isSyncing ? (
                <>
                  <span>جاري...</span>
                  <Cloud className="w-4 h-4 animate-spin" />
                </>
              ) : syncStatus === "active" ? (
                <>
                  <span className="hidden sm:inline">متصل</span>
                  <Cloud className="w-4 h-4" />
                </>
              ) : syncStatus === "success" ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              ) : syncStatus === "error" ? (
                <>
                  <span>فشل</span>
                  <Cloud className="w-4 h-4 text-red-500 dark:text-red-400" />
                </>
              ) : (
                <>
                  <span>مزامنة</span>
                  <UserCircle className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          id="main-scroll-container"
          className="flex-1 overflow-y-auto no-scrollbar pb-20 relative"
        >
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/batches" element={<BatchesRoute />} />
            <Route path="/customers" element={<CustomersRoute />} />
            <Route path="/reports" element={<ReportsRoute />} />
            <Route path="/order/:id" element={<OrderDetailsRoute />} />
            <Route path="/batch/:id" element={<BatchDetailsRoute />} />
            <Route path="/settings" element={<SettingsRoute />} />
          </Routes>
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 px-3 py-3 flex justify-between items-center z-20 pb-safe dark:bg-gray-800 dark:border-gray-700 dark:border-gray-600">
          <NavLink
            to="/batches"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 ${
                isActive
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-400 hover:text-gray-600"
              }`
            }
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="text-[10px] font-medium">السلات</span>
          </NavLink>

          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 ${
                isActive
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-400 hover:text-gray-600"
              }`
            }
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium">الطلبيات</span>
          </NavLink>

          <NavLink
            to="/customers"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 ${
                isActive
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-400 hover:text-gray-600"
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
                isActive
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-400 hover:text-gray-600"
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
                isActive
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-400 hover:text-gray-600"
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
