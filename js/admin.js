// js/admin.js - Gerenciamento completo com tabela, editar e excluir
let currentEditIndex = null;

// Referências DOM
const tbody = document.getElementById('playlistTbody');
const addBtn = document.getElementById('addBtn');
const publishBtn = document.getElementById('publishBtn');
const logoutBtn = document.getElementById('logoutBtn');
const statusDiv = document.getElementById('statusMsg');
const editModal = document.getElementById('editModal');
const editTipo = document.getElementById('editTipo');
const editUrl = document.getElementById('editUrl');
const editDuracao = document.getElementById('editDuracao');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Função para mostrar mensagem temporária
function showMessage(text, isError = false) {
  statusDiv.innerHTML = `<span style="color: ${isError ? '#e74c3c' : '#2ecc71'}">${text}</span>`;
  setTimeout(() => {
    if (statusDiv.innerHTML === `<span style="color: ${isError ? '#e74c3c' : '#2ecc71'}">${text}</span>`) {
      statusDiv.innerHTML = '';
    }
  }, 3000);
}

// Renderiza a tabela com os dados da playlist
async function renderPlaylistTable() {
  try {
    const items = await loadPlaylistFromDB();
    if (!items || items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">📭 Playlist vazia. Adicione mídias acima.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    items.forEach((item, idx) => {
      const row = tbody.insertRow();
      // Índice
      const cellIdx = row.insertCell(0);
      cellIdx.textContent = idx + 1;
      // Tipo com badge
      const cellTipo = row.insertCell(1);
      const tipoClass = `tipo-${item.tipo}`;
      cellTipo.innerHTML = `<span class="tipo-badge ${tipoClass}">${item.tipo.toUpperCase()}</span>`;
      // URL
      const cellUrl = row.insertCell(2);
      cellUrl.className = 'url-cell';
      cellUrl.title = item.url;
      cellUrl.textContent = item.url.length > 70 ? item.url.substring(0, 70) + '…' : item.url;
      // Duração
      const cellDur = row.insertCell(3);
      cellDur.textContent = item.duracao;
      // Ações (botões)
      const cellAcoes = row.insertCell(4);
      const btnEdit = document.createElement('button');
      btnEdit.textContent = '✏️';
      btnEdit.className = 'acao editar';
      btnEdit.title = 'Editar';
      btnEdit.onclick = () => openEditModal(idx);
      const btnDel = document.createElement('button');
      btnDel.textContent = '🗑️';
      btnDel.className = 'acao excluir';
      btnDel.title = 'Excluir';
      btnDel.onclick = () => deleteItem(idx);
      cellAcoes.appendChild(btnEdit);
      cellAcoes.appendChild(btnDel);
    });
  } catch (err) {
    console.error('Erro ao renderizar tabela', err);
    tbody.innerHTML = '<tr><td colspan="5">❌ Erro ao carregar playlist</td></tr>';
  }
}

// Abrir modal com os dados do item a ser editado
function openEditModal(index) {
  loadPlaylistFromDB().then(items => {
    if (!items[index]) return;
    currentEditIndex = index;
    editTipo.value = items[index].tipo;
    editUrl.value = items[index].url;
    editDuracao.value = items[index].duracao;
    editModal.style.display = 'flex';
  });
}

// Salvar edição
async function saveEdit() {
  if (currentEditIndex === null) return;
  const newTipo = editTipo.value;
  const newUrl = editUrl.value.trim();
  const newDuracao = parseInt(editDuracao.value, 10);

  if (!newUrl) {
    showMessage('❌ URL não pode estar vazia', true);
    return;
  }
  if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
    showMessage('⚠️ URL deve começar com http:// ou https://', true);
    return;
  }
  if (isNaN(newDuracao) || newDuracao < 1) {
    showMessage('⚠️ Duração inválida (mínimo 1 segundo)', true);
    return;
  }

  const items = await loadPlaylistFromDB();
  items[currentEditIndex] = {
    tipo: newTipo,
    url: newUrl,
    duracao: newDuracao
  };
  await savePlaylist(items);
  await renderPlaylistTable();
  closeModal();
  showMessage('✅ Item editado com sucesso!');
  notifyPlayerUpdate(); // opcional
}

// Excluir item
async function deleteItem(index) {
  if (confirm('Remover este item da playlist?')) {
    const items = await loadPlaylistFromDB();
    items.splice(index, 1);
    await savePlaylist(items);
    await renderPlaylistTable();
    showMessage('🗑️ Item removido');
    notifyPlayerUpdate();
  }
}

// Fechar modal
function closeModal() {
  editModal.style.display = 'none';
  currentEditIndex = null;
}

// Notificar player (via BroadcastChannel ou Service Worker)
function notifyPlayerUpdate() {
  try {
    const channel = new BroadcastChannel('sparta_player');
    channel.postMessage({ action: 'reloadPlaylist' });
    channel.close();
  } catch(e) {}
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'PLAYLIST_UPDATED' });
  }
}

// Adicionar nova mídia
async function addMedia() {
  const url = document.getElementById('mediaUrl').value.trim();
  const tipo = document.getElementById('mediaType').value;
  let duracao = parseInt(document.getElementById('duration').value, 10);

  if (!url) {
    showMessage('❌ Informe a URL da mídia', true);
    return;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    showMessage('⚠️ Use URLs completas com http:// ou https://', true);
    return;
  }
  if (isNaN(duracao) || duracao < 1) duracao = 10;

  const items = await loadPlaylistFromDB();
  items.push({ tipo, url, duracao });
  await savePlaylist(items);
  await renderPlaylistTable();
  document.getElementById('mediaUrl').value = '';
  document.getElementById('duration').value = '10';
  showMessage('✅ Mídia adicionada! Clique em "Publicar player" para atualizar a exibição.');
  notifyPlayerUpdate();
}

// Publicar (solicitar recarga no player)
function publishToPlayer() {
  notifyPlayerUpdate();
  showMessage('📡 Comando enviado! O player será atualizado em alguns segundos.');
}

// Event Listeners
addBtn.addEventListener('click', addMedia);
publishBtn.addEventListener('click', publishToPlayer);
logoutBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
saveEditBtn.addEventListener('click', saveEdit);
cancelEditBtn.addEventListener('click', closeModal);

// Fechar modal clicando fora
window.addEventListener('click', (e) => {
  if (e.target === editModal) closeModal();
});

// Inicializar
renderPlaylistTable();
