import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';
import { Customer, Order, OrderStatus } from './types';

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

interface AppState {
  customers: Customer[];
  orders: Order[];
  
  // Customer Actions
  addCustomer: (customer: Omit<Customer, 'id'>) => string;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  
  // Order Actions
  addOrder: (customerId: string) => string;
  updateOrder: (id: string, data: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      customers: [],
      orders: [],

      addCustomer: (data) => {
        const id = uuidv4();
        set((state) => ({
          customers: [...state.customers, { ...data, id }]
        }));
        return id;
      },

      updateCustomer: (id, data) => set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? { ...c, ...data } : c))
      })),

      deleteCustomer: (id) => set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
        orders: state.orders.filter((o) => o.customerId !== id)
      })),

      addOrder: (customerId) => {
        const id = uuidv4();
        const newOrder: Order = {
          id,
          customerId,
          status: 'PENDING',
          items: [],
          serviceFee: 0,
          shippingFee: 0,
          deposit: 0,
          dates: { created: Date.now() },
          notes: {}
        };
        set((state) => ({
          orders: [newOrder, ...state.orders]
        }));
        return id;
      },

      updateOrder: (id, data) => set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? { ...o, ...data } : o))
      })),

      deleteOrder: (id) => set((state) => ({
        orders: state.orders.filter((o) => o.id !== id)
      })),

      updateOrderStatus: (id, status) => set((state) => ({
        orders: state.orders.map((o) => {
          if (o.id === id) {
            const updates = { status };
            if (status === 'ORDERED' && !o.dates.ordered) {
               updates['dates'] = { ...o.dates, ordered: Date.now() };
            }
            return { ...o, ...updates };
          }
          return o;
        })
      }))
    }),
    {
      name: 'noor-store-storage',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
