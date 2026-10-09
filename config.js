/**
 * ==============================================================================
 * MAHADEV SAREE COLLECTION - WEBSITE CONFIGURATION
 * ==============================================================================
 * Edit this file to update your shop details, WhatsApp number, Google Sheet URL,
 * and text sections. No coding knowledge required!
 * ==============================================================================
 */

const CONFIG = {
  // ----------------------------------------------------------------------------
  // 1. SHOP BRANDING & CONTACT
  // ----------------------------------------------------------------------------
  SHOP_NAME: "Mahadev Saree Collection",
  SHOP_TAGLINE: "Pure Elegance in Every Weave • Premium Silk, Banarasi & Handloom Sarees",
  
  // WhatsApp Number in international format without '+' or spaces.
  // Example for India: 91 followed by your 10-digit number -> "919876543210"
  WHATSAPP_NUMBER: "919876543210",

  // Currency symbol displayed across the website
  CURRENCY_SYMBOL: "₹",

  // ----------------------------------------------------------------------------
  // 2. GOOGLE SHEET CSV DATA SOURCE
  // ----------------------------------------------------------------------------
  // To get your published CSV URL:
  // 1. In Google Sheets: File > Share > Publish to web
  // 2. Choose 'Entire Document' or your sheet tab, and format: 'Comma-separated values (.csv)'
  // 3. Click 'Publish', copy the generated URL, and paste it below.
  //
  // Leave empty ("") to test with the built-in sample sarees below.
  SHEET_CSV_URL: "",

  // How long to cache the sheet data in minutes before checking for updates (default: 5 mins)
  CACHE_TTL_MINUTES: 5,

  // ----------------------------------------------------------------------------
  // 3. ABOUT US SECTION
  // ----------------------------------------------------------------------------
  ABOUT: {
    TITLE: "About Mahadev Saree Collection",
    SUBTITLE: "Crafted with passion, delivered with love",
    DESCRIPTION_P1: "Welcome to Mahadev Saree Collection, your destination for authentic Indian handlooms, regal bridal silks, and contemporary festive wear. Each saree in our collection is handpicked directly from traditional master weavers across Varanasi, Kanchipuram, Chanderi, and Bengal.",
    DESCRIPTION_P2: "We believe every saree tells a story of heritage, grace, and artistry. By bypassing middlemen, we bring you genuine weaves and pure zari craftsmanship at honest, direct-from-weaver prices.",
    HIGHLIGHTS: [
      { icon: "✨", title: "100% Authentic Handloom", desc: "Certified pure silk & genuine zari work" },
      { icon: "🧵", title: "Direct Weaver Pricing", desc: "No middleman markups or hidden fees" },
      { icon: "📦", title: "Pan-India Safe Delivery", desc: "Insured shipping with tracking updates" },
      { icon: "💬", title: "Personal Video Shopping", desc: "Inspect any saree live over WhatsApp call" }
    ]
  },

  // ----------------------------------------------------------------------------
  // 4. HOW ORDERING WORKS (3 SIMPLE STEPS)
  // ----------------------------------------------------------------------------
  HOW_TO_ORDER: {
    TITLE: "How to Order in 3 Easy Steps",
    SUBTITLE: "No complicated cart or checkout — direct personal assistance on WhatsApp",
    STEPS: [
      {
        step: "1",
        title: "Browse & Select",
        desc: "Explore our catalog and find your favorite saree. Click on 'Order on WhatsApp' on the saree details page.",
        icon: "📱"
      },
      {
        step: "2",
        title: "Chat with Us",
        desc: "A pre-filled message with the saree ID, name, and link opens in WhatsApp. Request more photos or a live video preview.",
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
  // 5. RETURN & EXCHANGE POLICY
  // ----------------------------------------------------------------------------
  RETURN_POLICY: {
    TITLE: "Return & Exchange Policy",
    SUBTITLE: "Clear, transparent, and customer-first policies",
    POINTS: [
      "7-Day Exchange Window: If you receive a damaged or incorrect saree, notify us within 7 days of delivery with an unboxing video.",
      "Condition: The saree must be unworn, unwashed, with original tags, blouse piece intact, and folding preserved.",
      "Color Variation: We shoot in natural studio lighting. Slight 5-10% hue variation due to device screen settings is normal for handlooms.",
      "Cancellation: Orders can be cancelled before dispatch without any cancellation fee."
    ]
  },

  // ----------------------------------------------------------------------------
  // 6. FOOTER & CONTACT DETAILS
  // ----------------------------------------------------------------------------
  FOOTER: {
    ADDRESS: "Shop No. 12, Heritage Silk Market, Ring Road, Surat, Gujarat 395002",
    PHONE: "+91 98765 43210",
    EMAIL: "orders@mahadevsaree.com",
    HOURS: "Monday to Saturday: 10:00 AM – 8:30 PM (IST)",
    COPYRIGHT: "© 2026 Mahadev Saree Collection. All rights reserved."
  },

  // ----------------------------------------------------------------------------
  // 7. BUILT-IN FALLBACK SAMPLE DATA
  // ----------------------------------------------------------------------------
  // Used automatically when SHEET_CSV_URL is empty or if offline.
  // Columns correspond exactly to the Google Sheet specification:
  // id | name | fabric | color | pattern | border | category | occasion | description | price | image_url | extra_images | status | created_at
  FALLBACK_DATA: [
    {
      id: "MSC-101",
      name: "Kanjivaram Pure Silk Saree with Gold Zari Pallu",
      fabric: "Pure Silk",
      color: "Crimson Red",
      pattern: "Floral Jaal",
      border: "Contrast Temple Border",
      category: "Bridal",
      occasion: "Wedding / Reception",
      description: "Magnificent heirloom Kanjivaram silk saree woven with 2g pure gold zari. Features intricate peacock and chakra motifs along the traditional korvai border. Paired with a running unstitched blouse piece.",
      price: 14500,
      image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80",
      extra_images: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=80,https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80",
      status: "Available",
      created_at: "2026-10-06"
    },
    {
      id: "MSC-102",
      name: "Banarasi Katan Silk Saree in Emerald Green",
      fabric: "Banarasi Silk",
      color: "Emerald Green",
      pattern: "Kadwa Buti",
      border: "Rich Meenakari Zari Border",
      category: "Festive",
      occasion: "Festivals / Sangeet",
      description: "Handcrafted Banarasi katan silk saree featuring delicate floral kadwa butas across the body and an opulent meenakari zari border. Comes with matching brocade blouse piece.",
      price: 8900,
      image_url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=80",
      extra_images: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80",
      status: "Available",
      created_at: "2026-10-05"
    },
    {
      id: "MSC-103",
      name: "Pastel Pink Chanderi Silk Saree with Zari Motifs",
      fabric: "Chanderi Silk",
      color: "Pastel Pink",
      pattern: "Ashrafi Buti",
      border: "Delicate Golden Zari Border",
      category: "Party Wear",
      occasion: "Day Weddings / Engagement",
      description: "Lightweight and airy Chanderi silk saree with a sheer texture and glistening gold zari coin butis. Ideal for modern celebrations and day festivities.",
      price: 4950,
      image_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80",
      extra_images: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80",
      status: "Available",
      created_at: "2026-10-04"
    },
    {
      id: "MSC-104",
      name: "Royal Navy Blue Tussar Silk Handloom Saree",
      fabric: "Tussar Silk",
      color: "Navy Blue",
      pattern: "Handpainted Madhubani",
      border: "Broad Woven Border",
      category: "Handloom",
      occasion: "Pooja / Traditional Gatherings",
      description: "Rich textured wild Tussar silk saree adorned with artisanal Madhubani folk motifs painted with natural dyes. Authentic handloom with Silk Mark guarantee.",
      price: 6750,
      image_url: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=900&q=80",
      extra_images: "",
      status: "Sold",
      created_at: "2026-09-20"
    },
    {
      id: "MSC-105",
      name: "Sunset Mustard Organza Silk Floral Embroidered Saree",
      fabric: "Organza Silk",
      color: "Mustard Yellow",
      pattern: "Floral Resham Embroidery",
      border: "Scalloped Cutwork Border",
      category: "Festive",
      occasion: "Haldi / Mehendi",
      description: "Dreamy sheer organza silk drape with subtle sheen, delicate pastel threadwork flowers, and a designer scalloped cutwork border. Feather-light and stylish.",
      price: 5200,
      image_url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=80",
      extra_images: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80",
      status: "Available",
      created_at: "2026-10-07"
    },
    {
      id: "MSC-106",
      name: "Deep Wine Georgette Saree with Sequins Work",
      fabric: "Pure Georgette",
      color: "Wine Burgundy",
      pattern: "All-Over Micro Sequins",
      border: "Velvet Zari Piping",
      category: "Party Wear",
      occasion: "Cocktail / Evening Reception",
      description: "Fluid pure georgette drape in dramatic wine shade, elevated with tone-on-tone twinkling micro-sequins. Flows gracefully and hugs your silhouette effortlessly.",
      price: 7400,
      image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80",
      extra_images: "",
      status: "Available",
      created_at: "2026-09-15"
    },
    {
      id: "MSC-107",
      name: "Classic Ivory & Gold Tissue Silk Saree",
      fabric: "Tissue Silk",
      color: "Ivory White",
      pattern: "Metallic Shimmer Weave",
      border: "Heavy Zari Pallu",
      category: "Bridal",
      occasion: "Temple Weddings / Onam",
      description: "Gleaming ivory and spun gold tissue silk saree inspired by vintage royal aesthetics. A statement piece that catches light from every angle.",
      price: 11200,
      image_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80",
      extra_images: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=900&q=80",
      status: "Sold",
      created_at: "2026-08-30"
    },
    {
      id: "MSC-108",
      name: "Peach Chiffon Hand-Dyed Bandhani Saree",
      fabric: "Pure Chiffon",
      color: "Peach Orange",
      pattern: "Traditional Bandhani",
      border: "Gota Patti Border",
      category: "Festive",
      occasion: "Puja / Family Gathering",
      description: "Authentic tie-and-dye Bandhani crafted on butter-soft pure chiffon fabric with delicate golden gota patti border hand-stitched by Rajasthani artisans.",
      price: 3850,
      image_url: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=900&q=80",
      extra_images: "",
      status: "Available",
      created_at: "2026-10-08"
    }
  ]
};

// Expose on global window object
window.CONFIG = CONFIG;
