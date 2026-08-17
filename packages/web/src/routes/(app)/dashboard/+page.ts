import { getDashboard } from '$lib/api/dashboard';
import { getSystems } from '$lib/api/systems';
import { cachedFetch } from '$lib/api/cache';

export async function load() {
    try {
        const data = await cachedFetch(() => getDashboard(), '/api/dashboard');
        let hasSystems = false;
        try {
            const systems = await cachedFetch(() => getSystems({ limit: 1 }), '/api/systems?limit=1');
            hasSystems = systems.systems.length > 0;
        } catch {
            hasSystems = false;
        }
        return { instances: data.instances, hasSystems };
    } catch {
        return { instances: [], error: true, hasSystems: false };
    }
}
