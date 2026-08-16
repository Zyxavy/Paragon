import { getSystem } from '$lib/api/systems';
import { error } from '@sveltejs/kit';
import { cachedFetch } from '$lib/api/cache';

export async function load({ params }) {
    const system = await cachedFetch(() => getSystem(params.id), `/api/systems/${params.id}`).catch(() => null);
    if (!system) {
        throw error(404, 'System not found');
    }
    return { system };
}
