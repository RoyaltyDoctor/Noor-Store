import React, { useState, useMemo, useEffect } from "react";
import { useStore } from "../store";
import { Link, useLocation } from "react-router-dom";
import {
  Users,
  Phone,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Search,
  Package,
  ChevronLeft,
  ChevronDown,
  X,
  FileText,
  Filter,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { format } from "date-fns";
import type { Customer } from "../types";
import clsx from "clsx";
import { STATUS_LABELS, STATUS_COLORS } from "../types";

type SortOption =
  | "ALPHABETICAL"
  | "CREATED_AT"
  | "UPDATED_AT"
  | "PENDING_ORDERS"
  | "TOTAL_ORDERS";

const SORT_LABELS: Record<SortOption, string> = {
  ALPHABETICAL: "الأبجدية",
  CREATED_AT: "تاريخ التسجيل",
  UPDATED_AT: "تاريخ التعديل",
  PENDING_ORDERS: "الطلبيات قيد التنفيذ",
  TOTAL_ORDERS: "عدد الطلبيات",
};

export default function Customers() {
  const { customers, orders, addCustomer, updateCustomer, deleteCustomer } =
    useStore();
  const location = useLocation();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [viewCustomerHistory, setViewCustomerHistory] =
    useState<Customer | null>(null);

  // Highlight customer if navigating from an order detail
  useEffect(() => {
    const highlightId = location.state?.highlightCustomer;
    if (highlightId) {
      // Find the customer
      const targetCustomer = customers.find((c) => c.id === highlightId);
      if (targetCustomer) {
        setViewCustomerHistory(targetCustomer);
      }

      // Clear the state so it doesn't pop up again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, customers]);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [showExtraDetails, setShowExtraDetails] = useState(false);

  const [sortBy, setSortBy] = useState<SortOption>("UPDATED_AT");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const filteredCustomers = useMemo(() => {
    let list = [...customers];

    // Sort logic
    list.sort((a, b) => {
      let result = 0;
      switch (sortBy) {
        case "ALPHABETICAL":
          result = a.name.localeCompare(b.name, "ar");
          break;
        case "CREATED_AT": {
          const aCreated =
            (a as any).createdAt ||
            orders
              .filter((o) => o.customerId === a.id)
              .reduce(
                (min, o) => Math.min(min, o.dates?.created || Date.now()),
                a.updatedAt || 0,
              );
          const bCreated =
            (b as any).createdAt ||
            orders
              .filter((o) => o.customerId === b.id)
              .reduce(
                (min, o) => Math.min(min, o.dates?.created || Date.now()),
                b.updatedAt || 0,
              );
          result = aCreated - bCreated;
          break;
        }
        case "UPDATED_AT":
          result = (a.updatedAt || 0) - (b.updatedAt || 0);
          break;
        case "TOTAL_ORDERS": {
          const aCount = orders.filter((o) => o.customerId === a.id).length;
          const bCount = orders.filter((o) => o.customerId === b.id).length;
          if (bCount !== aCount) {
            result = aCount - bCount;
          } else {
            result = (a.updatedAt || 0) - (b.updatedAt || 0);
          }
          break;
        }
        case "PENDING_ORDERS": {
          const aPending = orders.filter(
            (o) =>
              o.customerId === a.id &&
              !["DELIVERED", "RETURNED"].includes(o.status),
          ).length;
          const bPending = orders.filter(
            (o) =>
              o.customerId === b.id &&
              !["DELIVERED", "RETURNED"].includes(o.status),
          ).length;
          if (bPending !== aPending) {
            result = aPending - bPending;
          } else {
            result = (a.updatedAt || 0) - (b.updatedAt || 0);
          }
          break;
        }
      }
      return sortDirection === "desc" ? -result : result;
    });

    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.notes?.toLowerCase().includes(q),
    );
  }, [customers, orders, searchQuery, sortBy, sortDirection]);

  const handleSave = () => {
    if (!formData.name) return;
    if (editingId) {
      updateCustomer(editingId, formData);
    } else {
      addCustomer(formData);
    }
    setFormData({ name: "", phone: "", address: "", notes: "" });
    setIsAdding(false);
    setEditingId(null);
    setShowExtraDetails(false);
  };

  const handleEdit = (e: React.MouseEvent, c: Customer) => {
    e.stopPropagation();
    setFormData({
      name: c.name,
      phone: c.phone || "",
      address: c.address || "",
      notes: c.notes || "",
    });
    setEditingId(c.id);
    setIsAdding(true);
    setShowExtraDetails(false);
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteCustomer(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const openHistory = (e: React.MouseEvent, c: Customer) => {
    e.stopPropagation();
    setViewCustomerHistory(c);
  };

  const customerOrders = useMemo(() => {
    if (!viewCustomerHistory) return [];
    return orders
      .filter((o) => o.customerId === viewCustomerHistory.id)
      .sort((a, b) => b.dates.created - a.dates.created);
  }, [viewCustomerHistory, orders]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 dark:text-white">
          <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          سجل العملاء{" "}
          <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full dark:text-gray-400 dark:bg-gray-700">
            ({customers.length})
          </span>
        </h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ name: "", phone: "", address: "", notes: "" });
            setShowExtraDetails(false);
          }}
          className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 active:bg-purple-200 transition-colors dark:bg-purple-600 dark:text-white dark:hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" /> إضافة عميل
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن عميل بالإسم، الجوال، الملاحظات..."
            className="w-full pl-3 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="bg-white border border-gray-200 px-3 py-2 rounded-xl text-sm font-bold text-gray-700 flex items-center gap-2 hover:bg-gray-50 shadow-sm transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:shadow-none"
          >
            <Filter className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">
              ترتيب: {SORT_LABELS[sortBy]}
            </span>
          </button>

          {showSortMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSortMenu(false)}
              ></div>
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-2 overflow-hidden dark:bg-gray-800 dark:border-gray-700 dark:shadow-none">
                {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(
                  ([key, label]) => {
                    const isActive = sortBy === key;
                    return (
                      <div
                        key={key}
                        className={clsx(
                          "w-full flex items-center justify-between text-sm transition-colors",
                          isActive
                            ? "text-purple-700 font-bold bg-purple-50/50"
                            : "text-gray-700 font-medium hover:bg-purple-50",
                        )}
                      >
                        <button
                          className="flex-1 text-right px-4 py-2"
                          onClick={() => {
                            setSortBy(key as SortOption);
                            setShowSortMenu(false);
                          }}
                        >
                          {label}
                        </button>
                        {isActive && (
                          <button
                            className="ml-3 p-1.5 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors dark:text-purple-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSortDirection((prev) =>
                                prev === "asc" ? "desc" : "asc",
                              );
                            }}
                          >
                            {sortDirection === "desc" ? (
                              <ArrowDown className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUp className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {!editingId && isAdding && (
        <div className="bg-white p-4 rounded-2xl border-2 border-purple-200 shadow-sm space-y-3 mb-4 dark:bg-gray-800 dark:shadow-none">
          <div className="flex justify-between items-center mb-2 border-b border-purple-50 pb-2 dark:border-gray-700">
            <h3 className="font-bold text-purple-900 text-sm dark:text-purple-100">
              إضافة عميل جديد
            </h3>
            <button
              onClick={() => setShowExtraDetails(!showExtraDetails)}
              className="text-[10px] bg-purple-50 text-purple-600 font-bold px-2 py-1 flex items-center gap-1 rounded hover:bg-purple-100 transition-colors dark:bg-purple-900/30 dark:text-purple-400"
            >
              {showExtraDetails
                ? "إخفاء التفاصيل"
                : "إظهار التفاصيل (عنوان، ملاحظات)"}
              <ChevronDown
                className={clsx(
                  "w-3 h-3 transition-transform",
                  showExtraDetails && "rotate-180",
                )}
              />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="الاسم (إلزامي)"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="flex-[2] min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:bg-gray-900 dark:border-gray-600"
            />
            <input
              type="tel"
              placeholder="رقم الجوال"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none dir-rtl dark:bg-gray-900 dark:border-gray-600"
            />
          </div>

          {showExtraDetails && (
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700 dark:border-gray-700">
              <input
                type="text"
                placeholder="(العنوان/المنطقة)"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:bg-gray-900 dark:border-gray-600"
              />
              <input
                type="text"
                placeholder="(ملاحظات حول العميل)"
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 outline-none placeholder:text-yellow-700/50 dark:bg-yellow-900/30"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={!formData.name}
              className="flex-1 bg-purple-600 text-white rounded-xl py-2 text-sm font-bold shadow-md dark:shadow-none"
            >
              حفظ
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setShowExtraDetails(false);
              }}
              className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2 text-sm font-bold dark:bg-gray-700 dark:text-gray-200"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {filteredCustomers.length === 0 && !isAdding ? (
        <div className="text-center py-12 text-gray-400">
          <p>{searchQuery ? "لا توجد نتائج مطابقة" : "لا يوجد عملاء مسجلين"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((c) => {
            const ordCount = orders.filter((o) => o.customerId === c.id).length;
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col transition-all hover:border-purple-200 relative overflow-hidden dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
              >
                {editingId === c.id ? (
                  <div className="p-4 bg-purple-50/30">
                    <div className="flex justify-between items-center mb-2 border-b border-purple-100 pb-2 dark:border-gray-700">
                      <h3 className="font-bold text-purple-900 text-sm dark:text-purple-100">
                        تعديل معلومات العميل
                      </h3>
                      <button
                        onClick={() => setShowExtraDetails(!showExtraDetails)}
                        className="text-[10px] bg-white text-purple-600 font-bold px-2 py-1 flex items-center gap-1 rounded border border-purple-100 hover:bg-purple-100 transition-colors dark:bg-gray-800 dark:text-purple-400"
                      >
                        {showExtraDetails ? "إخفاء التفاصيل" : "إظهار التفاصيل"}
                        <ChevronDown
                          className={clsx(
                            "w-3 h-3 transition-transform",
                            showExtraDetails && "rotate-180",
                          )}
                        />
                      </button>
                    </div>

                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="الاسم (إلزامي)"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="flex-[2] min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:bg-gray-800 dark:border-gray-600"
                      />
                      <input
                        type="tel"
                        placeholder="رقم الجوال"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none dir-rtl dark:bg-gray-800 dark:border-gray-600"
                      />
                    </div>

                    {showExtraDetails && (
                      <div className="space-y-2 pt-1">
                        <input
                          type="text"
                          placeholder="(العنوان/المنطقة)"
                          value={formData.address}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              address: e.target.value,
                            })
                          }
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:bg-gray-800 dark:border-gray-600"
                        />
                        <input
                          type="text"
                          placeholder="(ملاحظات حول العميل)"
                          value={formData.notes || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                          className="w-full bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 outline-none placeholder:text-yellow-700/50 dark:bg-yellow-900/30"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSave}
                        disabled={!formData.name}
                        className="flex-1 bg-purple-600 text-white rounded-xl py-2 text-sm font-bold shadow-md dark:shadow-none"
                      >
                        حفظ التعديلات
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setShowExtraDetails(false);
                          setIsAdding(false);
                        }}
                        className="flex-1 bg-white border border-gray-200 text-gray-700 rounded-xl py-2 text-sm font-bold dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-4 cursor-pointer active:scale-[0.99] transition-transform"
                    onClick={(e) => {
                      handleEdit(e, c);
                    }}
                  >
                    <div className="absolute top-0 bottom-0 right-0 w-1 bg-purple-100 dark:bg-purple-900/40" />

                    <div className="flex justify-between items-start w-full pr-2">
                      <h4 className="font-bold text-gray-900 leading-tight dark:text-white">
                        {c.name}
                      </h4>
                      <div
                        className="flex items-center gap-1 flex-shrink-0 mr-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleEdit(e, c)}
                          className="p-1.5 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-700 rounded-md transition-colors dark:bg-gray-900"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, c.id)}
                          className="p-1.5 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-red-500 rounded-md transition-colors dark:bg-gray-900"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-end w-full pr-2 mt-2 gap-2">
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <div
                          className="flex items-center text-[10px] text-gray-600 gap-1.5 w-full overflow-hidden dark:text-gray-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.phone && (
                            <div
                              dir="ltr"
                              className="flex items-center font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 whitespace-nowrap gap-1.5 flex-shrink-0 dark:bg-gray-900 dark:border-gray-700"
                            >
                              <a
                                href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`}
                                className="flex items-center hover:text-blue-600 transition-colors"
                              >
                                <Phone className="w-2.5 h-2.5 mr-1" /> {c.phone}
                              </a>
                              <div className="w-px h-2.5 bg-gray-300"></div>
                              <a
                                href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
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
                          {c.address && (
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(c.address)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 hover:text-blue-600 hover:border-blue-200 transition-colors max-w-full dark:bg-gray-900 dark:border-gray-700 dark:bg-gray-800"
                            >
                              <MapPin className="w-2.5 h-2.5 ml-1 flex-shrink-0" />
                              <span className="truncate block font-medium">
                                {c.address}
                              </span>
                            </a>
                          )}
                        </div>
                        {c.notes && (
                          <p className="text-[10px] text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-100 flex items-start gap-1 mt-1 leading-relaxed max-w-[95%] dark:bg-yellow-900/30">
                            <FileText className="w-3 h-3 flex-shrink-0 mt-0.5" />{" "}
                            {c.notes}
                          </p>
                        )}
                      </div>

                      <div
                        className="flex-shrink-0 self-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => openHistory(e, c)}
                          className={clsx(
                            "flex items-center gap-1 font-bold px-2 py-1 rounded-lg border text-[10px] transition-colors shadow-sm",
                            ordCount > 0
                              ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:text-purple-300 dark:bg-purple-900/40 dark:border-purple-800 dark:hover:bg-purple-900/60"
                              : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700",
                          )}
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>{ordCount} طلبية</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewCustomerHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-gray-50 w-full sm:max-w-md h-[80vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden mt-auto sm:mt-0 dark:bg-gray-900 dark:shadow-none dark:bg-gray-800">
            <div className="bg-white p-4 border-b flex justify-between items-center shadow-sm z-10 sticky top-0 dark:bg-gray-800 dark:border-gray-700 dark:shadow-none">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  سجل: {viewCustomerHistory.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                  {customerOrders.length} طلبيات مسجلة
                </p>
              </div>
              <button
                onClick={() => setViewCustomerHistory(null)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
              {customerOrders.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  لا يوجد طلبيات للعميل
                </div>
              ) : (
                customerOrders.map((order) => {
                  const serviceFee = order.serviceFee || 0;
                  const shippingFee = order.shippingFee || 0;
                  const total =
                    order.items.reduce((s, i) => s + i.price * i.quantity, 0) +
                    serviceFee +
                    shippingFee;
                  return (
                    <Link
                      key={order.id}
                      to={`/order/${order.id}`}
                      className="block bg-white p-4 rounded-xl border border-gray-100 shadow-sm active:scale-95 transition-transform dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 dark:text-gray-400 dark:bg-gray-900 dark:border-gray-700 dark:bg-gray-800">
                          #{order.orderNumber}
                        </span>
                        <span
                          className={clsx(
                            "text-[10px] font-bold px-2 py-1 rounded-md border",
                            STATUS_COLORS[order.status],
                          )}
                        >
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-gray-900 mb-2 dark:text-white">
                        {total} ر.س{" "}
                        <span className="text-xs text-gray-400 font-normal">
                          ({order.items.reduce((a, i) => a + i.quantity, 0)}{" "}
                          قطع)
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-50 pt-2 dark:border-gray-700">
                        <span className="text-[10px] text-gray-400">
                          {order.dates?.created &&
                          !isNaN(new Date(order.dates.created).getTime())
                            ? format(
                                new Date(order.dates.created),
                                "yyyy/MM/dd",
                              )
                            : "غير متوفر"}
                        </span>
                        <span className="text-xs font-bold text-purple-600 flex items-center dark:text-purple-400">
                          التفاصيل <ChevronLeft className="w-3 h-3 ml-1" />
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl dark:bg-gray-800 dark:shadow-none">
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center dark:text-white">
              تأكيد الحذف
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed dark:text-gray-400">
              هل أنت متأكد من حذف العميل؟ سيتم أيضاً حذف جميع الطلبيات المرتبطة
              به. هذا الإجراء لا يمكن التراجع عنه.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-bold transition-colors shadow-sm dark:shadow-none"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3 font-bold transition-colors dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
