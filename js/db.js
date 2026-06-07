// IndexedDB helper para armazenar playlist e mídias offline
const DB_NAME = 'SpartaPlayerDB';
const DB_VERSION = 1;
const STORE_PLAYLIST = 'playlist';
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db && db.name === DB_NAME) return resolve(db);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const dbRef = event.target.result;
      if (!dbRef.objectStoreNames.contains(STORE_PLAYLIST)) {
        dbRef.createObjectStore(STORE_PLAYLIST, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function savePlaylist(playlistArray) {
  const db = await openDB();
  const tx = db.transaction(STORE_PLAYLIST, 'readwrite');
  const store = tx.objectStore(STORE_PLAYLIST);
  await store.clear();
  for (let item of playlistArray) {
    store.add(item);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

async function loadPlaylistFromDB() {
  const db = await openDB();
  const tx = db.transaction(STORE_PLAYLIST, 'readonly');
  const store = tx.objectStore(STORE_PLAYLIST);
  const items = await store.getAll();
  return items;
}