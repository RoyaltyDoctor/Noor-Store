import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Phone, Package, ChevronLeft, X, UserPlus, CheckSquare, Square, Check, LayoutList } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, OrderStatus } from '../types';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function Home() {
  const { orders, customers, addOrder, addCustomer } = useStore();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter settings
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'ALL' | 'ACTIVE'>('ACTIVE');
  const [selectedStatusesMult, setSelectedStatusesMult] = useState<OrderStatus[]>(['PENDING', 'ORDERED', 'RECEIVED', 'SHIPPING']);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '' });

  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      if (isMultiSelectMode) {
        if (!selectedStatusesMult.includes(o.status)) return false;
      } else {
        if (selectedStatus === 'ACTIVE' && o.status === 'DELIVERED') return false;
        if (selectedStatus !== 'ALL' && selectedStatus !== 'ACTIVE' && o.status !== selectedStatus) return false;
      }
      
      // Search Match
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const customer = customers.find(c => c.id === o.customerId);
      const customerMatch = customer?.name?.toLowerCase().includes(q) || customer?.phone?.includes(q);
      const orderNumMatch = o.orderNumber?.includes(q);
      const trackingMatch = o.trackingNumber?.toLowerCase().includes(q);
      
      return customerMatch || orderNumMatch || trackingMatch;
    });
  }, [orders, isMultiSelectMode, selectedStatusesMult, selectedStatus, searchQuery, customers]);

  const filteredCustomersForOrder = useMemo(() => {
    return customers.filter(c => c.name.includes(customerSearch) || c.phone.includes(customerSearch));
  }, [customers, customerSearch]);

  const handleSelectCustomer = (cid: string) => {
    const oid = addOrder(cid);
    navigate(`/order/${oid}`);
    setShowNewOrderModal(false);
  };

  const handleCreateCustomerAndOrder = () => {
    if (!newCustomerForm.name) return;
    const cid = addCustomer({ name: newCustomerForm.name, phone: newCustomerForm.phone, address: '' });
    const oid = addOrder(cid);
    navigate(`/order/${oid}`);
    setShowNewOrderModal(false);
  };

  const toggleMultiselectStatus = (status: OrderStatus) => {
    setSelectedStatusesMult(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 1500);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">مرحباً نور 👋</h2>
          <p className="text-sm text-gray-500 mt-1">لديك {orders.filter(o => o.status !== 'DELIVERED').length} طلبية قيد التنفيذ</p>
        </div>
        <button 
          onClick={() => {setShowNewOrderModal(true); setIsAddingNewCustomer(false); setCustomerSearch('');}}
          className="bg-gray-900 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1 active:scale-95 transition-transform shadow-md"
        >
          <Plus className="w-4 h-4" /> طلبية جديدة
        </button>
      </div>

      <div className="flex items-center gap-2 relative">
        <div className="relative flex-1 cursor-text">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الطلبية، العميل، التتبع..."
            className="w-full pl-3 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-400"
          />
        </div>
        <button 
          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          className={clsx(
            "p-2 rounded-xl border transition-colors",
            (isMultiSelectMode ? selectedStatusesMult.length < 5 : selectedStatus !== 'ACTIVE') ? "bg-purple-50 border-purple-200 text-purple-600" : "bg-white border-gray-200 text-gray-600"
          )}
        >
          <Filter className="w-5 h-5" />
        </button>

        {showFilterDropdown && (
          <div className="absolute top-12 left-0 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2">
            
            <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-gray-500">طريقة الفلترة</span>
              <button 
                onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                className={clsx("text-xs font-bold flex items-center gap-1 px-2 py-1 rounded transition-colors", isMultiSelectMode ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600")}
              >
                 <LayoutList className="w-3 h-3" /> متعدد
              </button>
            </div>

            {isMultiSelectMode ? (
              <>
                <div className="px-3 pb-2 mb-2 border-b border-gray-50 flex justify-between text-xs font-bold text-gray-500">
                  <button onClick={() => setSelectedStatusesMult(['PENDING', 'ORDERED', 'RECEIVED', 'SHIPPING', 'DELIVERED'])} className="hover:text-purple-600 px-2">تحديد الكل</button>
                  <button onClick={() => setSelectedStatusesMult(['PENDING', 'ORDERED', 'RECEIVED', 'SHIPPING'])} className="hover:text-purple-600 px-2">قيد التنفيذ</button>
                </div>
                {Object.entries(STATUS_LABELS).map(([key, label]) => {
                  const isActive = selectedStatusesMult.includes(key as OrderStatus);
                  return (
                    <button key={key} onClick={() => toggleMultiselectStatus(key as OrderStatus)} className="w-full text-right px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-3">
                      {isActive ? <CheckSquare className="w-4 h-4 text-purple-600"/> : <Square className="w-4 h-4 text-gray-300"/>}
                      {label}
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                <button onClick={() => { setSelectedStatus('ALL'); setShowFilterDropdown(false); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 text-sm flex items-center justify-between">
                  عرض الكل {selectedStatus === 'ALL' && <Check className="w-4 h-4 text-purple-600"/>}
                </button>
                <button onClick={() => { setSelectedStatus('ACTIVE'); setShowFilterDropdown(false); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 text-sm flex items-center justify-between">
                  قيد التنفيذ (غير مستلم) {selectedStatus === 'ACTIVE' && <Check className="w-4 h-4 text-purple-600"/>}
                </button>
                <div className="border-t border-gray-50 my-1"></div>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <button key={key} onClick={() => { setSelectedStatus(key as OrderStatus); setShowFilterDropdown(false); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 text-sm flex items-center justify-between">
                    {label} {selectedStatus === key && <Check className="w-4 h-4 text-purple-600"/>}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>لا توجد طلبيات تطابق بحثك</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const customer = customers.find(c => c.id === order.customerId);
            const itemsTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const total = itemsTotal + order.serviceFee + order.shippingFee;
            const remaining = total - order.deposit;

            return (
              <Link key={order.id} to={`/order/${order.id}`} className="block bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-transform">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{customer?.name || 'عميل غير معروف'}</h3>
                    {customer?.phone && (
                      <p className="text-xs text-gray-500 flex items-center mt-1">
                        <Phone className="w-3 h-3 ml-1" /> {customer.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {order.orderNumber && (
                      <button 
                        onClick={(e) => handleCopy(e, order.orderNumber!, order.id)}
                        className={clsx(
                          "text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border transition-colors",
                          copiedOrderId === order.id ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-50/50 text-gray-400 border-gray-100 hover:bg-gray-100 hover:text-gray-600"
                        )}
                        title="نسخ رقم الطلبية"
                      >
                        #{order.orderNumber}
                      </button>
                    )}
                    <span className={clsx("text-xs font-bold px-2 py-1 rounded-md border", STATUS_COLORS[order.status])}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3 bg-gray-50 p-2 text-center rounded-xl">
                  <div className="flex-1">
                    <span className="text-gray-400 text-[10px] block font-medium">عدد القطع</span>
                    <span className="font-bold text-gray-800">{order.items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-200"></div>
                  <div className="flex-1">
                    <span className="text-gray-400 text-[10px] block font-medium">الإجمالي</span>
                    <span className="font-bold text-gray-800">{total}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-200"></div>
                  <div className="flex-1">
                    <span className="text-gray-400 text-[10px] block font-medium">المتبقي</span>
                    <span className="font-bold text-red-500">{remaining > 0 ? remaining : 'خالص'}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
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

      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-100">
              <h3 className="font-bold text-lg">{isAddingNewCustomer ? 'إضافة عميل جديد' : 'اختيار العميل للطلبية'}</h3>
              <button onClick={() => {setShowNewOrderModal(false); setIsAddingNewCustomer(false);}} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"><X className="w-4 h-4"/></button>
            </div>

            {!isAddingNewCustomer ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                    placeholder="ابحث عن عميل بالاسم أو الهاتف..."
                    className="w-full pl-3 pr-9 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 no-scrollbar">
                  {filteredCustomersForOrder.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 py-6">العميل غير موجود</div>
                  ) : (
                    filteredCustomersForOrder.map(c => (
                      <button key={c.id} onClick={() => handleSelectCustomer(c.id)} className="w-full text-right p-3 bg-white border border-gray-100 rounded-xl hover:bg-purple-50 hover:border-purple-200 active:scale-95 transition-all flex justify-between items-center shadow-sm">
                        <span className="font-bold text-gray-900 text-sm">{c.name}</span>
                        {c.phone && <span className="text-xs text-gray-500 font-mono tracking-wider dir-ltr flex items-center gap-1"><Phone className="w-3 h-3 ml-1"/> {c.phone}</span>}
                      </button>
                    ))
                  )}
                </div>
                <div className="pt-2">
                  <button 
                    onClick={() => setIsAddingNewCustomer(true)}
                    className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    <UserPlus className="w-4 h-4"/> عميل جديد غير مسجل بالتطبيق
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input 
                  type="text" placeholder="اسم العميل (إلزامي)" 
                  value={newCustomerForm.name} onChange={e => setNewCustomerForm({...newCustomerForm, name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <input 
                  type="tel" placeholder="رقم الهاتف (اختياري)" 
                  value={newCustomerForm.phone} onChange={e => setNewCustomerForm({...newCustomerForm, phone: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none dir-rtl"
                />
                <div className="flex gap-2 pt-4">
                  <button onClick={handleCreateCustomerAndOrder} disabled={!newCustomerForm.name} className="flex-1 bg-purple-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-opacity">إضافة العميل وتكوين الطلبية</button>
                  <button onClick={() => setIsAddingNewCustomer(false)} className="flex-none px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors">رجوع</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
