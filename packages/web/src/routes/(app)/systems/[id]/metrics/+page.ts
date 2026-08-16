import { getMetrics } from '$lib/api/systems';

export async function load({ params }) {
    const metrics = await getMetrics(params.id).catch(() => null);
    return { metrics };
}