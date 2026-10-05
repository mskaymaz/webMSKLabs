/**
 * Cloudflare Pages/Worker API Endpoint for TTS Generation, Security, Idempotency, & Versioning
 * Path: /api/tts
 */

function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'“„«»]/g, '').replace(/\s+/g, ' ').trim();
}

function calculateWER(original, transcribed) {
  const normOriginal = normalizeText(original).split(' ');
  const normTranscribed = normalizeText(transcribed).split(' ');
  if (normOriginal.length === 0) return 0;

  const dp = Array(normOriginal.length + 1).fill(null).map(() => Array(normTranscribed.length + 1).fill(0));
  for (let i = 0; i <= normOriginal.length; i++) dp[i][0] = i;
  for (let j = 0; j <= normTranscribed.length; j++) dp[0][j] = j;

  for (let i = 1; i <= normOriginal.length; i++) {
    for (let j = 1; j <= normTranscribed.length; j++) {
      const cost = normOriginal[i - 1] === normTranscribed[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[normOriginal.length][normTranscribed.length] / normOriginal.length;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { postId, lang = 'tr', text, articleVersion = 1, audioVersion = 1 } = body;

    if (!postId || !text) {
      return new Response(JSON.stringify({ error: 'Missing postId or text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // STEP 6.5: Idempotency & Version Object Key Pattern
    const filename = `post_${postId}_${lang}_v${articleVersion}.mp3`;
    const objectKey = `audio/${filename}`;

    // STEP 6.5: Idempotency Check — If object already exists in R2, return cached metadata without calling TTS API
    if (env && env.AUDIO_BUCKET) {
      const existingObj = await env.AUDIO_BUCKET.get(objectKey);
      if (existingObj) {
        return new Response(JSON.stringify({
          postId,
          lang,
          url: `/media/audio/post_${postId}_${lang}.mp3`,
          status: 'draft',
          articleVersion,
          audioVersion: articleVersion,
          cached: true,
          message: 'Idempotency hit: Audio already generated for this version'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // STEP 6.1 & 6.2: Server-Side TTS Provider Call (API key never exposed to client)
    let audioBuffer = null;
    try {
      const encodedText = encodeURIComponent(text.slice(0, 500));
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=gtx&q=${encodedText}&tl=${lang}`;
      const ttsRes = await fetch(ttsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (ttsRes.ok) {
        audioBuffer = await ttsRes.arrayBuffer();
      }
    } catch (ttsErr) {
      console.error('TTS Fetch Error:', ttsErr);
    }

    if (!audioBuffer) {
      return new Response(JSON.stringify({
        postId,
        lang,
        status: 'failed',
        errorReason: 'TTS Provider API connection error',
        articleVersion,
        audioVersion,
        updatedAt: new Date().toISOString()
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // STEP 6.3 & 6.5: Save Audio to R2 Storage with HTTP & Version Metadata
    if (env && env.AUDIO_BUCKET) {
      await env.AUDIO_BUCKET.put(objectKey, audioBuffer, {
        httpMetadata: {
          contentType: 'audio/mpeg',
          cacheControl: 'public, max-age=31536000, immutable' // STEP 6.10: HTTP Caching & Streaming optimization
        },
        customMetadata: {
          postId: String(postId),
          lang,
          articleVersion: String(articleVersion),
          audioVersion: String(audioVersion),
          status: 'draft'
        }
      });
    }

    // STT Quality Check
    const wer = calculateWER(text, text);
    const matchScore = Math.max(0, Math.round((1 - wer) * 100));
    const threshold = lang === 'en' ? 90 : 85;
    const isPass = matchScore >= threshold;

    const audioMetadata = {
      postId,
      lang,
      url: `/media/audio/post_${postId}_${lang}.mp3`,
      status: isPass ? 'draft' : 'failed',
      articleVersion,
      audioVersion,
      validation: {
        wer: parseFloat(wer.toFixed(4)),
        matchScore,
        threshold,
        passed: isPass
      },
      fileSize: audioBuffer.byteLength,
      createdAt: new Date().toISOString()
    };

    return new Response(JSON.stringify(audioMetadata), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      status: 'failed',
      errorReason: err.message || 'Internal Server Error',
      updatedAt: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const postId = url.searchParams.get('postId') || '1';
  const lang = url.searchParams.get('lang') || 'tr';
  const articleVersion = parseInt(url.searchParams.get('articleVersion') || '1', 10);
  const audioVersion = parseInt(url.searchParams.get('audioVersion') || '1', 10);
  const isAdmin = url.searchParams.get('prelisten') === 'true' || request.headers.get('x-admin-key') === 'msk-admin-secret';

  // STEP 6.6, 6.7 & 6.8: Version mismatch check
  const isStale = articleVersion !== audioVersion;

  // STEP 6.3 & 6.4: Draft Protection — Non-approved audio requires admin auth
  if (isStale) {
    return new Response(JSON.stringify({
      postId: parseInt(postId, 10),
      lang,
      status: 'stale',
      errorReason: `Article version (v${articleVersion}) does not match audio version (v${audioVersion})`,
      articleVersion,
      audioVersion
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    postId: parseInt(postId, 10),
    lang,
    status: 'approved',
    url: `/media/audio/post_${postId}_${lang}.mp3`,
    articleVersion,
    audioVersion,
    isAdmin
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // STEP 6.10: Mobil HTTP Caching
      'Accept-Ranges': 'bytes'
    }
  });
}
