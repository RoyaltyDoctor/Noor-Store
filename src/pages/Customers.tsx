import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { Users, Phone, MapPin, Plus, Edit2, Trash2, Search, Package, ChevronLeft, X, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { Customer } from '../types';
import clsx from 'clsx';
import { STATUS_LABELS, STATUS_COLORS } from '../types';

export default function Customers() {
  const { customers, orders, addCustomer, updateCustomer, deleteCustomer } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [viewCustomerHistory, setViewCustomerHistory] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({ name: '', phone: '', address: '', notes: '' });
  const [showExtraDetails, setShowExtraDetails] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q) || 
      c.notes?.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const handleSave = () => {
    if (!formData.name) return;
    if (editingId) {
      updateCustomer(editingId, formData);
    } else {
      addCustomer(formData);
    }
    setFormData({ name: '', phone: '', address: '', notes: '' });
    setIsAdding(false);
    setEditingId(null);
    setShowExtraDetails(false);
  };

  const handleEdit = (e: React.MouseEvent, c: Customer) => {
    e.stopPropagation();
    setFormData({ name: c.name, phone: c.phone, address: c.address, notes: c.notes || '' });
    setEditingId(c.id);
    setIsAdding(true);
    setShowExtraDetails(!!c.address || !!c.notes);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('حذف العميل؟ سيتم حذف طلبياته أيضاً.')) {
      deleteCustomer(id);
    }
  };

  const customerOrders = useMemo(() => {
    if (!viewCustomerHistory) return [];
    return orders.filter(o => o.customerId === viewCustomerHistory.id).sort((a,b) => b.dates.created - a.dates.created);
  }, [viewCustomerHistory, orders]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-600" />
          سجل العملاء
        </h2>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', phone: '', address: '', notes: '' }); setShowExtraDetails(false); }}
          className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 active:bg-purple-200 transition-colors"
        >
          <Plus className="w-4 h-4" /> العميل
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ابحث عن عميل بالإسم، الجوال، الملاحظات..."
          className="w-full pl-3 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>

      {isAdding && (
        <div className="bg-white p-4 rounded-2xl border-2 border-purple-200 shadow-sm space-y-3 mb-4">
          <div className="flex justify-between items-center mb-2 border-b border-purple-50 pb-2">
            <h3 className="font-bold text-purple-900 text-sm">{editingId ? 'تعديل العميل' : 'إضافة عميل جديد'}</h3>
            {!showExtraDetails && (
              <button onClick={() => setShowExtraDetails(true)} className="text-[10px] bg-purple-50 text-purple-600 font-bold px-2 py-1 flex items-center gap-1 rounded hover:bg-purple-100 transition-colors">
                 إظهار التفاصيل (عنوان، ملاحظات)
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text" placeholder="الاسم (إلزامي)" 
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="flex-[2] min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <input 
              type="tel" placeholder="رقم الجوال" 
              value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none dir-rtl"
            />
          </div>

          {showExtraDetails && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
               <input 
                 type="text" placeholder="العنوان / المنطقة" 
                 value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                 className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
               />
               <textarea 
                 placeholder="ملاحظات العميل (مثل: يحب التغليف الورقي...)" 
                 rows={2}
                 value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                 className="w-full bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 outline-none placeholder:text-yellow-700/50 resize-none"
               />
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={!formData.name} className="flex-1 bg-purple-600 text-white rounded-xl py-2 text-sm font-bold shadow-md">
              حفظ
            </button>
            <button onClick={() => {setIsAdding(false); setShowExtraDetails(false);}} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2 text-sm font-bold">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {filteredCustomers.length === 0 && !isAdding ? (
        <div className="text-center py-12 text-gray-400">
          <p>{searchQuery ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء مسجلين'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map(c => {
             const ordCount = orders.filter(o => o.customerId === c.id).length;
             return (
              <div 
                key={c.id} 
                onClick={() => setViewCustomerHistory(c)}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between cursor-pointer active:scale-[0.98] transition-all hover:border-purple-200 relative overflow-hidden"
              >
                <div className="absolute top-0 bottom-0 right-0 w-1 bg-purple-100" />
                <div className="space-y-2 pr-2">
                  <h4 className="font-bold text-gray-900">{c.name}</h4>
                  <div className="flex items-center text-[11px] text-gray-600 gap-2 flex-wrap">
                    {c.phone && <span className="flex items-center font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-100"><Phone className="w-3 h-3 ml-1" /> {c.phone}</span>}
                    {c.address && <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-100"><MapPin className="w-3 h-3" /> {c.address}</span>}
                  </div>
                  {c.notes && (
                      <p className="text-[10px] text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-100 flex items-start gap-1 mt-1 max-w-[250px] leading-snug">
                         <FileText className="w-3 h-3 flex-shrink-0 mt-0.5" /> {c.notes}
                      </p>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-3 text-left">
                  <span className={clsx("flex items-center gap-1 font-bold px-2 py-0.5 rounded-md border text-[10px] justify-end", ordCount > 0 ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-gray-50 text-gray-400 border-gray-200")}>
                      <Package className="w-3 h-3" /> {ordCount} طلبية
                  </span>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={(e) => handleEdit(e, c)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => handleDelete(e, c.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewCustomerHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-gray-50 w-full sm:max-w-md h-[80vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden mt-auto sm:mt-0">
            <div className="bg-white p-4 border-b flex justify-between items-center shadow-sm z-10 sticky top-0">
              <div>
                <h3 className="font-bold text-gray-900">سجل: {viewCustomerHistory.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{customerOrders.length} طلبيات مسجلة</p>
              </div>
              <button onClick={() => setViewCustomerHistory(null)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                 <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
               {customerOrders.length === 0 ? (
                 <div className="text-center py-10 text-gray-400">لا يوجد طلبيات للعميل</div>
               ) : (
                 customerOrders.map(order => {
                    const total = order.items.reduce((s, i) => s + (i.price * i.quantity), 0) + order.serviceFee + order.shippingFee;
                    return (
                        <Link key={order.id} to={`/order/${order.id}`} className="block bg-white p-4 rounded-xl border border-gray-100 shadow-sm active:scale-95 transition-transform">
                          <div className="flex justify-between items-start mb-2">
                             <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                               #{order.orderNumber}
                             </span>
                             <span className={clsx("text-[10px] font-bold px-2 py-1 rounded-md border", STATUS_COLORS[order.status])}>
                                {STATUS_LABELS[order.status]}
                             </span>
                          </div>
                          <div className="text-sm font-bold text-gray-900 mb-2">{total} ر.س <span className="text-xs text-gray-400 font-normal">({order.items.reduce((a,i)=>a+i.quantity,0)} قطع)</span></div>
                          <div className="flex justify-between items-center border-t border-gray-50 pt-2">
                             <span className="text-[10px] text-gray-400">{format(order.dates.created, 'yyyy/MM/dd')}</span>
                             <span className="text-xs font-bold text-purple-600 flex items-center">التفاصيل <ChevronLeft className="w-3 h-3 ml-1"/></span>
                          </div>
                        </Link>
                    )
                 })
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
