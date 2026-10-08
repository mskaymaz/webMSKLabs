/**
 * MSKLabs & DevAdmin — AI Provider Abstraction & Gemini API Client
 * File: backend/src/utils/ai.ts
 * Description: Gemini API istemcisi, timeout (AbortController), retry (jitter backoff),
 *              PII sanitization, error normalization ve $0 Quota Guard altyapısı.
 */

export type AIErrorCode =
  | 'RATE_LIMITED'
  | 'INVALID_API_KEY'
  | 'FETCH_TIMEOUT'
  | 'SAFETY_BLOCKED'
  | 'QUOTA_EXHAUSTED'
  | 'BAD_REQUEST'
  | 'PROVIDER_ERROR';

export class AIProviderError extends Error {
  public readonly code: AIErrorCode;
  public readonly status: number;
  public readonly isRetryable: boolean;

  constructor(message: string, code: AIErrorCode, status: number = 500, isRetryable: boolean = false) {
    const safeMessage = sanitizePII(message);
    super(safeMessage);
    this.name = 'AIProviderError';
    this.code = code;
    this.status = status;
    this.isRetryable = isRetryable;
  }
}

// PII Sanitization — Hassas verileri AI provider'a gitmeden önce maskeler
export function sanitizePII(text: string): string {
  if (!text) return '';
  let sanitized = text;

  // 1. API Keys & Token / Secret maskeleme (Telefon regex'inin secret'ları bozmasını önlemek için ilk sırada)
  sanitized = sanitized.replace(/(AIzaSy[A-Za-z0-9_-]{20,})/g, '[SECRET_REDACTED]');
  sanitized = sanitized.replace(/(sk-[A-Za-z0-9_-]{20,})/g, '[SECRET_REDACTED]');
  sanitized = sanitized.replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[SECRET_REDACTED]');
  sanitized = sanitized.replace(/(api[_-]?key|secret|access[_-]?token)\s*[:=]\s*["']?[^\s"',;]+["']?/gi, '$1=[SECRET_REDACTED]');

  // 2. E-posta adresi maskeleme
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');

  // 3. Parola / Şifre alanları
  sanitized = sanitized.replace(/(password|pass|sifre|parola)\s*[:=]\s*["']?[^\s"',;]+["']?/gi, '$1=[PASSWORD_REDACTED]');

  // 4. Telefon numarası maskeleme (Uluslararası, TR ve 7-11 haneli formatlar)
  sanitized = sanitized.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE_REDACTED]');
  sanitized = sanitized.replace(/\b\d{3}[-.\s]\d{4}\b/g, '[PHONE_REDACTED]');

  return sanitized;
}

// Uygulama seviyesinde Rate Limiter & Quota Guard (Maksimum 2 AI çağrısı / saniye)
export class AIRateLimiter {
  private timestamps: number[] = [];
  private readonly maxPerSecond: number;

  constructor(maxPerSecond: number = 2) {
    this.maxPerSecond = maxPerSecond;
  }

  public tryAcquire(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(ts => now - ts < 1000);
    if (this.timestamps.length >= this.maxPerSecond) {
      return false;
    }
    this.timestamps.push(now);
    return true;
  }

  public reset(): void {
    this.timestamps = [];
  }
}

export const globalAIRateLimiter = new AIRateLimiter(2);

export interface AIClientConfig {
  apiKey?: string;
  provider?: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchFn?: typeof fetch;
}

export interface AIGenerateOptions {
  systemPrompt?: string;
  prompt: string;
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
}

export interface AIGenerateResult {
  text: string;
  model: string;
  provider: string;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIClient {
  generateText(options: AIGenerateOptions): Promise<AIGenerateResult>;
}

// Gemini Provider Implementasyonu
class GeminiAIClient implements AIClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchFn: typeof fetch;

