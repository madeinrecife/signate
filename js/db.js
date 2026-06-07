// js/db.js - IndexedDB com tratamento de erro e funções assíncronas seguras
const DB_NAME = 'SpartaPlayerDB';
const DB_VERSION = 2;  // incrementado para garantir schema
const STORE_PLAYLIST = 'playlist';

let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance && dbInstance.name === DB_NAME) {
      resolve(dbInstance);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_PLAYLIST)) {
        db.createObjectStore(STORE_PLAYLIST, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function savePlaylist(playlistArray) {
  const db = await openDB();
  const tx = db.transaction(STORE_PLAYLIST, 'readwrite');
  const store = tx.objectStore(STORE_PLAYLIST);
  await store.clear();
  for (const item of playlistArray) {
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
