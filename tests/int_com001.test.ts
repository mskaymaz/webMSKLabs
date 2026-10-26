import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('INT-COM-001 — Kamusal Blog Yorum Arayüzü & Entegrasyon Testleri', () => {
  const blogHtmlPath = path.join(__dirname, '../blog/blog.html');
  const blogJsPath = path.join(__dirname, '../blog/blog.js');
  const commentsJsPath = path.join(__dirname, '../blog/comments.js');

  it('1. should verify blog.html has all required comments container and form elements', () => {
    const html = fs.readFileSync(blogHtmlPath, 'utf-8');

    expect(html).toContain('id="commentsSection"');
    expect(html).toContain('id="commentForm"');
    expect(html).toContain('id="commentAuthor"');
    expect(html).toContain('id="commentEmail"');
    expect(html).toContain('id="commentText"');
    expect(html).toContain('id="commentHoneypot"');
    expect(html).toContain('id="btnSubmitComment"');
    expect(html).toContain('id="commentsList"');
    expect(html).toContain('id="commentsCountBadge"');
    expect(html).toMatch(/src=["'].*comments\.js["']/);
  });

  it('2. should verify honeypot anti-bot trap is hidden and aria-hidden in blog.html', () => {
    const html = fs.readFileSync(blogHtmlPath, 'utf-8');
    expect(html).toMatch(/display:\s*none\s*!important/i);
    expect(html).toContain('name="website"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('3. should verify comments.js defines required public functions and TR/EN/AR dictionaries', () => {
    const code = fs.readFileSync(commentsJsPath, 'utf-8');

    expect(code).toContain('window.loadPostComments');
    expect(code).toContain('window.handleCommentSubmit');
    expect(code).toContain('window.resetCommentsUI');
    expect(code).toContain('window.updateCommentsI18n');

    // Localization keys
    expect(code).toContain('Yorumlar & Değerlendirmeler');
    expect(code).toContain('Comments & Discussions');
    expect(code).toContain('التعليقات والآراء');
  });

  it('4. should verify blog.js invokes loadPostComments in openPost and resetCommentsUI in showList', () => {
    const js = fs.readFileSync(blogJsPath, 'utf-8');
    expect(js).toContain('window.loadPostComments(currentPost)');
    expect(js).toContain('window.resetCommentsUI()');
  });

  it('5. should verify comments.js complies with line limit rule (<= 450 lines)', () => {
    const code = fs.readFileSync(commentsJsPath, 'utf-8');
    const lines = code.split('\n').length;
    expect(lines).toBeLessThanOrEqual(450);
  });
});
