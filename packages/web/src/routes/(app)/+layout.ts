import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { authClient } from '$lib/auth-client';
import { getCachedSession } from '$lib/auth/session.svelte';

type Session = NonNullable<Awaited<ReturnType<typeof authClient.getSession>>['data']>;

export const load: LayoutLoad = async () => {
  const { data: session } = await getCachedSession();
  if (!session) {
    throw redirect(302, '/sign-in');
  }
  return { session: session as Session };
};
