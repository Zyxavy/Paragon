import { getSystems } from '$lib/api/systems';
import { getDashboard } from '$lib/api/dashboard';
import { cachedFetch } from '$lib/api/cache';

export async function load({ url }) {
    const raw = url.searchParams.get('status');
    const status = raw && ['active', 'paused', 'archived', 'all'].includes(raw) ? raw : 'active';
    const qs = new URLSearchParams({ status });
    const [systemsData, dashboardData] = await Promise.all([
        cachedFetch(() => getSystems({ status }), `/api/systems?${qs.toString()}`),
        cachedFetch(() => getDashboard(), '/api/dashboard').catch(() => null),
    ]);

    const todayMap: Record<string, { state: string }> = {};
    if (dashboardData) {
        for (const inst of dashboardData.instances) {
            todayMap[inst.system_id] = { state: inst.state };
        }
    }

    return {
        systems: systemsData.systems,
        next_cursor: systemsData.next_cursor,
        todayMap,
        currentStatus: status,
    };
}
