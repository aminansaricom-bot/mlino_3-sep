import { describe, expect, it } from 'vitest';
import { unwrapTurn } from './compassBeam';

describe('map facing beam', () => {
  it('turns the short way round north', () => {
    expect(unwrapTurn(359, 1)).toBe(361);
    expect(unwrapTurn(1, 359)).toBe(-1);
    expect(unwrapTurn(720 + 90, 100)).toBe(820);
    expect(unwrapTurn(10, 190)).toBe(-170);
  });
});
