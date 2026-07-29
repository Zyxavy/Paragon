<script lang="ts">
  import { uploadAttachment, getAttachments, getAttachmentUrl, type AttachmentMetadata } from '$lib/api/attachments';
  import { Upload } from '@lucide/svelte';

  let { workspaceId, widgetId }: { workspaceId: string; widgetId: string } = $props();

  let attachments = $state<AttachmentMetadata[]>([]);
  let uploading = $state(false);
  let error = $state<string | null>(null);

  async function loadAttachments() {
    try {
      const res = await getAttachments(workspaceId, widgetId);
      attachments = res.attachments;
    } catch {
      // silently fail
      attachments = [];
    }
  }

  async function handleUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploading = true;
    error = null;

    try {
      await uploadAttachment(file, workspaceId, widgetId);
      input.value = '';
      await loadAttachments();
    } catch (e: any) {
      error = e.message || 'Upload failed.';
    } finally {
      uploading = false;
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  $effect(() => {
    loadAttachments();
  });
</script>

<div class="attachment-upload">
  <div class="upload-row">
    <label class="file-label">
      <Upload size="16" />
      <span>{uploading ? 'Uploading...' : 'Attach file'}</span>
      <input
        type="file"
        class="file-input"
        onchange={handleUpload}
        disabled={uploading}
      />
    </label>
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if attachments.length > 0}
    <ul class="attachment-list">
      {#each attachments as attachment}
        <li>
          <a href={getAttachmentUrl(attachment.id)} target="_blank" rel="noopener noreferrer">
            {attachment.filename}
          </a>
          <span class="size">({formatSize(attachment.size_bytes)})</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .attachment-upload {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border, #e5e7eb);
  }

  .upload-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .file-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px dashed var(--color-border, #d1d5db);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--color-muted, #6b7280);
  }

  .file-label:hover {
    border-color: var(--color-primary, #3b82f6);
    color: var(--color-primary, #3b82f6);
  }

  .file-input {
    display: none;
  }

  .error {
    color: #ef4444;
    font-size: 0.8rem;
    margin-top: 4px;
  }

  .attachment-list {
    list-style: none;
    padding: 0;
    margin: 8px 0 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .attachment-list li {
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .attachment-list a {
    color: var(--color-primary, #3b82f6);
    text-decoration: none;
  }

  .attachment-list a:hover {
    text-decoration: underline;
  }

  .size {
    color: var(--color-muted, #9ca3af);
    font-size: 0.8rem;
  }
</style>