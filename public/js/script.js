'use strict';

const imageInput = document.getElementById('imageInput');
const dropZone = document.getElementById('dropZone');
const chooseButton = document.getElementById('chooseButton');
const predictButton = document.getElementById('validateButton');
const selectedFile = document.getElementById('selectedFile');
const fileName = document.getElementById('fileName');
const fileMeta = document.getElementById('fileMeta');
const removeButton = document.getElementById('removeButton');
const previewArea = document.getElementById('previewArea');
const imagePreview = document.getElementById('imagePreview');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const statusBox = document.getElementById('statusBox');
const statusText = document.getElementById('statusText');
const predictionResult = document.getElementById('predictionResult');
const predictionLabel = document.getElementById('predictionLabel');
const predictionConfidence = document.getElementById('predictionConfidence');
const predictionNote = document.getElementById('predictionNote');
const scoreBar = document.getElementById('scoreBar');

const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const historyStatus = document.getElementById('historyStatus');
const historyLoading = document.getElementById('historyLoading');
const refreshHistoryButton = document.getElementById('refreshHistoryButton');
const clearHistoryButton = document.getElementById('clearHistoryButton');

let currentFile = null;
let previewUrl = null;

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_FILE_SIZE = 4 * 1024 * 1024;

function setStatus(message, type = 'info') {
  statusText.textContent = message;
  statusBox.classList.remove('success', 'error');
  if (type === 'success' || type === 'error') statusBox.classList.add(type);
  const mark = statusBox.querySelector('.status-mark');
  if (mark) mark.textContent = type === 'success' ? '✓' : type === 'error' ? '!' : 'i';
}

function clearPrediction() {
  predictionResult.hidden = true;
  predictionLabel.textContent = '-';
  predictionConfidence.textContent = '-';
  predictionNote.textContent = 'Skor softmax bukan kepastian asal-usul gambar.';
  scoreBar.style.width = '0%';
}

function clearPreview() {
  imagePreview.onload = null;
  imagePreview.onerror = null;
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  imagePreview.removeAttribute('src');
  imagePreview.hidden = true;
  previewPlaceholder.hidden = false;
  previewArea.classList.remove('has-image');
}

function resetSelection() {
  currentFile = null;
  imageInput.value = '';
  selectedFile.hidden = true;
  dropZone.hidden = false;
  predictButton.disabled = true;
  predictButton.textContent = 'Prediksi gambar';
  fileName.textContent = '';
  fileMeta.textContent = '';
  clearPreview();
  clearPrediction();
  setStatus('Pilih gambar, lalu tekan “Prediksi gambar”.');
}

function getFileExtension(file) {
  const match = file.name.match(/\.([^.]+)$/);
  return match ? match[1].toUpperCase() : 'FILE';
}

function selectFile(file) {
  if (!file) return;

  const hasValidExtension = ALLOWED_EXTENSIONS.test(file.name);
  const hasValidMime = !file.type || ALLOWED_TYPES.has(file.type);
  if (!hasValidExtension || !hasValidMime) {
    resetSelection();
    setStatus('Format belum didukung. Pilih JPG, JPEG, PNG, atau WEBP.', 'error');
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    resetSelection();
    setStatus('Ukuran gambar terlalu besar. Maksimal 4 MB.', 'error');
    return;
  }

  currentFile = file;
  dropZone.hidden = true;
  selectedFile.hidden = false;
  fileName.textContent = file.name;
  fileMeta.textContent = `${getFileExtension(file)} · ${(file.size / 1024).toFixed(1)} KB · Memuat pratinjau...`;
  predictButton.disabled = false;
  clearPrediction();
  clearPreview();

  const selectedPreviewUrl = URL.createObjectURL(file);
  previewUrl = selectedPreviewUrl;
  imagePreview.onload = () => {
    if (!currentFile || previewUrl !== selectedPreviewUrl) return;
    previewArea.classList.add('has-image');
    imagePreview.hidden = false;
    previewPlaceholder.hidden = true;
    fileMeta.textContent = `${getFileExtension(file)} · ${imagePreview.naturalWidth} × ${imagePreview.naturalHeight} px · ${(file.size / 1024).toFixed(1)} KB`;
    setStatus('Gambar berhasil dimuat. Tekan “Prediksi gambar” untuk menjalankan model.');
  };
  imagePreview.onerror = () => {
    if (previewUrl !== selectedPreviewUrl) return;
    resetSelection();
    setStatus('File tidak dapat dibaca sebagai gambar. Coba pilih file gambar lain.', 'error');
  };
  imagePreview.src = selectedPreviewUrl;
}

