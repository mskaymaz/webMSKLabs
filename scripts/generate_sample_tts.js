const fs = require('fs');
const path = require('path');
const https = require('https');

const outputDir = path.join(__dirname, '..', 'media', 'audio');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function fetchTTS(text, lang) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(text);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=gtx&q=${encoded}&tl=${lang}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP status ${res.statusCode}`));
      }
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

async function run() {
  const trText = "BIZCE Nedir? Sessiz Kalabaligin Sesi ve Baska Bir Pencere. Herkesin soyleyecek bir sozu var. Bizim de var.";
  try {
    const buf = await fetchTTS(trText, 'tr');
    const filePath = path.join(outputDir, 'post_1_tr.mp3');
    fs.writeFileSync(filePath, buf);
    console.log(`Saved TR: ${filePath} (${buf.length} bytes)`);
  } catch(e) {
    console.error("TR error:", e.message);
  }
}

run();
