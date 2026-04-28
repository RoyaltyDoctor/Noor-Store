import {
  getDocs,
  collection,
  writeBatch,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db, auth, signIn, handleFirestoreError, OperationType } from "./firebase";
import { useStore } from "./store";
import { Customer, Order, Batch } from "./types";

// Run once on login to merge any previously stored local data to the cloud
export const runInitialSync = async (userId: string) => {
  try {
    // 1. Capture local state IMMEDIATELY before any network requests might trigger updates
    const localState = useStore.getState();
    const localCustomers = [...localState.customers];
    const localOrders = [...localState.orders];
    const localBatches = [...localState.batches];
    const syncQueue = localState.syncQueue || [];

    // Process Offline action queue FIRST
    if (syncQueue.length > 0) {
      const queueBatch = writeBatch(db);
      let hasOps = false;

      // Keep only the latest operation for each document to avoid batch errors
      const collapsedQueue = new Map();
      syncQueue.forEach((item) => {
        collapsedQueue.set(`${item.collectionName}_${item.id}`, item);
      });

      collapsedQueue.forEach((item) => {
        if (item.type === "set") {
          queueBatch.set(
            doc(db, item.collectionName, item.id),
            { ...item.data, userId },
            { merge: true },
          );
          hasOps = true;
        } else if (item.type === "delete") {
          queueBatch.delete(doc(db, item.collectionName, item.id));
          hasOps = true;
        }
      });

      if (hasOps) {
        await queueBatch.commit().catch((err) => handleFirestoreError(err, OperationType.WRITE, "syncQueue"));
      }
      localState.clearSyncQueue();
    }

    // 2. Fetch remote data
    let customersSnapshot, ordersSnapshot, batchesSnapshot, deletedSnapshot;
    
    try {
      customersSnapshot = await getDocs(
        query(collection(db, "customers"), where("userId", "==", userId))
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "customers");
      return;
    }

    try {
      ordersSnapshot = await getDocs(
        query(collection(db, "orders"), where("userId", "==", userId))
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "orders");
      return;
    }

    try {
      batchesSnapshot = await getDocs(
        query(collection(db, "batches"), where("userId", "==", userId))
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "batches");
      return;
    }

    try {
      deletedSnapshot = await getDocs(
        query(collection(db, "deletedOrders"), where("userId", "==", userId))
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "deletedOrders");
      return;
    }


    const remoteCustomers: Record<string, Customer & { userId: string }> = {};
    customersSnapshot.docs.forEach((d) => {
      const data = d.data();
      if (data.userId === userId)
        remoteCustomers[d.id] = data as Customer & { userId: string };
    });

    const remoteOrders: Record<string, Order & { userId: string }> = {};
    ordersSnapshot.docs.forEach((d) => {
      const data = d.data();
      if (data.userId === userId)
        remoteOrders[d.id] = data as Order & { userId: string };
    });

    const remoteBatches: Record<string, Batch & { userId: string }> = {};
    batchesSnapshot.docs.forEach((d) => {
      const data = d.data();
      if (data.userId === userId)
        remoteBatches[d.id] = data as Batch & { userId: string };
    });

    const mergedCustomersMap = new Map<string, Customer>();
    const mergedOrdersMap = new Map<string, Order>();
    const mergedBatchesMap = new Map<string, Batch>();

    const batch = writeBatch(db);
    let uploadsCount = 0;

    const uploadToFirebase = (
      collectionName: string,
      id: string,
      data: any,
    ) => {
      const ref = doc(db, collectionName, id);
      batch.set(ref, { ...data, userId }, { merge: true });
      uploadsCount++;
    };

    // 1. Process Local Customers
    localCustomers.forEach((localC) => {
      const remoteC = remoteCustomers[localC.id];
      if (!remoteC) {
        mergedCustomersMap.set(localC.id, localC);
        uploadToFirebase("customers", localC.id, localC);
      } else {
        const localT = localC.updatedAt || 0;
        const remoteT = remoteC.updatedAt || 0;
        if (localT > remoteT) {
          mergedCustomersMap.set(localC.id, localC);
          uploadToFirebase("customers", localC.id, localC);
        } else {
          mergedCustomersMap.set(remoteC.id, remoteC);
        }
      }
    });

    // 2. Add Remote Customers that don't exist locally
    Object.values(remoteCustomers).forEach((remoteC) => {
      if (!mergedCustomersMap.has(remoteC.id)) {
        mergedCustomersMap.set(remoteC.id, remoteC);
      }
    });

    // 3. Process Local Orders
    localOrders.forEach((localO) => {
      const remoteO = remoteOrders[localO.id];
      if (!remoteO) {
        mergedOrdersMap.set(localO.id, localO);
        uploadToFirebase("orders", localO.id, localO);
      } else {
        const localT = localO.updatedAt || 0;
        const remoteT = remoteO.updatedAt || 0;
        if (localT > remoteT) {
          mergedOrdersMap.set(localO.id, localO);
          uploadToFirebase("orders", localO.id, localO);
        } else {
          mergedOrdersMap.set(remoteO.id, remoteO);
        }
      }
    });

    // 4. Add Remote Orders that don't exist locally
    Object.values(remoteOrders).forEach((remoteO) => {
      if (!mergedOrdersMap.has(remoteO.id)) {
        mergedOrdersMap.set(remoteO.id, remoteO);
      }
    });

    // 5. Process Local Batches
    localBatches.forEach((localB) => {
      const remoteB = remoteBatches[localB.id];
      if (!remoteB) {
        mergedBatchesMap.set(localB.id, localB);
        uploadToFirebase("batches", localB.id, localB);
      } else {
        const localT = localB.dates?.updated || 0;
        const remoteT = remoteB.dates?.updated || 0;
        if (localT > remoteT) {
          mergedBatchesMap.set(localB.id, localB);
          uploadToFirebase("batches", localB.id, localB);
        } else {
          mergedBatchesMap.set(remoteB.id, remoteB);
        }
      }
    });

    // 6. Add Remote Batches that don't exist locally
    Object.values(remoteBatches).forEach((remoteB) => {
      if (!mergedBatchesMap.has(remoteB.id)) {
        mergedBatchesMap.set(remoteB.id, remoteB);
      }
    });

    if (uploadsCount > 0) {
      await batch.commit();
    }

    // Update local store with merged result
    useStore.setState({
      customers: Array.from(mergedCustomersMap.values()),
      orders: Array.from(mergedOrdersMap.values()).sort(
        (a, b) => (b.dates?.created || 0) - (a.dates?.created || 0),
      ),
      batches: Array.from(mergedBatchesMap.values()).sort(
        (a, b) => (b.dates?.created || 0) - (a.dates?.created || 0),
      ),
    });
  } catch (err) {
    console.error("Initial merge failed:", err);
    throw err;
  }
};