function formatConfidence(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${(number * 100).toFixed(2)}%` : '-';
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Waktu tidak tersedia';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function renderHistory(items) {
  historyList.replaceChildren();
  const hasItems = Array.isArray(items) && items.length > 0;
  historyEmpty.hidden = hasItems;
  clearHistoryButton.disabled = !hasItems;

  if (!hasItems) return;

  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'history-card';

    const main = document.createElement('div');
    main.className = 'history-card-main';

    const title = document.createElement('strong');
    title.className = 'history-filename';
    title.textContent = item.original_filename || 'Gambar tanpa nama';

    const meta = document.createElement('span');
    meta.className = 'history-date';
    meta.textContent = formatDate(item.created_at);

    main.append(title, meta);

    const result = document.createElement('div');
    result.className = 'history-result';

    const label = document.createElement('span');
    label.className = `history-badge ${item.predicted_label === 'Human' ? 'human' : 'ai'}`;
    label.textContent = item.predicted_label || 'Tidak diketahui';

    const confidence = document.createElement('strong');
    confidence.className = 'history-confidence';
    confidence.textContent = formatConfidence(item.confidence);

    result.append(label, confidence);

    const remove = document.createElement('button');
    remove.className = 'history-delete-button';
    remove.type = 'button';
    remove.textContent = 'Hapus';
    remove.setAttribute('aria-label', `Hapus riwayat ${item.original_filename || ''}`);
    remove.addEventListener('click', () => deleteHistoryItem(item.id));

    card.append(main, result, remove);
    historyList.append(card);
  }
}

async function loadHistory() {
  historyLoading.hidden = false;
  historyStatus.textContent = 'Mengambil riwayat dari database...';
  refreshHistoryButton.disabled = true;
  try {
    const response = await fetch('/api/history', { method: 'GET', credentials: 'same-origin' });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || 'Riwayat gagal dimuat.');
    renderHistory(result.items);
    historyStatus.textContent = result.items.length
      ? `${result.items.length} riwayat terbaru ditampilkan.`
      : 'Riwayat analisis akan muncul setelah prediksi berhasil disimpan.';
  } catch (error) {
    historyList.replaceChildren();
    historyEmpty.hidden = true;
    clearHistoryButton.disabled = true;
    historyStatus.textContent = error.message || 'Tidak dapat terhubung ke database.';
  } finally {
    historyLoading.hidden = true;
    refreshHistoryButton.disabled = false;
  }
}

async function deleteHistoryItem(id) {
  if (!window.confirm('Hapus riwayat deteksi ini?')) return;
  try {
    const response = await fetch(`/api/history/${encodeURIComponent(id)}`, {
      method: 'DELETE', credentials: 'same-origin'
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || 'Riwayat gagal dihapus.');
    await loadHistory();
  } catch (error) {
    historyStatus.textContent = error.message || 'Tidak dapat menghapus riwayat.';
  }
}

async function deleteAllHistory() {
  if (!window.confirm('Hapus seluruh riwayat deteksi pada browser ini? Tindakan ini tidak dapat dibatalkan.')) return;
  clearHistoryButton.disabled = true;
  try {
    const response = await fetch('/api/history', {
      method: 'DELETE', credentials: 'same-origin'
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || 'Riwayat gagal dihapus.');
    await loadHistory();
  } catch (error) {
    historyStatus.textContent = error.message || 'Tidak dapat menghapus seluruh riwayat.';
    clearHistoryButton.disabled = false;
  }
}

chooseButton.addEventListener('click', () => imageInput.click());
dropZone.addEventListener('click', (event) => {
  if (event.target.closest('button')) return;
  imageInput.click();
});
dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    imageInput.click();
  }
});
imageInput.addEventListener('change', () => selectFile(imageInput.files && imageInput.files[0]));
removeButton.addEventListener('click', resetSelection);

for (const eventName of ['dragenter', 'dragover']) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add('drag-over');
  });
}
for (const eventName of ['dragleave', 'drop']) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove('drag-over');
  });
}
dropZone.addEventListener('drop', (event) => {
  const file = event.dataTransfer && event.dataTransfer.files[0];
  if (file) selectFile(file);
});

predictButton.addEventListener('click', async () => {
  if (!currentFile) return;
  const fileBeingPredicted = currentFile;
  const formData = new FormData();
  formData.append('image', fileBeingPredicted);

  predictButton.disabled = true;
  predictButton.textContent = 'Memproses...';
  clearPrediction();
  setStatus('Memeriksa gambar dan menjalankan model Machine Learning.');

  try {
    const response = await fetch('/predict-image', {
      method: 'POST', body: formData, credentials: 'same-origin'
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || 'Prediksi gagal dijalankan.');
    if (currentFile !== fileBeingPredicted) return;

    const confidence = Number(result.confidence);
    if (!Number.isFinite(confidence)) throw new Error('Server tidak mengirim skor prediksi yang valid.');

    const confidencePercent = Math.min(100, Math.max(0, confidence * 100));
    fileMeta.textContent = `${result.format || getFileExtension(fileBeingPredicted)} · ${result.width} × ${result.height} px · ${result.size_kb} KB`;
    predictionLabel.textContent = result.predicted_label || 'Tidak diketahui';
    predictionConfidence.textContent = `${confidencePercent.toFixed(2)}%`;
    predictionNote.textContent = result.score_note || 'Skor softmax bukan kepastian asal-usul gambar.';
    scoreBar.style.width = `${confidencePercent}%`;
    predictionResult.hidden = false;

    if (result.history_saved) {
      setStatus('Prediksi selesai dan riwayat berhasil disimpan.', 'success');
      await loadHistory();
    } else {
      setStatus(result.history_message || 'Prediksi berhasil, tetapi riwayat belum tersimpan. Periksa koneksi database.', 'error');
    }
  } catch (error) {
    setStatus(error.message || 'Tidak dapat terhubung ke server.', 'error');
  } finally {
    if (currentFile === fileBeingPredicted) {
      predictButton.disabled = false;
      predictButton.textContent = 'Prediksi gambar';
    }
  }
});

refreshHistoryButton.addEventListener('click', loadHistory);
clearHistoryButton.addEventListener('click', deleteAllHistory);

document.querySelectorAll('.main-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.main-nav a').forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
    if (link.getAttribute('href') === '#riwayat') loadHistory();
  });
});

loadHistory();

window.addEventListener('pagehide', () => {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
});
