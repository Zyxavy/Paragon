import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders headings, bold, lists, and GFM tables', () => {
    const html = renderMarkdown('# Title\n\n**bold**\n\n- a\n- b\n\n| A | B |\n|---|---|\n| 1 | 2 |');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<li>a</li>');
    expect(html).toContain('<table>');
  });

  it('strips script tags', () => {
    expect(renderMarkdown('<script>alert(1)</script>x')).not.toContain('script');
  });

  it('strips event handler attributes', () => {
    expect(renderMarkdown('<p onclick="x()">hi</p>')).not.toContain('onclick');
  });

  it('strips javascript: URLs from links', () => {
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('javascript:');
  });

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