  constructor(config: AIClientConfig) {
    const env = typeof process !== 'undefined' ? process.env : {};
    this.apiKey = config.apiKey || env.GEMINI_API_KEY || '';
    this.model = config.model || env.AI_MODEL || 'gemini-1.5-flash';
    this.timeoutMs = config.timeoutMs ?? (env.AI_TIMEOUT_MS ? parseInt(env.AI_TIMEOUT_MS, 10) : 10000);
    this.maxRetries = config.maxRetries ?? (env.AI_MAX_RETRIES ? parseInt(env.AI_MAX_RETRIES, 10) : 3);
    this.fetchFn = config.fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : globalThis.fetch);
  }

  public async generateText(options: AIGenerateOptions): Promise<AIGenerateResult> {
    if (!this.apiKey) {
      throw new AIProviderError('Gemini API key is missing or not configured', 'INVALID_API_KEY', 401, false);
    }

    if (!globalAIRateLimiter.tryAcquire()) {
      throw new AIProviderError('503 Service Unavailable (AI Quota Reached)', 'QUOTA_EXHAUSTED', 503, false);
    }

    const sanitizedPrompt = sanitizePII(options.prompt);
    const sanitizedSystem = options.systemPrompt ? sanitizePII(options.systemPrompt) : undefined;

    const requestBody: Record<string, any> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: sanitizedPrompt }]
        }
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens
      }
    };

    if (sanitizedSystem) {
      requestBody.systemInstruction = {
        parts: [{ text: sanitizedSystem }]
      };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    let attempt = 0;
    let lastError: AIProviderError | null = null;

    while (attempt <= this.maxRetries) {
      try {
        return await this.executeFetch(endpoint, requestBody, options.signal);
      } catch (err: any) {
        const providerErr = err instanceof AIProviderError
          ? err
          : new AIProviderError(err.message || 'Unknown AI Provider Error', 'PROVIDER_ERROR', 500, false);

        lastError = providerErr;

        if (!providerErr.isRetryable || attempt >= this.maxRetries) {
          throw providerErr;
        }

        attempt++;
        const backoffMs = Math.min(100 * Math.pow(2, attempt) + Math.random() * 50, 2000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError || new AIProviderError('AI Generation failed after max retries', 'PROVIDER_ERROR', 500, false);
  }

  private async executeFetch(
    endpoint: string,
    body: Record<string, any>,
    parentSignal?: AbortSignal
  ): Promise<AIGenerateResult> {
    const controller = new AbortController();
    let isTimedOut = false;

    const timeoutTimer = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, this.timeoutMs);

    const onParentAbort = () => {
      controller.abort();
    };

    if (parentSignal) {
      if (parentSignal.aborted) {
        controller.abort();
      } else {
        parentSignal.addEventListener('abort', onParentAbort);
      }
    }

    try {
      const response = await this.fetchFn(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const status = response.status;
        let errData: any = {};
        try {
          errData = await response.json();
        } catch (_) {}

        if (status === 401 || status === 403) {
          throw new AIProviderError('Invalid API key or unauthorized access', 'INVALID_API_KEY', 401, false);
        }
        if (status === 429) {
          throw new AIProviderError('AI Provider Rate Limit Exceeded', 'RATE_LIMITED', 429, true);
        }
        if (status >= 500) {
          throw new AIProviderError(`AI Provider Server Error (${status})`, 'PROVIDER_ERROR', status, true);
        }
        throw new AIProviderError(errData?.error?.message || `AI Request Failed (${status})`, 'BAD_REQUEST', status, false);
      }

      const data: any = await response.json();

      const candidate = data?.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY' || data?.promptFeedback?.blockReason) {
        throw new AIProviderError('Content generation blocked due to safety settings', 'SAFETY_BLOCKED', 400, false);
      }

      const textOutput = candidate?.content?.parts?.[0]?.text;
      if (textOutput === undefined || textOutput === null) {
        throw new AIProviderError('Empty text output returned from AI Provider', 'PROVIDER_ERROR', 500, false);
      }

      return {
        text: textOutput,
        model: this.model,
        provider: 'gemini',
        finishReason: candidate?.finishReason || 'STOP',
        usage: {
          promptTokens: data?.usageMetadata?.promptTokenCount,
          completionTokens: data?.usageMetadata?.candidatesTokenCount,
          totalTokens: data?.usageMetadata?.totalTokenCount
        }
      };
    } catch (err: any) {
      if (isTimedOut || err.name === 'AbortError' || parentSignal?.aborted) {
        throw new AIProviderError('AI Request timed out (FETCH_TIMEOUT)', 'FETCH_TIMEOUT', 504, false);
      }
      throw err;
    } finally {
      clearTimeout(timeoutTimer);
      if (parentSignal) {
        parentSignal.removeEventListener('abort', onParentAbort);
      }
    }
  }
}

export function createAIClient(config: AIClientConfig = {}): AIClient {
  const env = typeof process !== 'undefined' ? process.env : {};
  const provider = (config.provider || env.AI_PROVIDER || 'gemini').toLowerCase();

  switch (provider) {
    case 'gemini':
      return new GeminiAIClient(config);
    default:
      return new GeminiAIClient(config);
  }
}
