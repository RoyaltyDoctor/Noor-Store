import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useStore, useFilterStore, DateFilterType } from "../store";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Phone,
  Package,
  ChevronLeft,
  X,
  UserPlus,
  CheckSquare,
  Square,
  Check,
  LayoutList,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  SortDesc,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, OrderStatus, Order } from "../types";
import clsx from "clsx";
import {
  format,
  isToday,
  isThisWeek,
  isThisMonth,
  startOfDay,
  endOfDay,
} from "date-fns";
import { TextFitter } from "../components/TextFitter";

export default function Home() {
  const { orders, customers, batches, addOrder, addCustomer } = useStore();
  const {
    searchQuery,
    setSearchQuery,
    isMultiSelectMode,
    setIsMultiSelectMode,
    selectedStatus,
    setSelectedStatus,
    selectedStatusesMult,
    setSelectedStatusesMult,
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    scrollPosition,
    setScrollPosition,
    sortOption,
    setSortOption,
  } = useFilterStore();

  const navigate = useNavigate();

  const scrollRestored = React.useRef(false);

  useEffect(() => {
    const container = document.getElementById("main-scroll-container");
    if (!container) return;

    // Restore scroll position slightly after render to ensure content is painted
    if (!scrollRestored.current) {
      requestAnimationFrame(() => {
        container.scrollTo(0, scrollPosition);
        scrollRestored.current = true;
      });
    }

    let timeoutId: any;
    const handleScroll = () => {
      // Throttle state update
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setScrollPosition(container.scrollTop);
      }, 100);
    };

    // Add scroll event listener to constantly track position in case user uses browser back button
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []); // Empty dependencies to mount once

  const handleNavigateToOrder = (id: string) => {
    navigate(`/order/${id}`);
  };

  // Local dropdown visibility state
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const dropdownsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownsContainerRef.current &&
        !dropdownsContainerRef.current.contains(event.target as Node)
      ) {
        setShowFilterDropdown(false);
        setShowDateDropdown(false);
        setShowSortDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [showExtraFields, setShowExtraFields] = useState(false);

  const [itemsModalOrder, setItemsModalOrder] = useState<Order | null>(null);

  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const filtered = orders.filter((o) => {
      // Date filter
      if (dateFilter !== "ALL") {
        const timestamp =
          o.dates?.created || (o as any).createdAt || Date.now();
        const orderDate = new Date(timestamp);

        if (isNaN(orderDate.getTime())) return false; // Guard for invalid dates

        if (dateFilter === "TODAY" && !isToday(orderDate)) return false;
        if (
          dateFilter === "THIS_WEEK" &&
          !isThisWeek(orderDate, { weekStartsOn: 6 })
        )
          return false; // weekStartsOn: 6 (Saturday) is common in Middle East
        if (dateFilter === "THIS_MONTH" && !isThisMonth(orderDate))
          return false;
        if (dateFilter === "CUSTOM") {
          if (customStartDate) {
            const [y, m, d] = customStartDate.split("-").map(Number);
            const start = new Date(y, m - 1, d, 0, 0, 0);
            if (orderDate.getTime() < start.getTime()) return false;
          }
          if (customEndDate) {
            const [y, m, d] = customEndDate.split("-").map(Number);
            const end = new Date(y, m - 1, d, 23, 59, 59, 999);
            if (orderDate.getTime() > end.getTime()) return false;
          }
        }
      }

      // Status filter
      if (isMultiSelectMode) {
        if (!selectedStatusesMult.includes(o.status)) return false;
      } else {
        if (selectedStatus === "ACTIVE" && o.status === "DELIVERED")
          return false;
        if (
          selectedStatus !== "ALL" &&
          selectedStatus !== "ACTIVE" &&
          o.status !== selectedStatus
        )
          return false;
      }

      // Search Match
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const customer = customers.find((c) => c.id === o.customerId);
      const customerMatch =
        customer?.name?.toLowerCase().includes(q) ||
        customer?.phone?.includes(q);
      const orderNumMatch = o.orderNumber?.includes(q);
      const trackingMatch = o.trackingNumber?.toLowerCase().includes(q);

      return customerMatch || orderNumMatch || trackingMatch;
    });

    // Sorting
    switch (sortOption) {
      case "NEWEST":
        filtered.sort((a, b) => (b.dates?.created || 0) - (a.dates?.created || 0));
        break;
      case "OLDEST":
        filtered.sort((a, b) => (a.dates?.created || 0) - (b.dates?.created || 0));
        break;
      case "HIGHEST_PRICE":
        filtered.sort((a, b) => {
          const totalA = (a.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0) + (a.serviceFee || 0) + (a.shippingFee || 0);
          const totalB = (b.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0) + (b.serviceFee || 0) + (b.shippingFee || 0);
          return totalB - totalA;
        });
        break;
      case "LOWEST_PRICE":
        filtered.sort((a, b) => {
          const totalA = (a.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0) + (a.serviceFee || 0) + (a.shippingFee || 0);
          const totalB = (b.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0) + (b.serviceFee || 0) + (b.shippingFee || 0);
          return totalA - totalB;
        });
        break;
    }

    return filtered;
  }, [
    orders,
    isMultiSelectMode,
    selectedStatusesMult,
    selectedStatus,
    searchQuery,
    customers,
    dateFilter,
    customStartDate,
    customEndDate,
    sortOption,
  ]);

  const filteredCustomersForOrder = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name?.includes(customerSearch) || (c.phone && c.phone.includes(customerSearch)),
    );
  }, [customers, customerSearch]);

  const handleSelectCustomer = (cid: string) => {
    const oid = addOrder(cid);
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
    navigate(`/order/${oid}`);
    setShowNewOrderModal(false);
  };

  const toggleMultiselectStatus = (status: OrderStatus) => {
    setSelectedStatusesMult(
      selectedStatusesMult.includes(status)
        ? selectedStatusesMult.filter((s) => s !== status)
        : [...selectedStatusesMult, status],
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
    <div className="p-4 space-y-3 pb-24 min-h-full dark:bg-gray-900" dir="rtl">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-1 sm:gap-2 dark:text-white">
            <span className="truncate">مرحباً نور 👋</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 dark:text-gray-400 truncate">
            لديك {orders.filter((o) => o.status !== "DELIVERED").length} طلبية قيد التنفيذ
          </p>
        </div>
        <button
          onClick={() => {
            setShowNewOrderModal(true);
            setIsAddingNewCustomer(false);
            setCustomerSearch("");
          }}
          className="flex-shrink-0 whitespace-nowrap bg-gray-900 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1 active:scale-95 transition-transform shadow-md dark:shadow-none dark:bg-purple-600 dark:hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" /> طلبية جديدة
        </button>
      </div>

      <div
        className="flex items-center gap-2 relative mb-4"
        ref={dropdownsContainerRef}
      >
        <div className="relative flex-1 cursor-text">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الطلبية، العميل، التتبع..."
            className="w-full pl-3 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-400 dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => { setShowSortDropdown(!showSortDropdown); setShowDateDropdown(false); setShowFilterDropdown(false); }}
            className={clsx(
              "p-2 rounded-xl border transition-colors relative",
              sortOption !== "NEWEST"
                ? "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400"
                : "bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300",
            )}
            title="تغيير الترتيب"
          >
            <SortDesc className="w-5 h-5" />
            {sortOption !== "NEWEST" && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full border border-white dark:border-gray-900"></div>
            )}
          </button>

          {showSortDropdown && (
            <div className="absolute top-12 left-0 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2 dark:bg-gray-800 dark:border-gray-700 dark:shadow-none">
              <div className="px-4 py-2 border-b border-gray-100 mb-1 dark:border-gray-700">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                  ترتيب حسب
                </span>
              </div>
              {[
                { id: "NEWEST", label: "الأحدث أولاً" },
                { id: "OLDEST", label: "الأقدم أولاً" },
                { id: "HIGHEST_PRICE", label: "الأعلى سعراً" },
                { id: "LOWEST_PRICE", label: "الأقل سعراً" },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setSortOption(option.id as any);
                    setShowSortDropdown(false);
                  }}
                  className={clsx(
                    "w-full text-right px-4 py-2 text-sm sm:text-base flex items-center gap-2",
                    sortOption === option.id
                      ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-bold"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50",
                  )}
                >
                  {sortOption === option.id && <Check className="w-4 h-4 ml-auto block" />}
                  <span className={sortOption === option.id ? "ml-4" : ""}>{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => { setShowDateDropdown(!showDateDropdown); setShowFilterDropdown(false); setShowSortDropdown(false); }}
            className={clsx(
              "p-2 rounded-xl border transition-colors relative",
              dateFilter !== "ALL"
                ? "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400"
                : "bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300",
            )}
            title="تصفية حسب التاريخ"
          >
            <CalendarDays className="w-5 h-5" />
            {dateFilter !== "ALL" && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full border border-white dark:border-gray-900"></div>
            )}
          </button>
          
          {showDateDropdown && (
            <div className="absolute top-12 left-0 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2 dark:bg-gray-800 dark:border-gray-600 dark:shadow-none">
              <div className="px-4 py-2 border-b border-gray-100 mb-1 dark:border-gray-700 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                تاريخ الطلبية
                </span>
              </div>

              {[
                { id: "ALL", label: "الكل" },
                { id: "TODAY", label: "اليوم" },
                { id: "THIS_WEEK", label: "هذا الأسبوع" },
                { id: "THIS_MONTH", label: "هذا الشهر" },
                { id: "CUSTOM", label: "فترة محددة..." },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => {
                    setDateFilter(filter.id as DateFilterType);
                    setShowDateDropdown(false);
                  }}
                  className={clsx(
                    "w-full text-right px-3 py-2 text-xs sm:text-sm flex items-center gap-2 transition-colors outline-none",
                    dateFilter === filter.id
                      ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-bold"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                  )}
                >
                  <div className="flex items-center flex-1">
                    {dateFilter === filter.id && <Check className="w-4 h-4 ml-auto block" />}
                    <span className={clsx(dateFilter === filter.id ? "ml-4" : "")}>{filter.label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowDateDropdown(false); setShowSortDropdown(false); }}
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
          >
            <Filter className="w-5 h-5" />
          </button>

          {showFilterDropdown && (
            <div className="absolute top-12 left-0 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2 dark:bg-gray-800 dark:border-gray-600 dark:shadow-none">
              <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center mb-1 dark:border-gray-700 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                طريقة الفلترة
                </span>
                <button
                  onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                  className={clsx(
                    "text-xs font-bold flex items-center gap-1 px-2 py-1 rounded transition-colors",
                    isMultiSelectMode
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-600",
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
                    else {
                      setSelectedStatus("ALL");
                      setShowFilterDropdown(false);
                    }
                  }}
                  className={clsx(
                    "px-2 py-1 transition-colors rounded hover:bg-gray-50 dark:hover:bg-gray-700/50",
                    (
                      isMultiSelectMode
                        ? selectedStatusesMult.length === 5
                        : selectedStatus === "ALL"
                    )
                      ? "text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400"
                      : "text-gray-500 dark:text-gray-400",
                  )}
                >
                  {isMultiSelectMode ? "تحديد الكل" : "عرض الكل"}
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
                    else {
                      setSelectedStatus("ACTIVE");
                      setShowFilterDropdown(false);
                    }
                  }}
                  className={clsx(
                    "px-2 py-1 transition-colors rounded hover:bg-gray-50 dark:hover:bg-gray-700/50",
                    (
                      isMultiSelectMode
                        ? selectedStatusesMult.length === 4 &&
                          !selectedStatusesMult.includes("DELIVERED")
                        : selectedStatus === "ACTIVE"
                    )
                      ? "text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400"
                      : "text-gray-500 dark:text-gray-400",
                  )}
                >
                  قيد التنفيذ
                </button>
              </div>

              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const isSelected = isMultiSelectMode
                  ? selectedStatusesMult.includes(key as OrderStatus)
                  : selectedStatus === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isMultiSelectMode)
                        toggleMultiselectStatus(key as OrderStatus);
                      else {
                        setSelectedStatus(key as OrderStatus);
                        setShowFilterDropdown(false);
                      }
                    }}
                    className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm flex items-center gap-3 transition-colors outline-none"
                  >
                    {isMultiSelectMode ? (
                      isSelected ? (
                        <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-300 dark:text-gray-500" />
                      )
                    ) : (
                      <div
                        className={clsx(
                          "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                          isSelected
                            ? "border-purple-600 bg-purple-600"
                            : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800",
                        )}
                      >
                        {isSelected && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full dark:bg-gray-800" />
                        )}
                      </div>
                    )}
                    <span
                      className={clsx(
                        "transition-colors",
                        isSelected
                          ? "text-purple-700 font-bold dark:text-purple-300"
                          : "text-gray-700 dark:text-gray-300",
                      )}
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

      {dateFilter === "CUSTOM" && (
        <div className="flex gap-2 items-center bg-purple-50 p-3 rounded-xl border border-purple-100 dark:bg-purple-900/30">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-gray-500 block mb-1 dark:text-gray-400">
              من تاريخ
            </label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="w-full text-sm bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-600"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-gray-500 block mb-1 dark:text-gray-400">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="w-full text-sm bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-600"
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>لا توجد طلبيات تطابق بحثك</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const customer = customers.find((c) => c.id === order.customerId);

            const serviceFee = order.serviceFee || 0;
            const shippingFee = order.shippingFee || 0;
            const deposit = order.deposit || 0;

            const itemsTotal = (order.items || []).reduce(
              (sum, item) => sum + item.price * item.quantity,
              0,
            );
            const total = itemsTotal + serviceFee + shippingFee;
            const remaining = total - deposit;
            const itemCount = (order.items || []).reduce(
              (acc, i) => acc + i.quantity,
              0,
            );

            return (
              <div
                key={order.id}
                onClick={() => handleNavigateToOrder(order.id)}
                className="block cursor-pointer bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-transform dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
              >
                <div className="flex justify-between items-start mb-3 gap-3">
                  <div className="min-w-0 flex-1 flex">
                    <TextFitter origin="right">
                      <h3 className="font-bold text-gray-900 leading-tight block dark:text-white">
                        {customer?.name || "عميل غير معروف"}
                      </h3>
                    </TextFitter>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {order.orderNumber && (
                      <button
                        onClick={(e) =>
                          handleCopy(e, order.orderNumber!, order.id)
                        }
                        className={clsx(
                          "text-[10px] font-mono font-bold px-2 py-1 rounded-md border transition-colors whitespace-nowrap",
                          copiedOrderId === order.id
                            ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700",
                        )}
                        title="نسخ رقم الطلبية"
                      >
                        #{order.orderNumber}
                      </button>
                    )}
                    <span
                      className={clsx(
                        "text-xs font-bold px-2 py-1 rounded-md border whitespace-nowrap",
                        STATUS_COLORS[order.status],
                      )}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </div>

                {order.batchId && (
                  <div className="flex items-center gap-1 mb-2">
                     <button 
                       onClick={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         navigate(`/batch/${order.batchId}`);
                       }}
                       className="bg-purple-50 text-purple-700 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold border border-purple-100 hover:bg-purple-100 active:scale-95 transition-all dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
                     >
                       <ShoppingCart className="w-3 h-3" />
                       سلة: {batches.find(b => b.id === order.batchId)?.batchNumber}
                     </button>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3 bg-gray-50 p-2 text-center rounded-xl dark:text-gray-300 dark:bg-gray-900">
                  <div
                    className="flex-1 cursor-pointer hover:bg-gray-200 rounded transition-colors py-1"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setItemsModalOrder(order);
                    }}
                  >
                    <span className="text-gray-400 text-[10px] block font-medium">
                      عدد القطع
                    </span>
                    <span className="font-bold text-gray-800 pointer-events-none dark:text-gray-100">
                      {itemCount}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-gray-200 dark:bg-gray-600"></div>
                  <div className="flex-1">
                    <span className="text-gray-400 text-[10px] block font-medium">
                      الإجمالي
                    </span>
                    <span className="font-bold text-gray-800 dark:text-gray-100">
                      {total}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-gray-200 dark:bg-gray-600"></div>
                  <div className="flex-1">
                    <span className="text-gray-400 text-[10px] block font-medium">
                      المتبقي
                    </span>
                    <span className="font-bold text-red-500">
                      {total === 0 && itemCount === 0
                        ? 0
                        : remaining > 0
                          ? remaining
                          : "خالص"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">
                    تم الإنشاء:{" "}
                    {order.dates?.created &&
                    !isNaN(new Date(order.dates.created).getTime())
                      ? format(new Date(order.dates.created), "yyyy/MM/dd")
                      : "غير متوفر"}
                  </span>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center text-[10px] text-gray-600 gap-1.5 overflow-hidden dark:text-gray-300"
                  >
                    {customer?.phone && (
                      <div
                        dir="ltr"
                        className="flex items-center font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 whitespace-nowrap gap-1.5 flex-shrink-0 dark:bg-gray-900 dark:border-gray-700"
                      >
                        <a
                          href={`tel:${customer.phone.replace(/[^0-9+]/g, "")}`}
                          className="flex items-center hover:text-blue-600 transition-colors"
                        >
                          <Phone className="w-2.5 h-2.5 mr-1" />{" "}
                          {customer.phone}
                        </a>
                        <div className="w-px h-2.5 bg-gray-300"></div>
                        <a
                          href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:opacity-80 transition-opacity"
                          title="مراسلة واتساب"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-2.5 h-2.5 text-[#25D366]"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {itemsModalOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end sm:justify-center p-4 backdrop-blur-sm transition-opacity"
          onClick={() => setItemsModalOrder(null)}
        >
          <div
            className="bg-white w-full max-w-sm sm:mx-auto rounded-3xl p-4 shadow-xl max-h-[80vh] flex flex-col animate-slide-up sm:animate-none dark:bg-gray-800 dark:shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-100 dark:border-gray-700 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">
                محتويات الطلبية
              </h3>
              <button
                onClick={() => setItemsModalOrder(null)}
                className="p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto no-scrollbar space-y-2 pb-2">
              {itemsModalOrder.items.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  لا توجد قطع في هذه الطلبية
                </div>
              ) : (
                itemsModalOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3 dark:bg-gray-900 dark:border-gray-700 dark:bg-gray-800"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border bg-white dark:bg-gray-800"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-400 dark:bg-gray-600">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm truncate dark:text-white">
                        {item.name}
                      </h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.size && (
                          <span className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            م: {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            ل: {item.color}
                          </span>
                        )}
                        {item.sku && (
                          <span
                            className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-gray-600 font-mono dark:bg-gray-800 dark:text-gray-300"
                            dir="ltr"
                          >
                            #{item.sku}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                        {item.price} ر.س{" "}
                        <span className="text-gray-400 font-normal">
                          ×{item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => {
                handleNavigateToOrder(itemsModalOrder.id);
                setItemsModalOrder(null);
              }}
              className="mt-4 w-full bg-purple-100 text-purple-700 py-3 rounded-xl font-bold text-sm active:bg-purple-200 transition-colors dark:text-purple-300 dark:bg-purple-900/40"
            >
              عرض التفاصيل الكاملة للطلبية
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
}
