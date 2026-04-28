export type OrderStatus =
  | "PENDING"
  | "ORDERED"
  | "RECEIVED"
  | "SHIPPING"
  | "DELIVERED";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "قيد الطلب",
  ORDERED: "تم الشراء",
  RECEIVED: "وصلني",
  SHIPPING: "قيد التوصيل",
  DELIVERED: "تم الاستلام",
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  ORDERED: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  RECEIVED: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  SHIPPING: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
};

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
  updatedAt?: number;
}

export interface Item {
  id: string;
  name: string;
  url?: string;
  image?: string; // base64
  size?: string;
  color?: string;
  quantity: number;
  sku?: string;
  price: number;
}

export interface Batch {
  id: string;
  batchNumber: string;
  status: OrderStatus;
  couponEnabled: boolean;
  couponCode?: string;
  trackingNumber?: string;
  bankFees: number;
  dates: {
    created: number;
    updated: number;
  };
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  customerId: string;
  batchId?: string;
  status: OrderStatus;
  items: Item[];
  serviceFee: number;
  shippingFee: number;
  deposit: number;
  trackingNumber?: string;
  dates: {
    created: number;
    ordered?: number;
    expected?: number;
  };
  notes: {
    customerNotes?: string;
    internalNotes?: string;
  };
  updatedAt?: number;
}
