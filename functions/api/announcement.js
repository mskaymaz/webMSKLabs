/**
 * MSK Labs Remote Announcement & Force Update API
 * Cloudflare Pages Function endpoint: /api/announcement
 */

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const appId = (url.searchParams.get('app') || 'genel').toLowerCase().trim();
  const appVer = url.searchParams.get('ver') || '1.0.0';
  const os = (url.searchParams.get('os') || 'android').toLowerCase();
  const lang = (url.searchParams.get('lang') || 'tr').toLowerCase();

  // Dynamic Announcement & Remote Update Configuration Database
  const ANNOUNCEMENTS_DB = {
    'haydinamaza': {
      active: true,
      min_version: '2.0.0',
      force_update: false,
      title: {
        tr: '🕌 HaydiNamaza v2.1 Yayında!',
        en: '🕌 HaydiNamaza v2.1 Released!',
        ar: '🕌 تم إصدار تحديث جديد!'
      },
      message: {
        tr: 'Yeni pusula kalibrasyon özelliği ve daha hassas namaz vakti algoritması eklendi.',
        en: 'New compass calibration feature and precise prayer calculation algorithms added.',
        ar: 'تمت إضافة بوصلة جديدة ودقة عالية في حساب أوقات الصلاة.'
      },
      action_label: {
        tr: 'Güncelle / Detaylar',
        en: 'Update / Details',
        ar: 'تحديث / التفاصيل'
      },
      action_url: 'https://msklabs.org/changelog.html?app=haydinamaza'
    },
    'rekatsay': {
      active: false
    },
    'date-counter': {
      active: false
    },
    'deskpilot': {
      active: true,
      min_version: '1.0.0',
      force_update: false,
      title: {
        tr: '🖥️ DeskPilot Masaüstü Güncellemesi',
        en: '🖥️ DeskPilot Desktop Update',
        ar: '🖥️ تحديث جديد'
      },
      message: {
        tr: 'Windows 11 uyumluluğu artırıldı.',
        en: 'Windows 11 compatibility enhanced.',
        ar: 'تحسين التوافق مع ويندوز 11.'
      },
      action_label: {
        tr: 'İncele',
        en: 'Inspect',
        ar: 'معاينة'
      },
      action_url: 'https://msklabs.org/deskpilot.html'
    }
  };

  const appConfig = ANNOUNCEMENTS_DB[appId];

  // Response Payload
  let responseData = {
    success: true,
    timestamp: new Date().toISOString(),
    app_id: appId,
    current_ver: appVer,
    has_announcement: false,
    force_update: false
  };

  if (appConfig && appConfig.active) {
    responseData.has_announcement = true;
    responseData.force_update = appConfig.force_update || false;
    responseData.title = appConfig.title[lang] || appConfig.title['tr'];
    responseData.message = appConfig.message[lang] || appConfig.message['tr'];
    responseData.action_label = appConfig.action_label[lang] || appConfig.action_label['tr'];
    responseData.action_url = appConfig.action_url;
  }

  return new Response(JSON.stringify(responseData, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    }
  });
}