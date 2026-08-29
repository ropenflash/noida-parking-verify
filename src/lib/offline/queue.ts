const DB_NAME = "npv-offline";
const STORE = "drafts";

export type OfflineDraft = {
  id: string;
  createdAt: string;
  payload: unknown;
  status: "queued";
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueDraft(payload: unknown) {
  const db = await openDb();
  const draft: OfflineDraft = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    payload,
    status: "queued",
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(draft);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return draft.id;
}

export async function listQueuedDrafts(): Promise<OfflineDraft[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as OfflineDraft[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedDraft(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
