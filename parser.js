/**
 * ============================================================================
 * MAHADEV SAREE COLLECTION - INTELLIGENT SAREE TEXT PARSER
 * ============================================================================
 * Pure JavaScript • Zero Dependencies • 100% Offline
 *
 * This file extracts structured saree attributes from raw, inconsistent
 * supplier WhatsApp messages (containing emojis, typos, rates, and noise).
 * ============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SareeParser = factory();
    root.parseSareeText = root.SareeParser.parseSareeText;
    root.runParserTests = root.SareeParser.runParserTests;
    root.extractColorsFromImage = root.SareeParser.extractColorsFromImage;
  }
})(typeof self !== 'undefined' ? self : this, function () {

  'use strict';

  // ============================================================================
  // 📚 KEYWORDS DICTIONARY (EASY TO EDIT FOR BEGINNERS)
  // ============================================================================
  // To add a new fabric, work type, or occasion:
  // 1. Add the canonical display name as the key.
  // 2. Add all spelling variants, Hinglish terms, and common typos in the array.
  // Note: Matching is case-insensitive.
  // ============================================================================

  const KEYWORDS = {

    // --------------------------------------------------------------------------
    // 1. FABRICS & WEAVES
    // Listed with specific/compound weaves first, so longest match wins.
    // --------------------------------------------------------------------------
    FABRICS: [
      {
        name: 'Gajji Silk',
        category: 'Silk',
        variants: ['gajji soft silk', 'gajji silk', 'pure gajji', 'gajji heavy', 'gajji', 'gaji silk', 'gaji']
      },
      {
        name: 'Banarasi Katan Silk',
        category: 'Silk',
        variants: ['banarasi katan silk', 'banarasi katan', 'katan silk', 'katan banarasi', 'katan']
      },
      {
        name: 'Banarasi Silk',
        category: 'Silk',
        variants: ['banarasi silk', 'banarasi', 'banaras silk', 'banaras', 'benarasi']
      },
      {
        name: 'Kanjivaram Silk',
        category: 'Bridal',
        variants: ['kanjivaram silk', 'kanjivaram', 'kanchipuram silk', 'kanchipuram', 'kanjeevaram', 'kanjeevaram silk']
      },
      {
        name: 'Chanderi Silk',
        category: 'Handloom',
        variants: ['chanderi silk', 'chanderi', 'chanderi suti']
      },
      {
        name: 'Tussar Silk',
        category: 'Silk',
        variants: ['tussar silk', 'tussar', 'tussur', 'kosa silk', 'kosa']
      },
      {
        name: 'Organza Silk',
        category: 'Party Wear',
        variants: ['organza silk', 'organza', 'oraganza', 'arganza']
      },
      {
        name: 'Dola Silk',
        category: 'Silk',
        variants: ['dola silk', 'dola soft silk', 'dola']
      },
      {
        name: 'Modal Silk',
        category: 'Silk',
        variants: ['modal silk', 'modal satin', 'modal']
      },
      {
        name: 'Tissue Silk',
        category: 'Party Wear',
        variants: ['tissue silk', 'tissue zari', 'tissue']
      },
      {
        name: 'Pure Georgette',
        category: 'Party Wear',
        variants: ['pure georgette', 'georgette', 'gorgette', 'georgett']
      },
      {
        name: 'Pure Chiffon',
        category: 'Party Wear',
        variants: ['pure chiffon', 'chiffon', 'shiffon', 'chifon']
      },
      {
        name: 'Patola Silk',
        category: 'Handloom',
        variants: ['patola silk', 'patola', 'rajkot patola', 'patan patola']
      },
      {
        name: 'Paithani Silk',
        category: 'Bridal',
        variants: ['paithani silk', 'paithani', 'yeola paithani']
      },
      {
        name: 'Soft Silk',
        category: 'Silk',
        variants: ['soft silk', 'smooth silk']
      },
      {
        name: 'Linen Silk',
        category: 'Handloom',
        variants: ['linen silk', 'linen cotton', 'pure linen', 'linen']
      },
      {
        name: 'Cotton Silk',
        category: 'Handloom',
        variants: ['cotton silk', 'suti silk', 'cotton resham']
      },
      {
        name: 'Pure Cotton',
        category: 'Casual',
        variants: ['pure cotton', 'mulmul cotton', 'mulmul', 'khadi cotton', 'cotton']
      },
      {
        name: 'Crepe Silk',
        category: 'Silk',
        variants: ['crepe silk', 'pure crepe', 'crepe']
      },
      {
        name: 'Pure Silk',
        category: 'Silk',
        variants: ['pure silk', 'silk saree', 'silk', 'resham silk']
      }
    ],

    // --------------------------------------------------------------------------
    // 2. PATTERNS, CRAFTS & WORK TYPES
    // Add common misspellings (e.g., mirar -> mirror, wark -> work).
    // --------------------------------------------------------------------------
    PATTERNS_AND_WORK: [
      {
        name: 'Ajrakh',
        variants: ['ajrakh', 'ajrak', 'azrakh', 'ajrak print', 'ajrakh block']
      },
      {
        name: 'Bandhej',
        variants: ['bandhej', 'bandhani', 'badhej', 'bandhan', 'bandhana', 'tie and dye', 'tie & dye']
      },
      {
        name: 'Mirror Work',
        variants: [
          'mirror work', 'mirror wark', 'mirar work', 'mirar wark',
          'mirror', 'mirar', 'glass work', 'foil mirror', 'real mirror', 'abhla'
        ]
      },
      {
        name: 'Hand Work',
        variants: [
          'hand work', 'handwork', 'hand wark', 'super hand', 'supar hand',
          'full hand work', 'khatli work', 'khatli', 'aari work', 'aari',
          'zardozi', 'zardosi', 'mukaish', 'hand touch'
        ]
      },
      {
        name: 'Zari Border',
        variants: [
          'zari border', 'zari pallu', 'zari work', 'zari wark',
          'jari border', 'jari pallu', 'jari work', 'jari', 'zari',
          'gold zari', 'silver zari', 'antique zari', 'copper zari', 'tested zari'
        ]
      },
      {
        name: 'Embroidery',
        variants: [
          'embroidery', 'embroidary', 'embroided', 'thread work',
          'resham embroidery', 'resham work', 'kashmiri work'
        ]
      },
      {
        name: 'Gota Patti',
        variants: ['gota patti', 'gotapatti', 'gota work', 'gota border', 'gota wark', 'gota']
      },
      {
        name: 'Block Print',
        variants: ['block print', 'hand block', 'dabu print', 'bagru print', 'kalamkari', 'batik']
      },
      {
        name: 'Sequin Work',
        variants: ['sequin work', 'sequins', 'sequence work', 'sequence', 'siquence', 'siwance']
      },
      {
        name: 'Kadwa Buta',
        variants: ['kadwa buti', 'kadwa buta', 'kadwa', 'kadhwa', 'buti work', 'boota', 'meenakari buta']
      },
      {
        name: 'Floral Jaal',
        variants: ['floral jaal', 'jaal work', 'all over jaal', 'jaal']
      },
      {
        name: 'Digital Print',
        variants: ['digital print', 'floral print', 'organza print', 'digital']
      },
      {
        name: 'Temple Border',
        variants: ['temple border', 'korvai border', 'korvai']
      },
      {
        name: 'Meenakari',
        variants: ['meenakari', 'minakari', 'meena work']
      },
      {
        name: 'Patola Print',
        variants: ['patola print', 'patola weft', 'double ikkat', 'ikkat', 'ikat']
      }
    ],

    // --------------------------------------------------------------------------
    // 3. RECOMMENDED OCCASIONS
    // --------------------------------------------------------------------------
    OCCASIONS: [
      {
        name: 'Wedding / Bridal',
        variants: ['wedding', 'bridal', 'dulhan', 'shaadi', 'shadi', 'vivah', 'reception', 'trousseau']
      },
      {
        name: 'Festive',
        variants: ['festive', 'festival', 'diwali', 'puja', 'pooja', 'navratri', 'karwa chauth', 'onam', 'pongal']
      },
      {
        name: 'Party Wear',
        variants: ['party wear', 'partywear', 'cocktail', 'evening', 'party', 'farewell']
      },
      {
        name: 'Traditional',
        variants: ['traditional', 'religious', 'temple', 'havan']
      },
      {
        name: 'Casual / Daily Wear',
        variants: ['daily wear', 'office wear', 'casual', 'regular wear', 'summer wear']
      }
    ],

    // --------------------------------------------------------------------------
    // 4. COLORS & HINGLISH SHADES
    // --------------------------------------------------------------------------
    COLORS: [
      { name: 'Red', variants: ['red', 'laal', 'lal', 'crimson', 'cherry', 'blood red', 'tomato red'] },
      { name: 'Maroon', variants: ['maroon', 'marun', 'wine', 'burgundy', 'deep red'] },
      { name: 'Pink', variants: ['pink', 'gulabi', 'rani', 'baby pink', 'hot pink', 'rose', 'blush', 'magenta'] },
      { name: 'Yellow', variants: ['yellow', 'peela', 'pila', 'mustard', 'haldi', 'lemon'] },
      { name: 'Orange', variants: ['orange', 'narangi', 'kesari', 'rust', 'peach'] },
      { name: 'Green', variants: ['green', 'hara', 'bottle green', 'emerald', 'pista', 'mehendi', 'olive', 'mint'] },
      { name: 'Teal', variants: ['teal', 'rama', 'rama green', 'peacock green', 'sea green'] },
      { name: 'Blue', variants: ['blue', 'neela', 'nila', 'royal blue', 'sky blue', 'navy blue', 'navy', 'indigo'] },
      { name: 'Purple', variants: ['purple', 'baingani', 'violet', 'lavender', 'lilac', 'jamuni'] },
      { name: 'Gold', variants: ['gold', 'golden', 'sona', 'zari gold', 'antique gold'] },
      { name: 'White', variants: ['white', 'safed', 'pure white', 'snow white'] },
      { name: 'Cream', variants: ['cream', 'off white', 'offwhite', 'ivory', 'beige', 'makkhan'] },
      { name: 'Brown', variants: ['brown', 'chocolate', 'coffee', 'tan'] },
      { name: 'Grey', variants: ['grey', 'gray', 'silver', 'charcoal'] },
      { name: 'Black', variants: ['black', 'kaala', 'kala', 'jet black'] },
      { name: 'Multicolor', variants: ['multicolor', 'multi color', 'multi', 'panchrangi', 'rainbow'] }
    ]
  };


  // ============================================================================
  // 🛠️ HELPER NORMALIZATION UTILITIES
  // ============================================================================

  /**
   * Convert Indic numerals (Devanagari ०-९ and Gujarati ૦-૯) into ASCII 0-9.
   */
  function convertIndicDigits(str) {
    if (!str) return '';
    const devanagari = ['०','१','२','३','४','५','६','७','८','९'];
    const gujarati = ['૦','૧','૨','૩','૪','૫','૬','૭','૮','૯'];
    let result = str;
    for (let i = 0; i <= 9; i++) {
      result = result.replace(new RegExp(devanagari[i], 'g'), String(i));
      result = result.replace(new RegExp(gujarati[i], 'g'), String(i));
    }
    return result;
  }

  /**
   * Remove noise emojis, decorative asterisks, bullets, while preserving basic punctuation.
   */
  function cleanEmojisAndSymbols(str) {
    if (!str) return '';
    return str
      // Remove common decorative emojis and symbols
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ')
      .replace(/[*#~_`👍🌺🌸❤️✨🧵📦💬👌🔥🙏]/g, ' ')
      .replace(/[|]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Clean word boundary helper: checks if needle exists as word or sub-phrase.
   */
  function containsPhrase(textLower, phraseLower) {
    const escaped = phraseLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(?:^|[\\s,.;:()\\-\\/])' + escaped + '(?:$|[\\s,.;:()\\-\\/])', 'i');
    return regex.test(textLower);
  }


  // ============================================================================
  // 💰 PRICE & COST EXTRACTION (ACCURATE & NOISE RESISTANT)
  // ============================================================================

  /**
   * Lines with words like "offer", "note", "kg", "wet", "weight" must be ignored.
   * e.g. "Note 1. Kg wet original only offer -2*" has 1 and 2, which are NOT prices.
   */
  const NOISE_LINE_KEYWORDS = [
    'offer', 'note', 'kg', 'wet', 'weight', 'wt', 'discount',
    'kilo', 'gram', 'gm', 'booking', 'contact', 'call', 'order now'
  ];

  function extractPrice(rawText) {
    const lines = rawText.split(/\r?\n/);
    const validLines = [];

    // Filter out lines containing obvious noise/weight/offer phrases,
    // UNLESS the line specifically has an explicit price label (e.g. Rate: 2200)
    for (const rawLine of lines) {
      const lineLower = rawLine.toLowerCase();
      const hasPriceLabel = /(?:price|rate|mrp|rs\.?|inr|₹|dam|bhav)\b/i.test(lineLower);
      const hasNoise = NOISE_LINE_KEYWORDS.some(kw => lineLower.includes(kw));

      if (hasNoise && !hasPriceLabel) {
        // Drop pure noise lines (e.g. "Note 1. Kg wet original only offer -2")
        continue;
      }
      validLines.push(rawLine);
    }

    const filteredText = validLines.join('\n');
    const normalizedDigits = convertIndicDigits(filteredText);

    // Candidates storage: { value: number, priority: number, rawSnippet: string }
    const candidates = [];

    // Pattern 1: Explicit Price label: "price: 1270", "rate 1270+", "mrp 1500", "rs. 1270"
    const explicitRegex = /(?:price|rate|mrp|rs\.?|inr|₹|dam|bhav)\s*[:=\-–\s]*(\d{3,6})(?:\s*(?:\+|only|\/\-))?/gi;
    let match;
    while ((match = explicitRegex.exec(normalizedDigits)) !== null) {
      const val = parseInt(match[1], 10);
      if (val >= 200 && val <= 100000) {
        candidates.push({ value: val, priority: 1, raw: match[0].trim() });
      }
    }

    // Pattern 2: Number followed by price suffixes: "1270+", "1270/-", "1270 rs", "1270 no less"
    const suffixRegex = /\b(\d{3,6})\s*(?:\+|-\s*no\s*less|\/\-|rs\b|inr\b|\/-|fixed)/gi;
    while ((match = suffixRegex.exec(normalizedDigits)) !== null) {
      const val = parseInt(match[1], 10);
      if (val >= 200 && val <= 100000) {
        candidates.push({ value: val, priority: 2, raw: match[0].trim() });
      }
    }

    // Pattern 3: Lone standalone 3 to 5 digit number on a line (fallback)
    if (candidates.length === 0) {
      const standaloneRegex = /(?:^|\s)(\d{3,5})(?:\s|$)/gm;
      while ((match = standaloneRegex.exec(normalizedDigits)) !== null) {
        const val = parseInt(match[1], 10);
        // Exclude length/width values like 44, 630
        if (val >= 350 && val <= 75000 && val !== 630 && val !== 550) {
          candidates.push({ value: val, priority: 3, raw: match[1].trim() });
        }
      }
    }

    // Deduplicate candidates
    const uniqueMap = new Map();
    for (const c of candidates) {
      if (!uniqueMap.has(c.value) || uniqueMap.get(c.value).priority > c.priority) {
        uniqueMap.set(c.value, c);
      }
    }

    const sortedList = Array.from(uniqueMap.values()).sort((a, b) => a.priority - b.priority);

    if (sortedList.length === 0) {
      return { price: null, alternatives: [] };
    }

    const topPrice = sortedList[0].value;
    const alternatives = sortedList.slice(1).map(c => c.value);

    return {
      price: topPrice,
      alternatives: alternatives,
      uncertain: alternatives.length > 0
    };
  }


  // ============================================================================
  // 📏 DIMENSIONS & BLOUSE EXTRACTION
  // ============================================================================

  function extractDimensionsAndBlouse(textLower) {
    const normalized = convertIndicDigits(textLower);

    // 1. Length: e.g. "Length-6.30 mtr", "6.3 mtr with blouse", "5.5 meter"
    let length = null;
    const lengthRegex = /(?:length|cut|len)\s*[:=\-–\s]*(\d+(?:\.\d+)?)\s*(?:mtr|meter|metre|m\b)/i;
    const lengthMatch = normalized.match(lengthRegex);
    if (lengthMatch) {
      length = parseFloat(lengthMatch[1]);
    } else {
      // Direct "6.30 mtr" or "5.5 mtr"
      const directLenMatch = normalized.match(/\b(5\.\d+|6\.\d+|\d{1}\.\d{1,2})\s*(?:mtr|meter|metre)\b/i);
      if (directLenMatch) {
        length = parseFloat(directLenMatch[1]);
      }
    }

    // 2. Width: e.g. "Width-44 inches", "panna 44", "44 in"
    let width = null;
    const widthRegex = /(?:width|panna|pana|araz)\s*[:=\-–\s]*(\d+(?:\.\d+)?)\s*(?:inch|inches|in\b)?/i;
    const widthMatch = normalized.match(widthRegex);
    if (widthMatch) {
      width = parseFloat(widthMatch[1]);
    } else {
      const directWidthMatch = normalized.match(/\b(4[0-9]|5[0-9])\s*(?:inch|inches|in\b)/i);
      if (directWidthMatch) {
        width = parseFloat(directWidthMatch[1]);
      }
    }

    // 3. Blouse: "with blouse" = Yes, "without blouse" = No
    let blouse = null;
    if (
      normalized.includes('without blouse') ||
      normalized.includes('no blouse') ||
      normalized.includes('blouse-no') ||
      normalized.includes('blouse: no') ||
      normalized.includes('blouse piece: no')
    ) {
      blouse = 'No';
    } else if (
      normalized.includes('with blouse') ||
      normalized.includes('blouse piece') ||
      normalized.includes('blouse attach') ||
      normalized.includes('running blouse') ||
      normalized.includes('blouse available') ||
      normalized.includes('with bp') ||
      normalized.includes('contrast blouse')
    ) {
      blouse = 'Yes';
    }

    return {
      length: length,
      width: width,
      blouse: blouse
    };
  }


  // ============================================================================
  // 🧵 FABRIC, PATTERN & OCCASION MATCHING
  // ============================================================================

  function extractFabricAndCategory(textLower) {
    let matchedFabric = null;
    let matchedCategory = null;

    // Search fabrics in order (longest variants first)
    for (const item of KEYWORDS.FABRICS) {
      for (const variant of item.variants) {
        if (containsPhrase(textLower, variant)) {
          matchedFabric = item.name;
          matchedCategory = item.category;
          break;
        }
      }
      if (matchedFabric) break;
    }

    // Check if the word "pure" appears in the text
    if (matchedFabric && !matchedFabric.toLowerCase().startsWith('pure')) {
      if (containsPhrase(textLower, 'pure') || containsPhrase(textLower, 'asli')) {
        matchedFabric = 'Pure ' + matchedFabric;
      }
    }

    return {
      fabric: matchedFabric || null,
      category: matchedCategory || (matchedFabric ? 'Silk' : null)
    };
  }

  function extractPatternsAndWork(textLower) {
    const matchedSet = new Set();

    for (const item of KEYWORDS.PATTERNS_AND_WORK) {
      for (const variant of item.variants) {
        if (containsPhrase(textLower, variant)) {
          matchedSet.add(item.name);
          break;
        }
      }
    }

    const list = Array.from(matchedSet);
    return list.length > 0 ? list.join(', ') : null;
  }

  function extractOccasion(textLower) {
    for (const item of KEYWORDS.OCCASIONS) {
      for (const variant of item.variants) {
        if (containsPhrase(textLower, variant)) {
          return item.name;
        }
      }
    }
    return null;
  }

  function extractColor(textLower) {
    for (const item of KEYWORDS.COLORS) {
      for (const variant of item.variants) {
        if (containsPhrase(textLower, variant)) {
          return item.name;
        }
      }
    }
    return null;
  }


  // ============================================================================
  // 🏷️ SAREE NAME AUTO-SUGGESTION GENERATOR
  // Rule: "<up to 3 work keywords> <fabric> Saree"
  // e.g. "Ajrakh Bandhej Mirror Work Gajji Silk Saree"
  // ============================================================================

  function generateSuggestedName(fabric, patternWork) {
    const fabricClean = fabric || 'Handloom Silk';
    if (!patternWork) {
      return `${fabricClean} Saree`;
    }

    const works = patternWork.split(',').map(s => s.trim()).filter(Boolean);
    const topWorks = works.slice(0, 3).join(' ');

    // Avoid duplicate words like "Silk Gajji Silk"
    let combined = `${topWorks} ${fabricClean} Saree`;
    // Clean redundant multiple occurrences
    combined = combined.replace(/pure\s+/gi, '') // Keep name punchy
                       .replace(/\s+/g, ' ')
                       .trim();

    return combined.charAt(0).toUpperCase() + combined.slice(1);
  }


  // ============================================================================
  // 🚀 MAIN PARSER FUNCTION: parseSareeText(text)
  // ============================================================================

  /**
   * Main entry point to parse raw supplier WhatsApp text.
   *
   * @param {string} rawText - Unstructured WhatsApp message
   * @returns {Object} Structured suggested saree values
   */
  function parseSareeText(rawText) {
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return {
        cost_price: null,
        price_alternatives: [],
        price_uncertain: false,
        length_m: null,
        width_in: null,
        blouse: null,
        fabric: null,
        category: null,
        pattern: null,
        color: null,
        occasion: null,
        name: null,
        raw_message: ''
      };
    }

    // 1. Prepare normalized text for search
    const cleanedText = cleanEmojisAndSymbols(rawText);
    const textLower = cleanedText.toLowerCase();

    // 2. Extract Price (Cost)
    const priceResult = extractPrice(rawText);

    // 3. Extract Dimensions and Blouse
    const dimResult = extractDimensionsAndBlouse(textLower);

    // 4. Extract Fabric & Category
    const fabricResult = extractFabricAndCategory(textLower);

    // 5. Extract Patterns / Work
    const patternWork = extractPatternsAndWork(textLower);

    // 6. Extract Occasion & Color
    const occasion = extractOccasion(textLower);
    const color = extractColor(textLower);

    // 7. Auto-suggest Saree Name
    const suggestedName = generateSuggestedName(fabricResult.fabric, patternWork);

    return {
      cost_price: priceResult.price,
      price_alternatives: priceResult.alternatives,
      price_uncertain: priceResult.uncertain,
      length_m: dimResult.length,
      width_in: dimResult.width,
      blouse: dimResult.blouse,
      fabric: fabricResult.fabric,
      category: fabricResult.category,
      pattern: patternWork,
      color: color,
      occasion: occasion,
      name: suggestedName,
      raw_message: rawText.trim()
    };
  }


  // ============================================================================
  // 🎨 CLIENT-SIDE PHOTO COLOR DETECTION (CANVAS + CLUSTERING)
  // ============================================================================

  // Standard palette RGB references for perceptual distance matching
  const PALETTE = [
    { name: 'Red', r: 220, g: 38, b: 38 },
    { name: 'Maroon', r: 124, g: 18, b: 40 },
    { name: 'Pink', r: 236, g: 72, b: 153 },
    { name: 'Orange', r: 249, g: 115, b: 22 },
    { name: 'Yellow', r: 234, g: 179, b: 8 },
    { name: 'Green', r: 22, g: 163, b: 74 },
    { name: 'Teal', r: 13, g: 148, b: 136 },
    { name: 'Blue', r: 37, g: 99, b: 235 },
    { name: 'Navy', r: 30, g: 58, b: 138 },
    { name: 'Purple', r: 147, g: 51, b: 234 },
    { name: 'Brown', r: 120, g: 53, b: 15 },
    { name: 'Black', r: 24, g: 24, b: 27 },
    { name: 'White', r: 250, g: 250, b: 250 },
    { name: 'Cream', r: 244, g: 237, b: 228 },
    { name: 'Grey', r: 156, g: 163, b: 175 },
    { name: 'Gold', r: 217, g: 164, b: 38 }
  ];

  /**
   * Weighted perceptual color distance (Redmean metric).
   */
  function colorDistance(r1, g1, b1, r2, g2, b2) {
    const rmean = (r1 + r2) / 2;
    const r = r1 - r2;
    const g = g1 - g2;
    const b = b1 - b2;
    return Math.sqrt(
      (2 + rmean / 256) * r * r +
      4 * g * g +
      (2 + (255 - rmean) / 256) * b * b
    );
  }

  /**
   * Find closest color name from PALETTE.
   */
  function nearestColorName(r, g, b) {
    let closestName = 'Multicolor';
    let minDistance = Infinity;

    for (const p of PALETTE) {
      const d = colorDistance(r, g, b, p.r, p.g, p.b);
      if (d < minDistance) {
        minDistance = d;
        closestName = p.name;
      }
    }
    return closestName;
  }

  /**
   * Extracts top dominant colors from an HTMLImageElement using an offscreen canvas.
   * Filters out borders, near-white studio backgrounds, and near-black noise.
   *
   * @param {HTMLImageElement} imageEl
   * @returns {Object} { dominant: string, suggestions: string[] }
   */
  function extractColorsFromImage(imageEl) {
    return new Promise(function (resolve) {
      if (!imageEl) {
        resolve({ dominant: null, suggestions: [] });
        return;
      }

      function process() {
        try {
          const canvas = document.createElement('canvas');
          const size = 50;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ dominant: null, suggestions: [] });
            return;
          }

          ctx.drawImage(imageEl, 0, 0, size, size);
          const imgData = ctx.getImageData(0, 0, size, size);
          const data = imgData.data;

          const pixelBucket = [];
          const margin = Math.floor(size * 0.1); // Ignore outer 10% edges

          for (let y = margin; y < size - margin; y++) {
            for (let x = margin; x < size - margin; x++) {
              const idx = (y * size + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];

              if (a < 180) continue; // Skip transparency

              // Skip studio near-white background
              if (r > 225 && g > 225 && b > 225) continue;
              // Skip near-black shadows
              if (r < 30 && g < 30 && b < 30) continue;

              pixelBucket.push({ r, g, b });
            }
          }

          if (pixelBucket.length === 0) {
            resolve({ dominant: 'Multicolor', suggestions: ['Multicolor'] });
            return;
          }

          // Simple Color Histogram / Bucketing across 16 palette anchors
          const scores = {};
          PALETTE.forEach(p => { scores[p.name] = 0; });

          for (const px of pixelBucket) {
            const name = nearestColorName(px.r, px.g, px.b);
            scores[name] = (scores[name] || 0) + 1;
          }

          // Sort colors by frequency
          const sorted = Object.keys(scores)
            .filter(name => scores[name] > 0)
            .sort((a, b) => scores[b] - a[a]);

          if (sorted.length === 0) {
            resolve({ dominant: 'Multicolor', suggestions: ['Multicolor'] });
            return;
          }

          const totalValid = pixelBucket.length;
          const topScore = scores[sorted[0]];
          const topRatio = topScore / totalValid;

          // If top color has at least 35% representation, pick it. Otherwise Multicolor.
          let dominant = sorted[0];
          if (topRatio < 0.32 && sorted.length >= 3) {
            dominant = 'Multicolor';
          }

          const suggestions = [];
          if (dominant !== 'Multicolor') {
            suggestions.push(dominant);
          }
          for (const s of sorted) {
            if (!suggestions.includes(s) && suggestions.length < 3) {
              suggestions.push(s);
            }
          }
          if (!suggestions.includes('Multicolor')) {
            suggestions.push('Multicolor');
          }

          resolve({ dominant: dominant, suggestions: suggestions.slice(0, 3) });
        } catch (e) {
          console.warn('Canvas color extraction note:', e.message);
          resolve({ dominant: null, suggestions: [] });
        }
      }

      if (imageEl.complete && imageEl.naturalWidth > 0) {
        process();
      } else {
        imageEl.onload = process;
        imageEl.onerror = function () {
          resolve({ dominant: null, suggestions: [] });
        };
      }
    });
  }


  // ============================================================================
  // 🧪 UNIT TESTS FOR CONSOLE: runParserTests()
  // ============================================================================

  function runParserTests() {
    console.group('🧪 RUNNING SAREE PARSER TEST SUITE');

    const testCases = [
      {
        id: 1,
        title: 'Supplier Sample with Typos & Noise (Required Test Case)',
        input: `Super hand, Sareee full hand work
AJRAKH pure Gajji bandhej Supar mirar wark saree mirar Work
Note 1. Kg wet original only🌺 offer -2*🌺
pure Gajji Soft Silk saree
🌺*Price👍1270+ no less
Length-6.30 mtr with blouse
Width-44 inches
*Fabric pure Gajji heavy saree`,
        expected: {
          cost_price: 1270,
          length_m: 6.3,
          width_in: 44,
          blouse: 'Yes',
          fabric: 'Pure Gajji Silk',
          pattern: 'Ajrakh, Bandhej, Mirror Work, Hand Work',
          name: 'Ajrakh Bandhej Mirror Work Gajji Silk Saree'
        }
      },
      {
        id: 2,
        title: 'Hinglish Wedding Saree with Kadwa Meenakari',
        input: `Shadi special Banarasi Katan silk saree, lal rang me, rate 1850/- with blouse piece, 6.30 mtr, kadwa meenakari zari buta work`,
        expected: {
          cost_price: 1850,
          length_m: 6.3,
          blouse: 'Yes',
          fabric: 'Banarasi Katan Silk',
          color: 'Red',
          occasion: 'Wedding / Bridal'
        }
      },
      {
        id: 3,
        title: 'Cotton Saree with Rs 850/- and without blouse',
        input: `Bandhani Cotton saree rs 850/- free shipping, width 44 in length 5.5 mtr without blouse, block print dabu work`,
        expected: {
          cost_price: 850,
          length_m: 5.5,
          width_in: 44,
          blouse: 'No',
          pattern: 'Bandhej, Block Print'
        }
      },
      {
        id: 4,
        title: 'Organza Party Wear with NO price in message',
        input: `Exclusive Organza party wear floral digital print saree with sequence embroidery work with blouse 6.3 mtr`,
        expected: {
          cost_price: null,
          fabric: 'Organza Silk',
          occasion: 'Party Wear',
          blouse: 'Yes'
        }
      },
      {
        id: 5,
        title: 'Dola Silk with Weight and Offer noise',
        input: `Heavy Dola silk saree 2 kg box pack offer 10% off Rate: 2200/- Length 6.3 mtr with blouse`,
        expected: {
          cost_price: 2200,
          fabric: 'Dola Silk',
          blouse: 'Yes',
          length_m: 6.3
        }
      }
    ];

    let passedCount = 0;

    testCases.forEach((tc) => {
      console.group(`Test #${tc.id}: ${tc.title}`);
      const actual = parseSareeText(tc.input);

      let isSuccess = true;
      const comparisonTable = [];

      Object.keys(tc.expected).forEach(key => {
        const expVal = tc.expected[key];
        const actVal = actual[key];
        const match = (expVal === actVal) ||
          (typeof expVal === 'number' && typeof actVal === 'number' && Math.abs(expVal - actVal) < 0.01);

        if (!match) isSuccess = false;

        comparisonTable.push({
          Field: key,
          Expected: String(expVal),
          Actual: String(actVal),
          Status: match ? '✅ PASS' : '❌ FAIL'
        });
      });

      console.table(comparisonTable);
      if (isSuccess) {
        console.log(`%c[PASS] Test #${tc.id} succeeded.`, 'color: #16a34a; font-weight: bold;');
        passedCount++;
      } else {
        console.error(`[FAIL] Test #${tc.id} did not match expected.`);
      }
      console.groupEnd();
    });

    console.log(
      `%c🎉 TEST SUITE FINISHED: ${passedCount} / ${testCases.length} Tests Passed!`,
      `font-size: 1.1rem; font-weight: bold; color: ${passedCount === testCases.length ? '#16a34a' : '#ef4444'};`
    );
    console.groupEnd();

    return {
      total: testCases.length,
      passed: passedCount
    };
  }

  // Export public API
  return {
    KEYWORDS: KEYWORDS,
    parseSareeText: parseSareeText,
    extractColorsFromImage: extractColorsFromImage,
    runParserTests: runParserTests
  };
});
