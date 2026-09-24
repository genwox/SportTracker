window.liveDrafts = (() => {
    const dbName = 'sporttracker-live-v1';
    const storeName = 'drafts';
    let dbPromise;
    let watcherId = 0;
    const watchers = new Map();

    function open() {
        dbPromise ??= new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);
            request.onupgradeneeded = () => request.result.createObjectStore(storeName);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return dbPromise;
    }

    async function scopedKey(owner, key) {
        if (!owner) throw new Error('Sign in before using live drafts.');
        const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(owner));
        const hash = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
        return `${hash}:${key}`;
    }

    async function transact(owner, key, mode, operation) {
        const db = await open();
        const scoped = await scopedKey(owner, key);
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, mode);
            const request = operation(transaction.objectStore(storeName), scoped);
            let result;
            request.onsuccess = () => { result = request.result; };
            transaction.oncomplete = () => resolve(result);
            request.onerror = () => reject(request.error);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    return {
        get: (owner, key) => transact(owner, key, 'readonly', (store, scoped) => store.get(scoped)),
        put: (owner, key, value) => transact(owner, key, 'readwrite', (store, scoped) => store.put(value, scoped)),
        remove: (owner, key) => transact(owner, key, 'readwrite', (store, scoped) => store.delete(scoped)),
        async migrate(fromOwner, toOwner) {
            const fromPrefix = await scopedKey(fromOwner, '');
            const toPrefix = await scopedKey(toOwner, '');
            if (fromPrefix === toPrefix) return;
            const db = await open();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                const cursorRequest = store.openCursor();
                cursorRequest.onsuccess = () => {
                    const cursor = cursorRequest.result;
                    if (!cursor) return;
                    if (String(cursor.key).startsWith(fromPrefix)) {
                        store.put(cursor.value, toPrefix + String(cursor.key).slice(fromPrefix.length));
                        cursor.delete();
                    }
                    cursor.continue();
                };
                cursorRequest.onerror = () => reject(cursorRequest.error);
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        },
        async list(owner, prefix) {
            const db = await open();
            const scoped = await scopedKey(owner, prefix);
            return new Promise((resolve, reject) => {
                const values = [];
                const request = db.transaction(storeName, 'readonly').objectStore(storeName).openCursor();
                request.onsuccess = () => {
                    const cursor = request.result;
                    if (!cursor) { resolve(values); return; }
                    if (String(cursor.key).startsWith(scoped)) values.push(cursor.value);
                    cursor.continue();
                };
                request.onerror = () => reject(request.error);
            });
        },
        isOnline: () => navigator.onLine,
        watchOnline(dotNetRef) {
            const notify = () => dotNetRef.invokeMethodAsync('OnNetworkChanged', navigator.onLine);
            window.addEventListener('online', notify);
            window.addEventListener('offline', notify);
            const id = ++watcherId;
            watchers.set(id, notify);
            return id;
        },
        unwatchOnline(id) {
            const notify = watchers.get(id);
            if (!notify) return;
            window.removeEventListener('online', notify);
            window.removeEventListener('offline', notify);
            watchers.delete(id);
        }
    };
})();
