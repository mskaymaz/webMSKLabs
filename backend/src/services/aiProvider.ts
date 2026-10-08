/**
 * MSKLabs & DevAdmin — AI Provider Abstraction, Zero-Cost Guard & AI_CACHE Layer
 * File: backend/src/services/aiProvider.ts
 * Task: AI-005 (Provider Abstraction, Zero-Cost Guard $0/Mo Rule, Cloudflare KV AI_CACHE, Deterministic SHA-256 Cache Key)
 */

import { createAIClient, sanitizePII, AIProviderError, AIClientConfig, AIGenerateResult } from '../utils/ai';
import { assertPromptSafety } from '../utils/sanitizePrompt';

export interface AIProviderOptions {
  systemPrompt?: string;
  prompt: string;
  inputContent?: string;
  model?: string;
  promptId?: string;
  promptVersion?: string;
  language?: string;
  targetLanguage?: string;
  glossaryVersion?: string;
  glossaryTerms?: Array<{ source: string; target: string }>;
  schemaVersion?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  apiKey?: string;
  fetchFn?: typeof fetch;
  env?: Record<string, any>;
  configHash?: string;
}

export interface AIProviderResponse {
  text: string;
  model: string;
  provider: string;
  cached: boolean;
  cacheKey?: string;
  latencyMs: number;
  quotaState?: 'NORMAL' | 'EXHAUSTED';
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProvider {
  name: string;
  generateText(options: AIProviderOptions): Promise<AIProviderResponse>;
}

/**
 * GeminiProvider — Gemini API istemcisini AIProvider arayüzüne bağlar
 */
export class GeminiProvider implements AIProvider {
  public readonly name = 'gemini';

  public async generateText(options: AIProviderOptions): Promise<AIProviderResponse> {
    const startTime = Date.now();
    const config: AIClientConfig = {
      apiKey: options.apiKey || options.env?.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined),
      model: options.model || options.env?.AI_MODEL || 'gemini-1.5-flash',
      timeoutMs: options.env?.AI_TIMEOUT_MS ? parseInt(String(options.env.AI_TIMEOUT_MS), 10) : 10000,
      maxRetries: 3,
      fetchFn: options.fetchFn
    };

    const client = createAIClient(config);
    let result: AIGenerateResult;
    try {
      result = await client.generateText({
        systemPrompt: options.systemPrompt,
        prompt: options.prompt,
        signal: options.signal,
        temperature: options.temperature,
        maxTokens: options.maxTokens
      });
    } catch (err: any) {
      if (err instanceof AIProviderError) {
        if (err.code === 'RATE_LIMITED' || err.code === 'QUOTA_EXHAUSTED' || err.status === 429) {
          throw new AIProviderError(
            '503 Service Unavailable (AI Quota Reached — Paid provider fallback disabled by Zero-Cost Guard)',
            'QUOTA_EXHAUSTED',
            503,
            false
          );
        }
      }
      throw err;
    }

    const latencyMs = Date.now() - startTime;
    return {
      text: result.text,
      model: result.model,
      provider: this.name,
      cached: false,
      latencyMs,
      quotaState: 'NORMAL',
      usage: result.usage
    };
  }
}

/**
 * FallbackProvider — $0/Month Rule Zero-Cost Guard Enforcer
 * Kotanın dolması durumunda KESİNLİKLE ücretli sağlayıcıya geçmez.
 * Sistemi güvenli durdurur / 503 AI_QUOTA_REACHED hatası döndürür.
 */
export class FallbackProvider implements AIProvider {
  public readonly name = 'fallback';

  public async generateText(_options: AIProviderOptions): Promise<AIProviderResponse> {
    throw new AIProviderError(
      '503 Service Unavailable (AI Quota Reached — Zero-Cost Guard active, no paid fallback permitted)',
      'QUOTA_EXHAUSTED',
      503,
      false
    );
  }
}

// Global Memory Cache Fallback (Cloudflare KV olmadığında test ve lokal çalışma için)
const localMemoryCacheStore = new Map<string, { data: AIProviderResponse; expiresAt: number }>();

export function resetMemoryAICache(): void {
  localMemoryCacheStore.clear();
}

/**
 * Deterministic SHA-256 Hash Üretici (Cloudflare Web Crypto & Node Crypto Uyumlu)
 */
