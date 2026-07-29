import { putWorkspace } from '$lib/api/workspaces';
import type { Layout, Widget } from '$lib/api/workspaces';

const CURRENT_LAYOUT_VERSION = 1;

function defaultWidgetSize(type: string): { w: number; h: number } {
    switch (type) {
        case 'checklist': return { w: 360, h: 180 };
        case 'notes': return { w: 360, h: 240 };
        case 'log': return { w: 360, h: 240 };
        case 'link-list': return { w: 360, h: 240 };
        default: return { w: 240, h: 180 };
    }
}

function defaultLabel(type: string): string {
    const labels: Record<string, string> = {
        timer: 'Timer',
        counter: 'Counter',
        checklist: 'Checklist',
        log: 'Log',
        'link-list': 'Link List',
        streak: 'Streak',
        progress: 'Progress Chart',
        notes: 'Notes',
    };
    return labels[type] ?? type;
}

function deduplicateWidgets(widgets: Widget[]): Widget[] {
    const seen = new Set<string>();
    return widgets.filter(w => {
        if (seen.has(w.id)) return false;
        seen.add(w.id);
        return true;
    });
}

export class WorkspaceEditorStore {
    layout = $state<Layout>({ v: CURRENT_LAYOUT_VERSION, widgets: []});
    dirty = $state(false);
    systemId = $state('');

    load(systemId: string, layout: Layout | null) {
        this.systemId = systemId;
        const widgets = layout?.widgets ? deduplicateWidgets(layout.widgets) : [];
        this.layout = layout ? { ...layout, widgets } : { v: CURRENT_LAYOUT_VERSION, widgets: [] };
        this.dirty = false;
    }

    addWidget(type: string) {
        const id = crypto.randomUUID();
        const config: Record<string, any> = {};
        const defaults = defaultWidgetSize(type);
        const idx = this.layout.widgets.length;
        const widget: Widget = {
            id,
            type,
            x: 16 + idx * 24,
            y: 16 + idx * 24,
            w: defaults.w,
            h: defaults.h,
            config,
            label: defaultLabel(type),
        };
        this.layout = {
            ...this.layout,
            widgets: [...this.layout.widgets, widget],
        };
        this.dirty = true;
    }

    moveWidget(id: string, x: number, y: number) {
        this.layout = {
            ...this.layout,
            widgets: this.layout.widgets.map(w =>
                w.id === id ? { ...w, x, y } : w
            ),
        };
        this.dirty = true;
    }

    resizeWidget(id: string, w: number, h: number) {
        this.layout = {
            ...this.layout,
            widgets: this.layout.widgets.map(widget =>
                widget.id === id ? { ...widget, w, h } : widget
            ),
        };
        this.dirty = true;
    }

    removeWidget(id: string) {
        this.layout = {
            ...this.layout,
            widgets: this.layout.widgets.filter(w => w.id !== id),
        };
        this.dirty = true;
    }

    reorder(widgets: Widget[]) {
        this.layout = {
            ...this.layout,
            widgets: deduplicateWidgets(widgets),
        };
        this.dirty = true;
    }

    async save() {
        const saved = await putWorkspace(this.systemId, this.layout);
        this.layout = saved.layout;
        this.dirty = false;
    }
}
