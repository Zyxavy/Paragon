import { describe, it, expect } from 'vitest';
import { maskCode } from './recovery-codes';

describe('maskCode', () => {
  it('masks PARAGON-XXXX-XXXX to PARAGON-****-****', () => {
    expect(maskCode('PARAGON-A1B2-C3D4')).toBe('PARAGON-****-****');
  });

  it('masks correctly for different code patterns', () => {
    expect(maskCode('PARAGON-ABCD-EFGH')).toBe('PARAGON-****-****');
  });

  it('falls back to full mask for unexpected format', () => {
    expect(maskCode('INVALID')).toBe('****-****');
  });
});
