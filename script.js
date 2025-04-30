let mediaData = [];
let viewedItems = new Set(JSON.parse(localStorage.getItem('viewedItems') || '[]'));

// Load CSV file from GitHub repository
function loadCSV() {
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = '';

  fetch('data.csv')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load data.csv');
      }
      return response.text();
    })
    .then(csvText => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          if (results.errors.length > 0) {
            errorMessage.textContent = 'Error parsing CSV: ' + results.errors.map(e => e.message).join('; ');
            console.error('CSV parsing errors:', results.errors);
          }

          if (!results.data || results.data.length === 0) {
            errorMessage.textContent = 'CSV file is empty or invalid.';
            return;
          }

          // Check required columns
          const requiredColumns = ['id', 'url', 'title'];
          const firstRow = results.data[0];
          const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
          if (missingColumns.length > 0) {
            errorMessage.textContent = 'Missing required columns in CSV: ' + missingColumns.join(', ');
            return;
          }

          // Filter valid rows
          mediaData = results.data.filter(item => item.id && item.url && item.title);
          if (mediaData.length === 0) {
            errorMessage.textContent = 'No valid data found in CSV. Ensure each row has id, url, and title.';
            return;
          }

          renderMedia();
        },
        error: function (err) {
          errorMessage.textContent = 'Error parsing CSV: ' + err.message;
          console.error('Error parsing CSV:', err);
        }
      });
    })
    .catch(err => {
      errorMessage.textContent = 'Error loading CSV file: ' + err.message;
      console.error('Error loading CSV:', err);
    });
}

// Render media grid
function renderMedia() {
  const grid = document.getElementById('mediaGrid');
  const errorMessage = document.getElementById('errorMessage');
  grid.innerHTML = '';
  errorMessage.textContent = '';

  if (!mediaData || mediaData.length === 0) {
    errorMessage.textContent = 'No media data to display.';
    return;
  }

  mediaData.forEach(item => {
    const card = document.createElement('div');
    card.className = 'media-card';
    card.onclick = () => playVideo(item.url, item.title, item.id);

    // Thumbnail
    const thumb = item.thumb || 'https://via.placeholder.com/150';
    const viewedMark = viewedItems.has(item.id) ? '<span class="viewed">Viewed</span>' : '';

    // Handle optional fields
    const size = item.size_formatted || 'Unknown';
    const uploadTime = item.how_long_ago || 'Unknown';

    card.innerHTML = `
      <img src="${thumb}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/150'">
      ${viewedMark}
      <p><b>${item.title}</b></p>
      <p>Size: ${size}</p>
      <p>Uploaded: ${uploadTime}</p>
      <button onclick="event.stopPropagation(); markAsViewed('${item.id}')">Mark as ${viewedItems.has(item.id) ? 'Unviewed' : 'Viewed'}</button>
    `;

    grid.appendChild(card);
  });
}

// Play video in modal
function playVideo(url, title, id) {
  const modal = document.getElementById('videoModal');
  const video = document.getElementById('modalVideo');
  const videoTitle = document.getElementById('videoTitle');

  // Reset video
  video.src = '';
  videoTitle.textContent = title;

  // Try loading video
  video.src = url;
  video.load();

  video.onerror = (error) => {
    // Chỉ hiển thị lỗi nếu video thực sự không tải được
    if (video.src && !video.paused && video.currentSrc !== '') {
      console.error(`Failed to load video: ${url}`, error);
      alert('Failed to load video. Please check the URL or try another video.');
    } else {
      console.log(`Video load ignored (likely due to modal close): ${url}`);
    }
    closeModal();
  };

  video.onloadeddata = () => {
    modal.style.display = 'flex';
    video.play().catch(err => {
      console.error(`Failed to play video: ${url}`, err);
      alert('Failed to play video. Please check the video format or try another.');
      closeModal();
    });
    // Auto-mark as viewed
    if (!viewedItems.has(id)) {
      markAsViewed(id);
    }
  };
}

// Close modal
function closeModal() {
  const modal = document.getElementById('videoModal');
  const video = document.getElementById('modalVideo');
  video.onerror = null; // Xóa sự kiện onerror để ngăn lỗi khi đóng
  video.pause();
  video.src = '';
  video.load();
  document.getElementById('videoTitle').textContent = '';
  modal.style.display = 'none';
}

// Mark item as viewed/unviewed
function markAsViewed(id) {
  if (viewedItems.has(id)) {
    viewedItems.delete(id);
  } else {
    viewedItems.add(id);
  }
  localStorage.setItem('viewedItems', JSON.stringify([...viewedItems]));
  renderMedia();
}

// Sort media
function sortMedia() {
  const sortKey = document.getElementById('sort').value;
  mediaData.sort((a, b) => {
    if (sortKey === 'size_formatted') {
      const sizeA = parseFloat(a.size_formatted) || 0;
      const sizeB = parseFloat(b.size_formatted) || 0;
      return sizeB - sizeA;
    }
    return a[sortKey]?.localeCompare(b[sortKey]) || 0;
  });
  renderMedia();
}

// Close modal when clicking outside

document.getElementById('videoModal').onclick = function (e) {

  if (e.target === this) closeModal();

};

// Load CSV when the page loads
window.onload = loadCSV;
