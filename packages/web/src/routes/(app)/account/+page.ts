import { getRecoveryCodes } from '$lib/api/recovery-codes';
import type { RecoveryCode } from '$lib/api/recovery-codes';
import { ApiError } from '$lib/api/client';

export async function load() {
  try {
    const data = await getRecoveryCodes();
    return { codes: data.codes, error: null };
  } catch (e) {
    return {
      codes: [] as RecoveryCode[],
      error: e instanceof ApiError ? e.message : 'Failed to load recovery codes.',
    };
  }
}