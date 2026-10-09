/**
 * ==============================================================================
 * MAHADEV SAREE COLLECTION - MAIN APPLICATION SCRIPT (app.js)
 * ==============================================================================
 * Handles:
 * 1. Google Sheets CSV fetching with sessionStorage caching & fallback data
 * 2. PapaParse parsing and XSS-safe data sanitization
 * 3. Hash-based routing (#/ and #/saree/:id) with scroll position preservation
 * 4. Reactive catalog filtering (category, fabric, color, price slider, hide sold)
 * 5. Instant search and multi-criteria sorting
 * 6. Swipeable image gallery with thumbnails & tap-to-zoom lightbox
 * 7. WhatsApp dynamic order message generation
 * 8. Web Share API with clipboard fallback & toast notification
 * 9. "You may also like" recommendation engine
 * 10. Dynamic SEO document title and meta tag updates
 * ==============================================================================
 */

(function () {
  'use strict';

  // ----------------------------------------------------------------------------
  // APPLICATION STATE
  // ----------------------------------------------------------------------------
  const state = {
    allSarees: [],          // Raw sanitized array of saree records
    filteredSarees: [],     // Sarees after filters, search, and sorting
    currentRoute: '#/',     // Current hash route
    catalogScrollY: 0,      // Saved scroll position for returning from detail page
    activeCategory: 'all',  // Currently active category
    activeFabric: 'all',    // Currently active fabric
    activeColor: 'all',     // Currently active color
    maxPrice: Infinity,     // Maximum price filter
    priceMin: 0,            // Absolute minimum price in catalog
    priceMax: 100000,       // Absolute maximum price in catalog
    hideSold: false,        // Toggle for sold out items
    searchQuery: '',        // Current search text
    sortBy: 'newest',       // 'newest' | 'price-asc' | 'price-desc'
    activeLightboxImg: '',  // Current image in zoom lightbox
  };

  // Cache configuration key
  const CACHE_KEY = 'msc_saree_catalog_cache_v1';
  const CACHE_TIME_KEY = 'msc_saree_catalog_time_v1';

  // Default fallback image if sheet URL is empty or broken
  const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800' viewBox='0 0 600 800'%3E%3Crect fill='%23f4ede4' width='600' height='800'/%3E%3Ctext fill='%239c9389' font-family='sans-serif' font-size='24' font-weight='600' x='50%25' y='50%25' text-anchor='middle'%3ESaree Image Coming Soon%3C/text%3E%3C/svg%3E";

  // ----------------------------------------------------------------------------
  // DOM ELEMENT REFERENCES
  // ----------------------------------------------------------------------------
  const dom = {};

  function cacheDomElements() {
    // Views
    dom.catalogView = document.getElementById('catalog-view');
    dom.detailView = document.getElementById('detail-view');
    dom.sareeGrid = document.getElementById('saree-grid');
    dom.sareeDetailContent = document.getElementById('saree-detail-content');
    dom.similarSection = document.getElementById('similar-section');
    dom.similarSareesGrid = document.getElementById('similar-sarees-grid');
    
    // States
    dom.emptyState = document.getElementById('empty-state');
    dom.errorState = document.getElementById('error-state');
    dom.errorMessage = document.getElementById('error-message');
    dom.btnRetry = document.getElementById('btn-retry');
    dom.btnLoadFallback = document.getElementById('btn-load-fallback');
    dom.btnEmptyReset = document.getElementById('btn-empty-reset');
    
    // Search & Filter controls
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
    dom.activeFilterSummary = document.getElementById('active-filter-summary');

    // Header & Floating buttons
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

    // Footer & Info
    dom.btnForceRefresh = document.getElementById('btn-force-refresh');
  }

  // ----------------------------------------------------------------------------
  // HELPER UTILITIES
  // ----------------------------------------------------------------------------
  
  /**
   * Prevents XSS attacks by safely escaping HTML characters
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Formats numeric price into Indian currency format (e.g. ₹ 14,500)
   */
  function formatPrice(amount) {
    const num = Number(amount) || 0;
    const formatted = new Intl.NumberFormat('en-IN').format(num);
    return `${CONFIG.CURRENCY_SYMBOL}${formatted}`;
  }

  /**
   * Checks if a saree was added within the last 7 days
   */
  function isItemNew(createdAtStr) {
    if (!createdAtStr) return false;
    try {
      const createdDate = new Date(createdAtStr);
      if (isNaN(createdDate.getTime())) return false;
      const now = new Date();
      const diffMs = now.getTime() - createdDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    } catch (e) {
      return false;
    }
  }

  /**
   * Displays temporary toast notification
   */
  function showToast(message) {
    if (!dom.toastNotice) return;
    dom.toastMessage.textContent = message;
    dom.toastNotice.classList.add('show');
    clearTimeout(dom.toastNotice._timer);
    dom.toastNotice._timer = setTimeout(() => {
      dom.toastNotice.classList.remove('show');
    }, 3000);
  }

  /**
   * Constructs direct WhatsApp chat URL with pre-filled message
   */
  function buildWhatsAppUrl(customMessage) {
    const cleanNumber = (CONFIG.WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(customMessage);
    return `https://wa.me/${cleanNumber}?text=${encoded}`;
  }

  // ----------------------------------------------------------------------------
  // INITIALIZATION & CONFIG INJECTION
  // ----------------------------------------------------------------------------
  function initApp() {
    cacheDomElements();
    injectConfigContent();
    setupEventListeners();
    handleRouting();
    loadCatalogData();
  }

  /**
   * Populates brand details, About, How to Order, and Policy from config.js
   */
  function injectConfigContent() {
    // Shop branding in Header & Footer
    if (dom.headerShopName) dom.headerShopName.textContent = CONFIG.SHOP_NAME;
    if (dom.headerShopTagline) dom.headerShopTagline.textContent = CONFIG.SHOP_TAGLINE;
    
    const footerShopName = document.getElementById('footer-shop-name');
    const footerShopTagline = document.getElementById('footer-shop-tagline');
    if (footerShopName) footerShopName.textContent = CONFIG.SHOP_NAME;
    if (footerShopTagline) footerShopTagline.textContent = CONFIG.SHOP_TAGLINE;

    // Contact WhatsApp links
    const genericMsg = `Hello ${CONFIG.SHOP_NAME}, I would like to inquire about your saree collection.`;
    const defaultWaUrl = buildWhatsAppUrl(genericMsg);
    if (dom.headerWaLink) dom.headerWaLink.href = defaultWaUrl;
    if (dom.floatingWaBtn) dom.floatingWaBtn.href = defaultWaUrl;
    if (dom.footerWaBtn) dom.footerWaBtn.href = defaultWaUrl;

    // Footer Contact Info
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
  // DATA FETCHING & PARSING
  // ----------------------------------------------------------------------------

  /**
   * Renders shimmer skeleton cards in the grid while fetching
   */
  function renderSkeletons() {
    if (!dom.sareeGrid) return;
    const skeletonsCount = 8;
    let html = '';
    for (let i = 0; i < skeletonsCount; i++) {
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

  /**
   * Main function to retrieve saree records with caching
   */
  function loadCatalogData(forceBypassCache = false) {
    renderSkeletons();

    // Check URL parameters for forced refresh
    const urlParams = new URLSearchParams(window.location.search);
    const bypassParam = urlParams.has('refresh') || urlParams.has('clear_cache');

    const ttlMs = (CONFIG.CACHE_TTL_MINUTES || 5) * 60 * 1000;
    const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
    const cachedCsv = sessionStorage.getItem(CACHE_KEY);

    // Use cached data if valid and not force-refreshed
    if (!forceBypassCache && !bypassParam && cachedCsv && cachedTime) {
      const age = Date.now() - parseInt(cachedTime, 10);
      if (age < ttlMs) {
        parseCsvAndInit(cachedCsv, true);
        return;
      }
    }

    // Check if Google Sheet CSV URL is configured
    const sheetUrl = (CONFIG.SHEET_CSV_URL || '').trim();
    if (!sheetUrl) {
      // Use built-in fallback data when no URL is provided
      console.info('No SHEET_CSV_URL provided. Loading built-in fallback catalog data.');
      useFallbackData();
      return;
    }

    // Fetch from Google Sheet CSV
    fetch(sheetUrl, { cache: 'no-cache' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        return response.text();
      })
      .then(csvText => {
        // Save to sessionStorage
        try {
          sessionStorage.setItem(CACHE_KEY, csvText);
          sessionStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
        } catch (e) {
          console.warn('sessionStorage is full or disabled:', e);
        }
        parseCsvAndInit(csvText, false);
      })
      .catch(err => {
        console.error('Failed to fetch Google Sheet CSV:', err);
        showErrorState(err.message);
      });
  }

  /**
   * Parses raw CSV string with PapaParse
   */
  function parseCsvAndInit(csvText, isFromCache) {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim().toLowerCase(),
      complete: function (results) {
        if (!results.data || results.data.length === 0) {
          showErrorState('The sheet was loaded but contained no rows.');
          return;
        }

        const sanitized = sanitizeAndNormalize(results.data);
        if (sanitized.length === 0) {
          showErrorState('No valid saree items found. Ensure "id" and "name" columns are not empty.');
          return;
        }

        state.allSarees = sanitized;
        initializeFiltersAndData();
      },
      error: function (err) {
        console.error('PapaParse error:', err);
        showErrorState('Failed to parse sheet CSV data.');
      }
    });
  }

  /**
   * Normalizes raw rows, cleans prices, parses extra_images, and ignores empty rows
   */
  function sanitizeAndNormalize(rows) {
    const valid = [];
    rows.forEach((row, index) => {
      // Must have valid ID and Name
      const id = (row.id || '').toString().trim();
      const name = (row.name || '').toString().trim();
      if (!id || !name) return;

      // Clean price: strips symbols, spaces, commas
      let rawPrice = (row.price || '').toString().replace(/[^0-9.]/g, '');
      const price = parseFloat(rawPrice) || 0;

      // Extra images list
      let extraImages = [];
      if (row.extra_images) {
        extraImages = row.extra_images
          .toString()
          .split(',')
          .map(url => url.trim())
          .filter(url => url.length > 0 && url.startsWith('http'));
      }

      // Main image
      let imageUrl = (row.image_url || '').toString().trim();
      if (!imageUrl || !imageUrl.startsWith('http')) {
        imageUrl = PLACEHOLDER_IMAGE;
      }

      // Status
      let status = (row.status || 'Available').toString().trim();
      const isSold = status.toLowerCase() === 'sold';
      status = isSold ? 'Sold' : 'Available';

      valid.push({
        id: id,
        name: name,
        fabric: (row.fabric || 'Traditional Weave').toString().trim(),
        color: (row.color || 'Multicolor').toString().trim(),
        pattern: (row.pattern || 'Traditional').toString().trim(),
        border: (row.border || 'Zari Border').toString().trim(),
        category: (row.category || 'Handloom').toString().trim(),
        occasion: (row.occasion || 'Festive / Wedding').toString().trim(),
        description: (row.description || '').toString().trim(),
        price: price,
        image_url: imageUrl,
        extra_images: extraImages,
        status: status,
        isSold: isSold,
        created_at: (row.created_at || '').toString().trim(),
        isNew: isItemNew(row.created_at)
      });
    });

    return valid;
  }

  /**
   * Fallback data helper when sheet is offline or not yet configured
   */
  function useFallbackData() {
    if (CONFIG.FALLBACK_DATA && CONFIG.FALLBACK_DATA.length > 0) {
      state.allSarees = sanitizeAndNormalize(CONFIG.FALLBACK_DATA);
      initializeFiltersAndData();
    } else {
      showErrorState('No catalog data available.');
    }
  }

  /**
   * Displays the friendly error state with retry and fallback options
   */
  function showErrorState(message) {
    if (dom.sareeGrid) dom.sareeGrid.innerHTML = '';
    if (dom.emptyState) dom.emptyState.style.display = 'none';
    if (dom.errorState) {
      dom.errorState.style.display = 'block';
      if (dom.errorMessage) {
        dom.errorMessage.innerHTML = `
          ${escapeHtml(message)}<br><br>
          <small style="color: var(--color-text-light);">
            Make sure your Google Sheet is published to web via: <strong>File &gt; Share &gt; Publish to web &gt; CSV</strong>.
          </small>
        `;
      }
    }
  }

  // ----------------------------------------------------------------------------
  // FILTER SETUP & DATA POPULATION
  // ----------------------------------------------------------------------------
  function initializeFiltersAndData() {
    if (dom.errorState) dom.errorState.style.display = 'none';

    // Calculate price extremes
    const prices = state.allSarees.map(s => s.price).filter(p => p > 0);
    state.priceMin = prices.length ? Math.floor(Math.min(...prices)) : 0;
    state.priceMax = prices.length ? Math.ceil(Math.max(...prices)) : 50000;
    
    // Set slider bounds
    if (dom.filterPriceRange) {
      dom.filterPriceRange.min = state.priceMin;
      dom.filterPriceRange.max = state.priceMax;
      dom.filterPriceRange.value = state.priceMax;
      state.maxPrice = state.priceMax;
      if (dom.priceSliderValue) {
        dom.priceSliderValue.textContent = formatPrice(state.priceMax);
      }
    }

    // Populate Category, Fabric, Color options dynamically from dataset
    populateDropdowns();
    populateQuickPills();

    // Run first filter pass & render
    applyFiltersAndRender();

    // Check if on a specific saree route and render details
    handleRouting();
  }

  /**
   * Generates unique, sorted dropdown options for Category, Fabric, Color
   */
  function populateDropdowns() {
    const categories = new Set();
    const fabrics = new Set();
    const colors = new Set();

    state.allSarees.forEach(s => {
      if (s.category) categories.add(s.category);
      if (s.fabric) fabrics.add(s.fabric);
      if (s.color) colors.add(s.color);
    });

    fillSelect(dom.filterCategory, Array.from(categories).sort(), 'All Categories');
    fillSelect(dom.filterFabric, Array.from(fabrics).sort(), 'All Fabrics');
    fillSelect(dom.filterColor, Array.from(colors).sort(), 'All Colors');
  }

  function fillSelect(selectEl, items, allLabel) {
    if (!selectEl) return;
    const currentVal = selectEl.value;
    selectEl.innerHTML = `<option value="all">${escapeHtml(allLabel)}</option>` +
      items.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
    if (items.includes(currentVal)) {
      selectEl.value = currentVal;
    }
  }

  /**
   * Populates top horizontal quick pills for mobile 1-tap category filtering
   */
  function populateQuickPills() {
    if (!dom.quickCategoryPills) return;
    const categories = Array.from(new Set(state.allSarees.map(s => s.category))).sort();
    
    let html = `<button type="button" class="pill-item active" data-category="all">All Sarees</button>`;
    categories.forEach(cat => {
      html += `<button type="button" class="pill-item" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
    });

    dom.quickCategoryPills.innerHTML = html;

    // Attach click handlers to quick pills
    dom.quickCategoryPills.querySelectorAll('.pill-item').forEach(pill => {
      pill.addEventListener('click', () => {
        const selectedCat = pill.getAttribute('data-category');
        state.activeCategory = selectedCat;
        if (dom.filterCategory) dom.filterCategory.value = selectedCat;
        
        // Update active class on pills
        dom.quickCategoryPills.querySelectorAll('.pill-item').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        applyFiltersAndRender();
      });
    });
  }

  // ----------------------------------------------------------------------------
  // FILTERING, SORTING & RENDERING CATALOG
  // ----------------------------------------------------------------------------

  /**
   * Applies all active filters, search criteria, and sorting
   */
  function applyFiltersAndRender() {
    const q = state.searchQuery.toLowerCase().trim();

    state.filteredSarees = state.allSarees.filter(saree => {
      // 1. Search Query (name or description or fabric)
      if (q) {
        const matchName = saree.name.toLowerCase().includes(q);
        const matchDesc = saree.description.toLowerCase().includes(q);
        const matchFabric = saree.fabric.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchFabric) return false;
      }

      // 2. Category
      if (state.activeCategory !== 'all' && saree.category !== state.activeCategory) {
        return false;
      }

      // 3. Fabric
      if (state.activeFabric !== 'all' && saree.fabric !== state.activeFabric) {
        return false;
      }

      // 4. Color
      if (state.activeColor !== 'all' && saree.color !== state.activeColor) {
        return false;
      }

      // 5. Max Price
      if (saree.price > state.maxPrice) {
        return false;
      }

      // 6. Hide Sold
      if (state.hideSold && saree.isSold) {
        return false;
      }

      return true;
    });

    // Apply Sorting
    state.filteredSarees.sort((a, b) => {
      if (state.sortBy === 'price-asc') {
        return a.price - b.price;
      } else if (state.sortBy === 'price-desc') {
        return b.price - a.price;
      } else {
        // 'newest' sort
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return b.id.localeCompare(a.id);
      }
    });

    updateFilterStatsBadge();
    renderCatalogGrid();
  }

  /**
   * Updates filter count badge and results count text
   */
  function updateFilterStatsBadge() {
    let activeFilterCount = 0;
    if (state.activeCategory !== 'all') activeFilterCount++;
    if (state.activeFabric !== 'all') activeFilterCount++;
    if (state.activeColor !== 'all') activeFilterCount++;
    if (state.maxPrice < state.priceMax) activeFilterCount++;
    if (state.hideSold) activeFilterCount++;
    if (state.searchQuery) activeFilterCount++;

    if (dom.activeFilterBadge) {
      if (activeFilterCount > 0) {
        dom.activeFilterBadge.textContent = activeFilterCount;
        dom.activeFilterBadge.style.display = 'inline-block';
      } else {
        dom.activeFilterBadge.style.display = 'none';
      }
    }

    if (dom.resultsCount) {
      dom.resultsCount.textContent = `Showing ${state.filteredSarees.length} of ${state.allSarees.length} sarees`;
    }
  }

  /**
   * Renders saree cards into the responsive grid
   */
  function renderCatalogGrid() {
    if (!dom.sareeGrid) return;

    if (state.filteredSarees.length === 0) {
      dom.sareeGrid.innerHTML = '';
      if (dom.emptyState) dom.emptyState.style.display = 'block';
      return;
    }

    if (dom.emptyState) dom.emptyState.style.display = 'none';

    const cardsHtml = state.filteredSarees.map(saree => {
      const soldBadge = saree.isSold 
        ? `<span class="badge-sold-out">Sold Out</span>` 
        : '';
      const newBadge = (!saree.isSold && saree.isNew) 
        ? `<span class="badge-new">New</span>` 
        : '';

      return `
        <article class="saree-card ${saree.isSold ? 'is-sold' : ''}" data-id="${escapeHtml(saree.id)}">
          <a href="#/saree/${encodeURIComponent(saree.id)}" class="saree-card-link" aria-label="View details of ${escapeHtml(saree.name)}">
            <div class="card-img-wrap">
              ${newBadge}
              ${soldBadge}
              <img 
                src="${escapeHtml(saree.image_url)}" 
                alt="${escapeHtml(saree.name)}" 
                class="card-img" 
                loading="lazy"
                onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}';"
              >
            </div>
            <div class="card-body">
              <span class="card-meta">${escapeHtml(saree.fabric)} • ${escapeHtml(saree.category)}</span>
              <h3 class="card-title">${escapeHtml(saree.name)}</h3>
              <div class="card-price-row">
                <span class="card-price">${formatPrice(saree.price)}</span>
                <span class="card-cta-hint">${saree.isSold ? 'Sold' : 'View &rarr;'}</span>
              </div>
            </div>
          </a>
        </article>
      `;
    }).join('');

    dom.sareeGrid.innerHTML = cardsHtml;
  }

  // ----------------------------------------------------------------------------
  // SAREE DETAIL PAGE
  // ----------------------------------------------------------------------------

  /**
   * Renders the single saree details page
   */
  function renderSareeDetail(sareeId) {
    const saree = state.allSarees.find(s => s.id === sareeId);

    if (!saree) {
      if (dom.sareeDetailContent) {
        dom.sareeDetailContent.innerHTML = `
          <div class="state-box">
            <div class="state-icon">⚠️</div>
            <h3 class="state-title">Saree Not Found</h3>
            <p class="state-desc">The saree code <strong>${escapeHtml(sareeId)}</strong> could not be located in our catalog.</p>
            <a href="#/" class="btn-primary">Browse All Sarees</a>
          </div>
        `;
      }
      if (dom.similarSection) dom.similarSection.style.display = 'none';
      return;
    }

    // Dynamic Title & Meta Tags
    document.title = `${saree.name} | ${CONFIG.SHOP_NAME}`;
    updateMetaTags(saree);

    // Combine main image + extra images
    const allImages = [saree.image_url, ...(saree.extra_images || [])].filter(Boolean);

    // Prepare WhatsApp Message
    const currentUrl = window.location.href;
    const orderMessage = `Hello ${CONFIG.SHOP_NAME},\n\nI would like to order this saree:\n*Saree ID:* ${saree.id}\n*Name:* ${saree.name}\n*Price:* ${formatPrice(saree.price)}\n*Fabric:* ${saree.fabric}\n*Link:* ${currentUrl}\n\nPlease confirm availability and payment details.`;
    const orderWaUrl = buildWhatsAppUrl(orderMessage);

    const askSimilarMessage = `Hello ${CONFIG.SHOP_NAME},\n\nI really liked saree *${saree.name}* (ID: ${saree.id}) which is currently sold out.\nDo you have similar designs available?\n*Link:* ${currentUrl}`;
    const askSimilarWaUrl = buildWhatsAppUrl(askSimilarMessage);

    // Build Gallery Slides & Thumbnails
    const slidesHtml = allImages.map((imgUrl, idx) => `
      <div class="gallery-slide" data-index="${idx}" data-img="${escapeHtml(imgUrl)}">
        <img 
          src="${escapeHtml(imgUrl)}" 
          alt="${escapeHtml(saree.name)} - View ${idx + 1}"
          loading="${idx === 0 ? 'eager' : 'lazy'}"
          onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}';"
        >
        <span class="gallery-zoom-hint">🔍 Tap to Zoom</span>
      </div>
    `).join('');

    const thumbnailsHtml = allImages.length > 1 ? `
      <div class="gallery-thumbnails" role="tablist" aria-label="Saree image thumbnails">
        ${allImages.map((imgUrl, idx) => `
          <button type="button" class="thumb-item ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="View photo ${idx + 1}">
            <img src="${escapeHtml(imgUrl)}" alt="Thumbnail ${idx + 1}" onerror="this.src='${PLACEHOLDER_IMAGE}';">
          </button>
        `).join('')}
      </div>
    ` : '';

    // Action button state
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

    // Detail View HTML
    const detailHtml = `
      <div class="detail-grid">
        
        <!-- Left: Image Gallery -->
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
            <span class="badge-detail-id">ID: ${escapeHtml(saree.id)}</span>
          </div>

          <h2 class="detail-title">${escapeHtml(saree.name)}</h2>

          <div class="detail-price-row">
            <span class="detail-price">${formatPrice(saree.price)}</span>
            <span class="detail-tax-note">Inclusive of all taxes • Free Shipping</span>
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
          </div>

          <!-- Description -->
          <div class="detail-desc-box">
            <span class="detail-desc-label">Saree Description</span>
            <p class="detail-desc-text">${escapeHtml(saree.description || 'Authentic designer handloom saree featuring fine zari craftsmanship and supreme comfort.')}</p>
          </div>

          <!-- Call to Action Buttons -->
          <div class="cta-group">
            ${actionButtonsHtml}
            
            <div class="action-secondary-row">
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
      </div>
    `;

    dom.sareeDetailContent.innerHTML = detailHtml;

    // Attach Gallery & Lightbox Event Handlers
    attachGalleryHandlers(allImages);

    // Attach Share Button Event Handler
    const shareBtn = document.getElementById('btn-share-saree');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => handleShareSaree(saree));
    }

    // Render "You May Also Like" similar sarees
    renderSimilarSarees(saree);

    // Scroll to top of detail view
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /**
   * Sets up swipeable gallery interaction, thumbnails, and tap-to-zoom
   */
  function attachGalleryHandlers(allImages) {
    const galleryContainer = document.getElementById('gallery-container');
    const thumbnails = dom.sareeDetailContent.querySelectorAll('.thumb-item');
    const slides = dom.sareeDetailContent.querySelectorAll('.gallery-slide');

    // Click thumbnail to scroll gallery
    thumbnails.forEach(thumb => {
      thumb.addEventListener('click', () => {
        const idx = parseInt(thumb.getAttribute('data-index'), 10);
        if (slides[idx]) {
          slides[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        }
      });
    });

    // Update active thumbnail on gallery scroll
    if (galleryContainer && thumbnails.length > 0) {
      galleryContainer.addEventListener('scroll', () => {
        const slideWidth = galleryContainer.offsetWidth;
        const currentIdx = Math.round(galleryContainer.scrollLeft / slideWidth);
        thumbnails.forEach((t, i) => {
          t.classList.toggle('active', i === currentIdx);
        });
      }, { passive: true });
    }

    // Tap-to-zoom in Lightbox
    slides.forEach(slide => {
      slide.addEventListener('click', () => {
        const imgSrc = slide.getAttribute('data-img');
        openLightbox(imgSrc);
      });
    });
  }

  /**
   * Lightbox Modal Functions
   */
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

  /**
   * Handles Web Share API with clipboard fallback
   */
  function handleShareSaree(saree) {
    const shareData = {
      title: `${saree.name} | ${CONFIG.SHOP_NAME}`,
      text: `Take a look at this stunning ${saree.fabric} saree (${formatPrice(saree.price)}) at ${CONFIG.SHOP_NAME}!`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(err => {
        if (err.name !== 'AbortError') {
          copyToClipboard(window.location.href);
        }
      });
    } else {
      copyToClipboard(window.location.href);
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showToast('Link copied to clipboard!'))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
      showToast('Link copied to clipboard!');
    } catch (e) {
      showToast('Share link: ' + text);
    }
    document.body.removeChild(tempInput);
  }

  /**
   * Renders up to 4 similar sarees matching category or fabric
   */
  function renderSimilarSarees(currentSaree) {
    if (!dom.similarSection || !dom.similarSareesGrid) return;

    const similar = state.allSarees.filter(s => {
      if (s.id === currentSaree.id) return false;
      return s.category === currentSaree.category || s.fabric === currentSaree.fabric;
    }).slice(0, 4);

    if (similar.length === 0) {
      dom.similarSection.style.display = 'none';
      return;
    }

    dom.similarSection.style.display = 'block';
    dom.similarSareesGrid.innerHTML = similar.map(saree => `
      <article class="saree-card ${saree.isSold ? 'is-sold' : ''}" data-id="${escapeHtml(saree.id)}">
        <a href="#/saree/${encodeURIComponent(saree.id)}" class="saree-card-link">
          <div class="card-img-wrap">
            ${saree.isSold ? '<span class="badge-sold-out">Sold Out</span>' : ''}
            <img 
              src="${escapeHtml(saree.image_url)}" 
              alt="${escapeHtml(saree.name)}" 
              class="card-img" 
              loading="lazy"
              onerror="this.src='${PLACEHOLDER_IMAGE}';"
            >
          </div>
          <div class="card-body">
            <span class="card-meta">${escapeHtml(saree.fabric)}</span>
            <h4 class="card-title">${escapeHtml(saree.name)}</h4>
            <div class="card-price-row">
              <span class="card-price">${formatPrice(saree.price)}</span>
              <span class="card-cta-hint">View &rarr;</span>
            </div>
          </div>
        </a>
      </article>
    `).join('');
  }

  /**
   * Updates meta tags for SEO and Social Sharing
   */
  function updateMetaTags(saree) {
    const metaDesc = document.getElementById('meta-description');
    const ogTitle = document.getElementById('og-title');
    const ogDesc = document.getElementById('og-description');
    const ogImage = document.getElementById('og-image');
    const ogUrl = document.getElementById('og-url');

    const descText = `${saree.name} in ${saree.fabric} (${saree.color}) - ${formatPrice(saree.price)}. Order directly on WhatsApp from ${CONFIG.SHOP_NAME}.`;

    if (metaDesc) metaDesc.setAttribute('content', descText);
    if (ogTitle) ogTitle.setAttribute('content', `${saree.name} | ${CONFIG.SHOP_NAME}`);
    if (ogDesc) ogDesc.setAttribute('content', descText);
    if (ogImage) ogImage.setAttribute('content', saree.image_url);
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);
  }

  function resetMetaTags() {
    document.title = `${CONFIG.SHOP_NAME} | ${CONFIG.SHOP_TAGLINE}`;
    const metaDesc = document.getElementById('meta-description');
    if (metaDesc) {
      metaDesc.setAttribute('content', `Discover authentic Kanjivaram, Banarasi, Chanderi, and silk sarees at ${CONFIG.SHOP_NAME}. Order directly on WhatsApp.`);
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
      
      // Save catalog scroll position before leaving catalog
      if (!dom.catalogView.classList.contains('hidden')) {
        state.catalogScrollY = window.scrollY;
      }

      // Switch views
      dom.catalogView.classList.add('hidden');
      dom.detailView.classList.add('active');

      if (state.allSarees.length > 0) {
        renderSareeDetail(sareeId);
      }
    } else {
      // Show Catalog View
      resetMetaTags();
      dom.catalogView.classList.remove('hidden');
      dom.detailView.classList.remove('active');

      // Restore scroll position
      if (state.catalogScrollY > 0) {
        window.scrollTo({ top: state.catalogScrollY, behavior: 'instant' });
      }
    }
  }

  // ----------------------------------------------------------------------------
  // EVENT LISTENERS SETUP
  // ----------------------------------------------------------------------------
  function setupEventListeners() {
    // Hash routing changes
    window.addEventListener('hashchange', handleRouting);

    // Search input
    let searchTimeout = null;
    if (dom.searchInput) {
      dom.searchInput.addEventListener('input', e => {
        clearTimeout(searchTimeout);
        const val = e.target.value;
        state.searchQuery = val;
        
        if (dom.searchClearBtn) {
          dom.searchClearBtn.classList.toggle('visible', val.length > 0);
        }

        searchTimeout = setTimeout(() => {
          applyFiltersAndRender();
        }, 150);
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

    // Sort select
    if (dom.sortSelect) {
      dom.sortSelect.addEventListener('change', e => {
        state.sortBy = e.target.value;
        applyFiltersAndRender();
      });
    }

    // Toggle detailed filters drawer
    if (dom.btnToggleFilters) {
      dom.btnToggleFilters.addEventListener('click', () => {
        const isOpen = dom.filtersDrawer.classList.toggle('open');
        dom.btnToggleFilters.setAttribute('aria-expanded', String(isOpen));
      });
    }

    // Filter dropdowns
    if (dom.filterCategory) {
      dom.filterCategory.addEventListener('change', e => {
        state.activeCategory = e.target.value;
        // Sync quick pills
        if (dom.quickCategoryPills) {
          dom.quickCategoryPills.querySelectorAll('.pill-item').forEach(pill => {
            pill.classList.toggle('active', pill.getAttribute('data-category') === state.activeCategory);
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
        const val = parseFloat(e.target.value);
        state.maxPrice = val;
        if (dom.priceSliderValue) {
          dom.priceSliderValue.textContent = formatPrice(val);
        }
        applyFiltersAndRender();
      });
    }

    // Hide Sold Checkbox
    if (dom.filterHideSold) {
      dom.filterHideSold.addEventListener('change', e => {
        state.hideSold = e.target.checked;
        applyFiltersAndRender();
      });
    }

    // Reset Filters Buttons
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

      // Sync pills
      if (dom.quickCategoryPills) {
        dom.quickCategoryPills.querySelectorAll('.pill-item').forEach(pill => {
          pill.classList.toggle('active', pill.getAttribute('data-category') === 'all');
        });
      }

      applyFiltersAndRender();
    };

    if (dom.btnClearFilters) dom.btnClearFilters.addEventListener('click', resetFilters);
    if (dom.btnEmptyReset) dom.btnEmptyReset.addEventListener('click', resetFilters);

    // Retry and Fallback Buttons
    if (dom.btnRetry) {
      dom.btnRetry.addEventListener('click', () => loadCatalogData(true));
    }
    if (dom.btnLoadFallback) {
      dom.btnLoadFallback.addEventListener('click', useFallbackData);
    }

    // Force Refresh from Footer
    if (dom.btnForceRefresh) {
      dom.btnForceRefresh.addEventListener('click', () => {
        sessionStorage.removeItem(CACHE_KEY);
        sessionStorage.removeItem(CACHE_TIME_KEY);
        showToast('Refreshing catalog from live sheet...');
        loadCatalogData(true);
      });
    }

    // Lightbox Close Handlers
    if (dom.lightboxClose) {
      dom.lightboxClose.addEventListener('click', closeLightbox);
    }
    if (dom.lightboxModal) {
      dom.lightboxModal.addEventListener('click', e => {
        if (e.target === dom.lightboxModal || e.target.classList.contains('lightbox-content-wrap')) {
          closeLightbox();
        }
      });
    }

    // Keyboard ESC to close lightbox
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && dom.lightboxModal && dom.lightboxModal.classList.contains('open')) {
        closeLightbox();
      }
    });
  }

  // ----------------------------------------------------------------------------
  // START THE APPLICATION ON DOM READY
  // ----------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
