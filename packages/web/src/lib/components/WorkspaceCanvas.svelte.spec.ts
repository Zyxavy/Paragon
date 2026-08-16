import { page } from 'vitest/browser';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import WorkspaceCanvas from './WorkspaceCanvas.svelte';
import type { Widget } from '$lib/api/workspaces';

const timerWidget: Widget = {
    id: 'w1',
    type: 'timer',
    x: 16,
    y: 16,
    w: 240,
    h: 180,
    config: {},
    label: 'Timer',
};

describe('WorkspaceCanvas', () => {
    it('calls onRemove when the widget remove button is clicked', async () => {
        await page.viewport(1280, 800);

        const onRemove = vi.fn();
        render(WorkspaceCanvas, {
            props: {
                widgets: [timerWidget],
                instanceId: null,
                workspaceId: null,
                systemId: 'sys1',
                onMove: vi.fn(),
                onResize: vi.fn(),
                onRemove,
            },
        });

        await page.getByRole('button', { name: 'Remove Timer' }).click();

        expect(onRemove).toHaveBeenCalledWith('w1');
    });
});
