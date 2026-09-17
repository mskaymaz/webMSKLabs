/**
 * MSK Labs - Master Configuration & Central Settings
 * Tüm web modülleri ve istemci uç noktaları bu konfigürasyon objesini okur.
 * Master Central Configuration object consumed across all web modules.
 */
const SITE_CONFIG = {
  siteName: "MSK Labs",
  siteUrl: "https://msklabs.org",
  contactEmail: "msklabs.org@gmail.com",
  googleSheetApiUrl: "https://script.google.com/macros/s/AKfycbxoT1OGEkYZ_1MJXv6XErJYjVe26qqtr2rZGIXiDXxbNG9gIzabfhWsPJhjInTlG3_NQw/exec",
  version: "1.0.0",
  getAppsData: function() {
    return (typeof window !== 'undefined' && window.MSK_APPS_DATA) ? window.MSK_APPS_DATA : this.apps;
  },
  apps: {
    haydinamaza: { name: "HaydiNamaza", storeUrlAndroid: "https://play.google.com/store/apps/details?id=org.msklabs.haydinamaza" },
    rekatsay: { name: "RekatSay", storeUrlAndroid: "https://play.google.com/store/apps/details?id=org.msklabs.rekatsay" },
    emekli: { name: "Ne Zaman Emekli Olabilirim", storeUrlAndroid: "https://play.google.com/store/apps/details?id=org.msklabs.emekli" },
    enyakin: { name: "En Yakın Hizmet", storeUrlAndroid: "https://play.google.com/store/apps/details?id=org.msklabs.enyakin" },
    deskpilot: { name: "DeskPilot Pro", storeUrlWindows: "https://msklabs.org/dl.html?app=deskpilot" },
    gcpiluyari: { name: "GC Pil Uyardı", storeUrlAndroid: "https://play.google.com/store/apps/details?id=org.msklabs.gcpiluyari" }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SITE_CONFIG;
}