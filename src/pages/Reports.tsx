import { useState, useMemo } from "react";
import { useStore } from "../store";
import { Link } from "react-router-dom";
import {
  BarChart3,
  ChevronLeft,
  X,
  DollarSign,
  Package,
  TrendingUp,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, OrderStatus } from "../types";
import clsx from "clsx";

export default function Reports() {
  const { orders, customers } = useStore();
  const [selectedStatusModal, setSelectedStatusModal] =
    useState<OrderStatus | null>(null);
  const [selectedFinanceModal, setSelectedFinanceModal] = useState<
    "TOTAL" | "PAYMENTS" | "REMAINING" | null
  >(null);

  const statusCounts = useMemo(() => {
    const counts = {} as Record<OrderStatus, number>;
    Object.keys(STATUS_LABELS).forEach((k) => (counts[k as OrderStatus] = 0));
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const financials = useMemo(() => {
    let total = 0;
    let payments = 0;

    orders.forEach((o) => {
      const itemsTotal = o.items.reduce((s, i) => s + i.price * i.quantity, 0);
      const serviceFee = o.serviceFee || 0;
      const shippingFee = o.shippingFee || 0;
      const deposit = o.deposit || 0;
      const orderTotal = itemsTotal + serviceFee + shippingFee;
      total += orderTotal;
      payments += deposit;
    });

    return { total, payments, remaining: total - payments };
  }, [orders]);

  const financialModalData = useMemo(() => {
    if (!selectedFinanceModal) return [];

    return orders
      .map((o) => {
        const itemsTotal = o.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );
        const serviceFee = o.serviceFee || 0;
        const shippingFee = o.shippingFee || 0;
        const deposit = o.deposit || 0;
        const total = itemsTotal + serviceFee + shippingFee;
        const remaining = total - deposit;
        const customer = customers.find((c) => c.id === o.customerId);

        return {
          order: o,
          total,
          deposit,
          remaining,
          customerName: customer?.name || "عميل غير معروف",
        };
      })
      .filter((data) => {
        if (selectedFinanceModal === "TOTAL") return data.total > 0;
        if (selectedFinanceModal === "PAYMENTS") return data.deposit > 0;
        if (selectedFinanceModal === "REMAINING") return data.remaining > 0;
        return false;
      })
      .sort((a, b) => b.order.dates.created - a.order.dates.created);
  }, [selectedFinanceModal, orders, customers]);

  const statusModalData = useMemo(() => {
    if (!selectedStatusModal) return [];
    return orders
      .filter((o) => o.status === selectedStatusModal)
      .sort((a, b) => b.dates.created - a.dates.created);
  }, [selectedStatusModal, orders]);

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          التقارير والنظرة العامة
        </h2>
      </div>

      {/* Status Overview */}
      <section>
        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2 dark:text-gray-200">
          <Package className="w-5 h-5 text-gray-400" />
          حالات الطلبيات
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(STATUS_LABELS).map(([key, label]) => {
            const status = key as OrderStatus;
            const count = statusCounts[status];
            return (
              <div
                key={key}
                onClick={() => setSelectedStatusModal(status)}
                className={clsx(
                  "p-4 rounded-2xl border shadow-sm cursor-pointer active:scale-95 transition-transform flex flex-col justify-between",
                  STATUS_COLORS[status],
                )}
              >
                <span className="font-bold text-sm mb-2">{label}</span>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black">{count}</span>
                  <span className="text-[10px] opacity-70">طلبية</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Financials Overview */}
      <section>
        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2 mt-6 dark:text-gray-200">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          المالية
        </h3>
        <div className="space-y-3">
          <div
            onClick={() => setSelectedFinanceModal("TOTAL")}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform flex justify-between items-center dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold dark:text-gray-400">
                  إجمالي المبيعات
                </p>
                <p className="text-lg font-black text-gray-900 dark:text-white">
                  {financials.total} ر.س
                </p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-300" />
          </div>

          <div
            onClick={() => setSelectedFinanceModal("PAYMENTS")}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform flex justify-between items-center dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold dark:text-gray-400">
                  العرابين والمدفوعات
                </p>
                <p className="text-lg font-black text-green-600 dark:text-green-400">
                  {financials.payments} ر.س
                </p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-300" />
          </div>

          <div
            onClick={() => setSelectedFinanceModal("REMAINING")}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform flex justify-between items-center dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 dark:bg-red-900/30 dark:text-red-400 dark:bg-red-900/40">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold dark:text-gray-400">
                  المبالغ المتبقية
                </p>
                <p className="text-lg font-black text-red-500 dark:text-red-400">
                  {financials.remaining} ر.س
                </p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-300" />
          </div>
        </div>
      </section>

      {/* Status Modal */}
      {selectedStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-gray-50 w-full sm:max-w-md h-[80vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden mt-auto sm:mt-0 dark:bg-gray-900 dark:shadow-none dark:bg-gray-800">
            <div className="bg-white p-4 border-b flex justify-between items-center shadow-sm z-10 sticky top-0 dark:bg-gray-800 dark:border-gray-700 dark:shadow-none">
              <div>
                <h3
                  className={clsx(
                    "font-bold text-sm px-2 py-1 flex items-center justify-center rounded-lg",
                    STATUS_COLORS[selectedStatusModal],
                  )}
                >
                  طلبيات: {STATUS_LABELS[selectedStatusModal]}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStatusModal(null)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
              {statusModalData.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  لا يوجد طلبيات بهذه الحالة
                </div>
              ) : (
                statusModalData.map((order) => {
                  const customer = customers.find(
                    (c) => c.id === order.customerId,
                  );
                  return (
                    <Link
                      key={order.id}
                      to={`/order/${order.id}`}
                      className="block bg-white p-4 rounded-xl border border-gray-100 shadow-sm active:scale-95 transition-transform dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">
                            {customer?.name || "عميل غير معروف"}
                          </h4>
                          <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400">
                            #{order.orderNumber}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-purple-600 flex items-center dark:text-purple-400">
                          دخول <ChevronLeft className="w-3 h-3 ml-1" />
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

      {/* Finance Modal */}
      {selectedFinanceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-gray-50 w-full sm:max-w-md h-[80vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden mt-auto sm:mt-0 dark:bg-gray-900 dark:shadow-none dark:bg-gray-800">
            <div className="bg-white p-4 border-b flex justify-between items-center shadow-sm z-10 sticky top-0 dark:bg-gray-800 dark:border-gray-700 dark:shadow-none">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {selectedFinanceModal === "TOTAL" && "تفصيل المبيعات"}
                  {selectedFinanceModal === "PAYMENTS" && "العرابين والمدفوعات"}
                  {selectedFinanceModal === "REMAINING" &&
                    "المبالغ المتبقية للتحصيل"}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFinanceModal(null)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
              {financialModalData.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  لا يوجد بيانات لعرضها
                </div>
              ) : (
                financialModalData.map((data) => (
                  <Link
                    key={data.order.id}
                    to={`/order/${data.order.id}`}
                    className="block bg-white p-4 rounded-xl border border-gray-100 shadow-sm active:scale-95 transition-transform dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {data.customerName}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-50 self-start px-1 mt-1 rounded border border-gray-100 dark:text-gray-400 dark:bg-gray-900 dark:border-gray-700 dark:bg-gray-800">
                          #{data.order.orderNumber}
                        </span>
                      </div>
                      <div className="text-left">
                        <span
                          className={clsx(
                            "text-sm font-black",
                            selectedFinanceModal === "TOTAL"
                              ? "text-gray-900 dark:text-white"
                              : selectedFinanceModal === "PAYMENTS"
                                ? "text-green-600"
                                : "text-red-500 dark:text-red-400",
                          )}
                        >
                          {selectedFinanceModal === "TOTAL" && data.total}
                          {selectedFinanceModal === "PAYMENTS" && data.deposit}
                          {selectedFinanceModal === "REMAINING" &&
                            data.remaining}{" "}
                          ر.س
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