export async function sha256Text(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback Node.js Crypto (Vitest/Node)
  try {
    const nodeCrypto = require('crypto');
    return nodeCrypto.createHash('sha256').update(text).digest('hex');
  } catch (_) {
    // Simple FNV-1a hex fallback if crypto is completely unavailable
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

/**
 * Config Hash Üretici — AI davranışını etkileyen tüm konfigürasyon parametrelerini kapsar
 */
export async function generateConfigHash(config: Record<string, any> = {}): Promise<string> {
  const sortedKeys = Object.keys(config).sort();
  const canonicalString = sortedKeys.map(k => `${k}:${JSON.stringify(config[k])}`).join('|');
  return sha256Text(canonicalString);
}

/**
 * Cache Key Üretici: SHA-256(input_content + ":" + model + ":" + prompt_version + ":" + config_hash)
 */
export async function generateCacheKey(params: {
  inputContent: string;
  model: string;
  promptVersion: string;
  configHash: string;
}): Promise<string> {
  const rawKey = `${params.inputContent}:${params.model}:${params.promptVersion}:${params.configHash}`;
  const hash = await sha256Text(rawKey);
  return `aicache:${hash}`;
}

/**
 * AI Provider + Cloudflare KV AI_CACHE Katmanı (Safety First Execution Pipeline)
 */
export async function getOrGenerateAICache(params: {
  inputContent: string;
  model?: string;
  promptVersion?: string;
  promptId?: string;
  config?: Record<string, any>;
  provider?: AIProvider;
  kvCache?: any; // Cloudflare KV AI_CACHE binding
  options: AIProviderOptions;
}): Promise<AIProviderResponse> {
  const startTime = Date.now();
  const { inputContent, options, kvCache } = params;
  const model = options.model || params.model || options.env?.AI_MODEL || 'gemini-1.5-flash';
  const promptVersion = options.promptVersion || params.promptVersion || '1.0.0';

  // 1. AI-003 Güvenlik Kontrolü (UNTRAINED/UNTRUSTED INPUT — CACHE veya PROVIDER ÖNCESİ ZORUNLU)
  const rawInputCheck = `${options.prompt} ${inputContent || ''}`;
  assertPromptSafety(rawInputCheck);

  // 2. PII Sanitization
  const sanitizedInput = sanitizePII(inputContent || '');

  // 3. Config Hash & Deterministik SHA-256 Cache Key
  const effectiveConfig = {
    language: options.language || 'TR',
    targetLanguage: options.targetLanguage,
    temperature: options.temperature ?? 0.1,
    glossaryVersion: options.glossaryVersion || '1.0.0',
    glossaryTerms: options.glossaryTerms,
    schemaVersion: options.schemaVersion || '1.0.0',
    ...(params.config || {})
  };

  const configHash = options.configHash || (await generateConfigHash(effectiveConfig));
  const cacheKey = await generateCacheKey({
    inputContent: sanitizedInput,
    model,
    promptVersion,
    configHash
  });

  // 4. Cache HIT Kontrolü (Cloudflare KV veya Memory Fallback)
  let cachedRecord: AIProviderResponse | null = null;
  if (kvCache && typeof kvCache.get === 'function') {
    try {
      const stored = await kvCache.get(cacheKey, 'json');
      if (stored) cachedRecord = stored;
    } catch (_) {}
  } else {
    const memEntry = localMemoryCacheStore.get(cacheKey);
    if (memEntry && memEntry.expiresAt > Date.now()) {
      cachedRecord = memEntry.data;
    }
  }

  if (cachedRecord) {
    const hitLatency = Date.now() - startTime;
    return {
      ...cachedRecord,
      cached: true,
      cacheKey,
      latencyMs: hitLatency
    };
  }

  // 5. Cache MISS → AI Provider Çağrısı
  const activeProvider = params.provider || new GeminiProvider();
  let providerResponse: AIProviderResponse;

  try {
    providerResponse = await activeProvider.generateText({
      ...options,
      inputContent: sanitizedInput,
      model,
      promptVersion,
      configHash
    });
  } catch (err: any) {
    // Başarısız provider / quota / timeout hataları KESİNLİKLE CACHE'E YAZILMAZ
    if (err instanceof AIProviderError && (err.code === 'QUOTA_EXHAUSTED' || err.status === 429)) {
      const fallback = new FallbackProvider();
      await fallback.generateText(options); // Throws 503 Service Unavailable (AI Quota Reached)
    }
    throw err;
  }

  // 6. Başarılı Sonucu AI_CACHE KV'ye Yaz (TTL: 86400s / 24 Saat)
  const resultToStore: AIProviderResponse = {
    ...providerResponse,
    cached: true,
    cacheKey,
    latencyMs: providerResponse.latencyMs
  };

  if (kvCache && typeof kvCache.put === 'function') {
    try {
      await kvCache.put(cacheKey, JSON.stringify(resultToStore), { expirationTtl: 86400 });
    } catch (_) {}
  } else {
    localMemoryCacheStore.set(cacheKey, {
      data: resultToStore,
      expiresAt: Date.now() + 86400 * 1000
    });
  }

  return {
    ...providerResponse,
    cached: false,
    cacheKey,
    latencyMs: Date.now() - startTime
  };
}
