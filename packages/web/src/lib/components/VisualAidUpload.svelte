<script lang="ts">
  import { uploadVisualAid, deleteVisualAid, visualAidSrc } from '$lib/api/visual-aid';
  import { ApiError } from '$lib/api/client';

  let { systemId, value, onchange }: {
    systemId: string;
    value: string | null;
    onchange: (key: string | null) => void;
  } = $props();

  let uploading = $state(false);
  let error = $state<string | null>(null);

  async function handleUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    uploading = true;
    error = null;
    try {
      const res = await uploadVisualAid(systemId, file);
      onchange(res.r2_key);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Upload failed.';
    } finally {
      uploading = false;
      input.value = '';
    }
  }

  async function handleRemove() {
    error = null;
    try {
      await deleteVisualAid(systemId);
      onchange(null);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Remove failed.';
    }
  }
</script>

<div>
  {#if value}
    <div class="mt-2 rounded-xl border border-outline-variant/25 overflow-hidden inline-block">
      <img src={visualAidSrc(systemId, value)} crossorigin="use-credentials" alt="Visual aid"
           class="max-h-64 w-auto object-contain bg-surface" />
    </div>
    <div class="mt-2 flex items-center gap-2">
      <label class="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-body font-medium text-on-surface hover:bg-surface/60 cursor-pointer transition-colors duration-150">
        Replace image
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" class="hidden" onchange={handleUpload} disabled={uploading} />
      </label>
      <button type="button" onclick={handleRemove}
              class="rounded-lg bg-destructive/10 text-destructive px-3 py-1.5 text-xs font-body font-medium hover:bg-destructive/20 cursor-pointer transition-colors duration-150">
        Remove
      </button>
    </div>
  {:else}
    <label class="mt-1 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-body font-medium text-on-surface hover:bg-surface/60 cursor-pointer transition-colors duration-150 disabled:opacity-50">
      {uploading ? 'Uploading...' : 'Upload image (max 10 MB)'}
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" class="hidden" onchange={handleUpload} disabled={uploading} />
    </label>
  {/if}
  {#if error}
    <p class="mt-2 text-xs text-destructive font-body">{error}</p>
  {/if}
</div>
