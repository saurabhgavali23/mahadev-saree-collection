/**
 * ==============================================================================
 * MAHADEV SAREE COLLECTION - PUBLIC CATALOG SCRIPT (app.js)
 * ==============================================================================
 * Connects to Supabase Database (or demo fallback if unconfigured):
 * - Hash routing (#/ and #/saree/:id) with scroll preservation
 * - Dynamic category, fabric, and color filters
 * - Real-time price slider and "Hide Sold" toggle
 * - Search by name, fabric, and description
 * - Swipeable gallery with CSS scroll-snap, thumbnails, and tap-to-zoom
 * - WhatsApp order links with pre-filled saree details
 * - Web Share API with copy-link fallback
 * - 5-minute sessionStorage caching with force-refresh support
 * ==============================================================================
 */

(function () {
  'use strict';

  // ----------------------------------------------------------------------------
  // APPLICATION STATE
  // ----------------------------------------------------------------------------
  const state = {
    allSarees: [],
    filteredSarees: [],
    currentRoute: '#/',
    catalogScrollY: 0,
    activeCategory: 'all',
    activeFabric: 'all',
    activeColor: 'all',
    maxPrice: Infinity,
    priceMin: 0,
    priceMax: 50000,
    hideSold: false,
    searchQuery: '',
    sortBy: 'newest',
    supabaseClient: null,
    isDemoMode: false
  };

  const CACHE_KEY = 'msc_supabase_sarees_cache_v2';
  const CACHE_TIME_KEY = 'msc_supabase_sarees_time_v2';
  const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800' viewBox='0 0 600 800'%3E%3Crect fill='%23f4ede4' width='600' height='800'/%3E%3Ctext fill='%239c9389' font-family='sans-serif' font-size='24' font-weight='600' x='50%25' y='50%25' text-anchor='middle'%3ESaree Image Coming Soon%3C/text%3E%3C/svg%3E";

  // ----------------------------------------------------------------------------
  // DOM REFERENCES
  // ----------------------------------------------------------------------------
  const dom = {};

  function cacheDom() {
    dom.catalogView = document.getElementById('catalog-view');
    dom.detailView = document.getElementById('detail-view');
    dom.sareeGrid = document.getElementById('saree-grid');
    dom.sareeDetailContent = document.getElementById('saree-detail-content');
    dom.similarSection = document.getElementById('similar-section');
    dom.similarSareesGrid = document.getElementById('similar-sarees-grid');
    dom.demoModeBanner = document.getElementById('demo-mode-banner');

    // States
    dom.emptyState = document.getElementById('empty-state');
    dom.errorState = document.getElementById('error-state');
    dom.errorMessage = document.getElementById('error-message');
    dom.btnRetry = document.getElementById('btn-retry');
    dom.btnLoadFallback = document.getElementById('btn-load-fallback');
    dom.btnEmptyReset = document.getElementById('btn-empty-reset');

    // Filter & Search Controls
    dom.searchInput = document.getElementById('search-input');
    dom.searchClearBtn = document.getElementById('search-clear-btn');
    dom.sortSelect = document.getElementById('sort-select');
    dom.btnToggleFilters = document.getElementById('btn-toggle-filters');
    dom.activeFilterBadge = document.getElementById('active-filter-badge');
    dom.filtersDrawer = document.getElementById('filters-drawer');
    dom.quickCategoryPills = document.getElementById('quick-category-pills');
    dom.filterCategory = document.getElementById('filter-category');
    dom.filterFabric = document.getElementById('filter-fabric');
    dom.filterColor = document.getElementById('filter-color');
    dom.filterPriceRange = document.getElementById('filter-price-range');
    dom.priceSliderValue = document.getElementById('price-slider-value');
    dom.filterHideSold = document.getElementById('filter-hide-sold');
    dom.btnClearFilters = document.getElementById('btn-clear-filters');
    dom.resultsCount = document.getElementById('results-count');

    // Header & Floating Buttons
    dom.headerShopName = document.getElementById('header-shop-name');
    dom.headerShopTagline = document.getElementById('header-shop-tagline');
    dom.headerWaLink = document.getElementById('header-wa-link');
    dom.floatingWaBtn = document.getElementById('floating-whatsapp-btn');
    dom.footerWaBtn = document.getElementById('footer-wa-btn');

    // Lightbox & Toast
    dom.lightboxModal = document.getElementById('lightbox-modal');
    dom.lightboxImg = document.getElementById('lightbox-img');
    dom.lightboxClose = document.getElementById('lightbox-close');
    dom.toastNotice = document.getElementById('toast-notice');
    dom.toastMessage = document.getElementById('toast-message');

    // Footer Refresh
    dom.btnForceRefresh = document.getElementById('btn-force-refresh');
  }

  // ----------------------------------------------------------------------------
  // UTILITY FUNCTIONS
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
    if (amount <= 0) return `${CONFIG.CURRENCY_SYMBOL}—`;
    return `${CONFIG.CURRENCY_SYMBOL}${new Intl.NumberFormat('en-US').format(amount)}`;
  }

  function getShippingInfo(saree) {
    const raw = (saree && saree.shipping_charges !== undefined && saree.shipping_charges !== null)
      ? Number(saree.shipping_charges)
      : (CONFIG.SHIPPING ? Number(CONFIG.SHIPPING.DEFAULT_CHARGE) : 0);
    const amount = isNaN(raw) || raw < 0 ? 0 : raw;
    const isFree = amount <= 0;
    return {
      isFree: isFree,
      amount: amount,
      tagText: isFree ? '🚚 Free Delivery' : `+ ${formatPrice(amount)} Delivery`,
      badgeText: isFree ? '🚚 Free Delivery' : `+ ${formatPrice(amount)} Shipping`,
      detailText: isFree ? 'Free Delivery across India' : `${formatPrice(amount)} Insured Shipping`
    };
  }

  function isItemNew(createdAtStr) {
    if (!createdAtStr) return false;
    try {
      const createdDate = new Date(createdAtStr);
      if (isNaN(createdDate.getTime())) return false;
      const diffDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    } catch (e) {
      return false;
    }
  }

  function showToast(msg) {
    if (!dom.toastNotice) return;
    dom.toastMessage.textContent = msg;
    dom.toastNotice.classList.add('show');
    clearTimeout(dom.toastNotice._timer);
    dom.toastNotice._timer = setTimeout(() => {
      dom.toastNotice.classList.remove('show');
    }, 3000);
  }

  function buildWhatsAppUrl(msg) {
    const cleanNumber = (CONFIG.WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
  }

  // ----------------------------------------------------------------------------
  // SUPABASE CLIENT INITIALIZATION
  // ----------------------------------------------------------------------------
  function initSupabase() {
    const hasKeys = CONFIG.SUPABASE_URL &&
      !CONFIG.SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
      CONFIG.SUPABASE_ANON_KEY &&
      !CONFIG.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY') &&
      window.supabase;

    if (hasKeys) {
      try {
        state.supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        state.isDemoMode = false;
        if (dom.demoModeBanner) dom.demoModeBanner.classList.remove('visible');
      } catch (err) {
        console.warn('Failed to initialize Supabase client:', err);
        state.supabaseClient = null;
        state.isDemoMode = true;
        if (dom.demoModeBanner) dom.demoModeBanner.classList.add('visible');
      }
    } else {
      state.supabaseClient = null;
      state.isDemoMode = true;
      if (dom.demoModeBanner) dom.demoModeBanner.classList.add('visible');
    }
  }

  // ----------------------------------------------------------------------------
  // APPLICATION INIT & CONTENT INJECTION
  // ----------------------------------------------------------------------------
  function initApp() {
    cacheDom();
    initSupabase();
    injectConfigText();
    setupEventListeners();
    handleRouting();
    loadCatalogData();
  }

  function injectConfigText() {
    if (dom.headerShopName) dom.headerShopName.textContent = CONFIG.SHOP_NAME;
    if (dom.headerShopTagline) dom.headerShopTagline.textContent = CONFIG.SHOP_TAGLINE;

    const footerName = document.getElementById('footer-shop-name');
    const footerTagline = document.getElementById('footer-shop-tagline');
    if (footerName) footerName.textContent = CONFIG.SHOP_NAME;
    if (footerTagline) footerTagline.textContent = CONFIG.SHOP_TAGLINE;

    // Contact WhatsApp links
    const genericMsg = `Hello ${CONFIG.SHOP_NAME}, I would like to inquire about your online saree collection.`;
    const defaultWaUrl = buildWhatsAppUrl(genericMsg);
    if (dom.headerWaLink) dom.headerWaLink.href = defaultWaUrl;
    if (dom.floatingWaBtn) dom.floatingWaBtn.href = defaultWaUrl;
    if (dom.footerWaBtn) dom.footerWaBtn.href = defaultWaUrl;

    // Footer contact info
    const fAddress = document.getElementById('footer-address');
    const fPhone = document.getElementById('footer-phone');
    const fEmail = document.getElementById('footer-email');
    const fHours = document.getElementById('footer-hours');
    const fCopyright = document.getElementById('footer-copyright');

    if (fAddress && CONFIG.FOOTER.ADDRESS) fAddress.textContent = CONFIG.FOOTER.ADDRESS;
    if (fPhone && CONFIG.FOOTER.PHONE) fPhone.textContent = CONFIG.FOOTER.PHONE;
    if (fEmail && CONFIG.FOOTER.EMAIL) fEmail.textContent = CONFIG.FOOTER.EMAIL;
    if (fHours && CONFIG.FOOTER.HOURS) fHours.textContent = CONFIG.FOOTER.HOURS;
    if (fCopyright && CONFIG.FOOTER.COPYRIGHT) fCopyright.textContent = CONFIG.FOOTER.COPYRIGHT;

    // How It Works Steps
    const howTitle = document.getElementById('how-it-works-title');
    const howSubtitle = document.getElementById('how-it-works-subtitle');
    const howGrid = document.getElementById('how-it-works-grid');

    if (howTitle && CONFIG.HOW_TO_ORDER.TITLE) howTitle.textContent = CONFIG.HOW_TO_ORDER.TITLE;
    if (howSubtitle && CONFIG.HOW_TO_ORDER.SUBTITLE) howSubtitle.textContent = CONFIG.HOW_TO_ORDER.SUBTITLE;
    if (howGrid && CONFIG.HOW_TO_ORDER.STEPS) {
      howGrid.innerHTML = CONFIG.HOW_TO_ORDER.STEPS.map(step => `
        <div class="step-card">
          <div class="step-number">${escapeHtml(step.step)}</div>
          <div class="step-icon">${escapeHtml(step.icon)}</div>
          <h3 class="step-title">${escapeHtml(step.title)}</h3>
          <p class="step-desc">${escapeHtml(step.desc)}</p>
        </div>
      `).join('');

      // Admin redirect button below the 3 step cards
      const adminBtn = document.createElement('div');
      adminBtn.style.cssText = 'text-align: center; margin-top: 2rem; grid-column: 1 / -1;';
      adminBtn.innerHTML = `
        <a href="admin.html" id="how-to-order-admin-btn" title="Go to Store Admin Panel"
           style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1.25rem;
                  border: 1px solid var(--color-border, #e2d4c0); border-radius: 9999px;
                  color: var(--color-text-muted, #888); font-size: 0.78rem; font-weight: 500;
                  text-decoration: none; transition: all 0.2s ease; background: transparent;"
           onmouseover="this.style.borderColor='var(--color-primary,#7c1228)';this.style.color='var(--color-primary,#7c1228)';"
           onmouseout="this.style.borderColor='var(--color-border,#e2d4c0)';this.style.color='var(--color-text-muted,#888)';">
          🔒 Admin Portal
        </a>
      `;
      howGrid.appendChild(adminBtn);
    }

    // About Us Content
    const aboutTitle = document.getElementById('about-title');
    const aboutSubtitle = document.getElementById('about-subtitle');
    const aboutParagraphs = document.getElementById('about-paragraphs');
    const aboutHighlights = document.getElementById('about-highlights-grid');

    if (aboutTitle && CONFIG.ABOUT.TITLE) aboutTitle.textContent = CONFIG.ABOUT.TITLE;
    if (aboutSubtitle && CONFIG.ABOUT.SUBTITLE) aboutSubtitle.textContent = CONFIG.ABOUT.SUBTITLE;
    if (aboutParagraphs) {
      aboutParagraphs.innerHTML = `
        <p>${escapeHtml(CONFIG.ABOUT.DESCRIPTION_P1)}</p>
        <p>${escapeHtml(CONFIG.ABOUT.DESCRIPTION_P2)}</p>
      `;
    }
    if (aboutHighlights && CONFIG.ABOUT.HIGHLIGHTS) {
      aboutHighlights.innerHTML = CONFIG.ABOUT.HIGHLIGHTS.map(item => `
        <div class="highlight-box">
          <div class="highlight-icon">${escapeHtml(item.icon)}</div>
          <h4 class="highlight-title">${escapeHtml(item.title)}</h4>
          <p class="highlight-desc">${escapeHtml(item.desc)}</p>
        </div>
      `).join('');
    }

    // Return & Exchange Policy
    const returnTitle = document.getElementById('return-title');
    const returnSubtitle = document.getElementById('return-subtitle');
    const policyList = document.getElementById('policy-list');

    if (returnTitle && CONFIG.RETURN_POLICY.TITLE) returnTitle.textContent = CONFIG.RETURN_POLICY.TITLE;
    if (returnSubtitle && CONFIG.RETURN_POLICY.SUBTITLE) returnSubtitle.textContent = CONFIG.RETURN_POLICY.SUBTITLE;
    if (policyList && CONFIG.RETURN_POLICY.POINTS) {
      policyList.innerHTML = CONFIG.RETURN_POLICY.POINTS.map(pt => `
        <li class="policy-list-item">
          <span class="policy-check-icon">✓</span>
          <span>${escapeHtml(pt)}</span>
        </li>
      `).join('');
    }
  }

  // ----------------------------------------------------------------------------
  // DATA FETCHING & NORMALIZATION
  // ----------------------------------------------------------------------------
  function renderSkeletons() {
    if (!dom.sareeGrid) return;
    let html = '';
    for (let i = 0; i < 8; i++) {
      html += `
        <div class="skeleton-card" aria-hidden="true">
          <div class="skeleton-img"></div>
          <div class="skeleton-body">
            <div class="skeleton-line w-half"></div>
            <div class="skeleton-line w-full"></div>
            <div class="skeleton-line w-three-fourth"></div>
          </div>
        </div>
      `;
    }
    dom.sareeGrid.innerHTML = html;
    if (dom.emptyState) dom.emptyState.style.display = 'none';
    if (dom.errorState) dom.errorState.style.display = 'none';
  }

  function loadCatalogData(forceRefresh = false) {
    renderSkeletons();

    // Check sessionStorage cache
    const ttlMs = (CONFIG.CACHE_TTL_MINUTES || 5) * 60 * 1000;
    const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
    const cachedData = sessionStorage.getItem(CACHE_KEY);

    if (!forceRefresh && cachedData && cachedTime) {
      const age = Date.now() - parseInt(cachedTime, 10);
      if (age < ttlMs) {
        try {
          const parsed = JSON.parse(cachedData);
          state.allSarees = normalizeData(parsed);
          initializeFiltersAndData();
          return;
        } catch (e) {
          sessionStorage.removeItem(CACHE_KEY);
        }
      }
    }

    // If Supabase is not configured, load demo data
    if (!state.supabaseClient) {
      console.info('Running in demo mode with fallback data.');
      state.allSarees = normalizeData(CONFIG.FALLBACK_DATA || []);
      initializeFiltersAndData();
      return;
    }

    // Query live Supabase database
    state.supabaseClient
      .from('sarees')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          // If database is empty, fallback to demo items
          console.info('Database table is empty, showing sample data.');
          state.allSarees = normalizeData(CONFIG.FALLBACK_DATA || []);
        } else {
          state.allSarees = normalizeData(data);
          // Cache in sessionStorage
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
            sessionStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
          } catch (e) {
            console.warn('Storage quota exceeded:', e);
          }
        }

        initializeFiltersAndData();
      })
      .catch(err => {
        console.error('Failed to load sarees from Supabase:', err);
        showErrorState(err.message || 'Could not connect to Supabase.');
      });
  }

  function sanitizeVideoUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed.startsWith('https://')) return null;
    const isYt = trimmed.includes('youtube.com') || trimmed.includes('youtu.be');
    const isSupabase = trimmed.includes('supabase.co');
    const isDirect = trimmed.includes('.mp4') || trimmed.includes('.webm') || trimmed.includes('googleapis.com');
    if (isYt || isSupabase || isDirect) {
      return trimmed;
    }
    return null;
  }

  function normalizeData(rawItems) {
    return rawItems.map(row => {
      // Normalizing images array
      let imgs = [];
      if (Array.isArray(row.images)) {
        imgs = row.images.filter(Boolean);
      } else if (typeof row.images === 'string') {
        imgs = row.images.split(',').map(s => s.trim()).filter(Boolean);
      } else if (row.image_url) {
        imgs = [row.image_url];
      }

      if (imgs.length === 0) {
        imgs = [PLACEHOLDER_IMG];
      }

      const isSold = (row.status || '').toLowerCase() === 'sold';
      const cleanVideoUrl = sanitizeVideoUrl(row.video_url);

      return {
        id: String(row.id),
        name: (row.name || 'Untitled Saree').trim(),
        fabric: (row.fabric || 'Traditional Weave').trim(),
        color: (row.color || 'Multicolor').trim(),
        pattern: (row.pattern || 'Classic').trim(),
        border: (row.border || 'Zari Border').trim(),
        category: (row.category || 'Handloom').trim(),
        occasion: (row.occasion || 'Festive / Wedding').trim(),
        description: (row.description || '').trim(),
        price: parseFloat(row.price) || 0,
        shipping_charges: row.shipping_charges !== undefined && row.shipping_charges !== null
          ? (parseFloat(row.shipping_charges) || 0)
          : (CONFIG.SHIPPING?.DEFAULT_CHARGE ?? 0),
        images: imgs,
        mainImage: imgs[0] || PLACEHOLDER_IMG,
        video_url: cleanVideoUrl,
        video_poster: row.video_poster || null,
        reviews: Array.isArray(row.reviews) ? row.reviews : [],
        length_m: (row.length_m !== null && row.length_m !== undefined && !isNaN(row.length_m)) ? parseFloat(row.length_m) : null,
        width_in: (row.width_in !== null && row.width_in !== undefined && !isNaN(row.width_in)) ? parseFloat(row.width_in) : null,
        blouse: row.blouse ? String(row.blouse).trim() : null,
        status: isSold ? 'Sold' : 'Available',
        isSold: isSold,
        created_at: row.created_at || new Date().toISOString(),
        isNew: isItemNew(row.created_at)
      };
    });
  }

  function showErrorState(msg) {
    if (dom.sareeGrid) dom.sareeGrid.innerHTML = '';
    if (dom.emptyState) dom.emptyState.style.display = 'none';
    if (dom.errorState) {
      dom.errorState.style.display = 'block';
      if (dom.errorMessage) {
        dom.errorMessage.innerHTML = `
          ${escapeHtml(msg)}<br><br>
          <small style="color: var(--color-text-light);">
            Verify your Supabase URL & Anon Key in <code>config.js</code> and ensure RLS is enabled with public SELECT access.
          </small>
        `;
      }
    }
  }

  // ----------------------------------------------------------------------------
  // FILTERS SETUP & RENDERING
  // ----------------------------------------------------------------------------
  function initializeFiltersAndData() {
    if (dom.errorState) dom.errorState.style.display = 'none';

    // Price extremes
    const prices = state.allSarees.map(s => s.price).filter(p => p > 0);
    state.priceMin = prices.length ? Math.floor(Math.min(...prices)) : 0;
    state.priceMax = prices.length ? Math.ceil(Math.max(...prices)) : 50000;

    if (dom.filterPriceRange) {
      dom.filterPriceRange.min = state.priceMin;
      dom.filterPriceRange.max = state.priceMax;
      dom.filterPriceRange.value = state.priceMax;
      state.maxPrice = state.priceMax;
      if (dom.priceSliderValue) {
        dom.priceSliderValue.textContent = formatPrice(state.priceMax);
      }
    }

    populateFilterDropdowns();
    populateQuickCategoryPills();
    applyFiltersAndRender();
    handleRouting();
  }

  function populateFilterDropdowns() {
    const cats = new Set();
    const fabrics = new Set();
    const colors = new Set();

    state.allSarees.forEach(s => {
      if (s.category) cats.add(s.category);
      if (s.fabric) fabrics.add(s.fabric);
      if (s.color) colors.add(s.color);
    });

    fillSelect(dom.filterCategory, Array.from(cats).sort(), 'All Categories');
    fillSelect(dom.filterFabric, Array.from(fabrics).sort(), 'All Fabrics');
    fillSelect(dom.filterColor, Array.from(colors).sort(), 'All Colors');
  }

  function fillSelect(el, items, allLabel) {
    if (!el) return;
    const current = el.value;
    el.innerHTML = `<option value="all">${escapeHtml(allLabel)}</option>` +
      items.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
    if (items.includes(current)) el.value = current;
  }

  function populateQuickCategoryPills() {
    if (!dom.quickCategoryPills) return;
    const cats = Array.from(new Set(state.allSarees.map(s => s.category))).sort();

    let html = `<button type="button" class="pill-item active" data-category="all">All Sarees</button>`;
    cats.forEach(cat => {
      html += `<button type="button" class="pill-item" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
    });

    dom.quickCategoryPills.innerHTML = html;

    dom.quickCategoryPills.querySelectorAll('.pill-item').forEach(pill => {
      pill.addEventListener('click', () => {
        const selected = pill.getAttribute('data-category');
        state.activeCategory = selected;
        if (dom.filterCategory) dom.filterCategory.value = selected;

        dom.quickCategoryPills.querySelectorAll('.pill-item').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        applyFiltersAndRender();
      });
    });
  }

  function applyFiltersAndRender() {
    const q = state.searchQuery.toLowerCase().trim();

    state.filteredSarees = state.allSarees.filter(s => {
      if (q) {
        const matchName = s.name.toLowerCase().includes(q);
        const matchDesc = s.description.toLowerCase().includes(q);
        const matchFabric = s.fabric.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchFabric) return false;
      }

      if (state.activeCategory !== 'all' && s.category !== state.activeCategory) return false;
      if (state.activeFabric !== 'all' && s.fabric !== state.activeFabric) return false;
      if (state.activeColor !== 'all' && s.color !== state.activeColor) return false;
      if (s.price > state.maxPrice) return false;
      if (state.hideSold && s.isSold) return false;

      return true;
    });

    // Sorting
    state.filteredSarees.sort((a, b) => {
      if (state.sortBy === 'price-asc') return a.price - b.price;
      if (state.sortBy === 'price-desc') return b.price - a.price;
      // 'newest'
      const da = new Date(a.created_at).getTime() || 0;
      const db = new Date(b.created_at).getTime() || 0;
      return db - da;
    });

    updateFilterStats();
    renderCatalogGrid();
  }

  function updateFilterStats() {
    let count = 0;
    if (state.activeCategory !== 'all') count++;
    if (state.activeFabric !== 'all') count++;
    if (state.activeColor !== 'all') count++;
    if (state.maxPrice < state.priceMax) count++;
    if (state.hideSold) count++;
    if (state.searchQuery) count++;

    if (dom.activeFilterBadge) {
      dom.activeFilterBadge.textContent = count;
      dom.activeFilterBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    if (dom.resultsCount) {
      dom.resultsCount.textContent = `Showing ${state.filteredSarees.length} of ${state.allSarees.length} sarees`;
    }
  }

  function renderCatalogGrid() {
    if (!dom.sareeGrid) return;

    if (state.filteredSarees.length === 0) {
      dom.sareeGrid.innerHTML = '';
      if (dom.emptyState) dom.emptyState.style.display = 'block';
      return;
    }

    if (dom.emptyState) dom.emptyState.style.display = 'none';

    dom.sareeGrid.innerHTML = state.filteredSarees.map(saree => {
      const soldBadge = saree.isSold ? `<span class="badge-sold-out">Sold Out</span>` : '';
      const newBadge = (!saree.isSold && saree.isNew) ? `<span class="badge-new">New</span>` : '';
      const videoBadge = saree.video_url ? `<span class="badge-video">▶ Video</span>` : '';
      const shipping = getShippingInfo(saree);

      return `
        <article class="saree-card ${saree.isSold ? 'is-sold' : ''}" data-id="${escapeHtml(saree.id)}">
          <a href="#/saree/${encodeURIComponent(saree.id)}" class="saree-card-link" aria-label="View details of ${escapeHtml(saree.name)}">
            <div class="card-img-wrap">
              ${newBadge}
              ${soldBadge}
              ${videoBadge}
              <img 
                src="${escapeHtml(saree.mainImage)}" 
                alt="${escapeHtml(saree.name)}" 
                class="card-img" 
                loading="lazy"
                onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';"
              >
            </div>
            <div class="card-body">
              <span class="card-meta">${escapeHtml(saree.fabric)} • ${escapeHtml(saree.category)}</span>
              <h3 class="card-title">${escapeHtml(saree.name)}</h3>
              <div class="card-price-row">
                <div class="card-price-stack">
                  <span class="card-price">${formatPrice(saree.price)}</span>
                  <span class="card-shipping-tag ${shipping.isFree ? 'is-free' : 'is-paid'}">${shipping.tagText}</span>
                </div>
                <span class="card-cta-hint">${saree.isSold ? 'Sold' : 'View &rarr;'}</span>
              </div>
            </div>
          </a>
        </article>
      `;
    }).join('');
  }

  // ----------------------------------------------------------------------------
  // SAREE DETAIL PAGE
  // ----------------------------------------------------------------------------
  function renderSareeDetail(sareeId) {
    const saree = state.allSarees.find(s => String(s.id) === String(sareeId));

    if (!saree) {
      if (dom.sareeDetailContent) {
        dom.sareeDetailContent.innerHTML = `
          <div class="state-box">
            <div class="state-icon">⚠️</div>
            <h3 class="state-title">Saree Not Found</h3>
            <p class="state-desc">The saree code <strong>#${escapeHtml(sareeId)}</strong> could not be found in our catalog.</p>
            <a href="#/" class="btn-primary">Browse All Sarees</a>
          </div>
        `;
      }
      if (dom.similarSection) dom.similarSection.style.display = 'none';
      return;
    }

    document.title = `${saree.name} | ${CONFIG.SHOP_NAME}`;
    updateMeta(saree);

    const allImages = saree.images.length > 0 ? saree.images : [PLACEHOLDER_IMG];

    // Build unified gallery items: Video as FIRST item if available
    const galleryItems = [];
    if (saree.video_url) {
      const isYt = saree.video_url.includes('youtube.com') || saree.video_url.includes('youtu.be');
      let ytId = '';
      if (isYt) {
        const ytMatch = saree.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
        ytId = ytMatch ? ytMatch[1] : '';
      }
      const poster = saree.video_poster || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : saree.mainImage);

      galleryItems.push({
        type: 'video',
        isYouTube: isYt,
        youtubeId: ytId,
        videoUrl: saree.video_url,
        poster: poster
      });
    }

    allImages.forEach(imgUrl => {
      galleryItems.push({
        type: 'image',
        url: imgUrl
      });
    });

    const currentUrl = window.location.href;
    const shipping = getShippingInfo(saree);
    const totalAmount = saree.price + shipping.amount;
    const shippingLine = shipping.isFree 
      ? `*Shipping:* Free Delivery (Pan-India)` 
      : `*Shipping:* ${formatPrice(shipping.amount)} (Pan-India Insured Courier)`;
    const totalLine = shipping.isFree 
      ? `*Total:* ${formatPrice(saree.price)}` 
      : `*Total:* ${formatPrice(totalAmount)} (Price + Shipping)`;

    const orderMessage = `Hello ${CONFIG.SHOP_NAME},\n\nI would like to order this saree:\n*Saree ID:* ${saree.id}\n*Name:* ${saree.name}\n*Price:* ${formatPrice(saree.price)}\n${shippingLine}\n${totalLine}\n*Fabric:* ${saree.fabric}\n*Link:* ${currentUrl}\n\nPlease confirm availability and payment details.`;
    const orderWaUrl = buildWhatsAppUrl(orderMessage);

    const askSimilarMessage = `Hello ${CONFIG.SHOP_NAME},\n\nI liked saree *${saree.name}* (ID: ${saree.id}) which is sold out. Do you have similar designs available?\n*Link:* ${currentUrl}`;
    const askSimilarWaUrl = buildWhatsAppUrl(askSimilarMessage);

    const slidesHtml = galleryItems.map((item, idx) => {
      if (item.type === 'video') {
        if (item.isYouTube) {
          return `
            <div class="gallery-slide is-video" data-index="${idx}" data-yt-id="${escapeHtml(item.youtubeId)}">
              <div class="video-play-overlay" data-action="play-youtube" data-yt-id="${escapeHtml(item.youtubeId)}">
                <div class="btn-big-play">▶</div>
                <span class="video-play-caption">Watch Drape Video</span>
              </div>
              <img src="${escapeHtml(item.poster)}" alt="${escapeHtml(saree.name)} Video Poster" class="card-img" style="object-fit:cover;">
            </div>
          `;
        } else {
          return `
            <div class="gallery-slide is-video" data-index="${idx}">
              <div class="video-play-overlay" data-action="play-native">
                <div class="btn-big-play">▶</div>
                <span class="video-play-caption">Watch Drape Video</span>
              </div>
              <video class="gallery-video-player" controls playsinline preload="none" poster="${escapeHtml(item.poster)}">
                <source src="${escapeHtml(item.videoUrl)}" type="video/mp4">
                Your browser does not support HTML5 video.
              </video>
            </div>
          `;
        }
      } else {
        return `
          <div class="gallery-slide" data-index="${idx}" data-img="${escapeHtml(item.url)}">
            <img 
              src="${escapeHtml(item.url)}" 
              alt="${escapeHtml(saree.name)} - View ${idx + 1}"
              loading="${idx === 0 ? 'eager' : 'lazy'}"
              onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';"
            >
            <span class="gallery-zoom-hint">🔍 Tap to Zoom</span>
          </div>
        `;
      }
    }).join('');

    const thumbnailsHtml = galleryItems.length > 1 ? `
      <div class="gallery-thumbnails" role="tablist" aria-label="Saree thumbnails">
        ${galleryItems.map((item, idx) => {
      const isVid = item.type === 'video';
      const thumbSrc = isVid ? item.poster : item.url;
      return `
            <button type="button" class="thumb-item ${isVid ? 'is-video' : ''} ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="${isVid ? 'Watch Video' : 'View photo ' + (idx + 1)}">
              <img src="${escapeHtml(thumbSrc)}" alt="Thumbnail ${idx + 1}" onerror="this.src='${PLACEHOLDER_IMG}';">
            </button>
          `;
    }).join('')}
      </div>
    ` : '';

    let actionButtonsHtml = '';
    if (!saree.isSold) {
      actionButtonsHtml = `
        <a href="${orderWaUrl}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp-order">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
          </svg>
          <span>Order on WhatsApp</span>
        </a>
      `;
    } else {
      actionButtonsHtml = `
        <button type="button" class="btn-whatsapp-order disabled" disabled>
          <span>Sold Out</span>
        </button>
        <a href="${askSimilarWaUrl}" target="_blank" rel="noopener noreferrer" class="ask-similar-link">
          💬 Ask for similar sarees on WhatsApp &rarr;
        </a>
      `;
    }

    dom.sareeDetailContent.innerHTML = `
      <div class="detail-grid">
        
        <!-- Left: Image & Video Gallery -->
        <div class="gallery-wrapper">
          <div class="gallery-snap-container" id="gallery-container">
            ${slidesHtml}
          </div>
          ${thumbnailsHtml}
        </div>

        <!-- Right: Specifications & Ordering -->
        <div class="detail-info">
          
          <div class="detail-header-badges">
            <span class="badge-status ${saree.isSold ? 'sold' : 'available'}">
              ${saree.isSold ? 'Sold Out' : 'Available'}
            </span>
            ${saree.isNew && !saree.isSold ? '<span class="badge-new" style="position:static;">New Arrival</span>' : ''}
            ${saree.video_url ? '<span class="badge-video" style="position:static; background:#1e293b;">▶ Video Available</span>' : ''}
            <span class="badge-detail-id">ID: #${escapeHtml(saree.id)}</span>
          </div>

          <h2 class="detail-title">${escapeHtml(saree.name)}</h2>

          <div class="detail-price-row">
            <div class="detail-price-col">
              <span class="detail-price">${formatPrice(saree.price)}</span>
              <span class="detail-shipping-badge ${shipping.isFree ? 'is-free' : 'is-paid'}">
                ${shipping.badgeText}
              </span>
            </div>
            <div class="detail-price-meta">
              ${!shipping.isFree ? `<span class="detail-total-note">Total: <strong>${formatPrice(totalAmount)}</strong></span>` : ''}
              <span class="detail-tax-note">Inclusive of all taxes • Pan-India Insured</span>
            </div>
          </div>

          <!-- Specifications Table -->
          <div class="specs-grid">
            <div class="spec-item">
              <span class="spec-key">Fabric</span>
              <span class="spec-val">${escapeHtml(saree.fabric)}</span>
            </div>
            <div class="spec-item">
              <span class="spec-key">Color</span>
              <span class="spec-val">${escapeHtml(saree.color)}</span>
            </div>
            <div class="spec-item">
              <span class="spec-key">Pattern</span>
              <span class="spec-val">${escapeHtml(saree.pattern)}</span>
            </div>
            <div class="spec-item">
              <span class="spec-key">Border</span>
              <span class="spec-val">${escapeHtml(saree.border)}</span>
            </div>
            <div class="spec-item">
              <span class="spec-key">Occasion</span>
              <span class="spec-val">${escapeHtml(saree.occasion)}</span>
            </div>
            <div class="spec-item">
              <span class="spec-key">Category</span>
              <span class="spec-val">${escapeHtml(saree.category)}</span>
            </div>
            ${saree.length_m ? `
            <div class="spec-item">
              <span class="spec-key">Length</span>
              <span class="spec-val">${escapeHtml(saree.length_m)} meters</span>
            </div>` : ''}
            ${saree.width_in ? `
            <div class="spec-item">
              <span class="spec-key">Width</span>
              <span class="spec-val">${escapeHtml(saree.width_in)} inches</span>
            </div>` : ''}
            ${saree.blouse ? `
            <div class="spec-item">
              <span class="spec-key">Blouse Piece</span>
              <span class="spec-val">${escapeHtml(saree.blouse)}</span>
            </div>` : ''}
            <div class="spec-item">
              <span class="spec-key">Shipping</span>
              <span class="spec-val ${shipping.isFree ? 'highlight-free-shipping' : ''}">
                ${escapeHtml(shipping.detailText)}
              </span>
            </div>
            <div class="spec-item">
              <span class="spec-key">Returns</span>
              <span class="spec-val">Damaged only (Unboxing video required)</span>
            </div>
          </div>

          <!-- Description -->
          <div class="detail-desc-box">
            <span class="detail-desc-label">Saree Description</span>
            <p class="detail-desc-text">${escapeHtml(saree.description || 'Authentic handcrafted pure saree made by master weavers.')}</p>
          </div>

          <!-- Return Policy Note -->
          <div class="detail-policy-notice">
            <span class="detail-policy-notice-title">🛡️ Return &amp; Damage Policy</span>
            <p class="detail-policy-notice-text">
              • <strong>No Exchange:</strong> We do not offer exchanges or replacements.<br>
              • <strong>Return Only if Damaged:</strong> Accepted strictly if physical damage is found on arrival.<br>
              • <strong>Mandatory Unpacking Video:</strong> Full continuous unboxing video of sealed parcel required as proof.<br>
              • <strong>Self-Ship:</strong> In case of damage, customer needs to self-ship / courier the saree back to our return address.
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="cta-group">
            ${actionButtonsHtml}
            
            <button type="button" id="btn-share-saree" class="btn-share" aria-label="Share this saree">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              <span>Share Saree</span>
            </button>
          </div>

        </div>
      </div>

      <!-- Customer Reviews Section -->
      <div class="detail-reviews-wrapper" id="detail-reviews-container"></div>
    `;

    attachGalleryEvents();

    const shareBtn = document.getElementById('btn-share-saree');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => handleShare(saree));
    }

    loadAndRenderReviews(sareeId, saree);

    renderSimilarSarees(saree);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return '';
    }
  }

  async function loadAndRenderReviews(sareeId, saree) {
    const container = document.getElementById('detail-reviews-container');
    if (!container) return;

    let reviews = [];

    // 1. Try Supabase live table saree_reviews if connected
    if (state.supabaseClient) {
      try {
        const { data, error } = await state.supabaseClient
          .from('saree_reviews')
          .select('*')
          .eq('saree_id', sareeId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          reviews = data;
        }
      } catch (e) {
        console.warn('Could not query saree_reviews table:', e);
      }
    }

    // 2. Try local storage (admin added review locally/offline)
    if (reviews.length === 0) {
      try {
        const local = JSON.parse(localStorage.getItem('msc_local_reviews') || '[]');
        const matching = local.filter(r => String(r.saree_id) === String(sareeId));
        if (matching.length > 0) reviews = matching;
      } catch (e) {}
    }

    // 3. Fallback to saree.reviews or CONFIG.FALLBACK_DATA
    if (reviews.length === 0) {
      if (saree.reviews && saree.reviews.length > 0) {
        reviews = saree.reviews;
      } else {
        const fallback = (CONFIG.FALLBACK_DATA || []).find(s => String(s.id) === String(sareeId));
        if (fallback && fallback.reviews && fallback.reviews.length > 0) {
          reviews = fallback.reviews;
        }
      }
    }

    renderReviewsHtml(container, reviews, saree);
  }

  function renderReviewsHtml(container, reviews, saree) {
    if (!reviews || reviews.length === 0) {
      container.innerHTML = `
        <section class="detail-reviews-section">
          <div class="reviews-section-header">
            <div>
              <h3 class="reviews-section-title">Verified Customer Reviews</h3>
              <p class="reviews-section-subtitle">Real drape photos, videos, and comments from verified buyers</p>
            </div>
            <div class="reviews-guarantee-badge">
              <span>🛡️ 100% Quality Guaranteed</span>
            </div>
          </div>
          <div class="review-empty-card">
            <span class="review-empty-icon">✨</span>
            <h4>No customer reviews yet for this saree</h4>
            <p>Be the first to drape this authentic handcrafted piece! Every saree is hand-inspected and backed by ${escapeHtml(CONFIG.SHOP_NAME)}'s quality promise.</p>
          </div>
        </section>
      `;
      return;
    }

    const avgRating = (reviews.reduce((acc, r) => acc + (parseFloat(r.rating) || 5), 0) / reviews.length).toFixed(1);
    const starCount = Math.round(parseFloat(avgRating));

    container.innerHTML = `
      <section class="detail-reviews-section">
        <div class="reviews-section-header">
          <div class="reviews-header-info">
            <h3 class="reviews-section-title">Customer Reviews &amp; Drapes</h3>
            <p class="reviews-section-subtitle">Authentic feedback, drape photos, and videos from buyers</p>
          </div>
          <div class="reviews-summary-card">
            <div class="reviews-score-col">
              <span class="reviews-avg-number">${avgRating}</span>
              <div class="reviews-avg-stars" aria-label="${avgRating} out of 5 stars">${'★'.repeat(starCount)}${'☆'.repeat(5 - starCount)}</div>
            </div>
            <div class="reviews-count-meta">
              <strong>${reviews.length} ${reviews.length === 1 ? 'Verified Review' : 'Verified Reviews'}</strong>
              <span class="reviews-verified-pill">✓ Admin Verified</span>
            </div>
          </div>
        </div>

        <div class="reviews-cards-list">
          ${reviews.map(rev => {
            const rating = parseInt(rev.rating, 10) || 5;
            const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
            const initial = (rev.customer_name || 'C').trim().charAt(0).toUpperCase();
            const photos = Array.isArray(rev.photos) ? rev.photos : [];
            const dateStr = rev.created_at ? formatDate(rev.created_at) : 'Verified Purchase';

            let videoHtml = '';
            if (rev.video_url) {
              const vUrl = rev.video_url.trim();
              const isYt = vUrl.includes('youtube.com') || vUrl.includes('youtu.be');
              if (isYt) {
                const match = vUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
                const ytId = match ? match[1] : '';
                if (ytId) {
                  videoHtml = `
                    <div class="review-media-block">
                      <span class="review-media-label">🎥 Customer Drape Video</span>
                      <div class="review-video-embed yt-aspect">
                        <iframe 
                          src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?playsinline=1" 
                          title="Customer Drape Video" 
                          frameborder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowfullscreen 
                          loading="lazy">
                        </iframe>
                      </div>
                    </div>
                  `;
                }
              } else {
                videoHtml = `
                  <div class="review-media-block">
                    <span class="review-media-label">🎥 Customer Drape Video</span>
                    <div class="review-video-embed">
                      <video controls playsinline preload="metadata" class="review-video-player">
                        <source src="${escapeHtml(vUrl)}" type="video/mp4">
                        Your browser does not support HTML5 video.
                      </video>
                    </div>
                  </div>
                `;
              }
            }

            let photosHtml = '';
            if (photos.length > 0) {
              photosHtml = `
                <div class="review-media-block">
                  <span class="review-media-label">📸 Customer Photos (${photos.length}) <small>(Tap to zoom)</small></span>
                  <div class="review-photos-grid">
                    ${photos.map((pUrl, pIdx) => `
                      <button type="button" class="review-photo-btn" data-img="${escapeHtml(pUrl)}" aria-label="View customer photo ${pIdx + 1} full screen">
                        <img src="${escapeHtml(pUrl)}" alt="Customer photo ${pIdx + 1}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}';">
                        <span class="review-photo-zoom-icon">🔍</span>
                      </button>
                    `).join('')}
                  </div>
                </div>
              `;
            }

            return `
              <article class="customer-review-card">
                <header class="review-card-header">
                  <div class="reviewer-profile">
                    <div class="reviewer-avatar" aria-hidden="true">${escapeHtml(initial)}</div>
                    <div>
                      <h4 class="reviewer-name">${escapeHtml(rev.customer_name || 'Customer')}</h4>
                      <div class="reviewer-badges">
                        <span class="review-verified-badge">✓ Verified Buyer</span>
                        <time class="review-date">${escapeHtml(dateStr)}</time>
                      </div>
                    </div>
                  </div>
                  <div class="review-rating-stars" aria-label="${rating} out of 5 stars">${stars}</div>
                </header>

                <div class="review-comment-body">
                  <p class="review-comment-text">${escapeHtml(rev.comment || '')}</p>
                </div>

                ${photosHtml}
                ${videoHtml}
              </article>
            `;
          }).join('')}
        </div>
      </section>
    `;

    // Lightbox click on customer review photos
    container.querySelectorAll('.review-photo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const imgSrc = btn.getAttribute('data-img');
        if (imgSrc) openLightbox(imgSrc);
      });
    });
  }

  function attachGalleryEvents() {
    const gallery = document.getElementById('gallery-container');
    const thumbs = dom.sareeDetailContent.querySelectorAll('.thumb-item');
    const slides = dom.sareeDetailContent.querySelectorAll('.gallery-slide');

    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        const idx = parseInt(thumb.getAttribute('data-index'), 10);
        if (slides[idx]) {
          slides[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        }
      });
    });

    // Handle Video Play Overlays
    dom.sareeDetailContent.querySelectorAll('.video-play-overlay').forEach(overlay => {
      overlay.addEventListener('click', () => {
        const action = overlay.getAttribute('data-action');
        const parentSlide = overlay.closest('.gallery-slide');

        if (action === 'play-youtube') {
          const ytId = overlay.getAttribute('data-yt-id');
          if (ytId && parentSlide) {
            parentSlide.innerHTML = `
              <iframe 
                class="gallery-video-iframe" 
                src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?autoplay=1&playsinline=1" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen 
                loading="lazy">
              </iframe>
            `;
          }
        } else {
          // Native video play
          const videoEl = parentSlide ? parentSlide.querySelector('video') : null;
          if (videoEl) {
            overlay.style.display = 'none';
            videoEl.play().catch(e => console.warn('Video play prevented:', e));
          }
        }
      });
    });

    // Scroll listener: sync active thumbnail and pause video when user swipes away
    if (gallery && thumbs.length > 0) {
      gallery.addEventListener('scroll', () => {
        const width = gallery.offsetWidth;
        const currentIdx = Math.round(gallery.scrollLeft / width);
        thumbs.forEach((t, i) => t.classList.toggle('active', i === currentIdx));

        // Pause playing videos when user swipes to a different slide
        const videos = gallery.querySelectorAll('video');
        videos.forEach(v => {
          const parent = v.closest('.gallery-slide');
          const slideIdx = parent ? parseInt(parent.getAttribute('data-index'), 10) : -1;
          if (slideIdx !== currentIdx && !v.paused) {
            v.pause();
          }
        });
      }, { passive: true });
    }

    // Lightbox for photos only
    slides.forEach(slide => {
      if (!slide.classList.contains('is-video')) {
        slide.addEventListener('click', () => {
          openLightbox(slide.getAttribute('data-img'));
        });
      }
    });
  }

  function openLightbox(imgSrc) {
    if (!dom.lightboxModal || !dom.lightboxImg) return;
    dom.lightboxImg.src = imgSrc;
    dom.lightboxModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!dom.lightboxModal) return;
    dom.lightboxModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function handleShare(saree) {
    const shareData = {
      title: `${saree.name} | ${CONFIG.SHOP_NAME}`,
      text: `Take a look at this stunning ${saree.fabric} saree (${formatPrice(saree.price)}) at ${CONFIG.SHOP_NAME}!`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => copyLink(window.location.href));
    } else {
      copyLink(window.location.href);
    }
  }

  function copyLink(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showToast('Link copied to clipboard!'))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      showToast('Link copied to clipboard!');
    } catch (e) {
      showToast('Link: ' + text);
    }
    document.body.removeChild(input);
  }

  function renderSimilarSarees(current) {
    if (!dom.similarSection || !dom.similarSareesGrid) return;

    const similar = state.allSarees.filter(s => {
      if (String(s.id) === String(current.id)) return false;
      return s.category === current.category || s.fabric === current.fabric;
    }).slice(0, 4);

    if (similar.length === 0) {
      dom.similarSection.style.display = 'none';
      return;
    }

    dom.similarSection.style.display = 'block';
    dom.similarSareesGrid.innerHTML = similar.map(s => {
      const simShipping = getShippingInfo(s);
      return `
      <article class="saree-card ${s.isSold ? 'is-sold' : ''}">
        <a href="#/saree/${encodeURIComponent(s.id)}" class="saree-card-link">
          <div class="card-img-wrap">
            ${s.isSold ? '<span class="badge-sold-out">Sold Out</span>' : ''}
            <img 
              src="${escapeHtml(s.mainImage)}" 
              alt="${escapeHtml(s.name)}" 
              class="card-img" 
              loading="lazy"
              onerror="this.src='${PLACEHOLDER_IMG}';"
            >
          </div>
          <div class="card-body">
            <span class="card-meta">${escapeHtml(s.fabric)}</span>
            <h4 class="card-title">${escapeHtml(s.name)}</h4>
            <div class="card-price-row">
              <div class="card-price-stack">
                <span class="card-price">${formatPrice(s.price)}</span>
                <span class="card-shipping-tag ${simShipping.isFree ? 'is-free' : 'is-paid'}">${simShipping.tagText}</span>
              </div>
              <span class="card-cta-hint">View &rarr;</span>
            </div>
          </div>
        </a>
      </article>
      `;
    }).join('');
  }

  function updateMeta(saree) {
    const metaDesc = document.getElementById('meta-description');
    const ogTitle = document.getElementById('og-title');
    const ogDesc = document.getElementById('og-description');
    const ogImage = document.getElementById('og-image');
    const ogUrl = document.getElementById('og-url');

    const desc = `${saree.name} in ${saree.fabric} (${saree.color}) - ${formatPrice(saree.price)}. Order directly on WhatsApp from ${CONFIG.SHOP_NAME}.`;

    if (metaDesc) metaDesc.setAttribute('content', desc);
    if (ogTitle) ogTitle.setAttribute('content', `${saree.name} | ${CONFIG.SHOP_NAME}`);
    if (ogDesc) ogDesc.setAttribute('content', desc);
    if (ogImage) ogImage.setAttribute('content', saree.mainImage);
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);
  }

  function resetMeta() {
    document.title = `${CONFIG.SHOP_NAME} | ${CONFIG.SHOP_TAGLINE}`;
    const metaDesc = document.getElementById('meta-description');
    if (metaDesc) {
      metaDesc.setAttribute('content', `Discover authentic Kanjivaram, Banarasi, Chanderi, and silk sarees at ${CONFIG.SHOP_NAME}. 100% online boutique with Pan-India delivery. Order directly on WhatsApp.`);
    }
  }

  // ----------------------------------------------------------------------------
  // HASH ROUTER
  // ----------------------------------------------------------------------------
  function handleRouting() {
    const hash = window.location.hash || '#/';
    state.currentRoute = hash;

    if (hash.startsWith('#/saree/')) {
      const sareeId = decodeURIComponent(hash.replace('#/saree/', '')).trim();

      if (!dom.catalogView.classList.contains('hidden')) {
        state.catalogScrollY = window.scrollY;
      }

      dom.catalogView.classList.add('hidden');
      dom.detailView.classList.add('active');

      if (state.allSarees.length > 0) {
        renderSareeDetail(sareeId);
      }
    } else {
      resetMeta();
      dom.catalogView.classList.remove('hidden');
      dom.detailView.classList.remove('active');

      if (state.catalogScrollY > 0) {
        window.scrollTo({ top: state.catalogScrollY, behavior: 'instant' });
      }
    }
  }

  // ----------------------------------------------------------------------------
  // EVENT LISTENERS
  // ----------------------------------------------------------------------------
  function setupEventListeners() {
    window.addEventListener('hashchange', handleRouting);

    // Search
    let searchTimer = null;
    if (dom.searchInput) {
      dom.searchInput.addEventListener('input', e => {
        clearTimeout(searchTimer);
        const val = e.target.value;
        state.searchQuery = val;
        if (dom.searchClearBtn) dom.searchClearBtn.classList.toggle('visible', val.length > 0);
        searchTimer = setTimeout(applyFiltersAndRender, 150);
      });
    }

    if (dom.searchClearBtn) {
      dom.searchClearBtn.addEventListener('click', () => {
        dom.searchInput.value = '';
        state.searchQuery = '';
        dom.searchClearBtn.classList.remove('visible');
        applyFiltersAndRender();
      });
    }

    // Sort
    if (dom.sortSelect) {
      dom.sortSelect.addEventListener('change', e => {
        state.sortBy = e.target.value;
        applyFiltersAndRender();
      });
    }

    // Toggle filter drawer
    if (dom.btnToggleFilters) {
      dom.btnToggleFilters.addEventListener('click', () => {
        const isOpen = dom.filtersDrawer.classList.toggle('open');
        dom.btnToggleFilters.setAttribute('aria-expanded', String(isOpen));
      });
    }

    // Filter selects
    if (dom.filterCategory) {
      dom.filterCategory.addEventListener('change', e => {
        state.activeCategory = e.target.value;
        if (dom.quickCategoryPills) {
          dom.quickCategoryPills.querySelectorAll('.pill-item').forEach(p => {
            p.classList.toggle('active', p.getAttribute('data-category') === state.activeCategory);
          });
        }
        applyFiltersAndRender();
      });
    }

    if (dom.filterFabric) {
      dom.filterFabric.addEventListener('change', e => {
        state.activeFabric = e.target.value;
        applyFiltersAndRender();
      });
    }

    if (dom.filterColor) {
      dom.filterColor.addEventListener('change', e => {
        state.activeColor = e.target.value;
        applyFiltersAndRender();
      });
    }

    // Price Slider
    if (dom.filterPriceRange) {
      dom.filterPriceRange.addEventListener('input', e => {
        state.maxPrice = parseFloat(e.target.value);
        if (dom.priceSliderValue) dom.priceSliderValue.textContent = formatPrice(state.maxPrice);
        applyFiltersAndRender();
      });
    }

    // Hide sold checkbox
    if (dom.filterHideSold) {
      dom.filterHideSold.addEventListener('change', e => {
        state.hideSold = e.target.checked;
        applyFiltersAndRender();
      });
    }

    // Reset filters
    const resetFilters = () => {
      state.activeCategory = 'all';
      state.activeFabric = 'all';
      state.activeColor = 'all';
      state.maxPrice = state.priceMax;
      state.hideSold = false;
      state.searchQuery = '';

      if (dom.searchInput) dom.searchInput.value = '';
      if (dom.searchClearBtn) dom.searchClearBtn.classList.remove('visible');
      if (dom.filterCategory) dom.filterCategory.value = 'all';
      if (dom.filterFabric) dom.filterFabric.value = 'all';
      if (dom.filterColor) dom.filterColor.value = 'all';
      if (dom.filterPriceRange) {
        dom.filterPriceRange.value = state.priceMax;
        if (dom.priceSliderValue) dom.priceSliderValue.textContent = formatPrice(state.priceMax);
      }
      if (dom.filterHideSold) dom.filterHideSold.checked = false;

      if (dom.quickCategoryPills) {
        dom.quickCategoryPills.querySelectorAll('.pill-item').forEach(p => {
          p.classList.toggle('active', p.getAttribute('data-category') === 'all');
        });
      }

      applyFiltersAndRender();
    };

    if (dom.btnClearFilters) dom.btnClearFilters.addEventListener('click', resetFilters);
    if (dom.btnEmptyReset) dom.btnEmptyReset.addEventListener('click', resetFilters);

    // Retry & fallback buttons
    if (dom.btnRetry) dom.btnRetry.addEventListener('click', () => loadCatalogData(true));
    if (dom.btnLoadFallback) {
      dom.btnLoadFallback.addEventListener('click', () => {
        state.allSarees = normalizeData(CONFIG.FALLBACK_DATA || []);
        initializeFiltersAndData();
      });
    }

    // Force Refresh from footer
    if (dom.btnForceRefresh) {
      dom.btnForceRefresh.addEventListener('click', () => {
        sessionStorage.removeItem(CACHE_KEY);
        sessionStorage.removeItem(CACHE_TIME_KEY);
        showToast('Refreshing catalog from live database...');
        loadCatalogData(true);
      });
    }

    // Lightbox dismissal
    if (dom.lightboxClose) dom.lightboxClose.addEventListener('click', closeLightbox);
    if (dom.lightboxModal) {
      dom.lightboxModal.addEventListener('click', e => {
        if (e.target === dom.lightboxModal || e.target.classList.contains('lightbox-content-wrap')) {
          closeLightbox();
        }
      });
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && dom.lightboxModal && dom.lightboxModal.classList.contains('open')) {
        closeLightbox();
      }
    });
  }

  // ----------------------------------------------------------------------------
  // START
  // ----------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
