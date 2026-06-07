// Player principal com suporte a cache, duração para vídeos e recuperação de falhas
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

// Evita suspensão de tela (Wake Lock)
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => console.log('Wake Lock released'));
    }
  } catch (err) { console.warn('Wake Lock não suportado', err); }
}
requestWakeLock();

// Carrega playlist (primeiro tenta IndexedDB, depois playlist.json)
async function loadPlaylist() {
  try {
    const dbPlaylist = await loadPlaylistFromDB();
    if (dbPlaylist && dbPlaylist.length > 0) {
      playlist = dbPlaylist;
    } else {
      const res = await fetch('playlist.json');
      const data = await res.json();
      playlist = data.playlist;
      await savePlaylist(playlist);
    }
    currentIndex = 0;
    showItem();
  } catch (error) {
    console.error('Erro ao carregar playlist, usando fallback', error);
    playlist = [{ tipo: 'imagem', url: 'https://via.placeholder.com/1920x1080?text=Erro+de+conexão', duracao: 5 }];
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
      playerDiv.innerHTML = `<img src="${item.url}" alt="slide" style="width:100%;height:100%;object-fit:contain" loading="eager">`;
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
  currentIndex = (currentIndex + 1) % playlist.length;
  showItem();
}

// Iniciar player
loadPlaylist();

// Recuperar foco após perda de conexão
window.addEventListener('online', () => loadPlaylist());
window.addEventListener('offline', () => console.log('Modo offline ativo'));