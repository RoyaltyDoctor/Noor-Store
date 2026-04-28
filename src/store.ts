import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";
import { v4 as uuidv4 } from "uuid";
import { Customer, Order, OrderStatus, Batch } from "./types";

import { setDoc, doc, deleteDoc } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "./firebase";

const isAutoSyncEnabled = () => localStorage.getItem("autoSync") === "true";

const pushToFb = (collectionName: string, id: string, data: any) => {
  if (!isAutoSyncEnabled()) {
    useStore.setState((state) => ({
      syncQueue: [
        ...(state.syncQueue || []),
        { id, type: "set", collectionName, data },
      ],
    }));
    return;
  }
  const user = auth.currentUser;
  if (user) {
    setDoc(
      doc(db, collectionName, id),
      { ...data, userId: user.uid },
      { merge: true },
    ).catch((err) => handleFirestoreError(err, OperationType.WRITE, collectionName));
  }
};

const deleteFromFb = (collectionName: string, id: string) => {
  if (!isAutoSyncEnabled()) {
    useStore.setState((state) => ({
      syncQueue: [
        ...(state.syncQueue || []),
        { id, type: "delete", collectionName },
      ],
    }));
    return;
  }
  const user = auth.currentUser;
  if (user) {
    deleteDoc(doc(db, collectionName, id)).catch((err) => handleFirestoreError(err, OperationType.DELETE, collectionName));
  }
};

// Custom storage engine using IndexedDB
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export type DateFilterType =
  | "ALL"
  | "TODAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "CUSTOM";

export type SortOptionHome = "NEWEST" | "OLDEST" | "HIGHEST_PRICE" | "LOWEST_PRICE";

interface FilterState {
  searchQuery: string;
  isMultiSelectMode: boolean;
  selectedStatus: OrderStatus | "ALL" | "ACTIVE";
  selectedStatusesMult: OrderStatus[];
  dateFilter: DateFilterType;
  customStartDate: string;
  customEndDate: string;
  scrollPosition: number;
  sortOption: SortOptionHome;
  setSearchQuery: (val: string) => void;
  setIsMultiSelectMode: (val: boolean) => void;
  setSelectedStatus: (val: OrderStatus | "ALL" | "ACTIVE") => void;
  setSelectedStatusesMult: (val: OrderStatus[]) => void;
  setDateFilter: (val: DateFilterType) => void;
  setCustomStartDate: (val: string) => void;
  setCustomEndDate: (val: string) => void;
  setScrollPosition: (val: number) => void;
  setSortOption: (val: SortOptionHome) => void;
  reset: () => void;
}

export type SortOptionBatches = "NEWEST" | "OLDEST" | "MOST_ORDERS" | "LEAST_ORDERS" | "HIGHEST_COST" | "LOWEST_COST";

interface BatchesFilterState {
  searchQuery: string;
  selectedStatus: OrderStatus | "ALL" | "ACTIVE";
  sortOption: SortOptionBatches;
  setSearchQuery: (val: string) => void;
  setSelectedStatus: (val: OrderStatus | "ALL" | "ACTIVE") => void;
  setSortOption: (val: SortOptionBatches) => void;
}

export const useBatchesFilterStore = create<BatchesFilterState>((set) => ({
  searchQuery: "",
  selectedStatus: "ACTIVE",
  sortOption: "NEWEST",
  setSearchQuery: (val) => set({ searchQuery: val }),
  setSelectedStatus: (val) => set({ selectedStatus: val }),
  setSortOption: (val) => set({ sortOption: val }),
}));

export type SortOptionCustomers =
  | "ALPHABETICAL"
  | "CREATED_AT"
  | "UPDATED_AT"
  | "PENDING_ORDERS"
  | "TOTAL_ORDERS";

interface CustomersFilterState {
  searchQuery: string;
  sortBy: SortOptionCustomers;
  sortDirection: "asc" | "desc";
  setSearchQuery: (val: string) => void;
  setSortBy: (val: SortOptionCustomers) => void;
  setSortDirection: (val: "asc" | "desc") => void;
}

