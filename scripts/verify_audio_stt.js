/**
 * MSK Labs — Audio STT/Whisper Verification Engine
 * Compares transcribed text against original article text using Word Error Rate (WER)
 */

function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'“„«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateWER(original, transcribed) {
  const normOriginal = normalizeText(original).split(' ');
  const normTranscribed = normalizeText(transcribed).split(' ');

  if (normOriginal.length === 0) return 0;

  const dp = Array(normOriginal.length + 1)
    .fill(null)
    .map(() => Array(normTranscribed.length + 1).fill(0));

  for (let i = 0; i <= normOriginal.length; i++) dp[i][0] = i;
  for (let j = 0; j <= normTranscribed.length; j++) dp[0][j] = j;

  for (let i = 1; i <= normOriginal.length; i++) {
    for (let j = 1; j <= normTranscribed.length; j++) {
      const cost = normOriginal[i - 1] === normTranscribed[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // Deletion
        dp[i][j - 1] + 1,       // Insertion
        dp[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  const distance = dp[normOriginal.length][normTranscribed.length];
  const wer = distance / normOriginal.length;
  return wer;
}

function verifyAudioSTT(originalText, transcribedText, lang = 'tr', customThreshold = null) {
  const defaultThresholds = { tr: 85, en: 90, ar: 80 };
  const threshold = customThreshold || defaultThresholds[lang] || 85;

  const wer = calculateWER(originalText, transcribedText);
  const matchScore = Math.max(0, Math.round((1 - wer) * 100));
  const isPass = matchScore >= threshold;

  return {
    lang,
    wer: parseFloat(wer.toFixed(4)),
    matchScore,
    threshold,
    status: isPass ? 'draft' : 'failed',
    errorReason: isPass ? null : `Match score ${matchScore}% is below required threshold ${threshold}%`
  };
}

module.exports = {
  normalizeText,
  calculateWER,
  verifyAudioSTT
};
