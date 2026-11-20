import { describe, expect, test } from 'bun:test'
import { buildArbitrationCommand, validateInstruction } from '../src/bridge'

const base = {
  protocol: 'arkhai-nla-v1',
  network: 'sepolia',
  escrow_uid: `0x${'e'.repeat(64)}`,
  fulfillment_uid: `0x${'f'.repeat(64)}`,
  decision: true,
  outcome: 'APPROVED',
  case_id: 1n,
  round: 1n,
  commit_sha: 'a'.repeat(40),
}

describe('live Arkhai bridge guard', () => {
  test('accepts GenLayer map values and builds official NLA command', () => {
    const value = validateInstruction(new Map(Object.entries(base)))
    expect(value.case_id).toBe(1)
    expect(buildArbitrationCommand(value)).toEqual([
      'nla', 'escrow:arbitrate', '--escrow-uid', base.escrow_uid,
    ])
  })

  test('rejects a flipped decision', () => {
    expect(() => validateInstruction({ ...base, decision: false })).toThrow('does not match')
  })

  test('rejects unknown fields and inconclusive outcomes', () => {
    expect(() => validateInstruction({ ...base, override: true })).toThrow('schema')
    expect(() => validateInstruction({ ...base, outcome: 'INCONCLUSIVE', decision: false })).toThrow('final')
  })
})
