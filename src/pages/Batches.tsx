import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore, useSettingsStore, useBatchesFilterStore } from "../store";
import { Plus, ShoppingCart, Search, Filter, SortDesc, LayoutList, CheckCheck, Check, Link2, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { STATUS_LABELS, STATUS_COLORS, OrderStatus } from "../types";
import { ar } from "date-fns/locale";
import clsx from "clsx";
import { SortOptionBatches } from "../store";

export default function Batches() {
  const batches = useStore((state) => state.batches);
  const orders = useStore((state) => state.orders);
  const customers = useStore((state) => state.customers);
  const addBatch = useStore((state) => state.addBatch);
  const navigate = useNavigate();
  const currencySymbol = useSettingsStore((state) => state.currencySymbol);

  const searchQuery = useBatchesFilterStore((state) => state.searchQuery);
  const setSearchQuery = useBatchesFilterStore((state) => state.setSearchQuery);
  const selectedStatus = useBatchesFilterStore((state) => state.selectedStatus);
  const setSelectedStatus = useBatchesFilterStore((state) => state.setSelectedStatus);
  const sortOption = useBatchesFilterStore((state) => state.sortOption);
  const setSortOption = useBatchesFilterStore((state) => state.setSortOption);

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedStatusesMult, setSelectedStatusesMult] = useState<OrderStatus[]>(["PENDING", "ORDERED", "RECEIVED", "SHIPPING"]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const dropdownsContainerRef = React.useRef<HTMLDivElement>(null);
  const [selectedBatchOrders, setSelectedBatchOrders] = useState<any | null>(null);
  const [selectedBatchCustomers, setSelectedBatchCustomers] = useState<any | null>(null);
  const [copiedBatchLinkId, setCopiedBatchLinkId] = useState<string | null>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownsContainerRef.current &&
        !dropdownsContainerRef.current.contains(event.target as Node)
      ) {
        setShowFilters(false);
        setShowSortDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCreate = () => {
    const id = addBatch();
    navigate(`/batch/${id}`);
  };

  const toggleMultiselectStatus = (status: OrderStatus) => {
    setSelectedStatusesMult(
      selectedStatusesMult.includes(status)
        ? selectedStatusesMult.filter((s) => s !== status)
        : [...selectedStatusesMult, status],
    );
  };

  const batchesWithStats = useMemo(() => {
    let filteredBatches = batches;
    
    // Status Filter
    if (isMultiSelectMode) {
      filteredBatches = filteredBatches.filter(b => selectedStatusesMult.includes(b.status));
    } else {
      if (selectedStatus === "ACTIVE") {
        filteredBatches = filteredBatches.filter(b => b.status !== "DELIVERED");
      } else if (selectedStatus !== "ALL") {
        filteredBatches = filteredBatches.filter(b => b.status === selectedStatus);
      }
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredBatches = filteredBatches.filter(b => {
        const batchOrders = orders.filter(o => o.batchId === b.id);
        const batchCustomerIds = batchOrders.map(o => o.customerId);
        const batchCustomers = customers.filter(c => batchCustomerIds.includes(c.id));
        const customerNameMatch = batchCustomers.some(c => c.name.toLowerCase().includes(q));

        return b.batchNumber?.toLowerCase().includes(q) ||
          (b.trackingNumber && b.trackingNumber.toLowerCase().includes(q)) ||
          customerNameMatch;
      });
    }

    let mapped = filteredBatches.map(batch => {
      const batchOrders = orders.filter(o => o.batchId === batch.id);
      let totalCost = (batch.bankFees || 0) + (batch.shippingFees || 0) + (batch.transportFees || 0);
      let totalCustomers = new Set(batchOrders.map(o => o.customerId)).size;
      let itemsCount = 0;

      batchOrders.forEach(o => {
        o.items.forEach(i => {
          totalCost += (i.price * i.quantity);
          itemsCount += i.quantity;
        });
        totalCost += (o.shippingFee || 0);
      });

      return {
        ...batch,
        totalCost,
        totalCustomers,
        itemsCount,
        ordersCount: batchOrders.length
      };
    });

    // Sorting
    switch (sortOption) {
      case "NEWEST":
        mapped.sort((a, b) => (b.dates?.created || 0) - (a.dates?.created || 0));
        break;
      case "OLDEST":
        mapped.sort((a, b) => (a.dates?.created || 0) - (b.dates?.created || 0));
        break;
      case "MOST_ORDERS":
        mapped.sort((a, b) => b.ordersCount - a.ordersCount);
        break;
      case "LEAST_ORDERS":
        mapped.sort((a, b) => a.ordersCount - b.ordersCount);
        break;
      case "HIGHEST_COST":
        mapped.sort((a, b) => b.totalCost - a.totalCost);
        break;
      case "LOWEST_COST":
        mapped.sort((a, b) => a.totalCost - b.totalCost);
        break;
    }

    return mapped;
  }, [batches, orders, searchQuery, selectedStatus, sortOption]);

  return (
    <div className="p-4 space-y-3 min-h-full pb-24 dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-1 sm:gap-2 dark:text-white">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span className="truncate">إدارة السلات والشحنات</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 dark:text-gray-400 truncate">
            لديك {batches.filter(b => b.status !== "DELIVERED").length} سلة مفتوحة
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex-shrink-0 whitespace-nowrap bg-gray-900 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1 active:scale-95 transition-transform shadow-md dark:shadow-none dark:bg-purple-600 dark:hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" /> سلة جديدة
        </button>
      </div>

      <div className="flex items-center gap-2 relative mb-4" ref={dropdownsContainerRef}>
        <div className="relative flex-1 cursor-text">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث برقم السلة، العميل، التتبع"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
        
        <div className="relative">
          <button
            onClick={() => { setShowSortDropdown(!showSortDropdown); setShowFilters(false); }}
            className={`p-2 rounded-xl border transition-colors relative ${
              sortOption !== "NEWEST"
                ? "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400"
                : "bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            }`}
            title="تغيير الترتيب"
          >
            <SortDesc className="w-5 h-5" />
            {sortOption !== "NEWEST" && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full border border-white"></div>
            )}
          </button>

          {/* Sort Dropdown Popup */}
          {showSortDropdown && (
            <div className="absolute top-12 left-0 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2 dark:bg-gray-800 dark:border-gray-600 dark:shadow-none">
              <div className="px-4 py-2 border-b border-gray-100 mb-1 dark:border-gray-700">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                  ترتيب السلات
                </span>
              </div>
              {[
                { id: "NEWEST", label: "الأحدث إضافة" },
                { id: "OLDEST", label: "الأقدم إضافة" },
                { id: "MOST_ORDERS", label: "الأكثر طلبيات" },
                { id: "LEAST_ORDERS", label: "الأقل طلبيات" },
                { id: "HIGHEST_COST", label: "الأعلى تكلفة" },
                { id: "LOWEST_COST", label: "الأقل تكلفة" },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setSortOption(option.id as SortOptionBatches);
                    setShowSortDropdown(false);
                  }}
                  className={clsx(
                    "w-full text-right px-4 py-2 text-sm sm:text-base flex items-center gap-2",
                    sortOption === option.id
                      ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-bold"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50",
                  )}
                >
                  <div className="flex items-center flex-1">
                    {sortOption === option.id && <Check className="w-4 h-4 ml-auto block" />}
                    <span className={clsx(sortOption === option.id ? "ml-4" : "")}>{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="relative">
          <button
            onClick={() => { setShowFilters(!showFilters); setShowSortDropdown(false); }}
            className={clsx(
              "p-2 rounded-xl border transition-colors relative",
              (
                isMultiSelectMode
                  ? selectedStatusesMult.length < 5
                  : selectedStatus !== "ACTIVE"
              )
                ? "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400"
                : "bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300",
            )}
            title="تصفية حسب الحالة"
          >
            <Filter className="w-5 h-5" />
            {isMultiSelectMode ? (
              selectedStatusesMult.length < 5 && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full border border-white"></div>
              )
            ) : (
              selectedStatus !== "ACTIVE" && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full border border-white"></div>
              )
            )}
          </button>
          {/* Filters Dropdown Popup */}
          {showFilters && (
            <div className="absolute top-12 left-0 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2 dark:bg-gray-800 dark:border-gray-600 dark:shadow-none">
              <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center mb-1 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  تصفية بالحالة
                </span>
                <button
                  onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                  className={clsx(
                    "text-xs font-bold flex items-center gap-1 px-2 py-1 rounded transition-colors",
                    isMultiSelectMode
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
                  )}
                >
                  <LayoutList className="w-3 h-3" /> متعدد
                </button>
              </div>

              <div className="px-3 pb-2 mb-2 border-b border-gray-50 flex justify-between text-[11px] font-bold dark:border-gray-700">
                <button
                  onClick={() => {
                    if (isMultiSelectMode)
                      setSelectedStatusesMult([
                        "PENDING",
                        "ORDERED",
                        "RECEIVED",
                        "SHIPPING",
                        "DELIVERED",
                      ]);
                    else setSelectedStatus("ALL");
                    setShowFilters(false);
                  }}
                  className={`px-2 py-1 transition-colors rounded hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    !isMultiSelectMode && selectedStatus === "ALL"
                      ? "text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  عرض الكل
                </button>
                <button
                  onClick={() => {
                    if (isMultiSelectMode)
                      setSelectedStatusesMult([
                        "PENDING",
                        "ORDERED",
                        "RECEIVED",
                        "SHIPPING",
                      ]);
                    else setSelectedStatus("ACTIVE");
                    setShowFilters(false);
                  }}
                  className={`px-2 py-1 transition-colors rounded hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    (!isMultiSelectMode && selectedStatus === "ACTIVE") ||
                    (isMultiSelectMode &&
                      selectedStatusesMult.length === 4 &&
                      !selectedStatusesMult.includes("DELIVERED"))
                      ? "text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  نشط
                </button>
              </div>

              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const status = key as OrderStatus;
                const isSelected = isMultiSelectMode
                  ? selectedStatusesMult.includes(status)
                  : selectedStatus === status;
                
                return (
                  <button
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isMultiSelectMode) {
                        toggleMultiselectStatus(status);
                      } else {
                        setSelectedStatus(status);
                        setShowFilters(false);
                      }
                    }}
                    className="w-full text-right px-4 py-2 hover:bg-gray-50 text-sm sm:text-base flex items-center gap-3 transition-colors outline-none dark:hover:bg-gray-700"
                  >
                    {isMultiSelectMode ? (
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-purple-600 border-purple-600 dark:bg-purple-500 dark:border-purple-500"
                            : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
                        }`}
                      >
                        {isSelected && <CheckCheck className="w-3 h-3 text-white" />}
                      </div>
                    ) : (
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "border-purple-600 bg-purple-600 dark:border-purple-500 dark:bg-purple-500"
                            : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full dark:bg-gray-800" />
                        )}
                      </div>
                    )}
                    <span
                      className={`transition-colors ${
                        isSelected
                          ? "text-purple-700 font-bold dark:text-purple-400"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Batches List */ }
      <div className="space-y-3">
        {batchesWithStats.length === 0 ? (
          <div className="text-center py-16 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:shadow-none">
            <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-4 dark:text-gray-600" />
            <p>لا توجد سلات حالياً.</p>
          </div>
        ) : (
          batchesWithStats.map((batch) => (
            <div
              key={batch.id}
              onClick={() => navigate(`/batch/${batch.id}`)}
              className="block cursor-pointer bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.99] transition-transform dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold dark:bg-purple-900/30 dark:text-purple-400">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {batch.batchNumber}
                      {batch.couponEnabled && batch.couponCode && (
                         <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 font-mono dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700 flex items-center gap-0.5">
                           <span dir="ltr">{batch.couponCode}</span>
                           <span>{batch.couponType === 'percentage' ? '%' : currencySymbol}</span>
                         </span>
                      )}
                    </h3>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-md font-bold border ${STATUS_COLORS[batch.status]}`}
                >
                  {STATUS_LABELS[batch.status]}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t pt-3 dark:border-gray-700">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedBatchOrders(batch);
                  }}
                  className="text-center bg-gray-50 hover:bg-gray-100 p-2 rounded-lg cursor-pointer transition-colors dark:bg-gray-900 border border-transparent dark:hover:bg-gray-800 dark:border-gray-700"
                >
                  <span className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">الطلبات</span>
                  <span className="font-bold text-gray-800 text-sm dark:text-gray-200">{batch.ordersCount}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedBatchCustomers(batch);
                  }}
                  className="text-center bg-gray-50 hover:bg-gray-100 p-2 rounded-lg cursor-pointer transition-colors dark:bg-gray-900 border border-transparent dark:hover:bg-gray-800 dark:border-gray-700"
                >
                  <span className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">العملاء</span>
                  <span className="font-bold text-gray-800 text-sm dark:text-gray-200">{batch.totalCustomers}</span>
                </button>
                <div className="text-center bg-gray-50 p-2 rounded-lg dark:bg-gray-900">
                  <span className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">التكلفة التقريبية</span>
                  <span className="font-bold text-gray-800 text-sm dark:text-gray-200">
                    {batch.totalCost.toFixed(2)} <span className="text-[10px] font-normal text-gray-500">{currencySymbol}</span>
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                <span className="text-[10px] text-gray-400">
                  {batch.dates?.created ? format(batch.dates.created, "yyyy/MM/dd") : "تاريخ غير متوفر"}
                </span>
                {batch.batchUrl && (
                  <div className="flex items-center rtl:flex-row-reverse border border-blue-100 rounded bg-blue-50/50 shadow-sm overflow-hidden text-right h-5 dark:border-blue-900/50 dark:bg-blue-900/20 dark:shadow-none" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigator.clipboard.writeText(batch.batchUrl!);
                        setCopiedBatchLinkId(batch.id);
                        setTimeout(() => setCopiedBatchLinkId(null), 1500);
                      }}
                      className={clsx(
                        "px-1.5 py-0.5 transition-colors border-r border-blue-100 dark:border-blue-900/50 flex items-center justify-center h-full",
                        copiedBatchLinkId === batch.id
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "text-blue-500 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/50 dark:hover:text-blue-300"
                      )}
                      title="نسخ الرابط"
                    >
                      {copiedBatchLinkId === batch.id ? (
                        <Check className="w-2.5 h-2.5" />
                      ) : (
                        <Copy className="w-2.5 h-2.5" />
                      )}
                    </button>
                    <a
                      href={batch.batchUrl.startsWith('http') ? batch.batchUrl : `https://${batch.batchUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:bg-blue-100/50 px-1.5 flex items-center gap-1 text-[9px] font-bold h-full dark:text-blue-400 dark:hover:bg-blue-900/30"
                      title="فتح الرابط"
                    >
                      رابط السلة <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedBatchOrders && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full dark:bg-gray-800 shadow-xl" dir="rtl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">طلبات السلة ({selectedBatchOrders.batchNumber})</h3>
              <button
                onClick={() => setSelectedBatchOrders(null)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {(() => {
                const batchOrders = orders.filter(o => o.batchId === selectedBatchOrders.id);
                if (batchOrders.length === 0) {
                  return (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      لا توجد طلبات في هذه السلة حتى الآن.
                    </div>
                  );
                }
                return batchOrders.map(order => {
                  const customer = customers.find(c => c.id === order.customerId);
                  const orderTotalItems = (order.items || []).reduce((acc, item) => acc + (item.price * item.quantity), 0);
                  const orderTotal = orderTotalItems + (order.shippingFee || 0) + (order.serviceFee || 0) + (order.additionalFees || 0) - (order.discount || 0);
                  
                  return (
                    <Link
                      key={order.id}
                      to={`/order/${order.id}`}
                      className="block bg-gray-50 border border-gray-100 p-3 rounded-xl dark:bg-gray-900/50 dark:border-gray-700 active:scale-95 transition-transform"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                            #{order.orderNumber}
                          </span>
                          <div className="flex bg-white border border-gray-100 rounded-md overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                             <span className="px-1.5 py-0.5 text-[10px] text-gray-500 border-l border-gray-100 dark:border-gray-700 flex items-center gap-1">
                               {(order.items || []).length} منتجات
                             </span>
                             <span className="px-1.5 py-0.5 text-[10px] text-gray-500 flex items-center gap-1">
                               {(order.items || []).reduce((acc, item) => acc + item.quantity, 0)} قطع
                             </span>
                          </div>
                        </div>
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          {orderTotal.toFixed(2)} <span className="text-[10px] text-gray-500 font-normal">{currencySymbol}</span>
                        </span>
                      </div>
                      <div className="text-xs text-gray-700 font-bold dark:text-gray-300">
                        {customer?.name || 'عميل غير معروف'}
                      </div>
                      {(order.discount || order.additionalFees || order.shippingFee) ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(order.discount || 0) > 0 && (
                            <div className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded px-1.5 py-0.5 dark:text-red-400 dark:bg-red-900/30 dark:border-red-900/50">
                              خصم: {order.discount} {currencySymbol}
                            </div>
                          )}
                          {(order.additionalFees || 0) > 0 && (
                            <div className="text-[10px] text-orange-600 bg-orange-50 border border-orange-100 rounded px-1.5 py-0.5 dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-900/50">
                              رسوم إضافية: {order.additionalFees} {currencySymbol}
                            </div>
                          )}
                          {(order.shippingFee || 0) > 0 && (
                            <div className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-900/50">
                              شحن: {order.shippingFee} {currencySymbol}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </Link>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {selectedBatchCustomers && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full dark:bg-gray-800 shadow-xl" dir="rtl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">عملاء السلة ({selectedBatchCustomers.batchNumber})</h3>
              <button
                onClick={() => setSelectedBatchCustomers(null)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {(() => {
                const batchOrders = orders.filter(o => o.batchId === selectedBatchCustomers.id);
                if (batchOrders.length === 0) {
                  return (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      لا يوجد عملاء مرتبطين بهذه السلة.
                    </div>
                  );
                }
                
                // Group by customer
                let grouped: Record<string, { customer: any, orders: typeof batchOrders }> = {};
                batchOrders.forEach(o => {
                  const custKey = o.customerId || 'unknown';
                  if (!grouped[custKey]) {
                    grouped[custKey] = { customer: customers.find(c => c.id === o.customerId), orders: [] };
                  }
                  grouped[custKey].orders.push(o);
                });

                return Object.values(grouped).map(group => {
                  return (
                    <div key={group.customer?.id || 'unknown'} className="block bg-gray-50 border border-gray-100 p-3 rounded-xl dark:bg-gray-900/50 dark:border-gray-700">
                      <div className="font-bold text-sm text-gray-900 dark:text-white mb-2">
                         {group.customer?.name || "عميل غير معروف"}
                      </div>
                      <div className="space-y-1">
                        {group.orders.map(order => {
                          const orderTotalItems = (order.items || []).reduce((acc, item) => acc + (item.price * item.quantity), 0);
                          const orderTotal = orderTotalItems + (order.shippingFee || 0) + (order.serviceFee || 0) + (order.additionalFees || 0) - (order.discount || 0);
                          return (
                            <Link key={order.id} to={`/order/${order.id}`} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 active:scale-95 transition-transform dark:bg-gray-800 dark:border-gray-700">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-600">
                                  #{order.orderNumber}
                                </span>
                                <div className="flex bg-gray-50 border border-gray-100 rounded-md overflow-hidden dark:bg-gray-900 dark:border-gray-700">
                                  <span className="px-1.5 py-0.5 text-[10px] text-gray-500 border-l border-gray-100 dark:border-gray-700 flex items-center gap-1">
                                    {(order.items || []).length} منتجات
                                  </span>
                                  <span className="px-1.5 py-0.5 text-[10px] text-gray-500 flex items-center gap-1">
                                    {(order.items || []).reduce((acc, item) => acc + item.quantity, 0)} قطع
                                  </span>
                                </div>
                              </div>
                              <span className="font-bold text-xs text-gray-900 dark:text-white">
                                {orderTotal.toFixed(2)} <span className="text-[10px] text-gray-500 font-normal">{currencySymbol}</span>
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