export const useCustomersFilterStore = create<CustomersFilterState>((set) => ({
  searchQuery: "",
  sortBy: "UPDATED_AT",
  sortDirection: "desc",
  setSearchQuery: (val) => set({ searchQuery: val }),
  setSortBy: (val) => set({ sortBy: val }),
  setSortDirection: (val) => set({ sortDirection: val }),
}));

export const useFilterStore = create<FilterState>((set) => ({
  searchQuery: "",
  isMultiSelectMode: false,
  selectedStatus: "ACTIVE",
  selectedStatusesMult: ["PENDING", "ORDERED", "RECEIVED", "SHIPPING"],
  dateFilter: "ALL",
  customStartDate: "",
  customEndDate: "",
  scrollPosition: 0,
  sortOption: "NEWEST",
  setSearchQuery: (val) => set({ searchQuery: val }),
  setIsMultiSelectMode: (val) => set({ isMultiSelectMode: val }),
  setSelectedStatus: (val) => set({ selectedStatus: val }),
  setSelectedStatusesMult: (val) => set({ selectedStatusesMult: val }),
  setDateFilter: (val) => set({ dateFilter: val }),
  setCustomStartDate: (val) => set({ customStartDate: val }),
  setCustomEndDate: (val) => set({ customEndDate: val }),
  setScrollPosition: (val) => set({ scrollPosition: val }),
  setSortOption: (val) => set({ sortOption: val }),
  reset: () =>
    set({
      searchQuery: "",
      isMultiSelectMode: false,
      selectedStatus: "ACTIVE",
      selectedStatusesMult: ["PENDING", "ORDERED", "RECEIVED", "SHIPPING"],
      dateFilter: "ALL",
      customStartDate: "",
      customEndDate: "",
      sortOption: "NEWEST",
    }),
}));

interface AppState {
  customers: Customer[];
  orders: Order[];
  batches: Batch[];
  deletedOrders: { orderNumber: string; deletedAt: number }[];
  syncQueue: {
    id: string;
    type: "set" | "delete";
    collectionName: string;
    data?: any;
  }[];
  clearSyncQueue: () => void;

