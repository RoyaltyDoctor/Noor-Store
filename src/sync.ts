import { getDocs, collection, writeBatch, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth, signIn } from './firebase';
import { useStore } from './store';
import { Customer, Order } from './types';

// Run once on login to merge any previously stored local data to the cloud
export const runInitialSync = async (userId: string) => {
  try {
    // 1. Capture local state IMMEDIATELY before any network requests might trigger updates
    const localState = useStore.getState();
    const localCustomers = [...localState.customers];
    const localOrders = [...localState.orders];
    
    // 2. Fetch remote data
    const customersSnapshot = await getDocs(collection(db, 'customers'));
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    
    const remoteCustomers: Record<string, Customer & { userId: string }> = {};
    customersSnapshot.docs.forEach(d => {
      const data = d.data();
      if (data.userId === userId) remoteCustomers[d.id] = data as (Customer & { userId: string });
    });

    const remoteOrders: Record<string, Order & { userId: string }> = {};
    ordersSnapshot.docs.forEach(d => {
      const data = d.data();
      if (data.userId === userId) remoteOrders[d.id] = data as (Order & { userId: string });
    });

    const mergedCustomersMap = new Map<string, Customer>();
    const mergedOrdersMap = new Map<string, Order>();
    
    const batch = writeBatch(db);
    let uploadsCount = 0;

    const uploadToFirebase = (collectionName: string, id: string, data: any) => {
       const ref = doc(db, collectionName, id);
       batch.set(ref, { ...data, userId }, { merge: true });
       uploadsCount++;
    };

    localCustomers.forEach(localC => {
      const remoteC = remoteCustomers[localC.id];
      if (!remoteC) {
        mergedCustomersMap.set(localC.id, localC);
        uploadToFirebase('customers', localC.id, localC);
      } else {
        const localT = localC.updatedAt || 0;
        const remoteT = remoteC.updatedAt || 0;
        if (localT > remoteT) {
           mergedCustomersMap.set(localC.id, localC);
           uploadToFirebase('customers', localC.id, localC);
        } else {
           mergedCustomersMap.set(remoteC.id, remoteC);
        }
      }
    });

    localOrders.forEach(localO => {
      const remoteO = remoteOrders[localO.id];
      if (!remoteO) {
        mergedOrdersMap.set(localO.id, localO);
        uploadToFirebase('orders', localO.id, localO);
      } else {
        const localT = localO.updatedAt || 0;
        const remoteT = remoteO.updatedAt || 0;
        if (localT > remoteT) {
           mergedOrdersMap.set(localO.id, localO);
           uploadToFirebase('orders', localO.id, localO);
        } else {
           mergedOrdersMap.set(remoteO.id, remoteO);
        }
      }
    });

    if (uploadsCount > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.error("Initial merge failed:", err);
  }
};

let unsubscribers: (() => void)[] = [];

export const startRealtimeSync = (userId: string) => {
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];

  const qCustomers = query(collection(db, 'customers'), where('userId', '==', userId));
  const unsubC = onSnapshot(qCustomers, (snap) => {
    const customers = snap.docs.map(d => d.data() as Customer);
    useStore.setState({ customers });
  });
  unsubscribers.push(unsubC);

  const qOrders = query(collection(db, 'orders'), where('userId', '==', userId));
  const unsubO = onSnapshot(qOrders, (snap) => {
    const orders = snap.docs.map(d => d.data() as Order);
    orders.sort((a,b) => b.dates.created - a.dates.created);
    useStore.setState({ orders });
  });
  unsubscribers.push(unsubO);

  const qDeleted = query(collection(db, 'deletedOrders'), where('userId', '==', userId));
  const unsubD = onSnapshot(qDeleted, (snap) => {
     const deletedOrders = snap.docs.map(d => d.data() as any);
     useStore.setState({ deletedOrders });
  });
  unsubscribers.push(unsubD);
};

