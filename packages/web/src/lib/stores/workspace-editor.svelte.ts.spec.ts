import { describe, it, expect, vi } from 'vitest';
import { WorkspaceEditorStore } from './workspace-editor.svelte';

vi.mock('$lib/api/workspaces', () => ({
    putWorkspace: vi.fn(),
}));

describe('WorkspaceEditorStore', () => {
    it('places consecutive widgets visibly apart so new widgets are not hidden under existing ones', () => {
        const store = new WorkspaceEditorStore();
        store.addWidget('timer');
        store.addWidget('timer');

        const [first, second] = store.layout.widgets;
        const dx = Math.abs(second.x - first.x);
        const dy = Math.abs(second.y - first.y);

        expect(Math.max(dx, dy)).toBeGreaterThanOrEqual(48);
    });
});
