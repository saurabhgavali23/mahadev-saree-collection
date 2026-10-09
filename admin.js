/**
 * ==============================================================================
 * MAHADEV SAREE COLLECTION - ADMIN PANEL SCRIPT (admin.js)
 * ==============================================================================
 * Complete admin dashboard logic:
 * - Supabase Authentication (login, logout, session persistence across refresh)
 * - Saree CRUD operations (Create, Read, Update, Delete)
 * - Client-side image compression (Canvas resize to 1200px max, JPEG 0.8 quality)
 * - Video Support (Max 15MB, Max 15s duration validation, canvas poster extraction,
 *   direct Supabase Storage upload to 'saree-videos' or YouTube link embedding)
 * - Image reordering (left/right) with cover image designation and deletion
 * - Video and image cleanup from Supabase Storage on saree deletion
 * - Fast 1-click status toggle ("Mark Sold" / "Mark Available")
 * - 1-click saree duplication for quick entry of similar sarees
 * - Live search & filter within the admin inventory list
 * ==============================================================================
 */

(function () {
  'use strict';

  // ----------------------------------------------------------------------------
  // ADMIN STATE
  // ----------------------------------------------------------------------------
  const state = {
    supabaseClient: null,
    currentUser: null,
    allSarees: [],
    editingSareeId: null,      // null for 'Add' mode, number/string for 'Edit' mode
    currentPhotos: [],         // Array of { type: 'existing' | 'new', url?: string, blob?: Blob, previewUrl: string, file?: File }
    videoData: null,           // null | { type: 'existing' | 'new_file' | 'link', videoUrl?: string, posterUrl?: string, file?: File, posterBlob?: Blob, posterPreviewUrl?: string, duration?: number }
    searchQuery: '',
    filterStatus: 'all',
    filterCategory: 'all',
    orphanFiles: null,         // null until first scan, then array of orphan file objects
    isScanningOrphans: false,
    storageTotalFilesCount: 0
  };

  const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800' viewBox='0 0 600 800'%3E%3Crect fill='%23f4ede4' width='600' height='800'/%3E%3Ctext fill='%239c9389' font-family='sans-serif' font-size='24' font-weight='600' x='50%25' y='50%25' text-anchor='middle'%3ENo Photo%3C/text%3E%3C/svg%3E";

  // ----------------------------------------------------------------------------
  // DOM REFERENCES
  // ----------------------------------------------------------------------------
  const dom = {};

  function cacheDom() {
    // Navigation & Auth Header
    dom.adminShopTitle = document.getElementById('admin-shop-title');
    dom.adminUserEmail = document.getElementById('admin-user-email');
    dom.btnLogout = document.getElementById('btn-logout');

    // Views
    dom.authView = document.getElementById('auth-view');
    dom.dashboardView = document.getElementById('dashboard-view');

    // Login Form
    dom.loginForm = document.getElementById('login-form');
    dom.loginEmail = document.getElementById('login-email');
    dom.loginPassword = document.getElementById('login-password');
    dom.loginAlert = document.getElementById('login-alert');
    dom.btnLogin = document.getElementById('btn-login');

    // Tabs
    dom.tabFormBtn = document.getElementById('tab-form-btn');
    dom.tabListBtn = document.getElementById('tab-list-btn');
    dom.tabCleanupBtn = document.getElementById('tab-cleanup-btn');
    dom.tabFormContent = document.getElementById('tab-form-content');
    dom.tabListContent = document.getElementById('tab-list-content');
    dom.tabCleanupContent = document.getElementById('tab-cleanup-content');
    dom.totalSareesCount = document.getElementById('total-sarees-count');
    dom.orphanTabBadge = document.getElementById('orphan-tab-badge');
    dom.formTabLabel = document.getElementById('form-tab-label');

    // Saree Form
    dom.sareeForm = document.getElementById('saree-form');
    dom.formSectionTitle = document.getElementById('form-section-title');
    dom.formSectionDesc = document.getElementById('form-section-desc');
    dom.btnCancelEdit = document.getElementById('btn-cancel-edit');
    dom.sareeEditId = document.getElementById('saree-edit-id');
    dom.btnSaveSaree = document.getElementById('btn-save-saree');
    dom.btnSaveLabel = document.getElementById('btn-save-label');

    // Photo inputs & Preview
    dom.imageFilesInput = document.getElementById('image-files-input');
    dom.cameraFileInput = document.getElementById('camera-file-input');
    dom.btnChoosePhotos = document.getElementById('btn-choose-photos');
    dom.btnTakePhoto = document.getElementById('btn-take-photo');
    dom.photoPreviewGrid = document.getElementById('photo-preview-grid');

    // Video Elements
    dom.btnModeVideoUpload = document.getElementById('btn-mode-video-upload');
    dom.btnModeVideoLink = document.getElementById('btn-mode-video-link');
    dom.videoUploadPane = document.getElementById('video-upload-pane');
    dom.videoLinkPane = document.getElementById('video-link-pane');
    dom.videoFileInput = document.getElementById('video-file-input');
    dom.videoCameraInput = document.getElementById('video-camera-input');
    dom.btnChooseVideo = document.getElementById('btn-choose-video');
    dom.btnRecordVideo = document.getElementById('btn-record-video');
    dom.inputVideoLink = document.getElementById('input-video-link');
    dom.btnApplyVideoLink = document.getElementById('btn-apply-video-link');
    dom.videoPreviewWrap = document.getElementById('video-preview-wrap');
    dom.videoPreviewPlayer = document.getElementById('video-preview-player');
    dom.videoPreviewThumb = document.getElementById('video-preview-thumb');
    dom.videoPreviewInfo = document.getElementById('video-preview-info');
    dom.btnRemoveVideo = document.getElementById('btn-remove-video');
    dom.videoHiddenValidator = document.getElementById('video-hidden-validator');
    dom.videoPosterCanvas = document.getElementById('video-poster-canvas');
    dom.sareeVideoUrl = document.getElementById('saree-video-url');
    dom.sareeVideoPoster = document.getElementById('saree-video-poster');

    // Progress Bar
    dom.uploadProgressWrap = document.getElementById('upload-progress-wrap');
    dom.progressStatusText = document.getElementById('progress-status-text');
    dom.progressPercentText = document.getElementById('progress-percent-text');
    dom.progressBarFill = document.getElementById('progress-bar-fill');

    // Form Fields
    dom.inputName = document.getElementById('input-name');
    dom.inputPrice = document.getElementById('input-price');
    dom.inputFabric = document.getElementById('input-fabric');
    dom.inputCategory = document.getElementById('input-category');
    dom.inputStatus = document.getElementById('input-status');
    dom.inputColor = document.getElementById('input-color');
    dom.inputPattern = document.getElementById('input-pattern');
    dom.inputBorder = document.getElementById('input-border');
    dom.inputOccasion = document.getElementById('input-occasion');
    dom.inputDescription = document.getElementById('input-description');
    dom.fabricSuggestionsList = document.getElementById('fabric-suggestions-list');
    dom.categorySuggestionsList = document.getElementById('category-suggestions-list');

    // List & Inventory
    dom.btnRefreshList = document.getElementById('btn-refresh-list');
    dom.adminSearchInput = document.getElementById('admin-search-input');
    dom.adminStatusFilter = document.getElementById('admin-status-filter');
    dom.adminCategoryFilter = document.getElementById('admin-category-filter');
    dom.adminSareeList = document.getElementById('admin-saree-list');

    // Toast
    dom.adminToast = document.getElementById('admin-toast');
    dom.adminToastMessage = document.getElementById('admin-toast-message');

    // Storage Cleanup DOM
    dom.btnScanOrphans = document.getElementById('btn-scan-orphans');
    dom.btnScanOrphansEmpty = document.getElementById('btn-scan-orphans-empty');
    dom.orphanSummaryGrid = document.getElementById('orphan-summary-grid');
    dom.statTotalStorageFiles = document.getElementById('stat-total-storage-files');
    dom.statActiveFiles = document.getElementById('stat-active-files');
    dom.statOrphanFiles = document.getElementById('stat-orphan-files');
    dom.statOrphanSize = document.getElementById('stat-orphan-size');
    dom.orphanToolbar = document.getElementById('orphan-toolbar');
    dom.orphanSelectAll = document.getElementById('orphan-select-all');
    dom.orphanSelectedCountLabel = document.getElementById('orphan-selected-count-label');
    dom.btnDeleteSelectedOrphans = document.getElementById('btn-delete-selected-orphans');
    dom.btnDeleteAllOrphans = document.getElementById('btn-delete-all-orphans');
    dom.orphanFilesList = document.getElementById('orphan-files-list');
  }

  // ----------------------------------------------------------------------------
  // UTILITIES
  // ----------------------------------------------------------------------------
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatPrice(num) {
    const amount = Number(num) || 0;
    return `${CONFIG.CURRENCY_SYMBOL}${new Intl.NumberFormat('en-IN').format(amount)}`;
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return isoString;
    }
  }

  function getFilenameFromUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
      const clean = url.split('?')[0].split('#')[0];
      const part = clean.split('/').pop();
      return decodeURIComponent(part || '').trim();
    } catch (e) {
      return (url.split('/').pop() || '').trim();
    }
  }

  function showToast(msg) {
    if (!dom.adminToast) return;
    dom.adminToastMessage.textContent = msg;
    dom.adminToast.classList.add('show');
    clearTimeout(dom.adminToast._timer);
    dom.adminToast._timer = setTimeout(() => {
      dom.adminToast.classList.remove('show');
    }, 3000);
  }

  function setProgress(status, percent) {
    if (!dom.uploadProgressWrap) return;
    if (percent === null) {
      dom.uploadProgressWrap.classList.remove('visible');
      return;
    }
    dom.uploadProgressWrap.classList.add('visible');
    dom.progressStatusText.textContent = status;
    dom.progressPercentText.textContent = `${Math.round(percent)}%`;
    dom.progressBarFill.style.width = `${percent}%`;
  }

  // ----------------------------------------------------------------------------
  // CLIENT-SIDE IMAGE COMPRESSION (CANVAS)
  // ----------------------------------------------------------------------------
  function compressImage(file, maxDimension = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = e => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(blob => {
            if (!blob) return reject(new Error('Canvas compression failed'));
            resolve({
              blob: blob,
              previewUrl: canvas.toDataURL('image/jpeg', quality)
            });
          }, 'image/jpeg', quality);
        };
        img.onerror = () => reject(new Error('Failed to load image for compression'));
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
    });
  }

  // ----------------------------------------------------------------------------
  // CLIENT-SIDE VIDEO VALIDATION & POSTER EXTRACTION
  // ----------------------------------------------------------------------------
  /**
   * Validates video size (<= 15MB) and duration (<= 15 seconds),
   * and draws the first frame to canvas to produce a JPEG poster.
   */
  function validateAndExtractPoster(file) {
    const maxMb = CONFIG.MAX_VIDEO_SIZE_MB || 15;
    const maxDuration = CONFIG.MAX_VIDEO_DURATION_SEC || 15;

    // 1. File size check
    if (file.size > maxMb * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return Promise.reject(new Error(`Video is too large (${sizeMb} MB). Maximum allowed is ${maxMb} MB. Record at 720p or trim it.`));
    }

    return new Promise((resolve, reject) => {
      const video = dom.videoHiddenValidator;
      const objUrl = URL.createObjectURL(file);
      video.src = objUrl;
      video.muted = true;
      video.playsInline = true;

      const timeoutId = setTimeout(() => {
        URL.revokeObjectURL(objUrl);
        reject(new Error('Video validation timed out. Ensure the file is a valid MP4 or WebM video.'));
      }, 10000);

      video.onloadedmetadata = () => {
        const duration = video.duration;
        // Allow slight wiggle room of 0.5s for 15s camera recording
        if (duration > maxDuration + 0.5) {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(objUrl);
          return reject(new Error(`Video is too long (${duration.toFixed(1)}s). Maximum allowed is ${maxDuration} seconds. Record at 720p or trim it.`));
        }

        // Seek slightly forward to capture a vibrant non-black frame
        video.currentTime = Math.min(0.2, duration / 2);
      };

      video.onseeked = () => {
        clearTimeout(timeoutId);
        try {
          const canvas = dom.videoPosterCanvas;
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(blob => {
            const posterPreviewUrl = canvas.toDataURL('image/jpeg', 0.8);
            URL.revokeObjectURL(objUrl);

            resolve({
              duration: video.duration,
              posterBlob: blob,
              posterPreviewUrl: posterPreviewUrl
            });
          }, 'image/jpeg', 0.8);
        } catch (err) {
          URL.revokeObjectURL(objUrl);
          reject(err);
        }
      };

      video.onerror = () => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(objUrl);
        reject(new Error('Failed to read video file. Please ensure it is in MP4 or WebM format.'));
      };
    });
  }

  // ----------------------------------------------------------------------------
  // INITIALIZATION
  // ----------------------------------------------------------------------------
  async function initAdmin() {
    cacheDom();

    if (dom.adminShopTitle) dom.adminShopTitle.textContent = CONFIG.SHOP_NAME;

    // Datalists
    if (dom.fabricSuggestionsList && CONFIG.FABRIC_SUGGESTIONS) {
      dom.fabricSuggestionsList.innerHTML = CONFIG.FABRIC_SUGGESTIONS
        .map(f => `<option value="${escapeHtml(f)}">`).join('');
    }
    if (dom.categorySuggestionsList && CONFIG.CATEGORY_SUGGESTIONS) {
      dom.categorySuggestionsList.innerHTML = CONFIG.CATEGORY_SUGGESTIONS
        .map(c => `<option value="${escapeHtml(c)}">`).join('');
    }

    // Verify Supabase
    if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.includes('YOUR_PROJECT_ID') || !window.supabase) {
      showLoginAlert('Supabase credentials missing! Configure SUPABASE_URL and SUPABASE_ANON_KEY in config.js.');
      return;
    }

    try {
      state.supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    } catch (e) {
      showLoginAlert('Failed to initialize Supabase: ' + e.message);
      return;
    }

    setupEventListeners();

    // Check active session
    try {
      const { data: { session } } = await state.supabaseClient.auth.getSession();
      if (session && session.user) {
        setLoggedIn(session.user);
      } else {
        setLoggedOut();
      }
    } catch (err) {
      setLoggedOut();
    }

    state.supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session && session.user) {
        setLoggedIn(session.user);
      } else {
        setLoggedOut();
      }
    });
  }

  // ----------------------------------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------------------------------
  function setLoggedIn(user) {
    state.currentUser = user;
    if (dom.authView) dom.authView.style.display = 'none';
    if (dom.dashboardView) dom.dashboardView.classList.add('active');
    if (dom.btnLogout) dom.btnLogout.style.display = 'inline-flex';
    if (dom.adminUserEmail) dom.adminUserEmail.textContent = user.email || 'Admin';

    loadAllSarees();
  }

  function setLoggedOut() {
    state.currentUser = null;
    state.orphanFiles = null;
    if (dom.authView) dom.authView.style.display = 'flex';
    if (dom.dashboardView) dom.dashboardView.classList.remove('active');
    if (dom.btnLogout) dom.btnLogout.style.display = 'none';
    if (dom.adminUserEmail) dom.adminUserEmail.textContent = '';
    if (dom.orphanTabBadge) dom.orphanTabBadge.textContent = 'Scan';
  }

  function showLoginAlert(msg) {
    if (!dom.loginAlert) return;
    dom.loginAlert.textContent = msg;
    dom.loginAlert.classList.add('visible');
  }

  function hideLoginAlert() {
    if (!dom.loginAlert) return;
    dom.loginAlert.classList.remove('visible');
  }

  async function handleLogin(e) {
    e.preventDefault();
    hideLoginAlert();

    const email = dom.loginEmail.value.trim();
    const password = dom.loginPassword.value;

    if (!email || !password) {
      showLoginAlert('Please enter both email and password.');
      return;
    }

    dom.btnLogin.disabled = true;
    dom.btnLogin.textContent = 'Authenticating...';

    try {
      const { data, error } = await state.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        showLoginAlert(error.message || 'Invalid login credentials.');
      } else if (data && data.user) {
        setLoggedIn(data.user);
        showToast('Signed in successfully!');
      }
    } catch (err) {
      showLoginAlert('Login error: ' + (err.message || 'Please check your connection.'));
    } finally {
      dom.btnLogin.disabled = false;
      dom.btnLogin.textContent = 'Sign In to Dashboard';
    }
  }

  async function handleLogout() {
    if (!state.supabaseClient) return;
    try {
      await state.supabaseClient.auth.signOut();
      showToast('Logged out.');
      setLoggedOut();
    } catch (e) {
      console.warn('Logout error:', e);
    }
  }

  // ----------------------------------------------------------------------------
  // PHOTO PICKER & REORDERING
  // ----------------------------------------------------------------------------
  async function handleFilesSelected(fileList) {
    if (!fileList || fileList.length === 0) return;

    setProgress('Compressing photos...', 20);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith('image/')) continue;

      try {
        const { blob, previewUrl } = await compressImage(file, 1200, 0.8);
        state.currentPhotos.push({
          type: 'new',
          file: file,
          blob: blob,
          previewUrl: previewUrl
        });
      } catch (err) {
        console.error('Failed to compress image:', err);
        showToast(`Could not process image ${file.name}`);
      }
    }

    setProgress(null, null);
    renderPhotoPreviews();
  }

  function renderPhotoPreviews() {
    if (!dom.photoPreviewGrid) return;

    if (state.currentPhotos.length === 0) {
      dom.photoPreviewGrid.innerHTML = `
        <div style="grid-column: 1 / -1; font-size: 0.85rem; color: #94a3b8; text-align: center; padding: 1rem;">
          No photos selected yet. Tap above to add photos.
        </div>
      `;
      return;
    }

    dom.photoPreviewGrid.innerHTML = state.currentPhotos.map((photo, idx) => {
      const isCover = idx === 0;
      const previewSrc = photo.type === 'existing' ? photo.url : photo.previewUrl;

      return `
        <div class="photo-preview-card ${isCover ? 'is-cover' : ''}" data-index="${idx}">
          ${isCover ? '<span class="cover-badge">★ MAIN COVER</span>' : ''}
          <img src="${escapeHtml(previewSrc)}" alt="Photo ${idx + 1}" class="photo-preview-img">
          
          <div class="photo-actions-overlay">
            <button type="button" class="btn-photo-action btn-move-left" data-index="${idx}" title="Move earlier" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>
              ←
            </button>
            <button type="button" class="btn-photo-action btn-move-right" data-index="${idx}" title="Move later" ${idx === state.currentPhotos.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>
              →
            </button>
            <button type="button" class="btn-photo-action btn-photo-delete" data-index="${idx}" title="Remove photo">
              ×
            </button>
          </div>
        </div>
      `;
    }).join('');

    dom.photoPreviewGrid.querySelectorAll('.btn-move-left').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        if (idx > 0) {
          const temp = state.currentPhotos[idx];
          state.currentPhotos[idx] = state.currentPhotos[idx - 1];
          state.currentPhotos[idx - 1] = temp;
          renderPhotoPreviews();
        }
      });
    });

    dom.photoPreviewGrid.querySelectorAll('.btn-move-right').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        if (idx < state.currentPhotos.length - 1) {
          const temp = state.currentPhotos[idx];
          state.currentPhotos[idx] = state.currentPhotos[idx + 1];
          state.currentPhotos[idx + 1] = temp;
          renderPhotoPreviews();
        }
      });
    });

    dom.photoPreviewGrid.querySelectorAll('.btn-photo-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        state.currentPhotos.splice(idx, 1);
        renderPhotoPreviews();
      });
    });
  }

  // ----------------------------------------------------------------------------
  // VIDEO HANDLING (UPLOAD & LINK)
  // ----------------------------------------------------------------------------
  async function handleVideoFileSelected(file) {
    if (!file) return;

    setProgress('Validating video duration & size...', 30);
    dom.btnSaveSaree.disabled = true;

    try {
      const { duration, posterBlob, posterPreviewUrl } = await validateAndExtractPoster(file);

      state.videoData = {
        type: 'new_file',
        file: file,
        duration: duration,
        posterBlob: posterBlob,
        posterPreviewUrl: posterPreviewUrl
      };

      renderVideoPreview();
      showToast(`Video attached! Duration: ${duration.toFixed(1)}s`);
    } catch (err) {
      console.warn('Video validation error:', err);
      alert(err.message || 'Video validation failed.');
      clearVideoData();
    } finally {
      setProgress(null, null);
      dom.btnSaveSaree.disabled = false;
    }
  }

  function handleVideoLinkSubmit() {
    const rawUrl = dom.inputVideoLink.value.trim();
    if (!rawUrl) {
      showToast('Please paste a YouTube or video URL.');
      return;
    }

    // Check YouTube URL patterns
    const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/;
    const ytMatch = rawUrl.match(ytRegex);

    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      const posterUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      const cleanYtUrl = `https://www.youtube.com/watch?v=${videoId}`;

      state.videoData = {
        type: 'link',
        videoUrl: cleanYtUrl,
        posterUrl: posterUrl,
        isYouTube: true,
        youtubeId: videoId
      };

      renderVideoPreview();
      showToast('YouTube video linked successfully!');
      dom.inputVideoLink.value = '';
      return;
    }

    // Direct MP4 / WebM link check
    if (rawUrl.startsWith('https://') && (rawUrl.includes('.mp4') || rawUrl.includes('.webm') || rawUrl.includes('supabase.co'))) {
      state.videoData = {
        type: 'link',
        videoUrl: rawUrl,
        posterUrl: null,
        isYouTube: false
      };
      renderVideoPreview();
      showToast('Direct video link attached!');
      dom.inputVideoLink.value = '';
      return;
    }

    alert('Please provide a valid YouTube link (e.g. youtube.com/watch?v=... or youtu.be/...) or a direct HTTPS .mp4 / .webm link.');
  }

  function renderVideoPreview() {
    if (!dom.videoPreviewWrap) return;

    if (!state.videoData) {
      dom.videoPreviewWrap.style.display = 'none';
      dom.videoPreviewPlayer.style.display = 'none';
      dom.videoPreviewThumb.style.display = 'none';
      dom.videoPreviewPlayer.src = '';
      return;
    }

    dom.videoPreviewWrap.style.display = 'block';

    if (state.videoData.type === 'new_file') {
      dom.videoPreviewPlayer.style.display = 'block';
      dom.videoPreviewThumb.style.display = 'none';
      dom.videoPreviewPlayer.src = URL.createObjectURL(state.videoData.file);
      dom.videoPreviewPlayer.poster = state.videoData.posterPreviewUrl;
      dom.videoPreviewInfo.textContent = `Uploaded MP4 (${state.videoData.duration.toFixed(1)}s) • Poster generated`;
    } else if (state.videoData.isYouTube) {
      dom.videoPreviewPlayer.style.display = 'none';
      dom.videoPreviewThumb.style.display = 'block';
      dom.videoPreviewThumb.src = state.videoData.posterUrl;
      dom.videoPreviewInfo.textContent = `YouTube Video (${state.videoData.videoUrl})`;
    } else {
      // Existing file or direct MP4 link
      dom.videoPreviewPlayer.style.display = 'block';
      dom.videoPreviewThumb.style.display = 'none';
      dom.videoPreviewPlayer.src = state.videoData.videoUrl;
      if (state.videoData.posterUrl) dom.videoPreviewPlayer.poster = state.videoData.posterUrl;
      dom.videoPreviewInfo.textContent = `Video attached (${state.videoData.videoUrl.substring(0, 40)}...)`;
    }
  }

  function clearVideoData() {
    state.videoData = null;
    if (dom.sareeVideoUrl) dom.sareeVideoUrl.value = '';
    if (dom.sareeVideoPoster) dom.sareeVideoPoster.value = '';
    renderVideoPreview();
  }

  // ----------------------------------------------------------------------------
  // STORAGE UPLOAD (IMAGES & VIDEOS)
  // ----------------------------------------------------------------------------
  async function uploadPendingPhotos() {
    const bucket = CONFIG.STORAGE_BUCKET || 'saree-images';
    const finalUrls = [];
    const totalToUpload = state.currentPhotos.filter(p => p.type === 'new').length;
    let uploadedCount = 0;

    for (let i = 0; i < state.currentPhotos.length; i++) {
      const item = state.currentPhotos[i];

      if (item.type === 'existing') {
        finalUrls.push(item.url);
      } else if (item.type === 'new' && item.blob) {
        uploadedCount++;
        const percent = (uploadedCount / (totalToUpload + 1)) * 50;
        setProgress(`Uploading photo ${uploadedCount} of ${totalToUpload}...`, percent);

        const timestamp = Date.now();
        const rand = Math.random().toString(36).substring(2, 7);
        const filename = `saree_${timestamp}_${rand}.jpg`;

        const { error } = await state.supabaseClient.storage
          .from(bucket)
          .upload(filename, item.blob, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (error) throw new Error(`Failed to upload ${filename}: ${error.message}`);

        const { data: urlData } = state.supabaseClient.storage
          .from(bucket)
          .getPublicUrl(filename);

        if (!urlData || !urlData.publicUrl) throw new Error('Failed to retrieve photo public URL.');

        finalUrls.push(urlData.publicUrl);
      }
    }

    return finalUrls;
  }

  async function uploadVideoIfPending() {
    if (!state.videoData) return { videoUrl: null, posterUrl: null };

    // If existing or pasted link, return as is
    if (state.videoData.type === 'existing' || state.videoData.type === 'link') {
      return {
        videoUrl: state.videoData.videoUrl,
        posterUrl: state.videoData.posterUrl
      };
    }

    if (state.videoData.type === 'new_file') {
      const imageBucket = CONFIG.STORAGE_BUCKET || 'saree-images';
      const videoBucket = CONFIG.STORAGE_VIDEO_BUCKET || 'saree-videos';
      const timestamp = Date.now();
      const rand = Math.random().toString(36).substring(2, 7);

      // 1. Upload generated poster image to 'saree-images'
      setProgress('Uploading video poster frame...', 65);
      const posterFilename = `poster_${timestamp}_${rand}.jpg`;
      const { error: posterErr } = await state.supabaseClient.storage
        .from(imageBucket)
        .upload(posterFilename, state.videoData.posterBlob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (posterErr) throw new Error(`Failed to upload poster: ${posterErr.message}`);

      const { data: posterUrlData } = state.supabaseClient.storage
        .from(imageBucket)
        .getPublicUrl(posterFilename);

      const finalPosterUrl = posterUrlData.publicUrl;

      // 2. Upload video file to 'saree-videos'
      setProgress('Uploading video file to storage (max 15MB)...', 80);
      const ext = state.videoData.file.name.split('.').pop() || 'mp4';
      const videoFilename = `video_${timestamp}_${rand}.${ext}`;

      const { error: videoErr } = await state.supabaseClient.storage
        .from(videoBucket)
        .upload(videoFilename, state.videoData.file, {
          contentType: state.videoData.file.type || 'video/mp4',
          upsert: false
        });

      if (videoErr) throw new Error(`Failed to upload video: ${videoErr.message}`);

      const { data: videoUrlData } = state.supabaseClient.storage
        .from(videoBucket)
        .getPublicUrl(videoFilename);

      const finalVideoUrl = videoUrlData.publicUrl;

      return {
        videoUrl: finalVideoUrl,
        posterUrl: finalPosterUrl
      };
    }

    return { videoUrl: null, posterUrl: null };
  }

  // ----------------------------------------------------------------------------
  // ADD / EDIT SAREE SUBMISSION
  // ----------------------------------------------------------------------------
  async function handleSareeSubmit(e) {
    e.preventDefault();

    if (!state.currentUser) {
      showToast('You must be logged in to save sarees.');
      return;
    }

    const name = dom.inputName.value.trim();
    const price = parseFloat(dom.inputPrice.value);

    if (!name) {
      showToast('Please enter a saree title.');
      dom.inputName.focus();
      return;
    }

    if (isNaN(price) || price < 0) {
      showToast('Please enter a valid price.');
      dom.inputPrice.focus();
      return;
    }

    if (state.currentPhotos.length === 0) {
      showToast('Please upload at least 1 photo for the saree.');
      return;
    }

    dom.btnSaveSaree.disabled = true;
    dom.btnSaveLabel.textContent = 'Processing & Uploading...';

    try {
      // 1. Upload photos
      const uploadedPhotos = await uploadPendingPhotos();

      // 2. Upload video & poster if pending
      const { videoUrl, posterUrl } = await uploadVideoIfPending();

      setProgress('Saving saree record to Supabase...', 95);

      const payload = {
        name: name,
        fabric: dom.inputFabric.value.trim() || 'Traditional Weave',
        color: dom.inputColor.value.trim() || 'Multicolor',
        pattern: dom.inputPattern.value.trim() || 'Traditional',
        border: dom.inputBorder.value.trim() || 'Zari Border',
        category: dom.inputCategory.value.trim() || 'Handloom',
        occasion: dom.inputOccasion.value.trim() || 'Festive / Wedding',
        description: dom.inputDescription.value.trim(),
        price: price,
        status: dom.inputStatus.value,
        images: uploadedPhotos,
        video_url: videoUrl,
        video_poster: posterUrl
      };

      if (state.editingSareeId) {
        const { error } = await state.supabaseClient
          .from('sarees')
          .update(payload)
          .eq('id', state.editingSareeId);

        if (error) throw error;
        showToast(`Saree #${state.editingSareeId} updated successfully!`);
      } else {
        const { error } = await state.supabaseClient
          .from('sarees')
          .insert([payload]);

        if (error) throw error;
        showToast('New saree added to catalog successfully!');
      }

      // Bust public catalog cache
      sessionStorage.removeItem('msc_supabase_sarees_cache_v2');
      sessionStorage.removeItem('msc_supabase_sarees_time_v2');

      resetForm();
      await loadAllSarees();
      switchToTab('list');

    } catch (err) {
      console.error('Error saving saree:', err);
      showToast('Failed to save saree: ' + err.message);
    } finally {
      setProgress(null, null);
      dom.btnSaveSaree.disabled = false;
      dom.btnSaveLabel.textContent = state.editingSareeId ? 'Update Saree' : 'Save Saree to Catalog';
    }
  }

  function resetForm() {
    state.editingSareeId = null;
    state.currentPhotos = [];
    state.videoData = null;
    dom.sareeForm.reset();
    dom.sareeEditId.value = '';
    dom.formSectionTitle.textContent = 'Add New Saree';
    dom.formSectionDesc.textContent = 'Add saree specifications, photos, and drape video';
    dom.formTabLabel.textContent = 'Add New Saree';
    dom.btnSaveLabel.textContent = 'Save Saree to Catalog';
    dom.btnCancelEdit.style.display = 'none';
    renderPhotoPreviews();
    renderVideoPreview();
  }

  function startEditSaree(saree) {
    state.editingSareeId = saree.id;
    dom.sareeEditId.value = saree.id;
    dom.inputName.value = saree.name || '';
    dom.inputPrice.value = saree.price || 0;
    dom.inputFabric.value = saree.fabric || '';
    dom.inputCategory.value = saree.category || '';
    dom.inputStatus.value = saree.status || 'Available';
    dom.inputColor.value = saree.color || '';
    dom.inputPattern.value = saree.pattern || '';
    dom.inputBorder.value = saree.border || '';
    dom.inputOccasion.value = saree.occasion || '';
    dom.inputDescription.value = saree.description || '';

    // Photos
    const imgs = Array.isArray(saree.images) ? saree.images : [];
    state.currentPhotos = imgs.map(url => ({
      type: 'existing',
      url: url,
      previewUrl: url
    }));

    // Video
    if (saree.video_url) {
      const isYt = saree.video_url.includes('youtube.com') || saree.video_url.includes('youtu.be');
      state.videoData = {
        type: 'existing',
        videoUrl: saree.video_url,
        posterUrl: saree.video_poster,
        isYouTube: isYt
      };
    } else {
      state.videoData = null;
    }

    dom.formSectionTitle.textContent = `Edit Saree #${saree.id}`;
    dom.formSectionDesc.textContent = `Editing: ${saree.name}`;
    dom.formTabLabel.textContent = `Edit Saree #${saree.id}`;
    dom.btnSaveLabel.textContent = 'Update Saree';
    dom.btnCancelEdit.style.display = 'inline-flex';

    renderPhotoPreviews();
    renderVideoPreview();
    switchToTab('form');
  }

  function duplicateSaree(saree) {
    resetForm();
    dom.inputName.value = `${saree.name} (Copy)`;
    dom.inputPrice.value = saree.price || 0;
    dom.inputFabric.value = saree.fabric || '';
    dom.inputCategory.value = saree.category || '';
    dom.inputStatus.value = 'Available';
    dom.inputColor.value = saree.color || '';
    dom.inputPattern.value = saree.pattern || '';
    dom.inputBorder.value = saree.border || '';
    dom.inputOccasion.value = saree.occasion || '';
    dom.inputDescription.value = saree.description || '';

    const imgs = Array.isArray(saree.images) ? saree.images : [];
    state.currentPhotos = imgs.map(url => ({
      type: 'existing',
      url: url,
      previewUrl: url
    }));

    if (saree.video_url) {
      const isYt = saree.video_url.includes('youtube.com') || saree.video_url.includes('youtu.be');
      state.videoData = {
        type: 'existing',
        videoUrl: saree.video_url,
        posterUrl: saree.video_poster,
        isYouTube: isYt
      };
    }

    renderPhotoPreviews();
    renderVideoPreview();
    showToast('Saree details duplicated into form! Review and click Save.');
    switchToTab('form');
  }

  // ----------------------------------------------------------------------------
  // INVENTORY LIST & ACTIONS
  // ----------------------------------------------------------------------------
  async function loadAllSarees() {
    if (!state.supabaseClient) return;

    dom.adminSareeList.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #64748b;">
        Loading catalog inventory from Supabase...
      </div>
    `;

    try {
      const { data, error } = await state.supabaseClient
        .from('sarees')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      state.allSarees = data || [];
      if (dom.totalSareesCount) dom.totalSareesCount.textContent = state.allSarees.length;

      populateAdminCategories();
      renderAdminList();
    } catch (err) {
      console.error('Failed to load sarees for admin:', err);
      dom.adminSareeList.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #b91c1c;">
          Error loading inventory: ${escapeHtml(err.message)}
        </div>
      `;
    }
  }

  function populateAdminCategories() {
    if (!dom.adminCategoryFilter) return;
    const cats = Array.from(new Set(state.allSarees.map(s => s.category).filter(Boolean))).sort();
    dom.adminCategoryFilter.innerHTML = `<option value="all">All Categories</option>` +
      cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  }

  function renderAdminList() {
    if (!dom.adminSareeList) return;

    const q = state.searchQuery.toLowerCase().trim();

    const filtered = state.allSarees.filter(s => {
      if (q) {
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchFabric = (s.fabric || '').toLowerCase().includes(q);
        const matchId = String(s.id).includes(q);
        if (!matchName && !matchFabric && !matchId) return false;
      }
      if (state.filterStatus !== 'all' && s.status !== state.filterStatus) return false;
      if (state.filterCategory !== 'all' && s.category !== state.filterCategory) return false;
      return true;
    });

    if (filtered.length === 0) {
      dom.adminSareeList.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: #64748b;">
          No sarees match your filter criteria.
        </div>
      `;
      return;
    }

    dom.adminSareeList.innerHTML = filtered.map(saree => {
      const isSold = saree.status === 'Sold';
      const mainImg = (saree.images && saree.images.length > 0) ? saree.images[0] : PLACEHOLDER_IMG;
      const hasVideo = !!saree.video_url;

      return `
        <div class="admin-saree-row" data-id="${saree.id}">
          <div class="admin-saree-info">
            <div style="position: relative;">
              <img src="${escapeHtml(mainImg)}" alt="${escapeHtml(saree.name)}" class="admin-saree-thumb" onerror="this.src='${PLACEHOLDER_IMG}';">
              ${hasVideo ? '<span style="position:absolute;bottom:2px;right:2px;background:rgba(0,0,0,0.8);color:#fff;font-size:0.6rem;padding:1px 3px;border-radius:3px;">▶ Video</span>' : ''}
            </div>
            <div class="admin-saree-details">
              <span class="admin-saree-title">#${saree.id} - ${escapeHtml(saree.name)}</span>
              <span class="admin-saree-sub">${escapeHtml(saree.fabric || 'Silk')} • ${escapeHtml(saree.category || 'Handloom')}</span>
              <span class="admin-saree-price">${formatPrice(saree.price)}</span>
            </div>
          </div>

          <div class="admin-actions-group">
            <button type="button" class="btn-admin-action btn-sold-toggle ${isSold ? 'is-sold' : 'is-available'}" data-id="${saree.id}" data-current="${saree.status}">
              ${isSold ? '❌ Sold Out' : '✅ Available'}
            </button>
            <button type="button" class="btn-admin-action btn-edit-saree" data-id="${saree.id}">
              ✏️ Edit
            </button>
            <button type="button" class="btn-admin-action btn-duplicate-saree" data-id="${saree.id}">
              📋 Duplicate
            </button>
            <button type="button" class="btn-admin-action btn-delete btn-delete-saree" data-id="${saree.id}">
              🗑️ Delete
            </button>
          </div>
        </div>
      `;
    }).join('');

    dom.adminSareeList.querySelectorAll('.btn-sold-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const current = btn.getAttribute('data-current');
        toggleSareeStatus(id, current);
      });
    });

    dom.adminSareeList.querySelectorAll('.btn-edit-saree').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const saree = state.allSarees.find(s => String(s.id) === String(id));
        if (saree) startEditSaree(saree);
      });
    });

    dom.adminSareeList.querySelectorAll('.btn-duplicate-saree').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const saree = state.allSarees.find(s => String(s.id) === String(id));
        if (saree) duplicateSaree(saree);
      });
    });

    dom.adminSareeList.querySelectorAll('.btn-delete-saree').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const saree = state.allSarees.find(s => String(s.id) === String(id));
        if (saree) deleteSaree(saree);
      });
    });
  }

  async function toggleSareeStatus(id, currentStatus) {
    const newStatus = currentStatus === 'Available' ? 'Sold' : 'Available';

    try {
      const { error } = await state.supabaseClient
        .from('sarees')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      showToast(`Saree #${id} marked as ${newStatus}!`);
      sessionStorage.removeItem('msc_supabase_sarees_cache_v2');

      const saree = state.allSarees.find(s => String(s.id) === String(id));
      if (saree) saree.status = newStatus;
      renderAdminList();
    } catch (err) {
      showToast('Failed to update status: ' + err.message);
    }
  }

  async function deleteSaree(saree) {
    const confirmDelete = window.confirm(`Are you sure you want to delete saree #${saree.id} ("${saree.name}")?\n\nThis will permanently delete the record, its photos, and its video.`);
    if (!confirmDelete) return;

    try {
      const imgBucket = CONFIG.STORAGE_BUCKET || 'saree-images';
      const vidBucket = CONFIG.STORAGE_VIDEO_BUCKET || 'saree-videos';

      // 1. Delete image files from storage bucket
      if (Array.isArray(saree.images)) {
        const imgFiles = saree.images
          .filter(u => u && u.includes(imgBucket))
          .map(url => url.split('/').pop())
          .filter(Boolean);

        if (imgFiles.length > 0) {
          await state.supabaseClient.storage.from(imgBucket).remove(imgFiles);
        }
      }

      // 2. Delete video and video poster from storage bucket
      if (saree.video_url && saree.video_url.includes(vidBucket)) {
        const vidFile = saree.video_url.split('/').pop();
        if (vidFile) await state.supabaseClient.storage.from(vidBucket).remove([vidFile]);
      }
      if (saree.video_poster && saree.video_poster.includes(imgBucket)) {
        const posterFile = saree.video_poster.split('/').pop();
        if (posterFile) await state.supabaseClient.storage.from(imgBucket).remove([posterFile]);
      }

      // 3. Delete row from sarees table
      const { error } = await state.supabaseClient
        .from('sarees')
        .delete()
        .eq('id', saree.id);

      if (error) throw error;

      showToast(`Saree #${saree.id} deleted successfully.`);
      sessionStorage.removeItem('msc_supabase_sarees_cache_v2');

      state.allSarees = state.allSarees.filter(s => String(s.id) !== String(saree.id));
      if (dom.totalSareesCount) dom.totalSareesCount.textContent = state.allSarees.length;
      renderAdminList();
    } catch (err) {
      console.error('Failed to delete saree:', err);
      showToast('Error deleting saree: ' + err.message);
    }
  }

  // ----------------------------------------------------------------------------
  // ORPHAN FILES STORAGE CLEANUP
  // ----------------------------------------------------------------------------

  /**
   * Helper to retrieve all non-folder files from a storage bucket (handles pagination)
   */
  async function fetchAllBucketFiles(bucket) {
    const list = [];
    let offset = 0;
    const limit = 100;
    try {
      while (true) {
        const { data, error } = await state.supabaseClient.storage.from(bucket).list('', {
          limit: limit,
          offset: offset,
          sortBy: { column: 'created_at', order: 'desc' }
        });
        if (error) {
          console.warn(`Bucket "${bucket}" list notice:`, error.message);
          break;
        }
        if (!data || data.length === 0) break;
        const valid = data.filter(item => item && item.name && item.name !== '.emptyFolderPlaceholder' && item.id !== null);
        list.push(...valid);
        if (data.length < limit) break;
        offset += limit;
      }
    } catch (err) {
      console.warn(`Error listing bucket "${bucket}":`, err);
    }
    return list;
  }

  /**
   * Scans Supabase Storage buckets and compares against all saree rows
   */
  async function scanOrphanFiles() {
    if (!state.supabaseClient || state.isScanningOrphans) return;
    state.isScanningOrphans = true;

    if (dom.btnScanOrphans) {
      dom.btnScanOrphans.disabled = true;
      dom.btnScanOrphans.textContent = '⏳ Scanning...';
    }
    if (dom.btnScanOrphansEmpty) {
      dom.btnScanOrphansEmpty.disabled = true;
      dom.btnScanOrphansEmpty.textContent = '⏳ Scanning...';
    }

    if (dom.orphanFilesList) {
      dom.orphanFilesList.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: #64748b;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🔍</div>
          <p style="font-size: 0.95rem; font-weight: 600; color: #1e293b;">Scanning storage buckets & active sarees...</p>
          <p style="font-size: 0.78rem; color: #94a3b8; margin-top: 0.35rem;">Comparing files in saree-images and saree-videos</p>
        </div>
      `;
    }

    try {
      // 1. Fetch all saree image & video references from the database
      const { data: sarees, error: sareesErr } = await state.supabaseClient
        .from('sarees')
        .select('id, images, video_url, video_poster');

      if (sareesErr) throw sareesErr;

      const activeImageFilenames = new Set();
      const activeVideoFilenames = new Set();
      const allActiveUrls = [];

      (sarees || []).forEach(s => {
        if (Array.isArray(s.images)) {
          s.images.forEach(u => {
            if (typeof u === 'string' && u) {
              allActiveUrls.push(u);
              const name = getFilenameFromUrl(u);
              if (name) activeImageFilenames.add(name);
            }
          });
        }
        if (s.video_poster && typeof s.video_poster === 'string') {
          allActiveUrls.push(s.video_poster);
          const name = getFilenameFromUrl(s.video_poster);
          if (name) activeImageFilenames.add(name);
        }
        if (s.video_url && typeof s.video_url === 'string') {
          allActiveUrls.push(s.video_url);
          const name = getFilenameFromUrl(s.video_url);
          if (name) activeVideoFilenames.add(name);
        }
      });

      // 2. Query all files in storage buckets
      const imageBucket = CONFIG.STORAGE_BUCKET || 'saree-images';
      const videoBucket = CONFIG.STORAGE_VIDEO_BUCKET || 'saree-videos';

      const [imageFiles, videoFiles] = await Promise.all([
        fetchAllBucketFiles(imageBucket),
        fetchAllBucketFiles(videoBucket)
      ]);

      const orphanList = [];

      // Check image bucket files
      imageFiles.forEach(f => {
        const isReferenced = activeImageFilenames.has(f.name) || allActiveUrls.some(u => u.includes(f.name));
        if (!isReferenced) {
          const { data: pubUrl } = state.supabaseClient.storage.from(imageBucket).getPublicUrl(f.name);
          orphanList.push({
            bucket: imageBucket,
            name: f.name,
            id: f.id,
            size: f.metadata?.size || 0,
            created_at: f.created_at,
            publicUrl: pubUrl?.publicUrl || '',
            isVideo: false,
            selected: false
          });
        }
      });

      // Check video bucket files
      videoFiles.forEach(f => {
        const isReferenced = activeVideoFilenames.has(f.name) || allActiveUrls.some(u => u.includes(f.name));
        if (!isReferenced) {
          const { data: pubUrl } = state.supabaseClient.storage.from(videoBucket).getPublicUrl(f.name);
          orphanList.push({
            bucket: videoBucket,
            name: f.name,
            id: f.id,
            size: f.metadata?.size || 0,
            created_at: f.created_at,
            publicUrl: pubUrl?.publicUrl || '',
            isVideo: true,
            selected: false
          });
        }
      });

      state.orphanFiles = orphanList;
      state.storageTotalFilesCount = imageFiles.length + videoFiles.length;

      renderOrphanView();
      showToast(`Scan complete: ${orphanList.length} orphan file(s) found.`);
    } catch (err) {
      console.error('Scan orphan files error:', err);
      showToast('Scan error: ' + err.message);
      if (dom.orphanFilesList) {
        dom.orphanFilesList.innerHTML = `
          <div style="text-align: center; padding: 2.5rem 1rem; color: #dc2626;">
            <p style="font-weight: 700; margin-bottom: 0.5rem;">⚠️ Scan Failed</p>
            <p style="font-size: 0.82rem; color: #64748b; margin-bottom: 1rem;">${escapeHtml(err.message)}</p>
            <button type="button" id="btn-scan-orphans-retry" class="btn-secondary" style="font-size: 0.82rem;">
              🔄 Retry Scan
            </button>
          </div>
        `;
        const retryBtn = document.getElementById('btn-scan-orphans-retry');
        if (retryBtn) retryBtn.addEventListener('click', scanOrphanFiles);
      }
    } finally {
      state.isScanningOrphans = false;
      if (dom.btnScanOrphans) {
        dom.btnScanOrphans.disabled = false;
        dom.btnScanOrphans.textContent = '🔄 Scan Storage';
      }
      if (dom.btnScanOrphansEmpty) {
        dom.btnScanOrphansEmpty.disabled = false;
        dom.btnScanOrphansEmpty.textContent = '🔄 Scan Storage Now';
      }
    }
  }

  /**
   * Renders orphan file stats, toolbar, and file listing
   */
  function renderOrphanView() {
    if (!state.orphanFiles) return;

    const totalStorage = state.storageTotalFilesCount || 0;
    const orphanCount = state.orphanFiles.length;
    const activeCount = Math.max(0, totalStorage - orphanCount);
    const totalBytes = state.orphanFiles.reduce((acc, f) => acc + (f.size || 0), 0);

    // Update Metrics
    if (dom.statTotalStorageFiles) dom.statTotalStorageFiles.textContent = totalStorage;
    if (dom.statActiveFiles) dom.statActiveFiles.textContent = activeCount;
    if (dom.statOrphanFiles) dom.statOrphanFiles.textContent = orphanCount;
    if (dom.statOrphanSize) dom.statOrphanSize.textContent = formatBytes(totalBytes);
    if (dom.orphanTabBadge) {
      dom.orphanTabBadge.textContent = orphanCount === 0 ? 'Clean' : `${orphanCount} unlinked`;
    }

    if (orphanCount === 0) {
      if (dom.orphanToolbar) dom.orphanToolbar.style.display = 'none';
      if (dom.orphanFilesList) {
        const imgB = CONFIG.STORAGE_BUCKET || 'saree-images';
        const vidB = CONFIG.STORAGE_VIDEO_BUCKET || 'saree-videos';
        dom.orphanFilesList.innerHTML = `
          <div style="text-align: center; padding: 3rem 1.5rem; color: #16a34a;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: #15803d; margin-bottom: 0.4rem;">
              Storage is Completely Clean!
            </h3>
            <p style="font-size: 0.85rem; color: #64748b; max-width: 440px; margin: 0 auto; line-height: 1.5;">
              Every file in <code>${escapeHtml(imgB)}</code> and <code>${escapeHtml(vidB)}</code> is actively referenced by a saree in your catalog. No storage waste detected.
            </p>
          </div>
        `;
      }
      return;
    }

    // Show toolbar
    if (dom.orphanToolbar) dom.orphanToolbar.style.display = 'flex';
    updateOrphanSelectionToolbar();

    // Render list
    if (dom.orphanFilesList) {
      dom.orphanFilesList.innerHTML = state.orphanFiles.map((file, idx) => {
        return `
          <div class="orphan-file-row" data-bucket="${escapeHtml(file.bucket)}" data-name="${escapeHtml(file.name)}">
            <div class="orphan-file-left">
              <input 
                type="checkbox" 
                class="orphan-file-checkbox" 
                data-index="${idx}" 
                ${file.selected ? 'checked' : ''}
                style="width: 16px; height: 16px; cursor: pointer; flex-shrink: 0;"
              >
              ${file.isVideo ? `
                <div class="orphan-video-icon">
                  <span>▶</span>
                  <span style="font-size: 0.55rem; font-weight: 700;">VIDEO</span>
                </div>
              ` : `
                <img 
                  src="${escapeHtml(file.publicUrl)}" 
                  alt="${escapeHtml(file.name)}" 
                  class="orphan-file-thumb" 
                  onerror="this.src='${PLACEHOLDER_IMG}';"
                >
              `}
              <div class="orphan-file-info">
                <span class="orphan-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
                <div class="orphan-file-meta">
                  <span class="orphan-bucket-badge">${escapeHtml(file.bucket)}</span>
                  <span>${formatBytes(file.size)}</span>
                  ${file.created_at ? `<span>• ${formatDate(file.created_at)}</span>` : ''}
                </div>
              </div>
            </div>

            <div style="flex-shrink: 0;">
              <button 
                type="button" 
                class="btn-admin-action btn-delete btn-delete-orphan-single" 
                data-index="${idx}" 
                title="Delete this unreferenced file"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Wire checkboxes
      dom.orphanFilesList.querySelectorAll('.orphan-file-checkbox').forEach(cb => {
        cb.addEventListener('change', e => {
          const idx = parseInt(e.target.getAttribute('data-index'), 10);
          if (state.orphanFiles[idx]) {
            state.orphanFiles[idx].selected = e.target.checked;
            updateOrphanSelectionToolbar();
          }
        });
      });

      // Wire individual delete buttons
      dom.orphanFilesList.querySelectorAll('.btn-delete-orphan-single').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          deleteSingleOrphan(idx);
        });
      });
    }
  }

  function updateOrphanSelectionToolbar() {
    if (!state.orphanFiles) return;

    const selected = state.orphanFiles.filter(f => f.selected);
    const selectedCount = selected.length;
    const totalCount = state.orphanFiles.length;

    if (dom.orphanSelectedCountLabel) {
      dom.orphanSelectedCountLabel.textContent = `(${selectedCount} selected)`;
    }

    if (dom.btnDeleteSelectedOrphans) {
      dom.btnDeleteSelectedOrphans.disabled = selectedCount === 0;
      dom.btnDeleteSelectedOrphans.textContent = `🗑️ Delete Selected (${selectedCount})`;
    }

    if (dom.orphanSelectAll) {
      dom.orphanSelectAll.checked = totalCount > 0 && selectedCount === totalCount;
      dom.orphanSelectAll.indeterminate = selectedCount > 0 && selectedCount < totalCount;
    }
  }

  async function deleteSingleOrphan(index) {
    const file = state.orphanFiles[index];
    if (!file) return;

    const confirmed = window.confirm(`Are you sure you want to permanently delete "${file.name}" from "${file.bucket}"?\n\nThis unreferenced file (${formatBytes(file.size)}) will be permanently removed.`);
    if (!confirmed) return;

    try {
      const { error } = await state.supabaseClient.storage
        .from(file.bucket)
        .remove([file.name]);

      if (error) throw error;

      showToast(`Deleted ${file.name}`);
      state.orphanFiles.splice(index, 1);
      if (state.storageTotalFilesCount > 0) state.storageTotalFilesCount--;
      renderOrphanView();
    } catch (err) {
      console.error('Failed to delete orphan file:', err);
      showToast('Failed to delete file: ' + err.message);
    }
  }

  async function deleteSelectedOrphans() {
    if (!state.orphanFiles) return;
    const selected = state.orphanFiles.filter(f => f.selected);
    if (selected.length === 0) {
      showToast('No files selected for deletion.');
      return;
    }

    const totalBytes = selected.reduce((acc, f) => acc + (f.size || 0), 0);
    const confirmed = window.confirm(`Are you sure you want to permanently delete ${selected.length} selected orphan file(s)?\n\nThis will free up ${formatBytes(totalBytes)} of storage.\n\nThis action CANNOT be undone.`);
    if (!confirmed) return;

    dom.btnDeleteSelectedOrphans.disabled = true;
    dom.btnDeleteSelectedOrphans.textContent = 'Deleting...';

    try {
      const imageBucket = CONFIG.STORAGE_BUCKET || 'saree-images';
      const videoBucket = CONFIG.STORAGE_VIDEO_BUCKET || 'saree-videos';

      const imagesToDelete = selected.filter(f => f.bucket === imageBucket).map(f => f.name);
      const videosToDelete = selected.filter(f => f.bucket === videoBucket).map(f => f.name);

      if (imagesToDelete.length > 0) {
        const { error: imgErr } = await state.supabaseClient.storage.from(imageBucket).remove(imagesToDelete);
        if (imgErr) throw imgErr;
      }

      if (videosToDelete.length > 0) {
        const { error: vidErr } = await state.supabaseClient.storage.from(videoBucket).remove(videosToDelete);
        if (vidErr) throw vidErr;
      }

      showToast(`Successfully deleted ${selected.length} orphan file(s)!`);
      await scanOrphanFiles();
    } catch (err) {
      console.error('Failed to delete selected files:', err);
      showToast('Error deleting files: ' + err.message);
    } finally {
      if (dom.btnDeleteSelectedOrphans) {
        dom.btnDeleteSelectedOrphans.disabled = false;
      }
    }
  }

  async function deleteAllOrphans() {
    if (!state.orphanFiles || state.orphanFiles.length === 0) {
      showToast('No orphan files to delete.');
      return;
    }

    const totalCount = state.orphanFiles.length;
    const totalBytes = state.orphanFiles.reduce((acc, f) => acc + (f.size || 0), 0);

    const confirmed = window.confirm(`⚠️ WARNING: DELETE ALL ORPHAN FILES?\n\nYou are about to permanently delete all ${totalCount} unreferenced file(s) across your storage buckets.\n\nSpace to reclaim: ${formatBytes(totalBytes)}\n\nThis action CANNOT be undone. Are you sure you want to proceed?`);
    if (!confirmed) return;

    dom.btnDeleteAllOrphans.disabled = true;
    dom.btnDeleteAllOrphans.textContent = 'Deleting All...';

    try {
      const imageBucket = CONFIG.STORAGE_BUCKET || 'saree-images';
      const videoBucket = CONFIG.STORAGE_VIDEO_BUCKET || 'saree-videos';

      const imagesToDelete = state.orphanFiles.filter(f => f.bucket === imageBucket).map(f => f.name);
      const videosToDelete = state.orphanFiles.filter(f => f.bucket === videoBucket).map(f => f.name);

      if (imagesToDelete.length > 0) {
        const { error: imgErr } = await state.supabaseClient.storage.from(imageBucket).remove(imagesToDelete);
        if (imgErr) throw imgErr;
      }

      if (videosToDelete.length > 0) {
        const { error: vidErr } = await state.supabaseClient.storage.from(videoBucket).remove(videosToDelete);
        if (vidErr) throw vidErr;
      }

      showToast(`Successfully cleaned up ${totalCount} orphan file(s)!`);
      await scanOrphanFiles();
    } catch (err) {
      console.error('Failed to delete all orphan files:', err);
      showToast('Error deleting all orphans: ' + err.message);
    } finally {
      if (dom.btnDeleteAllOrphans) {
        dom.btnDeleteAllOrphans.disabled = false;
        dom.btnDeleteAllOrphans.textContent = '⚠️ Delete All Orphans';
      }
    }
  }

  // ----------------------------------------------------------------------------
  // TAB SWITCHER
  // ----------------------------------------------------------------------------
  function switchToTab(tabName) {
    if (tabName === 'form') {
      dom.tabFormBtn.classList.add('active');
      dom.tabListBtn.classList.remove('active');
      if (dom.tabCleanupBtn) dom.tabCleanupBtn.classList.remove('active');
      dom.tabFormContent.style.display = 'block';
      dom.tabListContent.style.display = 'none';
      if (dom.tabCleanupContent) dom.tabCleanupContent.style.display = 'none';
    } else if (tabName === 'list') {
      dom.tabFormBtn.classList.remove('active');
      dom.tabListBtn.classList.add('active');
      if (dom.tabCleanupBtn) dom.tabCleanupBtn.classList.remove('active');
      dom.tabFormContent.style.display = 'none';
      dom.tabListContent.style.display = 'block';
      if (dom.tabCleanupContent) dom.tabCleanupContent.style.display = 'none';
    } else if (tabName === 'cleanup') {
      dom.tabFormBtn.classList.remove('active');
      dom.tabListBtn.classList.remove('active');
      if (dom.tabCleanupBtn) dom.tabCleanupBtn.classList.add('active');
      dom.tabFormContent.style.display = 'none';
      dom.tabListContent.style.display = 'none';
      if (dom.tabCleanupContent) dom.tabCleanupContent.style.display = 'block';

      // Auto-scan on first tab opening if never scanned before
      if (state.orphanFiles === null && !state.isScanningOrphans) {
        scanOrphanFiles();
      }
    }
  }

  // ----------------------------------------------------------------------------
  // EVENT LISTENERS
  // ----------------------------------------------------------------------------
  function setupEventListeners() {
    // Auth
    if (dom.loginForm) dom.loginForm.addEventListener('submit', handleLogin);
    if (dom.btnLogout) dom.btnLogout.addEventListener('click', handleLogout);

    // Tabs
    if (dom.tabFormBtn) dom.tabFormBtn.addEventListener('click', () => switchToTab('form'));
    if (dom.tabListBtn) dom.tabListBtn.addEventListener('click', () => switchToTab('list'));
    if (dom.tabCleanupBtn) dom.tabCleanupBtn.addEventListener('click', () => switchToTab('cleanup'));

    // Orphan Cleanup
    if (dom.btnScanOrphans) dom.btnScanOrphans.addEventListener('click', scanOrphanFiles);
    if (dom.btnScanOrphansEmpty) dom.btnScanOrphansEmpty.addEventListener('click', scanOrphanFiles);
    if (dom.btnDeleteSelectedOrphans) dom.btnDeleteSelectedOrphans.addEventListener('click', deleteSelectedOrphans);
    if (dom.btnDeleteAllOrphans) dom.btnDeleteAllOrphans.addEventListener('click', deleteAllOrphans);
    if (dom.orphanSelectAll) {
      dom.orphanSelectAll.addEventListener('change', e => {
        const isChecked = e.target.checked;
        if (state.orphanFiles) {
          state.orphanFiles.forEach(f => { f.selected = isChecked; });
          renderOrphanView();
        }
      });
    }

    // Photo selection
    if (dom.btnChoosePhotos) {
      dom.btnChoosePhotos.addEventListener('click', () => dom.imageFilesInput.click());
    }
    if (dom.btnTakePhoto) {
      dom.btnTakePhoto.addEventListener('click', () => dom.cameraFileInput.click());
    }

    if (dom.imageFilesInput) {
      dom.imageFilesInput.addEventListener('change', e => {
        handleFilesSelected(e.target.files);
        dom.imageFilesInput.value = '';
      });
    }

    if (dom.cameraFileInput) {
      dom.cameraFileInput.addEventListener('change', e => {
        handleFilesSelected(e.target.files);
        dom.cameraFileInput.value = '';
      });
    }

    // Video Mode Switch
    if (dom.btnModeVideoUpload) {
      dom.btnModeVideoUpload.addEventListener('click', () => {
        dom.btnModeVideoUpload.classList.add('active');
        dom.btnModeVideoLink.classList.remove('active');
        dom.videoUploadPane.style.display = 'block';
        dom.videoLinkPane.style.display = 'none';
      });
    }

    if (dom.btnModeVideoLink) {
      dom.btnModeVideoLink.addEventListener('click', () => {
        dom.btnModeVideoLink.classList.add('active');
        dom.btnModeVideoUpload.classList.remove('active');
        dom.videoUploadPane.style.display = 'none';
        dom.videoLinkPane.style.display = 'block';
      });
    }

    // Video File Selection
    if (dom.btnChooseVideo) {
      dom.btnChooseVideo.addEventListener('click', () => dom.videoFileInput.click());
    }
    if (dom.btnRecordVideo) {
      dom.btnRecordVideo.addEventListener('click', () => dom.videoCameraInput.click());
    }

    if (dom.videoFileInput) {
      dom.videoFileInput.addEventListener('change', e => {
        if (e.target.files && e.target.files[0]) {
          handleVideoFileSelected(e.target.files[0]);
          dom.videoFileInput.value = '';
        }
      });
    }

    if (dom.videoCameraInput) {
      dom.videoCameraInput.addEventListener('change', e => {
        if (e.target.files && e.target.files[0]) {
          handleVideoFileSelected(e.target.files[0]);
          dom.videoCameraInput.value = '';
        }
      });
    }

    // Video Link
    if (dom.btnApplyVideoLink) {
      dom.btnApplyVideoLink.addEventListener('click', handleVideoLinkSubmit);
    }

    // Remove Video
    if (dom.btnRemoveVideo) {
      dom.btnRemoveVideo.addEventListener('click', () => {
        clearVideoData();
        showToast('Video removed from this saree.');
      });
    }

    // Saree Form Submit & Cancel
    if (dom.sareeForm) dom.sareeForm.addEventListener('submit', handleSareeSubmit);
    if (dom.btnCancelEdit) dom.btnCancelEdit.addEventListener('click', resetForm);

    // List search & filters
    let searchTimer = null;
    if (dom.adminSearchInput) {
      dom.adminSearchInput.addEventListener('input', e => {
        clearTimeout(searchTimer);
        state.searchQuery = e.target.value;
        searchTimer = setTimeout(renderAdminList, 150);
      });
    }

    if (dom.adminStatusFilter) {
      dom.adminStatusFilter.addEventListener('change', e => {
        state.filterStatus = e.target.value;
        renderAdminList();
      });
    }

    if (dom.adminCategoryFilter) {
      dom.adminCategoryFilter.addEventListener('change', e => {
        state.filterCategory = e.target.value;
        renderAdminList();
      });
    }

    if (dom.btnRefreshList) {
      dom.btnRefreshList.addEventListener('click', () => {
        loadAllSarees();
        showToast('Inventory reloaded from Supabase.');
      });
    }
  }

  // ----------------------------------------------------------------------------
  // START
  // ----------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
  } else {
    initAdmin();
  }

})();
