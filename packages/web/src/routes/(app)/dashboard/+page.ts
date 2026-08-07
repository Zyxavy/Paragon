import { getDashboard } from '$lib/api/dashboard';
import { cachedFetch } from '$lib/api/cache';

export async function load() {
    try {
        const data = await cachedFetch(() => getDashboard(), '/api/dashboard');
        return { instances: data.instances };
    } catch {
        return { instances: [], error: true };
    }
}
