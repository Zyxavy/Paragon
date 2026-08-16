export interface ChangeApplied {
    floor_action?: string;
    purpose?: string;
    philosophy?: string;
    protocol?: string;
    trigger?: string;
    environment_cue?: string;
}

export class DuplicateReviewError extends Error {
    constructor() {
        super('A review for this period already exists.');
        this.name = 'DuplicateReviewError';
    }
}

function deriveChangeText(
    changeApplied: ChangeApplied | null | undefined,
    changeNote?: string | null
): string {
    if (changeNote) return changeNote;

    if (!changeApplied) return '';

    const parts: string[] = [];
    const fields: Record<string, string | undefined> = {
        floor_action: changeApplied.floor_action,
        purpose: changeApplied.purpose,
        philosophy: changeApplied.philosophy,
        protocol: changeApplied.protocol,
        trigger: changeApplied.trigger,
        environment_cue: changeApplied.environment_cue,
    };

    for (const [key, val] of Object.entries(fields)) {
        if (val !== undefined) {
            parts.push(`${key}: '${val}'`);
        }
    }

    return parts.length > 0 ? `Updated ${parts.join(', ')}` : '';
}

export async function createReview(
    db: D1Database,
    systemId: string,
    userId: string,
    data: {
        period_start: string;
        period_end: string;
        what_worked: string;
        what_broke: string;
        worst_day_check: boolean;
        change_applied?: ChangeApplied | null;
        change_applied_note?: string | null;
    }
): Promise<{ review: any; updated_system: any }> {
    // 1. Insert review with derived change_applied text.
    //    ON CONFLICT makes the period-uniqueness race-free: a concurrent
    //    duplicate insert fails atomically instead of the loser 500ing.
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const changeText = deriveChangeText(data.change_applied, data.change_applied_note);

    const statements: D1PreparedStatement[] = [
        db.prepare(`
            INSERT INTO reviews (id, system_id, period_start, period_end, what_worked, what_broke, worst_day_check, change_applied, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(system_id, period_start, period_end) DO NOTHING
        `).bind(
            id, systemId, data.period_start, data.period_end,
            data.what_worked, data.what_broke, data.worst_day_check ? 1 : 0,
            changeText, now, now
        ),
    ];

    // 2. Write-back to systems if change_applied has any fields
    if (data.change_applied) {
        const sets: string[] = [];
        const params: any[] = [];
        const writable: (keyof ChangeApplied)[] = [
            'floor_action', 'purpose', 'philosophy', 'protocol', 'trigger', 'environment_cue',
        ];

        for (const field of writable) {
            if (data.change_applied[field] !== undefined) {
                sets.push(`${field} = ?`);
                params.push(data.change_applied[field]);
            }
        }

        if (sets.length > 0) {
            sets.push('updated_at = ?');
            params.push(now);
            params.push(systemId, userId);

            statements.push(
                db.prepare(
                    `UPDATE systems SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`
                ).bind(...params)
            );
        }
    }

    // 3. Fetch and return both records (batched AFTER the writes above)
    statements.push(
        db.prepare('SELECT * FROM reviews WHERE id = ?').bind(id),
        db.prepare('SELECT * FROM systems WHERE id = ? AND user_id = ?').bind(systemId, userId)
    );

    const results = await db.batch(statements);

    if (results[0].meta.changes === 0) {
        throw new DuplicateReviewError();
    }

    const review = results[results.length - 2].results?.[0];
    const updatedSystem = results[results.length - 1].results?.[0];

    return { review, updated_system: updatedSystem };
}