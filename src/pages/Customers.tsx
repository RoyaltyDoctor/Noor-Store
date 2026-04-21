import { useState } from 'react';
import { useStore } from '../store';
import { Users, Phone, MapPin, Plus, Edit2, Trash2 } from 'lucide-react';
import type { Customer } from '../types';

export default function Customers() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  const handleSave = () => {
    if (!formData.name) return;
    if (editingId) {
      updateCustomer(editingId, formData);
    } else {
      addCustomer(formData);
    }
    setFormData({ name: '', phone: '', address: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (c: Customer) => {
    setFormData({ name: c.name, phone: c.phone, address: c.address });
    setEditingId(c.id);
    setIsAdding(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-600" />
          سجل العملاء
        </h2>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', phone: '', address: '' }); }}
          className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 active:bg-purple-200 transition-colors"
        >
          <Plus className="w-4 h-4" /> جديد
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900 mb-2">{editingId ? 'تعديل عميل' : 'إضافة عميل جديد'}</h3>
          <input 
            type="text" placeholder="اسم العميل" 
            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
          <input 
            type="tel" placeholder="رقم الجوال" 
            value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
          <input 
            type="text" placeholder="العنوان / المنطقة" 
            value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="flex-1 bg-gray-900 text-white rounded-xl py-2 text-sm font-bold active:scale-95 transition-transform">
              حفظ
            </button>
            <button onClick={() => setIsAdding(false)} className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2 text-sm font-bold active:bg-gray-200 transition-colors">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {customers.length === 0 && !isAdding ? (
        <div className="text-center py-12 text-gray-400">
          <p>لا يوجد عملاء مسجلين بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map(c => (
            <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900">{c.name}</h4>
                <div className="flex items-center text-xs text-gray-500 gap-3">
                  {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                  {c.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.address}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(c)} className="p-2 text-gray-400 hover:text-purple-600 bg-gray-50 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => {
                  if (confirm('هل أنت متأكد من حذف العميل؟ سيتم حذف طلباته أيضاً.')) {
                    deleteCustomer(c.id);
                  }
                }} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
