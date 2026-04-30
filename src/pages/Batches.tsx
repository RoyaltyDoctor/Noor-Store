import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore, useBatchesFilterStore } from "../store";
import { Plus, ShoppingCart, Search, Filter, SortDesc, LayoutList, CheckCheck, Check } from "lucide-react";
import { format } from "date-fns";
import { STATUS_LABELS, STATUS_COLORS, OrderStatus } from "../types";
import { ar } from "date-fns/locale";
import clsx from "clsx";
import { SortOptionBatches } from "../store";

export default function Batches() {
  const batches = useStore((state) => state.batches);
  const orders = useStore((state) => state.orders);
  const addBatch = useStore((state) => state.addBatch);
  const navigate = useNavigate();

  const {
    searchQuery,
    setSearchQuery,
    selectedStatus,
    setSelectedStatus,
    sortOption,
    setSortOption,
  } = useBatchesFilterStore();

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedStatusesMult, setSelectedStatusesMult] = useState<OrderStatus[]>(["PENDING", "ORDERED", "RECEIVED", "SHIPPING"]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const dropdownsContainerRef = React.useRef<HTMLDivElement>(null);

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
      filteredBatches = filteredBatches.filter(b => 
        b.batchNumber?.toLowerCase().includes(q) ||
        (b.couponCode && b.couponCode.toLowerCase().includes(q)) ||
        (b.trackingNumber && b.trackingNumber.toLowerCase().includes(q))
      );
    }

    let mapped = filteredBatches.map(batch => {
      const batchOrders = orders.filter(o => o.batchId === batch.id);
      let totalCost = batch.bankFees || 0;
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
            placeholder="بحث برقم السلة أو الكوبون أو رقم التتبع..."
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
            <div className="absolute top-12 left-12 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2 dark:bg-gray-800 dark:border-gray-600 dark:shadow-none">
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
                    className="w-full text-right px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-3 transition-colors outline-none dark:hover:bg-gray-700"
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
            <Link
              key={batch.id}
              to={`/batch/${batch.id}`}
              className="block bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.99] transition-transform dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
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
                         <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 font-mono dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700">
                           {batch.couponCode}
                         </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {batch.dates?.created ? format(batch.dates.created, "dd MMM yyyy, p", { locale: ar }) : "تاريخ غير متوفر"}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-md font-bold border ${STATUS_COLORS[batch.status]}`}
                >
                  {STATUS_LABELS[batch.status]}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t pt-3 dark:border-gray-700">
                <div className="text-center bg-gray-50 p-2 rounded-lg dark:bg-gray-900">
                  <span className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">الطلبات</span>
                  <span className="font-bold text-gray-800 text-sm dark:text-gray-200">{batch.ordersCount}</span>
                </div>
                <div className="text-center bg-gray-50 p-2 rounded-lg dark:bg-gray-900">
                  <span className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">العملاء</span>
                  <span className="font-bold text-gray-800 text-sm dark:text-gray-200">{batch.totalCustomers}</span>
                </div>
                <div className="text-center bg-gray-50 p-2 rounded-lg dark:bg-gray-900">
                  <span className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">التكلفة التقريبية</span>
                  <span className="font-bold text-gray-800 text-sm dark:text-gray-200">
                    <span className="text-[10px] ml-0.5">₪</span>
                    {batch.totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
