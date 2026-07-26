import { page } from 'vitest/browser';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TemplatePicker from './TemplatePicker.svelte';

vi.mock('$lib/api/templates', () => {
    const tpl = {
        id: 'tpl_reading_system',
        name: 'Reading System',
        source: 'built_in' as const,
        default_purpose: 'Build a consistent daily reading habit',
        default_philosophy: 'Reading matters to me',
        default_protocol: 'Read for N minutes',
        default_floor_action: 'Open the book and read one paragraph',
        default_trigger_pattern: 'After I brush my teeth at night',
        default_barrier_list: ['Phone on nightstand'],
        default_environment_cue: 'Book on the pillow',
        suggested_widgets: ['counter', 'log'],
        created_at: '2026-07-01T00:00:00.000Z',
        updated_at: '2026-07-01T00:00:00.000Z',
    };
    return {
        getTemplates: vi.fn().mockResolvedValue({ templates: [tpl], next_cursor: null }),
        getTemplate: vi.fn(),
        saveAsTemplate: vi.fn(),
    };
});

describe('TemplatePicker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('selecting a template calls callback with template data', async () => {
        const onSelect = vi.fn();
        render(TemplatePicker, { props: { ontemplateSelect: onSelect } });

        // Open the details picker
        await page.getByText('Use a template').click();
        await vi.waitFor(() => expect(page.getByText('Reading System')).toBeVisible());

        await page.getByText('Reading System').click();
        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'tpl_reading_system', name: 'Reading System' })
        );
    });

    it('does not call any save/create endpoint', async () => {
        const { saveAsTemplate } = await import('$lib/api/templates');
        render(TemplatePicker, { props: { ontemplateSelect: vi.fn() } });

        // Open the details picker
        await page.getByText('Use a template').click();
        await vi.waitFor(() => expect(page.getByText('Reading System')).toBeVisible());

        await page.getByText('Reading System').click();
        expect(saveAsTemplate).not.toHaveBeenCalled();
    });
});
