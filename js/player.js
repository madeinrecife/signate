// js/player.js - Player principal com suporte a recarga dinâmica da playlist
let currentIndex = 0;
let playlist = [];
let timeoutId = null;
let currentVideo = null;
let wakeLock = null;

const playerDiv = document.getElementById('player');
const clockDiv = document.getElementById('clock');

// Relógio
function updateClock() {
  clockDiv.innerText = new Date().toLocaleTimeString('pt-BR');
}
setInterval(updateClock, 1000);
updateClock();

// Tela cheia
document.getElementById('fullscreenBtn').addEventListener('click', () => {
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  }
});

// Wake Lock (tela sempre acesa)
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => console.log('Wake Lock liberado'));
    }
  } catch (err) { console.warn('Wake Lock não suportado', err); }
}
requestWakeLock();

// Carrega playlist do IndexedDB (fallback para playlist.json)
async function loadPlaylist() {
  try {
    let items = await loadPlaylistFromDB();
    if (!items || items.length === 0) {
      // Fallback: carrega do arquivo JSON estático
      const res = await fetch('playlist.json');
      const data = await res.json();
      items = data.playlist;
      if (items && items.length) await savePlaylist(items);
    }
    if (items && items.length) {
      playlist = items;
      currentIndex = currentIndex % playlist.length;
      showItem();
    } else {
      throw new Error('Playlist vazia');
    }
  } catch (error) {
    console.error('Erro ao carregar playlist:', error);
    playlist = [{ tipo: 'imagem', url: 'https://via.placeholder.com/1920x1080?text=Sem+playlist', duracao: 5 }];
    showItem();
  }
}

function showItem() {
  if (timeoutId) clearTimeout(timeoutId);
  if (currentVideo) {
    currentVideo.pause();
    currentVideo.src = '';
    currentVideo = null;
  }

  const item = playlist[currentIndex];
  if (!item) return;

  switch (item.tipo) {
    case 'imagem':
      playerDiv.innerHTML = `<img src="${item.url}" alt="slide" style="width:100%;height:100%;object-fit:contain" loading="eager" onerror="this.src='https://via.placeholder.com/1920x1080?error=404'">`;
      scheduleNext(item.duracao || 10);
      break;
    case 'video':
      playerDiv.innerHTML = `<video style="width:100%;height:100%;" src="${item.url}" autoplay muted playsinline></video>`;
      const video = playerDiv.querySelector('video');
      currentVideo = video;
      const durationSec = item.duracao && item.duracao > 0 ? item.duracao : (video.duration || 10);
      video.onended = () => nextItem();
      video.onerror = () => {
        console.warn('Erro no vídeo, pulando');
        nextItem();
      };
      scheduleNext(durationSec);
      break;
    case 'pdf':
      playerDiv.innerHTML = `<iframe src="${item.url}" style="width:100%;height:100%;border:none" title="documento"></iframe>`;
      scheduleNext(item.duracao || 15);
      break;
    default:
      scheduleNext(5);
  }
}

function scheduleNext(seconds) {
  timeoutId = setTimeout(() => nextItem(), seconds * 1000);
}

function nextItem() {
  if (playlist.length === 0) {
    loadPlaylist();
    return;
  }
  currentIndex = (currentIndex + 1) % playlist.length;
  showItem();
}

// Recarregar playlist sob demanda (usado pelo admin)
async function reloadPlaylist() {
  console.log('🔄 Recarregando playlist por solicitação do admin');
  const oldIndex = currentIndex;
  await loadPlaylist();  // atualiza a variável 'playlist'
  // Tenta manter o mesmo índice relativo, mas evita erro se playlist mudou
  if (currentIndex >= playlist.length) currentIndex = 0;
  showItem();
}

// Escuta mensagens do Service Worker (admin publicou)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'PLAYLIST_UPDATED') {
      reloadPlaylist();
    }
  });
}

// Alternativa: BroadcastChannel (funciona mesmo sem service worker ativo)
const channel = new BroadcastChannel('sparta_player');
channel.onmessage = (event) => {
  if (event.data && event.data.action === 'reloadPlaylist') {
    reloadPlaylist();
  }
};

// Iniciar
loadPlaylist();

// Recuperar conexão
window.addEventListener('online', () => loadPlaylist());
