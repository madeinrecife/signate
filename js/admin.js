// Painel administrativo (simplificado)
document.addEventListener('DOMContentLoaded', async () => {
  const playlistContainer = document.getElementById('playlistContainer');
  const addBtn = document.getElementById('addBtn');
  const publishBtn = document.getElementById('publishBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  async function renderPlaylist() {
    const items = await loadPlaylistFromDB();
    if (!playlistContainer) return;
    playlistContainer.innerHTML = items.map((item, idx) => `
      <div class='playlist-item'>
        <span><strong>${item.tipo}</strong> - ${item.url.substring(0, 50)}... (${item.duracao}s)</span>
        <button onclick='removeItem(${idx})'>🗑️</button>
      </div>
    `).join('');
  }

  window.removeItem = async (index) => {
    const items = await loadPlaylistFromDB();
    items.splice(index, 1);
    await savePlaylist(items);
    renderPlaylist();
  };

  addBtn?.addEventListener('click', async () => {
    const url = document.getElementById('mediaUrl').value;
    const tipo = document.getElementById('mediaType').value;
    const duracao = parseInt(document.getElementById('duration').value);
    if (!url) return alert('Informe a URL');
    const items = await loadPlaylistFromDB();
    items.push({ tipo, url, duracao });
    await savePlaylist(items);
    renderPlaylist();
    document.getElementById('mediaUrl').value = '';
  });

  publishBtn?.addEventListener('click', async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'UPDATE_CACHE' });
    }
    alert('Playlist publicada! O player será atualizado em breve.');
  });

  logoutBtn?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  renderPlaylist();
});