let unsubscribers: (() => void)[] = [];

export const stopRealtimeSync = () => {
  unsubscribers.forEach((unsub) => unsub());
  unsubscribers = [];
};

export const startRealtimeSync = (userId: string) => {
  unsubscribers.forEach((unsub) => unsub());
  unsubscribers = [];

  const qCustomers = query(
    collection(db, "customers"),
    where("userId", "==", userId),
  );
  const unsubC = onSnapshot(qCustomers, (snap) => {
    const customers = snap.docs.map((d) => d.data() as Customer);
    useStore.setState({ customers });
  }, (err) => handleFirestoreError(err, OperationType.LIST, "customers"));
  unsubscribers.push(unsubC);

  const qOrders = query(
    collection(db, "orders"),
    where("userId", "==", userId),
  );
  const unsubO = onSnapshot(qOrders, (snap) => {
    const orders = snap.docs.map((d) => d.data() as Order);
    orders.sort((a, b) => (b.dates?.created || 0) - (a.dates?.created || 0));
    useStore.setState({ orders });
  }, (err) => handleFirestoreError(err, OperationType.LIST, "orders"));
  unsubscribers.push(unsubO);

  const qBatches = query(
    collection(db, "batches"),
    where("userId", "==", userId),
  );
  const unsubB = onSnapshot(qBatches, (snap) => {
    const batches = snap.docs.map((d) => d.data() as Batch);
    batches.sort((a, b) => (b.dates?.created || 0) - (a.dates?.created || 0));
    useStore.setState({ batches });
  }, (err) => handleFirestoreError(err, OperationType.LIST, "batches"));
  unsubscribers.push(unsubB);

  const qDeleted = query(
    collection(db, "deletedOrders"),
    where("userId", "==", userId),
  );
  const unsubD = onSnapshot(qDeleted, (snap) => {
    const deletedOrders = snap.docs.map((d) => d.data() as any);
    useStore.setState({ deletedOrders });
  }, (err) => handleFirestoreError(err, OperationType.LIST, "deletedOrders"));
  unsubscribers.push(unsubD);
};
