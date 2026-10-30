import { describe, it, expect } from 'vitest';
import { sanitizeHTML, isSafeUrl, escapeText } from '../src/utils/sanitize.js';

describe('SEC-REQ-002 — HTML Sanitization & Injection Protection Tests', () => {
  describe('1. Basic XSS & Dangerous Tag Stripping', () => {
    it('should completely strip script tags and their code content', () => {
      const input = '<script>alert(1);</script><p>Merhaba Dünya</p>';
      const clean = sanitizeHTML(input);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('alert(1)');
      expect(clean).toBe('<p>Merhaba Dünya</p>');
    });

    it('should strip style tags and embedded CSS content', () => {
      const input = '<style>body { display: none; }</style><p>Metin</p>';
      const clean = sanitizeHTML(input);
      expect(clean).not.toContain('<style>');
      expect(clean).not.toContain('display: none');
      expect(clean).toBe('<p>Metin</p>');
    });

    it('should strip iframe elements', () => {
      const input = '<iframe src="https://evil-attacker.example"></iframe><p>Korumalı İçerik</p>';
      const clean = sanitizeHTML(input);
      expect(clean).not.toContain('<iframe');
      expect(clean).toBe('<p>Korumalı İçerik</p>');
    });

    it('should strip SVG tags and SVG-based XSS payloads', () => {
      const input = '<svg onload="alert(1)"><circle r=10/></svg><div>Güvenli Div</div>';
      const clean = sanitizeHTML(input);
      expect(clean).not.toContain('<svg');
      expect(clean).not.toContain('onload');
      expect(clean).toBe('<div>Güvenli Div</div>');
    });

    it('should strip object, embed, and applet tags', () => {
      const input = '<object data="evil.swf"></object><embed src="evil.swf" /><p>Safe</p>';
      const clean = sanitizeHTML(input);
      expect(clean).not.toContain('<object');
      expect(clean).not.toContain('<embed');
      expect(clean).toBe('<p>Safe</p>');
    });
  });

  describe('2. Event Handler Attribute Sanitization', () => {
    it('should strip onerror event handler from img tags', () => {
      const input = '<img src="x" onerror="alert(1)" alt="Resim" />';
      const clean = sanitizeHTML(input);
      expect(clean).not.toContain('onerror');
      expect(clean).toContain('<img src="x" alt="Resim" />');
    });

    it('should strip event handlers regardless of case variations (e.g. OnErRoR, OnCliCk)', () => {
      const input = '<img src=x OnErRoR=alert(1) /><b ONCLICK="doEvil()">Kalın</b>';
      const clean = sanitizeHTML(input);
      expect(clean).not.toContain('OnErRoR');
      expect(clean).not.toContain('ONCLICK');
      expect(clean).toContain('<img src="x" />');
      expect(clean).toContain('<b>Kalın</b>');
    });

    it('should strip style attributes from allowed elements', () => {
      const input = '<p style="color: red; background-image: url(javascript:alert(1))">Stilli Metin</p>';
      const clean = sanitizeHTML(input);
      expect(clean).not.toContain('style=');
      expect(clean).toBe('<p>Stilli Metin</p>');
    });
  });

  describe('3. URL Protocol Validation & Dangerous Scheme Defeat', () => {
    it('should reject javascript: URLs in href attributes', () => {
      const input = '<a href="javascript:alert(1)">Tıkla</a>';
      const clean = sanitizeHTML(input);
      expect(clean).not.toContain('href=');
      expect(clean).toBe('<a>Tıkla</a>');
    });

    it('should defeat obfuscated javascript: URLs with uppercase, spaces, and tab characters', () => {
      const input1 = '<a href="  JaVaScRiPt : alert(1)">Link 1</a>';
      const input2 = '<a href="java\tscript:alert(1)">Link 2</a>';
      const input3 = '<a href="java\nscript:alert(1)">Link 3</a>';

      expect(sanitizeHTML(input1)).toBe('<a>Link 1</a>');
      expect(sanitizeHTML(input2)).toBe('<a>Link 2</a>');
      expect(sanitizeHTML(input3)).toBe('<a>Link 3</a>');
    });

    it('should defeat HTML entity encoded javascript: URLs', () => {
      const input1 = '<a href="java&#115;cript:alert(1)">Encoded 1</a>';
      const input2 = '<a href="javascript&colon;alert(1)">Encoded 2</a>';

      expect(sanitizeHTML(input1)).toBe('<a>Encoded 1</a>');
      expect(sanitizeHTML(input2)).toBe('<a>Encoded 2</a>');
    });

    it('should reject data: URLs containing HTML/script payloads', () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">Data Link</a>';
      expect(sanitizeHTML(input)).toBe('<a>Data Link</a>');
      expect(isSafeUrl('data:text/html,abc')).toBe(false);
    });

    it('should reject vbscript: and file: schemes', () => {
      expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
      expect(isSafeUrl('file:///C:/Windows/System32')).toBe(false);
    });

    it('should allow valid http, https, mailto, tel and relative URLs', () => {
      expect(isSafeUrl('https://mskaymaz.com')).toBe(true);
      expect(isSafeUrl('http://example.com/page?id=1')).toBe(true);
      expect(isSafeUrl('mailto:destek@mskaymaz.com')).toBe(true);
      expect(isSafeUrl('tel:+905551112233')).toBe(true);
      expect(isSafeUrl('/api/v1/support')).toBe(true);
      expect(isSafeUrl('#section1')).toBe(true);

      const html = '<a href="https://example.com" target="_blank">Site</a> <a href="mailto:a@b.com">Mail</a>';
      const clean = sanitizeHTML(html);
      expect(clean).toContain('href="https://example.com"');
      expect(clean).toContain('rel="noopener noreferrer"');
      expect(clean).toContain('href="mailto:a@b.com"');
    });
  });

  describe('4. Allowed HTML Preservation & Escaping', () => {
    it('should preserve allowed rich text formatting elements', () => {
      const input = '<p>Merhaba <strong>Dünya</strong>! <em>İtalik</em> ve <code>kod</code></p>';
      const clean = sanitizeHTML(input);
      expect(clean).toBe(input);
    });

    it('should escape raw text safely using escapeText helper', () => {
      expect(escapeText('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });
  });
});
