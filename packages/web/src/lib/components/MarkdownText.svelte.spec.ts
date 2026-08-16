import { page } from 'vitest/browser';
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownText from './MarkdownText.svelte';

describe('MarkdownText', () => {
  it('renders formatted markdown', async () => {
    render(MarkdownText, { props: { content: '# Heading\n\nSome **bold** text.\n\n- one\n- two' } });
    await expect.element(page.getByRole('heading', { name: 'Heading' })).toBeVisible();
    await expect.element(page.getByText('bold')).toBeVisible();
    await expect.element(page.getByRole('list')).toBeVisible();
  });

  it('does not execute script tags', async () => {
    const { container } = await render(MarkdownText, { props: { content: '<script>window.pwned = 1</script>hello' } });
    expect(container.innerHTML).not.toContain('<script>');
  });

  it('renders nothing for empty content', async () => {
    const { container } = await render(MarkdownText, { props: { content: '' } });
    expect(container.textContent).toBe('');
  });
});
