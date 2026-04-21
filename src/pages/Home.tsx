import { useState } from 'react';
import { useStore } from '../store';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Phone, Package, ChevronLeft, MapPin } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function Home() {
  const { orders, customers, addOrder, addCustomer } = useStore();
  const navigate = useNavigate();
  const [filterActive, setFilterActive] = useState(true); // true = hide delivered

  const filteredOrders = orders.filter((o) => {
    if (filterActive && o.status === 'DELIVERED') return false;
    return true;
  });

  const handleCreateOrder = () => {
    // If no customers, create a dummy or navigate
    if (customers.length === 0) {
      const cid = addCustomer({ name: 'عميل جديد', phone: '', address: '' });
      const oid = addOrder(cid);
      navigate(`/order/${oid}`);
    } else {
      const oid = addOrder(customers[0].id);
      navigate(`/order/${oid}`);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Stats/Greetings */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">مرحباً نور 👋</h2>
        <p className="text-sm text-gray-500 mt-1">لديك {filteredOrders.length} طلبات قيد التنفيذ</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="ابحث برقم التتبع، العميل..."
            className="w-full pl-3 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-400"
          />
        </div>
        <button 
          onClick={() => setFilterActive(!filterActive)}
          className={clsx(
            "p-2 rounded-xl border transition-colors",
            filterActive ? "bg-purple-50 border-purple-200 text-purple-600" : "bg-white border-gray-200 text-gray-600"
          )}
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>لا توجد طلبات هنا</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const customer = customers.find(c => c.id === order.customerId);
            
            // Calculate totals
            const itemsTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const total = itemsTotal + order.serviceFee + order.shippingFee;
            const remaining = total - order.deposit;

            return (
              <Link 
                key={order.id} 
                to={`/order/${order.id}`}
                className="block bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{customer?.name || 'عميل غير معروف'}</h3>
                    <p className="text-xs text-gray-500 flex items-center mt-1">
                      <MapPin className="w-3 h-3 mr-1 inline" /> {customer?.address || 'بدون عنوان'}
                    </p>
                  </div>
                  <span className={clsx("text-xs font-bold px-2 py-1 rounded-md border", STATUS_COLORS[order.status])}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div>
                    <span className="text-gray-400 text-xs block">عدد القطع</span>
                    <span className="font-medium">{order.items.reduce((acc, i) => acc + i.quantity, 0)} قطع</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs block">الإجمالي</span>
                    <span className="font-medium text-gray-900">{total} ريال</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs block">المتبقي</span>
                    <span className="font-medium text-red-500">{remaining > 0 ? `${remaining} ريال` : 'خالص'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">
                    تم الإنشاء: {format(order.dates.created, 'yyyy/MM/dd')}
                  </span>
                  <div className="flex items-center text-purple-600 text-xs font-bold">
                    التفاصيل <ChevronLeft className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={handleCreateOrder}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-8 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 active:scale-95 transition-all z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

    </div>
  );
}
