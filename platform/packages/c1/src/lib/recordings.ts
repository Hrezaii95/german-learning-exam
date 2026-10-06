const databaseName = 'lingovo-c1-recordings';
type SavedRecording = { blob: Blob; savedAt: number };

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('recordings');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadRecording(id: string): Promise<SavedRecording | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('recordings', 'readonly');
    const request = transaction.objectStore('recordings').get(id);
    request.onsuccess = () => resolve(request.result as SavedRecording | undefined);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onabort = () => { db.close(); reject(transaction.error); };
  });
}

export async function saveRecording(id: string, blob: Blob): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('recordings', 'readwrite');
    transaction.objectStore('recordings').put({blob, savedAt: Date.now()}, id);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error); };
  });
}
