/**
 * ==============================================================================
 * MAHADEV SAREE COLLECTION - CENTRAL CONFIGURATION FILE
 * ==============================================================================
 * Edit this file to add your Supabase credentials, WhatsApp number, shop details,
 * and text sections.
 * ==============================================================================
 */

const CONFIG = {
  // ----------------------------------------------------------------------------
  // 1. SUPABASE BACKEND CREDENTIALS
  // ----------------------------------------------------------------------------
  // Find these in your Supabase Dashboard:
  // Project Settings -> API -> Project URL and Project API Keys (anon / public)
  //
  // NOTE: The 'anon' key is SAFE to be public. It is protected by Row Level Security.
  // NEVER use or expose the 'service_role' secret key here!
  SUPABASE_URL: "https://ixlkxdhifffzzvdckycd.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_8J_lk1nUhIZmm4A3o2_UAg_lwjpdPAH",

  // Storage buckets created in Supabase
  STORAGE_BUCKET: "saree-images",
  STORAGE_VIDEO_BUCKET: "saree-videos",

  // Video limits
  MAX_VIDEO_SIZE_MB: 15,
  MAX_VIDEO_DURATION_SEC: 15,

  // ----------------------------------------------------------------------------
  // 2. SHOP BRANDING & CONTACT
  // ----------------------------------------------------------------------------
  SHOP_NAME: "Mahadev Saree Collection",
  SHOP_TAGLINE: "Pure Elegance in Every Weave • Premium Silk, Banarasi & Handloom Sarees",

  // WhatsApp number in international format without '+' or spaces.
  // Format for India: 91 followed by 10-digit phone number -> "919876543210"
  WHATSAPP_NUMBER: "919876543210",

  // Currency symbol
  CURRENCY_SYMBOL: "₹",

  // How long to cache catalog data in sessionStorage (in minutes)
  CACHE_TTL_MINUTES: 5,

  // ----------------------------------------------------------------------------
  // 3. ADMIN DROPDOWN SUGGESTIONS (For quick entry in admin form)
  // ----------------------------------------------------------------------------
  CATEGORY_SUGGESTIONS: [
    "Bridal",
    "Festive",
    "Party Wear",
    "Handloom",
    "Casual",
    "Traditional",
    "Contemporary"
  ],

  FABRIC_SUGGESTIONS: [
    "Pure Silk",
    "Banarasi Silk",
    "Kanjivaram Silk",
    "Chanderi Silk",
    "Tussar Silk",
    "Organza Silk",
    "Pure Georgette",
    "Pure Chiffon",
    "Tissue Silk",
    "Linen Silk",
    "Cotton Silk"
  ],

  // ----------------------------------------------------------------------------
  // 4. ABOUT US SECTION
  // ----------------------------------------------------------------------------
  ABOUT: {
    TITLE: "About Mahadev Saree Collection",
    SUBTITLE: "Crafted with passion, delivered with love",
    DESCRIPTION_P1: "Welcome to Mahadev Saree Collection, your premier boutique for authentic Indian handlooms, regal bridal silks, and contemporary festive wear. Each saree in our catalog is handpicked directly from traditional master weavers across Varanasi, Kanchipuram, Chanderi, and Bengal.",
    DESCRIPTION_P2: "We believe every saree tells a timeless story of heritage, grace, and artistry. By bypassing middlemen, we bring you genuine weaves and pure zari craftsmanship at direct weaver prices.",
    HIGHLIGHTS: [
      { icon: "✨", title: "100% Authentic Handloom", desc: "Certified pure silk & genuine zari work" },
      { icon: "🧵", title: "Direct Weaver Pricing", desc: "Honest pricing with no middleman markups" },
      { icon: "📦", title: "Pan-India Safe Delivery", desc: "Insured shipping with live tracking updates" },
      { icon: "💬", title: "Personal Video Shopping", desc: "Inspect any saree live over WhatsApp call" }
    ]
  },

  // ----------------------------------------------------------------------------
  // 5. HOW ORDERING WORKS (3 SIMPLE STEPS)
  // ----------------------------------------------------------------------------
  HOW_TO_ORDER: {
    TITLE: "How to Order in 3 Simple Steps",
    SUBTITLE: "No complicated checkout — personalized, friendly shopping on WhatsApp",
    STEPS: [
      {
        step: "1",
        title: "Browse & Select",
        desc: "Explore our catalog and find your dream saree. Watch the drape video and click 'Order on WhatsApp' on the saree details page.",
        icon: "📱"
      },
      {
        step: "2",
        title: "WhatsApp Us",
        desc: "A pre-filled message with the saree ID, name, price, and link opens automatically. Ask questions or request live video verification.",
        icon: "💬"
      },
      {
        step: "3",
        title: "Pay by QR & Relax",
        desc: "Confirm your order, pay securely via UPI QR code or bank transfer, and we dispatch your saree within 24 hours.",
        icon: "🛍️"
      }
    ]
  },

  // ----------------------------------------------------------------------------
  // 6. RETURN & EXCHANGE POLICY
  // ----------------------------------------------------------------------------
  RETURN_POLICY: {
    TITLE: "Return & Exchange Policy",
    SUBTITLE: "Honest, transparent, and customer-first service",
    POINTS: [
      "7-Day Exchange Window: If you receive a damaged or incorrect saree, notify us within 7 days with a clear unboxing video.",
      "Condition: Saree must be unworn, unwashed, with all original tags, folding intact, and unstitched blouse piece attached.",
      "Color Variation: Authentic handlooms shot under natural studio lights may show a minor 5-10% hue variation depending on screen calibration.",
      "Dispatch Cancellation: Orders can be cancelled anytime before courier dispatch with an immediate 100% refund."
    ]
  },

  // ----------------------------------------------------------------------------
  // 7. FOOTER & CONTACT DETAILS
  // ----------------------------------------------------------------------------
  FOOTER: {
    ADDRESS: "Shop No. 12, Heritage Silk Market, Ring Road, Surat, Gujarat 395002",
    PHONE: "+91 98765 43210",
    EMAIL: "orders@mahadevsaree.com",
    HOURS: "Monday to Saturday: 10:00 AM – 8:30 PM (IST)",
    COPYRIGHT: "© 2026 Mahadev Saree Collection. All rights reserved."
  },

  // ----------------------------------------------------------------------------
  // 8. DEMO / FALLBACK DATA
  // ----------------------------------------------------------------------------
  // Displayed automatically if SUPABASE_URL still has 'YOUR_PROJECT_ID' so you can
  // test the site immediately before connecting your Supabase project.
  FALLBACK_DATA: [
    {
      id: 101,
      name: "Kanjivaram Pure Silk Saree with Gold Zari Pallu",
      fabric: "Pure Silk",
      color: "Crimson Red",
      pattern: "Floral Jaal",
      border: "Contrast Temple Border",
      category: "Bridal",
      occasion: "Wedding / Reception",
      description: "Magnificent heirloom Kanjivaram silk saree woven with 2g pure gold zari. Features intricate peacock and chakra motifs along the traditional korvai border. Paired with a running unstitched blouse piece.",
      price: 14500,
      images: [
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80"
      ],
      video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      video_poster: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80",
      status: "Available",
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: 102,
      name: "Banarasi Katan Silk Saree in Emerald Green",
      fabric: "Banarasi Silk",
      color: "Emerald Green",
      pattern: "Kadwa Buti",
      border: "Rich Meenakari Zari Border",
      category: "Festive",
      occasion: "Festivals / Sangeet",
      description: "Handcrafted Banarasi katan silk saree featuring delicate floral kadwa butas across the body and an opulent meenakari zari border. Comes with matching brocade blouse piece.",
      price: 8900,
      images: [
        "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80"
      ],
      video_url: null,
      video_poster: null,
      status: "Available",
      created_at: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: 103,
      name: "Pastel Pink Chanderi Silk Saree with Zari Motifs",
      fabric: "Chanderi Silk",
      color: "Pastel Pink",
      pattern: "Ashrafi Buti",
      border: "Delicate Golden Zari Border",
      category: "Party Wear",
      occasion: "Day Weddings / Engagement",
      description: "Lightweight and airy Chanderi silk saree with a sheer texture and glistening gold zari coin butis. Ideal for modern celebrations and day festivities.",
      price: 4950,
      images: [
        "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80"
      ],
      video_url: null,
      video_poster: null,
      status: "Available",
      created_at: new Date(Date.now() - 4 * 86400000).toISOString()
    },
    {
      id: 104,
      name: "Royal Navy Blue Tussar Silk Handloom Saree",
      fabric: "Tussar Silk",
      color: "Navy Blue",
      pattern: "Handpainted Madhubani",
      border: "Broad Woven Border",
      category: "Handloom",
      occasion: "Pooja / Traditional Gatherings",
      description: "Rich textured wild Tussar silk saree adorned with artisanal Madhubani folk motifs painted with natural dyes. Authentic handloom with Silk Mark guarantee.",
      price: 6750,
      images: [
        "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=80"
      ],
      video_url: null,
      video_poster: null,
      status: "Sold",
      created_at: new Date(Date.now() - 18 * 86400000).toISOString()
    },
    {
      id: 105,
      name: "Sunset Mustard Organza Silk Floral Embroidered Saree",
      fabric: "Organza Silk",
      color: "Mustard Yellow",
      pattern: "Floral Resham Embroidery",
      border: "Scalloped Cutwork Border",
      category: "Festive",
      occasion: "Haldi / Mehendi",
      description: "Dreamy sheer organza silk drape with subtle sheen, delicate pastel threadwork flowers, and a designer scalloped cutwork border. Feather-light and stylish.",
      price: 5200,
      images: [
        "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80"
      ],
      video_url: null,
      video_poster: null,
      status: "Available",
      created_at: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      id: 106,
      name: "Deep Wine Georgette Saree with Micro Sequins",
      fabric: "Pure Georgette",
      color: "Wine Burgundy",
      pattern: "All-Over Micro Sequins",
      border: "Velvet Zari Piping",
      category: "Party Wear",
      occasion: "Cocktail / Evening Reception",
      description: "Fluid pure georgette drape in dramatic wine shade, elevated with tone-on-tone twinkling micro-sequins. Flows gracefully and hugs your silhouette effortlessly.",
      price: 7400,
      images: [
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80"
      ],
      video_url: null,
      video_poster: null,
      status: "Available",
      created_at: new Date(Date.now() - 25 * 86400000).toISOString()
    }
  ]
};

// Expose on global window object
window.CONFIG = CONFIG;
