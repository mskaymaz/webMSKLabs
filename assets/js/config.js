/**
 * MSK Labs - Master Configuration & Central Settings
 * Tüm web modülleri ve istemci uç noktaları bu konfigürasyon objesini okur.
 * Master Central Configuration object consumed across all web modules.
 */
window.SITE_CONFIG = {
  siteName: "MSK Labs",
  siteUrl: "https://msklabs.org",
  contactEmail: "msklabs.org@gmail.com",
  googleSheetApiUrl: "https://script.google.com/macros/s/AKfycbxoT1OGEkYZ_1MJXv6XErJYjVe26qqtr2rZGIXiDXxbNG9gIzabfhWsPJhjInTlG3_NQw/exec",
  version: "1.0.0",
  getAppsData: function() {
    return (typeof window !== 'undefined' && window.MSK_APPS_DATA) ? window.MSK_APPS_DATA : this.apps;
  },
  apps: {
    haydi_namaza: { name: "HaydiNamaza", storeUrlAndroid: "https://play.google.com/store/apps/details?id=org.msklabs.haydinamaza" },
    rekatsay: { name: "RekatSay", storeUrlAndroid: "https://play.google.com/store/apps/details?id=org.msklabs.rekatsay" },
    date_counter: { name: "Date Counter", storeUrlWindows: "https://msklabs.org/apps/date_counter.html" },
    en_yakin: { name: "En Yakın Hizmet", storeUrlAndroid: "https://play.google.com/store/apps/details?id=org.msklabs.enyakin" },
    deskpilot: { name: "DeskPilot Pro", storeUrlWindows: "https://msklabs.org/dl.html?app=deskpilot" },
    gc_pil_uyari: { name: "GC Pil Uyarı", storeUrlAndroid: "https://play.google.com/store/apps/details?id=org.msklabs.gcpiluyari" }
  },
  catalogUrl: "https://raw.githubusercontent.com/mskaymaz/AllAppReleaseWork/main/app_catalog.json",
  fetchCatalog: function(customUrl) {
    var url = customUrl || this.catalogUrl;
    if (typeof fetch === 'undefined') return Promise.resolve(this.getAppsData());
    return fetch(url)
      .then(function(res) {
        if (!res.ok) throw new Error("Catalog HTTP error " + res.status);
        return res.json();
      })
      .then(function(catalog) {
        if (catalog && Array.isArray(catalog.apps)) {
          window.MSK_CATALOG_REMOTE = catalog;
          if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('mskCatalogLoaded', { detail: catalog }));
          }
        }
        return catalog;
      })
      .catch(function(err) {
        console.warn("[MSK SITE_CONFIG] Remote catalog fetch fallback activated:", err.message);
        return null;
      });
  }
};

// Geriye dönük uyumluluk (Legacy Alias'lar)
window.SITE_CONFIG.apps.haydinamaza = window.SITE_CONFIG.apps.haydi_namaza;
window.SITE_CONFIG.apps.enyakin = window.SITE_CONFIG.apps.en_yakin;
window.SITE_CONFIG.apps.gcpiluyari = window.SITE_CONFIG.apps.gc_pil_uyari;
window.SITE_CONFIG.apps["date-counter"] = window.SITE_CONFIG.apps.date_counter;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.SITE_CONFIG;
}