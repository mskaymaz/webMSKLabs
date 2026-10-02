/**
 * Cloudflare Pages Function - Destek & Talep API Endpoint
 * URL: https://msklabs.org/api/feedback
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const data = await request.json();
    const { app, ver, os, category, subject, message, email } = data;

    if (!subject || !message) {
      return new Response(JSON.stringify({ success: false, error: 'Konu ve mesaj zorunludur.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ticket ID Üretimi
    const randNum = Math.floor(10000 + Math.random() * 90000);
    const ticketId = 'MSK-' + randNum;
    const createdAt = new Date().toISOString();

    let aiAnalysis = {
      quality_score: 5.0,
      ai_summary: subject,
      ai_category: category,
      action_item: 'İnceleme bekleniyor.'
    };

    // 1. Google Gemini API Entegrasyonu (Tanımlı ise)
    const geminiKey = env?.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const prompt = `Aşağıdaki kullanıcı talebini analiz et ve SADECE geçerli bir JSON çıktısı ver:
        - ai_category: "hata", "istek", "tesekkur", "fikir" veya "genel"
        - quality_score: 1-10 arası ciddiyet ve detay puanı
        - ai_summary: Talebin 1 cümlelik özeti
        - action_item: Geliştirici için yapılması gereken aksiyon

        Uygulama: ${app} (v${ver}, ${os})
        Kategori: ${category}
        Konu: ${subject}
        Mesaj: ${message}`;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const geminiData = await geminiRes.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleanJson = rawText.replace(/```json|```/g, '').trim();
          aiAnalysis = JSON.parse(cleanJson);
        }
      } catch (aiErr) {
        console.error('Gemini API Error:', aiErr);
      }
    }

    // 2. Google Sheets Entegrasyonu (Otomatik E-Tabloya Satır Ekleme)
    const sheetsUrl = env?.GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbxoT1OGEkYZ_1MJXv6XErJYjVe26qqtr2rZGIXiDXxbNG9gIzabfhWsPJhjInTlG3_NQw/exec';
    
    try {
      await fetch(sheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticketId,
          app: app,
          ver: ver,
          os: os,
          category: category,
          subject: subject,
          message: message,
          email: email,
          ai_score: aiAnalysis.quality_score,
          ai_summary: aiAnalysis.ai_summary
        })
      });
    } catch (sheetErr) {
      console.error('Google Sheets Forwarding Error:', sheetErr);
    }

    // 3. Telegram Anlık Bildirimi
    const tgToken = env?.TELEGRAM_BOT_TOKEN;
    const tgChatId = env?.TELEGRAM_CHAT_ID;

    if (tgToken && tgChatId) {
      try {
        const tgMessage = `🚨 *Yeni Destek Talebi [#${ticketId}]*\n\n📱 *Uygulama:* ${app} (v${ver}, ${os})\n🏷️ *Kategori:* ${category}\n📌 *Konu:* ${subject}\n📝 *Mesaj:* ${message}\n⭐ *AI Ciddiyet Puanı:* ${aiAnalysis.quality_score}/10\n🤖 *AI Özeti:* ${aiAnalysis.ai_summary}\n🛠️ *Eylem:* ${aiAnalysis.action_item}\n📧 *E-posta:* ${email}`;

        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgChatId,
            text: tgMessage,
            parse_mode: 'Markdown'
          })
        });
      } catch (tgErr) {
        console.error('Telegram Error:', tgErr);
      }
    }

    // Yanıt Dönüşü
    return new Response(JSON.stringify({
      success: true,
      ticket_id: ticketId,
      created_at: createdAt,
      ai_analysis: aiAnalysis
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}