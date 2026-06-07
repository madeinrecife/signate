// js/admin.js - Painel administrativo com correção de salvamento e publicação
document.addEventListener('DOMContentLoaded', async () => {
  const playlistContainer = document.getElementById('playlistContainer');
  const addBtn = document.getElementById('addBtn');
  const publishBtn = document.getElementById('publishBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  // Função para renderizar a playlist na tela do admin
  async function renderPlaylist() {
    const items = await loadPlaylistFromDB();
    if (!playlistContainer) return;
    if (!items || items.length === 0) {
      playlistContainer.innerHTML = '<p>Playlist vazia. Adicione mídias abaixo.</p>';
      return;
    }
    playlistContainer.innerHTML = items.map((item, idx) => `
      <div class='playlist-item' data-index='${idx}'>
        <div style="flex:1">
          <strong>${item.tipo.toUpperCase()}</strong><br>
          <small>${item.url.substring(0, 60)}${item.url.length > 60 ? '...' : ''}</small><br>
          <span>⏱️ ${item.duracao}s</span>
        </div>
        <button onclick='removeItem(${idx})' style="background:#c0392b;">🗑️ Remover</button>
      </div>
    `).join('');
  }

  // Tornar removeItem global para ser chamado pelo onclick
  window.removeItem = async (index) => {
    const items = await loadPlaylistFromDB();
    if (index >= 0 && index < items.length) {
      items.splice(index, 1);
      await savePlaylist(items);
      await renderPlaylist();
      // Notifica o player (opcional)
      notifyPlayerUpdate();
    }
  };

  // Adicionar nova mídia
  addBtn?.addEventListener('click', async () => {
    const url = document.getElementById('mediaUrl').value.trim();
    const tipo = document.getElementById('mediaType').value;
    let duracao = parseInt(document.getElementById('duration').value, 10);

    if (!url) {
      alert('❌ Informe a URL da mídia (imagem, vídeo ou PDF)');
      return;
    }
    if (isNaN(duracao) || duracao < 1) duracao = 10;

    // Validação simples para URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('⚠️ Use URLs completas com http:// ou https://');
      return;
    }

    const items = await loadPlaylistFromDB();
    items.push({ tipo, url, duracao });
    await savePlaylist(items);
    
    // Limpa campos
    document.getElementById('mediaUrl').value = '';
    document.getElementById('duration').value = '10';
    await renderPlaylist();
    
    // Notifica o player (opcional)
    notifyPlayerUpdate();
    alert('✅ Mídia adicionada! Clique em "Publicar player" para atualizar a exibição.');
  });

  // Publicar alterações (solicita ao service worker que avise o player)
  publishBtn?.addEventListener('click', async () => {
    // Primeiro garante que a playlist atual está salva (já está)
    // Em seguida, tenta notificar o player via Service Worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'PLAYLIST_UPDATED' });
      alert('📡 Publicado! O player será atualizado em alguns segundos.');
    } else {
      // Fallback: apenas recarrega o player quando ele estiver ativo
      alert('⚠️ Service Worker não ativo. O player precisará ser recarregado manualmente (F5).');
    }
  });

  // Sair (voltar para o player)
  logoutBtn?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // Função auxiliar para tentar notificar o player via BroadcastChannel (alternativa)
  function notifyPlayerUpdate() {
    try {
      const channel = new BroadcastChannel('sparta_player');
      channel.postMessage({ action: 'reloadPlaylist' });
      channel.close();
    } catch(e) { /* ignora se não suportado */ }
  }

  // Inicializa
  await renderPlaylist();
});
