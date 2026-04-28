import React, { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useStore } from "../store";
import { OrderStatus, STATUS_LABELS, STATUS_COLORS } from "../types";
import clsx from "clsx";
import { 
  ChevronRight, 
  ShoppingCart, 
  Trash2, 
  Tag, 
  Hash, 
  Landmark,
  FileText,
  User,
  Package,
  X,
  CheckCircle2,
  Search,
  Phone,
  UserPlus,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function BatchDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const allBatches = useStore((state) => state.batches);
  const batch = allBatches.find((b) => b.id === id);
  const updateBatch = useStore((state) => state.updateBatch);
  const deleteBatch = useStore((state) => state.deleteBatch);
  const updateOrder = useStore((state) => state.updateOrder);
  const allOrders = useStore((state) => state.orders);
  const orders = allOrders.filter(o => o.batchId === id);
  const customers = useStore((state) => state.customers);
  const addOrder = useStore((state) => state.addOrder);
  const addCustomer = useStore((state) => state.addCustomer);

  const [isEditingDocs, setIsEditingDocs] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkOrderSearchQuery, setLinkOrderSearchQuery] = useState("");
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
  });

  const filteredCustomersForOrder = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.includes(customerSearch) || (c.phone && c.phone.includes(customerSearch)),
    );
  }, [customers, customerSearch]);

  const handleSelectCustomer = (cid: string) => {
    const oid = addOrder(cid);
    updateOrder(oid, { batchId: id });
    navigate(`/order/${oid}`);
    setShowNewOrderModal(false);
  };

  const handleCreateCustomerAndOrder = () => {
    if (!newCustomerForm.name) return;
    const cid = addCustomer({
      name: newCustomerForm.name,
      phone: newCustomerForm.phone,
      address: newCustomerForm.address,
      notes: newCustomerForm.notes,
    });
    const oid = addOrder(cid);
    updateOrder(oid, { batchId: id });
    navigate(`/order/${oid}`);
    setShowNewOrderModal(false);
  };

  const [formData, setFormData] = useState({
    couponEnabled: batch?.couponEnabled || false,
    couponCode: batch?.couponCode || "",
    trackingNumber: batch?.trackingNumber || "",
    bankFees: batch?.bankFees || 0,
    notes: batch?.notes || "",
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAssociatedOrders, setDeleteAssociatedOrders] = useState(false);

  const confirmDelete = () => {
    deleteBatch(id!, deleteAssociatedOrders);
    navigate("/batches");
  };

  const handleUpdateStatus = (status: OrderStatus) => {
    updateBatch(id!, { status });
  };

  const handleSaveDocs = () => {
    updateBatch(id!, {
      ...formData,
      bankFees: Number(formData.bankFees) || 0
    });
    setIsEditingDocs(false);
  };

  if (!batch) {
    return (
      <div className="p-4 text-center text-gray-500 mt-20" dir="rtl">
        <p>لم يتم العثور على السلة.</p>
        <button
          onClick={() => navigate("/batches")}
          className="mt-4 text-purple-600 underline"
        >
          العودة
        </button>
      </div>
    );
  }

  const [showExtraFields, setShowExtraFields] = useState(false);

  // Calculate Batch Financials
  const financials = useMemo(() => {
    let totalItemsCost = 0;
    let expectedShipping = 0;
    orders.forEach(o => {
      o.items.forEach(i => {
        totalItemsCost += (i.price * i.quantity);
      });
      expectedShipping += (o.shippingFee || 0);
    });
    return {
      totalItemsCost,
      expectedShipping,
      bankFees: batch.bankFees || 0,
      totalCost: totalItemsCost + expectedShipping + (batch.bankFees || 0)
    };
  }, [orders, batch]);

  const statuses: OrderStatus[] = [
    "PENDING",
    "ORDERED",
    "RECEIVED",
    "SHIPPING",
    "DELIVERED",
  ];
  const currentStatusIndex = statuses.indexOf(batch.status);

  return (
    <div className="pb-24 min-h-screen dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40 px-4 py-3 shadow-sm flex items-center justify-between dark:bg-gray-800 dark:border-gray-700 dark:border-gray-600 dark:shadow-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/batches")}
            className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl hover:bg-gray-100 active:scale-95 transition-all text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-gray-900 flex items-center gap-2 dark:text-white">
              {batch.batchNumber}
              {batch.couponEnabled && batch.couponCode && (
                <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 font-mono dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700">
                  {batch.couponCode}
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-500 font-mono dark:text-gray-400">
              {batch.dates?.created ? format(batch.dates.created, "dd MMM yyyy", { locale: ar }) : "تاريخ غير متوفر"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-xl active:scale-95 transition-all dark:text-red-400 dark:hover:bg-red-900/40"
          title="حذف السلة"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Tracker */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden dark:bg-gray-800 dark:border-gray-700 dark:shadow-none">
          <div className="grid grid-cols-3 items-center mb-6">
            <div className="justify-self-start">
              <h3 className="font-bold text-gray-900 text-sm dark:text-white">
                حالة السلة
              </h3>
            </div>
            <div className="justify-self-center">
              <span
                className={clsx(
                  "px-5 py-2 rounded-xl text-sm font-bold border inline-block whitespace-nowrap shadow-sm",
                  STATUS_COLORS[batch.status],
                )}
              >
                {STATUS_LABELS[batch.status]}
              </span>
            </div>
            <div className="justify-self-end"></div>
          </div>

          <div className="flex justify-between relative mt-6 mb-2">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full dark:bg-gray-700" />
            <div
              className="absolute top-1/2 right-0 h-1 bg-purple-500 -translate-y-1/2 z-0 rounded-full transition-all duration-300"
              style={{
                width: `${(currentStatusIndex / (statuses.length - 1)) * 100}%`,
              }}
            />
            {statuses.map((status, idx) => {
              const isPast = idx <= currentStatusIndex;
              return (
                <button
                  key={status}
                  onClick={() => handleUpdateStatus(status)}
                  className="relative z-10 flex flex-col items-center gap-2 group outline-none"
                >
                  <div
                    className={clsx(
                      "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors bg-white dark:bg-gray-800",
                      isPast
                        ? "border-purple-600 text-purple-600 dark:text-purple-400"
                        : "border-gray-300 text-transparent",
                    )}
                  >
                    {isPast && (
                      <CheckCircle2 className="w-4 h-4 fill-purple-600 text-white" />
                    )}
                  </div>
                  <span
                    className={clsx(
                      "text-[10px] font-bold absolute -bottom-5 whitespace-nowrap transition-colors",
                      isPast
                        ? "text-purple-700 dark:text-purple-400"
                        : "text-gray-400 dark:text-gray-500",
                    )}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Details & Documents */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:shadow-none">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2 dark:text-gray-300">
              <FileText className="w-4 h-4 text-orange-500" />
              تفاصيل وتكاليف السلة
            </h3>
            <button 
              onClick={() => {
                if (isEditingDocs) handleSaveDocs();
                else setIsEditingDocs(true);
              }}
              className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-lg dark:text-purple-400 dark:bg-purple-900/30"
            >
              {isEditingDocs ? 'حفظ' : 'تعديل'}
            </button>
          </div>

          {isEditingDocs ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 dark:bg-gray-900 dark:border-gray-700">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer dark:text-gray-300">
                  <input 
                    type="checkbox" 
                    checked={formData.couponEnabled}
                    onChange={(e) => setFormData({...formData, couponEnabled: e.target.checked})}
                    className="w-4 h-4 text-purple-600 rounded bg-white border-gray-300 focus:ring-purple-500 cursor-pointer dark:bg-gray-800 dark:border-gray-600"
                  />
                  استخدام كوبون
                </label>
              </div>
              
              {formData.couponEnabled && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 block dark:text-gray-400">رمز الكوبون</label>
                  <div className="relative">
                    <Tag className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.couponCode}
                      onChange={(e) => setFormData({...formData, couponCode: e.target.value.toUpperCase()})}
                      className="w-full bg-white border border-gray-200 rounded-xl pl-3 pr-9 py-2 focus:ring-2 focus:ring-purple-500 outline-none text-left font-mono dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      placeholder="e.g. SAVE20"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 block dark:text-gray-400">رقم التتبع</label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.trackingNumber}
                    onChange={(e) => setFormData({...formData, trackingNumber: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl pl-3 pr-9 py-2 focus:ring-2 focus:ring-purple-500 outline-none text-left font-mono dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    placeholder="Tracking No."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 block dark:text-gray-400">رسوم البنك (₪)</label>
                <div className="relative">
                  <Landmark className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={formData.bankFees || ""}
                    onChange={(e) => setFormData({...formData, bankFees: parseFloat(e.target.value)})}
                    className="w-full bg-white border border-gray-200 rounded-xl pl-3 pr-9 py-2 focus:ring-2 focus:ring-purple-500 outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 block dark:text-gray-400">ملاحظات إضافية للسلة</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 h-20 resize-none focus:ring-2 focus:ring-purple-500 outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="ملاحظات حول هذه السلة..."
                />
              </div>

            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 dark:bg-gray-900/50 dark:border-gray-700">
                  <span className="text-[10px] text-gray-500 block mb-1 dark:text-gray-400 flex items-center gap-1"><Tag className="w-3 h-3"/>الكوبون</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {batch.couponEnabled ? batch.couponCode || 'مفعل بدون رمز' : 'غير مفعل'}
                  </span>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 dark:bg-gray-900/50 dark:border-gray-700 flex justify-between flex-col">
                   <span className="text-[10px] text-gray-500 block mb-1 dark:text-gray-400 flex items-center gap-1"><Hash className="w-3 h-3"/>رقم التتبع</span>
                   <span className="text-sm font-bold text-gray-800 dark:text-gray-200 font-mono truncate" dir="ltr">
                     {batch.trackingNumber || '--'}
                   </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 dark:bg-gray-900/50 dark:border-gray-700">
                  <span className="text-[10px] text-gray-500 block mb-1 dark:text-gray-400 flex items-center gap-1"><Landmark className="w-3 h-3"/>رسوم البنك</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    <span className="text-[10px] ml-0.5">₪</span>
                    {batch.bankFees || 0}
                  </span>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 dark:bg-gray-900/50 dark:border-gray-700">
                  <span className="text-[10px] text-gray-500 block mb-1 dark:text-gray-400">إجمالي التكلفة المتوقعة للسلة</span>
                  <span className="text-sm font-bold text-purple-700 dark:text-purple-400">
                    <span className="text-[10px] ml-0.5">₪</span>
                    {financials.totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
              {batch.notes && (
                <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-3 dark:bg-yellow-900/10 dark:border-yellow-900/30">
                  <span className="text-[10px] text-yellow-600 block mb-1 font-bold dark:text-yellow-500">ملاحظات</span>
                  <p className="text-sm text-yellow-800 dark:text-yellow-400 whitespace-pre-wrap leading-relaxed">{batch.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Batch Orders */}
        <div>
          <div className="flex justify-between items-center mb-3 ml-2">
            <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2 dark:text-gray-300">
              <Package className="w-4 h-4 text-purple-500" />
              طلبات الشحنة ({orders.length})
            </h3>
            <button
              onClick={() => setShowLinkModal(true)}
              className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-lg dark:text-purple-400 dark:bg-purple-900/30"
            >
              إضافة طلبية
            </button>
          </div>

          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500 bg-white rounded-xl border border-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400">
                لا توجد طلبات في هذه السلة حتى الآن.
              </div>
            ) : (
              orders.map(order => {
                const customer = customers.find(c => c.id === order.customerId);
                const orderTotal = (order.items || []).reduce((acc, item) => acc + (item.price * item.quantity), 0);
                
                return (
                  <Link 
                    key={order.id}
                    to={`/order/${order.id}`}
                    className="block bg-white p-3 rounded-xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] sm:text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                         #{order.orderNumber}
                       </span>
                       <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                         <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400 ml-1">قيمة المنتجات:</span>
                         <span className="text-[10px] ml-0.5 text-gray-500 dark:text-gray-400">₪</span>
                         {orderTotal.toFixed(2)}
                       </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                      <User className="w-3.5 h-3.5 text-purple-500" />
                      {customer?.name || 'عميل محذوف'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 dark:text-gray-400 flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {(order.items || []).reduce((acc, item) => acc + item.quantity, 0)} منتجات
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

      </div>

      {/* Link Orders Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-4 shadow-xl max-h-[80vh] flex flex-col dark:bg-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">إضافة طلبية للسلة</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={() => {
                setShowLinkModal(false);
                setShowNewOrderModal(true);
                setIsAddingNewCustomer(false);
                setCustomerSearch("");
              }}
              className="w-full mb-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl px-4 py-3 font-bold flex items-center justify-center gap-2 transition-colors dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
            >
              <ShoppingCart className="w-5 h-5" /> طلبية جديدة بالكامل
            </button>
            
            <div className="relative mb-3 flex-shrink-0">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن طلبية لإضافتها للسلة..."
                value={linkOrderSearchQuery}
                onChange={(e) => setLinkOrderSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-9 pl-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div className="overflow-y-auto overflow-x-hidden flex-1 space-y-2 pb-safe pr-1 custom-scrollbar">
              {(() => {
                const availableOrders = allOrders.filter(o => !o.batchId && (o.orderNumber?.includes(linkOrderSearchQuery) || customers.find(c => c.id === o.customerId)?.name.toLowerCase().includes(linkOrderSearchQuery.toLowerCase())));
                if (availableOrders.length === 0) {
                  return (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      لا توجد طلبيات متاحة يمكن إضافتها.
                    </div>
                  );
                }
                return availableOrders.map(order => {
                  const customer = customers.find(c => c.id === order.customerId);
                  return (
                    <div key={order.id} className="border border-gray-100 rounded-xl p-3 flex justify-between items-center dark:border-gray-700">
                      <div>
                        <div className="font-bold text-sm text-gray-900 dark:text-white">
                          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-[10px] ml-2 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                            #{order.orderNumber}
                          </span>
                          {customer?.name || "عميل غير معروف"}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {(order.items || []).reduce((acc, item) => acc + item.quantity, 0)} منتجات
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          updateOrder(order.id, { batchId: id });
                          setShowLinkModal(false);
                        }}
                        className="bg-purple-50 text-purple-600 text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 dark:bg-purple-900/30 dark:text-purple-400"
                      >
                        إضافة
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-xl dark:bg-gray-800 dark:shadow-none">
            <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-100 dark:border-gray-700 dark:border-gray-700">
              <h3 className="font-bold text-lg">
                {isAddingNewCustomer
                  ? "إضافة عميل جديد"
                  : "اختيار العميل للطلبية"}
              </h3>
              <button
                onClick={() => {
                  setShowNewOrderModal(false);
                  setIsAddingNewCustomer(false);
                }}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isAddingNewCustomer ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="ابحث عن عميل بالاسم أو الهاتف..."
                    className="w-full pl-3 pr-9 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:bg-gray-900 dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 no-scrollbar">
                  {filteredCustomersForOrder.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 py-6 dark:text-gray-400">
                      العميل غير موجود
                    </div>
                  ) : (
                    filteredCustomersForOrder.map((c) => (
                      <button
                         key={c.id}
                        onClick={() => handleSelectCustomer(c.id)}
                        className="w-full text-right p-3 bg-white border border-gray-100 rounded-xl hover:bg-purple-50 hover:border-purple-200 active:scale-95 transition-all flex justify-between items-center shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
                      >
                        <span className="font-bold text-gray-900 text-sm dark:text-white">
                          {c.name}
                        </span>
                        {c.phone && (
                          <span
                            className="text-xs text-gray-500 font-mono tracking-wider flex items-center gap-1.5 dark:text-gray-400"
                            dir="ltr"
                          >
                            <Phone className="w-3 h-3" /> {c.phone}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setIsAddingNewCustomer(true)}
                    className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md dark:shadow-none dark:bg-purple-600 dark:hover:bg-purple-700"
                  >
                    <UserPlus className="w-4 h-4" /> عميل جديد غير مسجل بالتطبيق
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="اسم العميل (إلزامي)"
                    value={newCustomerForm.name}
                    onChange={(e) =>
                      setNewCustomerForm({
                        ...newCustomerForm,
                        name: e.target.value,
                      })
                    }
                    className="w-2/3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:bg-gray-900 dark:border-gray-600 dark:bg-gray-800"
                  />
                  <input
                    type="tel"
                    placeholder="رقم الهاتف"
                    value={newCustomerForm.phone}
                    onChange={(e) =>
                      setNewCustomerForm({
                        ...newCustomerForm,
                        phone: e.target.value,
                      })
                    }
                    className="w-1/3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none dir-rtl dark:bg-gray-900 dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50 transition-all dark:border-gray-700 dark:bg-gray-900 dark:bg-gray-800">
                  <button
                    onClick={() => setShowExtraFields(!showExtraFields)}
                    className="w-full flex items-center justify-between p-3 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <span>تفاصيل إضافية (العنوان والملاحظات)</span>
                    {showExtraFields ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {showExtraFields && (
                    <div className="p-3 border-t border-gray-100 space-y-3 bg-white dark:border-gray-700 dark:border-gray-700 dark:bg-gray-800">
                      <input
                        type="text"
                        placeholder="(العنوان/المنطقة)"
                        value={newCustomerForm.address}
                        onChange={(e) =>
                          setNewCustomerForm({
                            ...newCustomerForm,
                            address: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:bg-gray-900 dark:border-gray-600 dark:bg-gray-800"
                      />
                      <input
                        type="text"
                        placeholder="(ملاحظات حول العميل)"
                        value={newCustomerForm.notes}
                        onChange={(e) =>
                          setNewCustomerForm({
                            ...newCustomerForm,
                            notes: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:bg-gray-900 dark:border-gray-600 dark:bg-gray-800"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleCreateCustomerAndOrder}
                    disabled={!newCustomerForm.name}
                    className="flex-1 bg-purple-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-opacity dark:shadow-none"
                  >
                    إضافة عميل وتكوين الطلبية
                  </button>
                  <button
                    onClick={() => setIsAddingNewCustomer(false)}
                    className="flex-none px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    رجوع
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Batch Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl dark:bg-gray-800 dark:shadow-none">
            <h3 className="font-bold text-lg text-gray-900 mb-3 dark:text-white">حذف السلة</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed dark:text-gray-300">
              هل أنت متأكد من رغبتك في حذف هذه السلة؟ لا يمكن التراجع عن هذا الإجراء.
            </p>

            <label className="flex items-center gap-3 p-3 mb-6 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-800">
              <input
                type="checkbox"
                checked={deleteAssociatedOrders}
                onChange={(e) => setDeleteAssociatedOrders(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 bg-white cursor-pointer"
              />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">حذف الطلبيات المرتبطة أيضاً</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-colors dark:shadow-none"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-none px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
