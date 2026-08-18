import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { authClient } from '$lib/auth-client';

// Deliberately fetches the session directly instead of getCachedSession():
// the 60s TTL cache would otherwise be poisoned with a "not signed in"
// result while the user is filling in the sign-in form, causing a fresh
// post-auth navigation (goto('/dashboard') / goto('/guides')) to bounce
// straight back to this layout.
export const load: LayoutLoad = async () => {
  const { data: session } = await authClient.getSession();
  if (session) {
    throw redirect(302, '/guides');
  }
};