  // Customer Actions
  addCustomer: (customer: Omit<Customer, "id">) => string;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Order Actions
  addOrder: (customerId: string) => string;
  updateOrder: (id: string, data: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;

  // Batch Actions
  addBatch: () => string;
  updateBatch: (id: string, data: Partial<Batch>) => void;
  deleteBatch: (id: string, deleteOrders?: boolean) => void;

  // Backup Merge
  mergeBackup: (backupData: {
    customers?: Customer[];
    orders?: Order[];
    batches?: Batch[];
    deletedOrders?: { orderNumber: string; deletedAt: number }[];
  }) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      customers: [],
      orders: [],
      batches: [],
      deletedOrders: [],
      syncQueue: [],
      clearSyncQueue: () => set({ syncQueue: [] }),

      addBatch: () => {
        const id = uuidv4();
        const state = get();
        
        let batchNumber = `B-${Math.floor(1000 + Math.random() * 9000)}`;
        while (state.batches.some(b => b.batchNumber === batchNumber)) {
          batchNumber = `B-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const newBatch: Batch = {
          id,
          batchNumber,
          status: "PENDING",
          couponEnabled: false,
          bankFees: 0,
          dates: { created: Date.now(), updated: Date.now() },
        };

        set((state) => ({
          batches: [newBatch, ...state.batches],
        }));

        pushToFb("batches", id, newBatch);
        return id;
      },

      updateBatch: (id, data) =>
        set((state) => {
          let updatedOrders = [...state.orders];
          let updatedBatches = state.batches.map((b) => {
            if (b.id === id) {
              const updated = {
                ...b,
                ...data,
                dates: { ...(b.dates || { created: Date.now() }), updated: Date.now() },
              };
              pushToFb("batches", id, updated);

              // Sync status and trackingNumber to related orders
              if (data.status !== undefined || data.trackingNumber !== undefined) {
                updatedOrders = updatedOrders.map(o => {
                  if (o.batchId === id) {
                    const updatedOrder = { ...o };
                    let changed = false;
                    if (data.status !== undefined && updatedOrder.status !== data.status) {
                      updatedOrder.status = data.status as OrderStatus; // Ensure type
                      changed = true;
                    }
                    if (data.trackingNumber !== undefined && updatedOrder.trackingNumber !== data.trackingNumber) {
                      updatedOrder.trackingNumber = data.trackingNumber;
                      changed = true;
                    }
                    if (changed) {
                      updatedOrder.updatedAt = Date.now();
                      pushToFb("orders", o.id, updatedOrder);
                      return updatedOrder;
                    }
                  }
                  return o;
                });
              }

              return updated;
            }
            return b;
          });
          return { batches: updatedBatches, orders: updatedOrders };
        }),

      deleteBatch: (id, deleteOrders = false) =>
        set((state) => {
          deleteFromFb("batches", id);
          
          let updatedOrders = [...state.orders];
          let updatedDeletedOrders = [...(state.deletedOrders || [])];

          // Handle orders linked to this batch
          const now = Date.now();
          updatedOrders = state.orders.map((o) => {
            if (o.batchId === id) {
              if (deleteOrders) {
                // We are deleting the order
                deleteFromFb("orders", o.id);
                updatedDeletedOrders.push({
                  orderNumber: o.orderNumber || "",
                  deletedAt: now,
                });
                if (o.orderNumber) {
                   pushToFb("deletedOrders", o.id, {
                     orderNumber: o.orderNumber,
                     deletedAt: now,
                   });
                }
                return null as any; // will filter out below
              } else {
                // We only unlink the order
                const updated = { ...o, batchId: undefined };
                pushToFb("orders", o.id, updated);
                return updated;
              }
            }
            return o;
          }).filter(Boolean);

          return {
            batches: state.batches.filter((b) => b.id !== id),
            orders: updatedOrders,
            deletedOrders: updatedDeletedOrders
          };
        }),

      addCustomer: (data) => {
        const id = uuidv4();
        const newCustomer = { ...data, id, updatedAt: Date.now() };
        set((state) => ({
          customers: [...state.customers, newCustomer],
        }));
        pushToFb("customers", id, newCustomer);
        return id;
      },

      updateCustomer: (id, data) =>
        set((state) => {
          const updatedCustomers = state.customers.map((c) => {
            if (c.id === id) {
              const updated = { ...c, ...data, updatedAt: Date.now() };
              pushToFb("customers", id, updated);
              return updated;
            }
            return c;
          });
          return { customers: updatedCustomers };
        }),

      deleteCustomer: (id) =>
        set((state) => {
          deleteFromFb("customers", id);

          // Handle associated orders deletion logic for cloud
          const ordersToDelete = state.orders.filter(
            (o) => o.customerId === id,
          );
          ordersToDelete.forEach((o) => {
            deleteFromFb("orders", o.id);
            if (o.orderNumber)
              pushToFb("deletedOrders", o.id, {
                orderNumber: o.orderNumber,
                deletedAt: Date.now(),
              });
          });

          return {
            customers: state.customers.filter((c) => c.id !== id),
            orders: state.orders.filter((o) => o.customerId !== id),
          };
        }),

      addOrder: (customerId) => {
        const id = uuidv4();

        let orderNumber = "";
        const now = Date.now();
        const state = get();

        // 1 month in ms = 30 * 24 * 60 * 60 * 1000 = 2592000000
        const ONE_MONTH_MS = 2592000000;

        // Filter out order numbers that were deleted more than 1 month ago
        // This makes them mathematically "available" for the random generator below
        const safeDeletedOrders = state.deletedOrders || [];
        const activeReservations = safeDeletedOrders.filter(
          (d) => now - d.deletedAt < ONE_MONTH_MS,
        );

        // Generate a unique 5-digit order number
        let isUnique = false;
        while (!isUnique) {
          orderNumber = Math.floor(10000 + Math.random() * 90000).toString();

          // It's unique if it's not currently active AND not recently deleted (within the last month)
          const isActivelyUsed = state.orders.some(
            (o) => o.orderNumber === orderNumber,
          );
          const isReserved = activeReservations.some(
            (d) => d.orderNumber === orderNumber,
          );

          if (!isActivelyUsed && !isReserved) {
            isUnique = true;
          }
        }

        const newOrder: Order = {
          id,
          orderNumber,
          customerId,
          status: "PENDING",
          items: [],
          serviceFee: 0,
          shippingFee: 0,
          deposit: 0,
          dates: { created: Date.now() },
          notes: {},
          updatedAt: Date.now(),
        };

        set((state) => ({
          orders: [newOrder, ...state.orders],
          deletedOrders: activeReservations,
        }));

        pushToFb("orders", id, newOrder);

        return id;
      },

      updateOrder: (id, data) =>
        set((state) => {
          const updatedOrders = state.orders.map((o) => {
            if (o.id === id) {
              const updated = { ...o, ...data, updatedAt: Date.now() };
              pushToFb("orders", id, updated);
              return updated;
            }
            return o;
          });
          return { orders: updatedOrders };
        }),

      deleteOrder: (id) =>
        set((state) => {
          const orderToDelete = state.orders.find((o) => o.id === id);
          const newDeletedOrders = state.deletedOrders || [];

          deleteFromFb("orders", id);

          if (orderToDelete && orderToDelete.orderNumber) {
            pushToFb("deletedOrders", id, {
              orderNumber: orderToDelete.orderNumber,
              deletedAt: Date.now(),
            });
            return {
              orders: state.orders.filter((o) => o.id !== id),
              deletedOrders: [
                ...newDeletedOrders,
                {
                  orderNumber: orderToDelete.orderNumber,
                  deletedAt: Date.now(),
                },
              ],
            };
          }

          return {
            orders: state.orders.filter((o) => o.id !== id),
          };
        }),

      updateOrderStatus: (id, status) =>
        set((state) => {
          const updatedOrders = state.orders.map((o) => {
            if (o.id === id) {
              const updates: Partial<Order> = { status, updatedAt: Date.now() };
              if (status === "ORDERED" && !o.dates?.ordered) {
                updates.dates = { ...(o.dates || { created: Date.now() }), ordered: Date.now() };
              }
              const updated = { ...o, ...updates };
              pushToFb("orders", id, updated);
              return updated;
            }
            return o;
          });
          return { orders: updatedOrders };
        }),

      mergeBackup: (backupData) =>
        set((state) => {
          let updatedCustomers = [...state.customers];
          let updatedOrders = [...state.orders];
          let updatedBatches = [...state.batches];

          const { customers = [], orders = [], batches = [] } = backupData;

          // Merge Customers
          customers.forEach((importedC) => {
            const index = updatedCustomers.findIndex(
              (c) => c.id === importedC.id,
            );
            if (index === -1) {
              updatedCustomers.push(importedC);
              pushToFb("customers", importedC.id, importedC);
            } else {
              const currentT = updatedCustomers[index].updatedAt || 0;
              const importedT = importedC.updatedAt || 0;
              if (importedT > currentT) {
                updatedCustomers[index] = importedC;
                pushToFb("customers", importedC.id, importedC);
              }
            }
          });

          // Merge Orders
          orders.forEach((importedO) => {
            const index = updatedOrders.findIndex((o) => o.id === importedO.id);
            if (index === -1) {
              updatedOrders.push(importedO);
              pushToFb("orders", importedO.id, importedO);
            } else {
              const currentT = updatedOrders[index].updatedAt || 0;
              const importedT = importedO.updatedAt || 0;
              if (importedT > currentT) {
                updatedOrders[index] = importedO;
                pushToFb("orders", importedO.id, importedO);
              }
            }
          });

          // Merge Batches
          batches.forEach((importedB) => {
            const index = updatedBatches.findIndex((b) => b.id === importedB.id);
            if (index === -1) {
              updatedBatches.push(importedB);
              pushToFb("batches", importedB.id, importedB);
            } else {
              const currentT = updatedBatches[index].dates?.updated || 0;
              const importedT = importedB.dates?.updated || 0;
              if (importedT > currentT) {
                updatedBatches[index] = importedB;
                pushToFb("batches", importedB.id, importedB);
              }
            }
          });

          return { customers: updatedCustomers, orders: updatedOrders, batches: updatedBatches };
        }),
    }),
    {
      name: "noor-store-storage",
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
