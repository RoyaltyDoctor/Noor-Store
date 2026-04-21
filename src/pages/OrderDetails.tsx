import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ChevronRight, ExternalLink, Plus, Trash2, Camera, ReceiptText, CheckCircle2, Edit2, Copy, ChevronDown, Check, Phone, X, MapPin, FileText } from 'lucide-react';
import { OrderStatus, STATUS_COLORS, STATUS_LABELS, Item } from '../types';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orders, customers, updateOrder, updateOrderStatus, deleteOrder } = useStore();
  
  const order = orders.find(o => o.id === id);
  const customer = customers.find(c => c.id === order?.customerId);

  const [activeTab, setActiveTab] = useState<'info' | 'items' | 'finance'>('items');
  const [addingItem, setAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<Item>>({ quantity: 1, price: 0 });
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  
  const [showQuantityDropdown, setShowQuantityDropdown] = useState(false);

  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [copiedSkuId, setCopiedSkuId] = useState<string | null>(null);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  if (!order) return <div className="p-4 text-center">الطلب غير موجود</div>;

  const statuses: OrderStatus[] = ['PENDING', 'ORDERED', 'RECEIVED', 'SHIPPING', 'DELIVERED'];
  const currentStatusIndex = statuses.indexOf(order.status);

  // Financials
  const itemsTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = itemsTotal + order.serviceFee + order.shippingFee;
  const remaining = total - order.deposit;

  const isFormOpen = addingItem || editingItemId !== null;

  const openAddForm = () => {
    setNewItem({ quantity: 1, price: 0 });
    setEditingItemId(null);
    setAddingItem(true);
    setShowMoreInfo(false);
    setShowQuantityDropdown(false);
  };

  const openEditForm = (item: Item) => {
    setNewItem(item);
    setEditingItemId(item.id);
    setAddingItem(false);
    setShowMoreInfo(!!item.url || !!item.sku || !!item.image);
    setShowQuantityDropdown(false);
  };

  const closeForm = () => {
    setAddingItem(false);
    setEditingItemId(null);
    setNewItem({ quantity: 1, price: 0 });
    setShowMoreInfo(false);
    setShowQuantityDropdown(false);
  };

  const handleSaveItem = () => {
    if (!newItem.name || newItem.price === undefined) return;
    
    if (editingItemId) {
      updateOrder(order.id, { 
        items: order.items.map(i => i.id === editingItemId ? { ...i, ...newItem } as Item : i) 
      });
    } else {
      const item: Item = {
        id: uuidv4(),
        ...newItem,
        name: newItem.name,
        price: Number(newItem.price),
        quantity: Number(newItem.quantity) || 1,
      } as Item;
      updateOrder(order.id, { items: [item, ...order.items] });
    }
    closeForm();
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

  const [deleteItemConfirmId, setDeleteItemConfirmId] = useState<string | null>(null);
  const [showDeleteOrderConfirm, setShowDeleteOrderConfirm] = useState(false);

  const removeItem = (itemId: string) => {
    setDeleteItemConfirmId(itemId);
  };

  const confirmRemoveItem = () => {
    if (deleteItemConfirmId && order) {
      updateOrder(order.id, { items: order.items.filter(i => i.id !== deleteItemConfirmId) });
      setDeleteItemConfirmId(null);
    }
  };

  const handleDeleteOrder = () => {
    setShowDeleteOrderConfirm(true);
  };

  const confirmDeleteOrder = () => {
    if (order) {
       deleteOrder(order.id);
       navigate('/');
    }
  };

  const handleCopyOrderNumber = () => {
    if(order.orderNumber) {
        navigator.clipboard.writeText(order.orderNumber);
        setCopiedOrderId(order.id);
        setTimeout(() => setCopiedOrderId(null), 1500);
    }
  };

  const handleCopySku = (sku: string, id: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSkuId(id);
    setTimeout(() => setCopiedSkuId(null), 1500);
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrlId(id);
    setTimeout(() => setCopiedUrlId(null), 1500);
  };

  return (
    <div className="bg-gray-50 min-h-full pb-8 relative">
      {/* Top Header Fixed - z-40 to prevent overlaps */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40 px-4 py-3 shadow-sm flex items-center justify-between">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-gray-900 active:bg-gray-100 rounded-full transition-colors">
          <ChevronRight className="w-6 h-6" />
        </button>
        <div className="flex-1 text-center items-center justify-center flex truncate px-2">
          <button 
             onClick={() => setShowCustomerModal(true)} 
             className="font-bold text-gray-900 text-base inline-block hover:text-purple-600 transition-colors bg-gray-50 px-3 py-1 rounded-full border border-gray-100 shadow-sm active:scale-95"
          >
             طلبية <span className="text-purple-700">{customer?.name}</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {customer?.phone && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg text-gray-500 font-mono tracking-wider dir-ltr">
              <a 
                href={`tel:${customer.phone.replace(/[^0-9+]/g, '')}`} 
                className="hover:text-blue-600 transition-colors flex items-center justify-center p-0.5"
                title="اتصال"
              >
                <Phone className="w-4 h-4" />
              </a>
              <div className="w-px h-4 bg-gray-300"></div>
              <a 
                href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`} 
                target="_blank" 
                rel="noreferrer" 
                className="hover:text-[#25D366] transition-colors flex items-center justify-center p-0.5"
                title="تواصل واتساب"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#25D366] hover:scale-110 transition-transform"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>
          )}
          <button onClick={handleDeleteOrder} className="text-red-500 bg-red-50 p-1.5 rounded-xl">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Status Tracker */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="grid grid-cols-3 items-center mb-6">
            
            {/* Right: "حالة الطلبية" label - uses justify-self-start to push to the start of its cell (which is right in RTL) */}
            <div className="justify-self-start">
               <h3 className="font-bold text-gray-900 text-sm">حالة الطلبية</h3>
            </div>
            
            {/* Center: Dynamic Status Badge */}
            <div className="justify-self-center">
              <span className={clsx("px-5 py-2 rounded-xl text-sm font-bold border inline-block whitespace-nowrap shadow-sm", STATUS_COLORS[order.status])}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>

            {/* Left: Order Number - uses justify-self-end to push to the edge of its cell (which is left in RTL) */}
            <div className="justify-self-end">
              {order.orderNumber && (
                <button 
                  onClick={handleCopyOrderNumber}
                  className={clsx(
                    "text-xs font-mono font-bold px-3 py-1.5 rounded-lg border transition-colors shadow-sm",
                    copiedOrderId === order.id ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
                  )}
                  title="نسخ رقم الطلبية"
                >
                  #{order.orderNumber}
                </button>
              )}
            </div>
            
          </div>

          <div className="flex justify-between relative mt-6 mb-2">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full" />
            <div 
              className="absolute top-1/2 right-0 h-1 bg-purple-500 -translate-y-1/2 z-0 rounded-full transition-all duration-300" 
              style={{ width: `${(currentStatusIndex / (statuses.length - 1)) * 100}%` }}
            />
            {statuses.map((status, idx) => {
              const isPast = idx <= currentStatusIndex;
              return (
                <button
                  key={status}
                  onClick={() => updateOrderStatus(order.id, status)}
                  className="relative z-10 flex flex-col items-center gap-2 group outline-none"
                >
                  <div className={clsx(
                    "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors bg-white",
                    isPast ? "border-purple-600 text-purple-600" : "border-gray-300 text-transparent"
                  )}>
                    {isPast && <CheckCircle2 className="w-4 h-4 fill-purple-600 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 relative z-10">
          <button 
            className={clsx("flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors", activeTab === 'items' ? "bg-purple-100 text-purple-700" : "text-gray-500")}
            onClick={() => setActiveTab('items')}
          >
            المنتجات ({order.items.length})
          </button>
          <button 
            className={clsx("flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors", activeTab === 'finance' ? "bg-purple-100 text-purple-700" : "text-gray-500")}
            onClick={() => setActiveTab('finance')}
          >
            المالية
          </button>
          <button 
            className={clsx("flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors", activeTab === 'info' ? "bg-purple-100 text-purple-700" : "text-gray-500")}
            onClick={() => setActiveTab('info')}
          >
            معلومات
          </button>
        </div>

        {/* Tab Content: ITEMS */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            
            {/* Form is at the top */}
            {!isFormOpen ? (
              <button 
                onClick={openAddForm}
                className="w-full py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
              >
                <Plus className="w-5 h-5" /> إضافة منتج جديد
              </button>
            ) : (
              <div className="bg-white p-4 rounded-2xl border-2 border-purple-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-bold text-gray-900 border-b pb-2 mb-2">{editingItemId ? 'تعديل القطعة' : 'إضافة قطعة جديدة'}</h4>
                </div>
                
                {/* Row 1: Name and SKU */}
                <div className="flex gap-2 w-full">
                  <input type="text" placeholder="اسم القطعة (إلزامي)" 
                    value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})}
                    className="flex-[2] min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <input type="text" placeholder="رمز القطعة SKU" 
                    value={newItem.sku || ''} onChange={e => setNewItem({...newItem, sku: e.target.value})}
                    className="flex-1 min-w-0 md:max-w-[120px] bg-gray-50 border border-gray-200 rounded-xl px-2 py-3 focus:ring-2 focus:ring-purple-500 outline-none text-left" dir="ltr"
                  />
                </div>

                {/* Row 2: Size, Color, Price, Quantity */}
                {/* Using flex layout properly to prevent overflow. Shrink items below minimum and set basic padding */}
                <div className="flex gap-2 w-full">
                  <input type="text" placeholder="المقاس" 
                    value={newItem.size || ''} onChange={e => setNewItem({...newItem, size: e.target.value})}
                    className="flex-[1.2] min-w-0 w-0 bg-gray-50 border border-gray-200 rounded-xl px-2 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <input type="text" placeholder="اللون" 
                    value={newItem.color || ''} onChange={e => setNewItem({...newItem, color: e.target.value})}
                    className="flex-[1.2] min-w-0 w-0 bg-gray-50 border border-gray-200 rounded-xl px-2 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <input type="number" placeholder="السعر" onFocus={e => e.target.select()}
                    value={newItem.price === 0 && !editingItemId ? '' : newItem.price} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})}
                    className="flex-[1.2] min-w-0 w-0 bg-gray-50 border border-gray-200 rounded-xl px-2 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <div className="relative flex-1 min-w-0 w-0">
                    <button 
                      type="button" 
                      onClick={() => setShowQuantityDropdown(!showQuantityDropdown)} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-3 focus:ring-2 focus:ring-purple-500 outline-none flex justify-between items-center text-gray-700"
                    >
                      <span className="truncate flex-1 text-center font-bold">{newItem.quantity || 1}</span>
                      <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    </button>
                    {showQuantityDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-40 overflow-y-auto no-scrollbar">
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                          <button 
                             type="button" 
                             key={num} 
                             onClick={() => { setNewItem({...newItem, quantity: num}); setShowQuantityDropdown(false); }} 
                             className="w-full text-center py-2 hover:bg-purple-50 text-sm border-b border-gray-50 last:border-0 transition-colors"
                          >
                             {num}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expand Toggle */}
                {!showMoreInfo && (
                  <button type="button" onClick={() => setShowMoreInfo(true)} className="text-purple-600 text-xs font-bold pt-2 flex items-center gap-1 hover:text-purple-800 transition-colors">
                    <Plus className="w-3 h-3" /> إضافة تفاصيل (رابط، صورة...)
                  </button>
                )}

                {/* Expanded Info */}
                {showMoreInfo && (
                  <div className="pt-2 space-y-3 border-t border-gray-100 mt-3 relative">
                    <input type="url" placeholder="رابط المنتج" dir="auto"
                      value={newItem.url || ''} onChange={e => setNewItem({...newItem, url: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 focus:ring-2 focus:ring-purple-500 outline-none text-right placeholder-gray-400"
                    />

                    {/* Image upload */}
                    <div className="pt-1">
                      <label className="block text-xs text-gray-500 mb-2">صورة المنتج</label>
                      <div className="flex items-center gap-4">
                        <label className="relative inline-flex items-center justify-center px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-purple-100 transition-colors">
                          اختر صورة
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                        </label>
                        {newItem.image && <img src={newItem.image} className="h-12 w-12 object-cover rounded-md border shadow-sm" alt="Product" />}
                      </div>
                    </div>
                    
                    <button type="button" onClick={() => setShowMoreInfo(false)} className="text-gray-500 text-xs flex items-center gap-1 mt-2">
                       <ChevronDown className="w-3 h-3 transform rotate-180" /> إخفاء التفاصيل
                    </button>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={handleSaveItem} disabled={!newItem.name || newItem.price === undefined} className="flex-1 bg-purple-600 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-bold active:scale-95 transition-transform shadow-md">
                    {editingItemId ? 'حفظ التعديلات' : 'إضافة القطعة'}
                  </button>
                  <button type="button" onClick={closeForm} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 text-sm font-bold active:bg-gray-200 transition-colors">إلغاء</button>
                </div>
              </div>
            )}

            {/* Existing Items */}
            <AnimatePresence initial={false}>
              {order.items.map((item) => (
                <motion.div 
                  key={item.id} 
                  initial={{ opacity: 0, scale: 0.95, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0, marginTop: 0, marginBottom: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={clsx("p-3 rounded-2xl border transition-colors", editingItemId === item.id ? "border-purple-300 bg-purple-50" : "bg-white border-gray-100 shadow-sm")}
                >
                  <div className="flex gap-3 relative flex-wrap sm:flex-nowrap">
                    
                    {/* Image Placeholder */}
                    <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
  
                    {/* Info */}
                    <div className="flex-1 pt-1 min-w-0">
                      <div className="flex justify-between items-start w-full mb-1">
                          <h4 className="font-bold text-gray-900 text-sm leading-snug truncate pr-2">{item.name}</h4>
                          {/* Actions Area inline - Subtle style */}
                          {editingItemId !== item.id && (
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => openEditForm(item)} className="p-1.5 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-700 rounded-md transition-colors" title="تعديل">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => removeItem(item.id)} className="p-1.5 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-700 rounded-md transition-colors" title="حذف">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-gray-500">
                        {item.size && <span className="bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded shadow-sm">م: {item.size}</span>}
                        {item.color && <span className="bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded shadow-sm">ل: {item.color}</span>}
                        {item.sku && (
                          <div className="flex items-center bg-gray-50 border border-gray-100 rounded shadow-sm overflow-hidden" dir="ltr">
                            <button 
                               onClick={() => handleCopySku(item.sku!, item.id)} 
                               className={clsx("px-1.5 py-0.5 transition-colors border-r border-gray-100 flex items-center justify-center h-full", copiedSkuId === item.id ? "bg-green-100 text-green-700" : "text-gray-400 hover:bg-gray-200 hover:text-gray-700")} 
                               title="نسخ الكود"
                            >
                              {copiedSkuId === item.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <span className="px-1.5 py-0.5 font-mono max-w-[80px] truncate">{item.sku}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-sm font-bold text-gray-900">{item.price} ر.س <span className="font-normal text-xs text-gray-500">×{item.quantity}</span></div>
                        {item.url && (
                          <div className="flex items-center rtl:flex-row-reverse border border-blue-100 rounded bg-blue-50/50 shadow-sm overflow-hidden text-right h-6">
                            <button 
                               onClick={() => handleCopyUrl(item.url!, item.id)} 
                               className={clsx("px-2 py-1 transition-colors border-r border-blue-100 flex items-center justify-center h-full", copiedUrlId === item.id ? "bg-green-100 text-green-700" : "text-blue-400 hover:bg-blue-100 hover:text-blue-600")} 
                               title="نسخ الرابط"
                            >
                              {copiedUrlId === item.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:bg-blue-100/50 px-2 flex items-center gap-1 text-[10px] font-bold h-full">
                              الرابط <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
  
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Tab Content: FINANCE */}
        {activeTab === 'finance' && (
          <div className="space-y-4">
            <div className="bg-gray-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 p-4 opacity-10">
                <ReceiptText className="w-32 h-32" />
              </div>
              <h3 className="text-white/70 font-medium text-sm mb-1">المبلغ المتبقي للتحصيل</h3>
              <div className="text-5xl font-black mb-6">{Math.max(0, remaining).toFixed(2)} <span className="text-lg font-normal">ر.س</span></div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 space-y-3 text-sm relative z-10 border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">إجمالي المنتجات ({order.items.reduce((acc, i) => acc+i.quantity, 0)} قطعة):</span>
                  <span className="font-bold">{itemsTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">رسوم الخدمة:</span>
                  <span className="font-bold text-purple-300">+{order.serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">رسوم الشحن:</span>
                  <span className="font-bold text-orange-300">+{order.shippingFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/20 pt-3 mt-1">
                  <span className="font-bold text-base">الإجمالي الكلي:</span>
                  <span className="font-bold text-base">{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-green-300 bg-green-500/10 -mx-2 px-2 py-1.5 rounded-lg border border-green-500/20">
                  <span className="font-medium">المدفوع مقدماً (عربون):</span>
                  <span className="font-bold">- {order.deposit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h4 className="font-bold text-gray-900 mb-1">تحديث المبالغ الإضافية</h4>
              
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">رسوم الخدمة (عمولة) <span className="text-gray-400 font-normal">بالريال</span></label>
                <input type="number" onFocus={e => e.target.select()}
                  value={order.serviceFee === 0 ? '' : order.serviceFee} 
                  onChange={e => updateOrder(order.id, { serviceFee: Number(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">رسوم الشحن <span className="text-gray-400 font-normal">بالريال</span></label>
                <input type="number" onFocus={e => e.target.select()}
                  value={order.shippingFee === 0 ? '' : order.shippingFee} 
                  onChange={e => updateOrder(order.id, { shippingFee: Number(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">العربون المدفوع من العميل <span className="text-gray-400 font-normal">بالريال</span></label>
                <input type="number" onFocus={e => e.target.select()}
                  value={order.deposit === 0 ? '' : order.deposit} 
                  onChange={e => updateOrder(order.id, { deposit: Number(e.target.value) })}
                  className="w-full bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-green-500 outline-none"
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
              <input type="text" placeholder="رقم تتبع الشحنة" 
                value={order.trackingNumber || ''} onChange={e => updateOrder(order.id, { trackingNumber: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 focus:ring-2 focus:ring-purple-500 outline-none text-right" dir="rtl"
              />
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <h4 className="font-bold text-gray-900">ملاحظات العميل</h4>
              <textarea placeholder="ملاحظات العميل..." rows={3}
                value={order.notes?.customerNotes || ''} onChange={e => updateOrder(order.id, { notes: { ...order.notes, customerNotes: e.target.value } })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              />
            </div>

            <div className="bg-white p-4 rounded-2xl border border-yellow-200 shadow-sm space-y-3 bg-yellow-50/50">
              <h4 className="font-bold text-yellow-800">ملاحظات خاصة بي</h4>
              <textarea placeholder="ملاحظات خاصة بي..." rows={3}
                value={order.notes?.internalNotes || ''} onChange={e => updateOrder(order.id, { notes: { ...order.notes, internalNotes: e.target.value } })}
                className="w-full bg-white border border-yellow-200 rounded-xl px-3 py-3 focus:ring-2 focus:ring-yellow-500 outline-none resize-none placeholder:text-yellow-600/40"
              />
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-3">تغيير العميل المرتبط بالطلبية</h4>
              <select 
                value={order.customerId} 
                onChange={(e) => updateOrder(order.id, { customerId: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

          </div>
        )}

      </div>

      {/* Item Delete Confirmation Modal */}
      {deleteItemConfirmId && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">حذف القطعة</h3>
            <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
              هل أنت متأكد من حذف هذه القطعة من الطلبية؟
            </p>
            <div className="flex gap-3">
              <button 
                onClick={confirmRemoveItem}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-bold transition-colors shadow-sm"
              >
                تأكيد الحذف
              </button>
              <button 
                onClick={() => setDeleteItemConfirmId(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3 font-bold transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Delete Confirmation Modal */}
      {showDeleteOrderConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">حذف الطلبية بالكامل</h3>
            <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
              هل أنت متأكد من حذف هذه الطلبية بجميع محتوياتها؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={confirmDeleteOrder}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-bold transition-colors shadow-sm"
              >
                تأكيد الحذف
              </button>
              <button 
                onClick={() => setShowDeleteOrderConfirm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3 font-bold transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Info Modal */}
      {showCustomerModal && customer && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCustomerModal(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowCustomerModal(false)}
              className="absolute top-4 left-4 p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-4 pr-3 border-r-4 border-purple-500">بيانات العميل</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">الاسم</label>
                <p className="font-bold text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">{customer.name}</p>
              </div>
              
              {customer.phone && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">رقم الهاتف</label>
                  <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                    <span className="font-mono text-gray-700 block text-left w-full" dir="ltr">{customer.phone}</span>
                    <div className="flex items-center gap-2 border-r border-gray-200 pr-2 ml-4">
                      <a href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-[#25D366] hover:scale-110 transition-transform">
                         <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </a>
                      <a href={`tel:${customer.phone.replace(/[^0-9+]/g, '')}`} className="text-blue-500 hover:scale-110 transition-transform">
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
              
              {customer.address && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">العنوان</label>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(customer.address)}`} target="_blank" rel="noreferrer" className="flex items-start gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-100 hover:text-blue-600 transition-colors">
                     <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                     <span className="text-sm font-medium">{customer.address}</span>
                  </a>
                </div>
              )}
              
              {customer.notes && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">ملاحظات</label>
                  <div className="bg-yellow-50/50 px-3 py-2 rounded-lg border border-yellow-100 text-yellow-800 text-sm leading-relaxed flex items-start gap-2">
                     <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                     <span>{customer.notes}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
