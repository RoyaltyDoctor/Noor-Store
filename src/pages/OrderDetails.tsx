import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ChevronRight, ExternalLink, Plus, Trash2, Camera, MapPin, ReceiptText, PackageCheck, Send, CheckCircle2 } from 'lucide-react';
import { OrderStatus, STATUS_COLORS, STATUS_LABELS, Item } from '../types';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orders, customers, updateOrder, updateOrderStatus } = useStore();
  
  const order = orders.find(o => o.id === id);
  const customer = customers.find(c => c.id === order?.customerId);

  const [activeTab, setActiveTab] = useState<'info' | 'items' | 'finance'>('items');
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<Item>>({ quantity: 1, price: 0 });

  if (!order) return <div className="p-4 text-center">الطلب غير موجود</div>;

  const statuses: OrderStatus[] = ['PENDING', 'ORDERED', 'RECEIVED', 'SHIPPING', 'DELIVERED'];
  const currentStatusIndex = statuses.indexOf(order.status);

  // Financials
  const itemsTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = itemsTotal + order.serviceFee + order.shippingFee;
  const remaining = total - order.deposit;

  const handleSaveItem = () => {
    if (!newItem.name || !newItem.price) return;
    
    const item: Item = {
      id: uuidv4(),
      name: newItem.name,
      price: Number(newItem.price),
      quantity: Number(newItem.quantity) || 1,
      size: newItem.size,
      color: newItem.color,
      url: newItem.url,
      sku: newItem.sku
    };

    updateOrder(order.id, { items: [...order.items, item] });
    setAddingItem(false);
    setNewItem({ quantity: 1, price: 0 });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem({ ...newItem, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeItem = (itemId: string) => {
    updateOrder(order.id, { items: order.items.filter(i => i.id !== itemId) });
  };

  return (
    <div className="bg-gray-50 min-h-full pb-8">
      {/* Top Header Fixed */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-4 py-3 shadow-sm flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-900 active:bg-gray-100 rounded-full transition-colors">
          <ChevronRight className="w-6 h-6" />
        </button>
        <h2 className="font-bold flex-1 text-center truncate px-2 text-gray-900">
          طلب {customer?.name}
        </h2>
        {customer?.phone && (
          <a href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-green-600 bg-green-50 p-2 rounded-full font-bold text-xs" title="تواصل واتساب">
            واتساب
          </a>
        )}
      </div>

      <div className="p-4 space-y-6">
        
        {/* Status Tracker */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden">
          <h3 className="font-bold text-gray-900 mb-4 text-sm">حالة الطلبية</h3>
          <div className="flex justify-between relative">
            {/* Background Track */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full" />
            
            {/* Active Track */}
            <div 
              className="absolute top-1/2 right-0 h-1 bg-purple-500 -translate-y-1/2 z-0 rounded-full transition-all duration-300" 
              style={{ width: `${(currentStatusIndex / (statuses.length - 1)) * 100}%` }}
            />

            {statuses.map((status, idx) => {
              const isPast = idx <= currentStatusIndex;
              const isCurrent = idx === currentStatusIndex;
              return (
                <button
                  key={status}
                  onClick={() => updateOrderStatus(order.id, status)}
                  className="relative z-10 flex flex-col items-center gap-2 group outline-none"
                >
                  <div className={clsx(
                    "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors",
                    isPast ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-300 text-transparent"
                  )}>
                    {isPast && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-center">
            <span className={clsx("px-3 py-1 rounded-lg text-xs font-bold border inline-block", STATUS_COLORS[order.status])}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button 
            className={clsx("flex-1 py-3 text-sm font-bold transition-colors border-b-2", activeTab === 'items' ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500")}
            onClick={() => setActiveTab('items')}
          >
            المنتجات ({order.items.length})
          </button>
          <button 
            className={clsx("flex-1 py-3 text-sm font-bold transition-colors border-b-2", activeTab === 'finance' ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500")}
            onClick={() => setActiveTab('finance')}
          >
            المالية
          </button>
          <button 
            className={clsx("flex-1 py-3 text-sm font-bold transition-colors border-b-2", activeTab === 'info' ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500")}
            onClick={() => setActiveTab('info')}
          >
            تفاصيل وتتبع
          </button>
        </div>

        {/* Tab Content: ITEMS */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            
            {order.items.map((item, idx) => (
              <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3 relative">
                {/* Image Placeholder */}
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Camera className="w-6 h-6 opacity-30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-sm leading-snug">{item.name}</h4>
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-gray-500">
                    {item.size && <span className="bg-gray-100 px-1.5 py-0.5 rounded">م: {item.size}</span>}
                    {item.color && <span className="bg-gray-100 px-1.5 py-0.5 rounded">ل: {item.color}</span>}
                    {item.sku && <span className="bg-gray-100 px-1.5 py-0.5 rounded">SKU: {item.sku}</span>}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm font-bold text-gray-900">{item.price} ر.س <span className="font-normal text-xs text-gray-500">×{item.quantity}</span></div>
                    {item.url && (
                        <a href={item.url} target="_blank" rel="noreferrer" className="text-purple-600">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                  </div>
                </div>

                {/* Delete Area */}
                <button 
                  onClick={() => removeItem(item.id)}
                  className="absolute top-2 left-2 p-1.5 bg-red-50 text-red-500 rounded-md"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {addingItem ? (
              <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm space-y-3">
                <h4 className="font-bold text-sm text-purple-900">إضافة قطعة</h4>
                
                <input type="text" placeholder="اسم القطعة ووصف مختصر (إلزامي)" 
                  value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})}
                  className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
                
                <div className="flex gap-2">
                  <input type="number" placeholder="السعر (إلزامي)" 
                    value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})}
                    className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <input type="number" placeholder="الكمية" 
                    value={newItem.quantity || ''} onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})}
                    className="w-20 bg-gray-50 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <input type="text" placeholder="المقاس" 
                    value={newItem.size || ''} onChange={e => setNewItem({...newItem, size: e.target.value})}
                    className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <input type="text" placeholder="اللون" 
                    value={newItem.color || ''} onChange={e => setNewItem({...newItem, color: e.target.value})}
                    className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                
                <input type="url" placeholder="رابط المنتج (URL)" 
                  value={newItem.url || ''} onChange={e => setNewItem({...newItem, url: e.target.value})}
                  className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-left" dir="ltr"
                />

                <input type="text" placeholder="الكود (SKU)" 
                  value={newItem.sku || ''} onChange={e => setNewItem({...newItem, sku: e.target.value})}
                  className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />

                {/* Image upload */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">صورة المنتج</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"/>
                  {newItem.image && <img src={newItem.image} className="h-16 w-16 object-cover rounded mt-2 border" />}
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={handleSaveItem} className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm font-bold active:scale-95">إضافة</button>
                  <button onClick={() => setAddingItem(false)} className="flex-1 bg-gray-100 text-gray-600 rounded-lg py-2 text-sm font-bold">إلغاء</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setAddingItem(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 hover:text-purple-600 hover:border-purple-300 transition-all"
              >
                <Plus className="w-5 h-5" /> إضافة منتج
              </button>
            )}
          </div>
        )}

        {/* Tab Content: FINANCE */}
        {activeTab === 'finance' && (
          <div className="space-y-4">
            <div className="bg-gray-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ReceiptText className="w-24 h-24" />
              </div>
              <h3 className="text-white/70 font-medium text-sm mb-1">المبلغ المتبقي</h3>
              <div className="text-4xl font-black mb-4">{Math.max(0, remaining).toFixed(2)} <span className="text-lg font-normal">ر.س</span></div>
              
              <div className="bg-white/10 rounded-xl p-3 space-y-2 text-sm relative z-10">
                <div className="flex justify-between">
                  <span className="text-white/70">إجمالي المنتجات:</span>
                  <span className="font-medium">{itemsTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">رسوم الخدمة:</span>
                  <span className="font-medium">{order.serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">رسوم الشحن:</span>
                  <span className="font-medium">{order.shippingFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-white/20 pt-2 mt-2">
                  <span className="font-bold">الإجمالي الكلي:</span>
                  <span className="font-bold">{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-300">
                  <span>المدفوع مقدماً (عربون):</span>
                  <span>- {order.deposit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <h4 className="font-bold text-gray-900 mb-2">تحديث المبالغ</h4>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">رسوم الخدمة (عمولة)</label>
                <input type="number" 
                  value={order.serviceFee || ''} onChange={e => updateOrder(order.id, { serviceFee: Number(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">رسوم الشحن</label>
                <input type="number" 
                  value={order.shippingFee || ''} onChange={e => updateOrder(order.id, { shippingFee: Number(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">العربون المدفوع</label>
                <input type="number" 
                  value={order.deposit || ''} onChange={e => updateOrder(order.id, { deposit: Number(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: INFO */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <h4 className="font-bold text-gray-900">تتبع الشحنة</h4>
              <input type="text" placeholder="رقم التتبع (مثل شي إن، أرامكس...)" 
                value={order.trackingNumber || ''} onChange={e => updateOrder(order.id, { trackingNumber: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none text-left" dir="ltr"
              />
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <h4 className="font-bold text-gray-900">ملاحظات العميل</h4>
              <textarea placeholder="ملاحظات العميل... (تغليف خاص، عنوان دقيق...)" rows={3}
                value={order.notes?.customerNotes || ''} onChange={e => updateOrder(order.id, { notes: { ...order.notes, customerNotes: e.target.value } })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              />
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 bg-yellow-50/30">
              <h4 className="font-bold text-yellow-800">ملاحظات الوسيطة (سرية)</h4>
              <textarea placeholder="ملاحظات خاصة بك فقط..." rows={3}
                value={order.notes?.internalNotes || ''} onChange={e => updateOrder(order.id, { notes: { ...order.notes, internalNotes: e.target.value } })}
                className="w-full bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-yellow-500 outline-none resize-none placeholder:text-yellow-600/50"
              />
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-3">تغيير العميل</h4>
              <select 
                value={order.customerId} 
                onChange={(e) => updateOrder(order.id, { customerId: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
