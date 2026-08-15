const RECOVERY_CODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function generateRecoveryCode(): string {
  const raw = crypto.randomUUID().replace(/-/g, '').toUpperCase();
  return `PARAGON-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export async function hashRecoveryCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyRecoveryCode(
  code: string,
  storedHash: string | null | undefined,
  storedLegacyCode: string | null | undefined
): Promise<boolean> {
  // Legacy rows (pre-hash migration) stored the raw code; compare directly.
  if (storedLegacyCode) {
    if (storedLegacyCode === code) return true;
    return false;
  }
  if (!storedHash) return false;
  const hash = await hashRecoveryCode(code);
  return timingSafeEqualHex(hash, storedHash);
}

export function isRecoveryCodeExpired(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return true;
  return Date.now() - created > RECOVERY_CODE_TTL_MS;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
  status: number;
}

export async function handleRecovery(
  db: D1Database,
  email: string,
  recoveryCode: string,
  newPassword: string,
): Promise<RecoveryResult> {
  if (!email || !recoveryCode || !newPassword) {
    return { success: false, message: 'Email, recovery code, and new password are required.', status: 400 };
  }
  if (newPassword.length < 8) {
    return { success: false, message: 'Password must be at least 8 characters.', status: 400 };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = recoveryCode.trim().toUpperCase();

  const user = await db.prepare('SELECT id FROM user WHERE email = ?').bind(normalizedEmail).first<{ id: string }>();
  if (!user) {
    return { success: false, message: 'Invalid email or recovery code.', status: 401 };
  }

  const codes = await db.prepare(
    "SELECT id, code, code_hash, created_at FROM recovery_codes WHERE user_id = ? AND used_at IS NULL"
  ).bind(user.id).all<{ id: string; code: string; code_hash: string | null; created_at: string }>();

  let matched: { id: string; code: string; code_hash: string | null; created_at: string } | null = null;
  if (codes.results) {
    for (const row of codes.results) {
      if (isRecoveryCodeExpired(row.created_at)) continue;
      if (await verifyRecoveryCode(normalizedCode, row.code_hash, row.code)) {
        matched = row;
        break;
      }
    }
  }

  if (!matched) {
    return { success: false, message: 'Invalid email or recovery code.', status: 401 };
  }

  await db.prepare("UPDATE recovery_codes SET used_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), matched.id).run();

  const { hashPassword } = await import('better-auth/crypto');
  const hashedPassword = await hashPassword(newPassword);

  await db.prepare("UPDATE account SET password = ? WHERE userId = ?")
    .bind(hashedPassword, user.id).run();

  return { success: true, message: 'Password reset successfully.', status: 200 };
}