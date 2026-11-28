import { describe, expect, test } from 'bun:test'
import { buildArbitrationCommand } from '../src/bridge'
import { oracleDecisionContext } from '../src/arkhai-demand'
import {
  assertSettlementContext, readLatestFinalInstructionWith, validateInstruction,
  type SettlementContext,
} from '../src/settlement'
import { encodeDemand } from '../node_modules/alkahest-ts/sdks/ts/src/clients/arbiters/general/trustedOracle'
import { TransactionHashVariant } from 'genlayer-js/types'

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

const context: SettlementContext = {
  network: 'sepolia',
  escrowUid: base.escrow_uid as `0x${string}`,
  escrowAttestationUid: base.escrow_uid as `0x${string}`,
  fulfillmentUid: base.fulfillment_uid as `0x${string}`,
  fulfillmentAttestationUid: base.fulfillment_uid as `0x${string}`,
  fulfillmentRefUid: base.escrow_uid as `0x${string}`,
  escrowRevocationTime: 0n,
  fulfillmentRevocationTime: 0n,
  liveDemand: '0x1234',
  requestedDemand: '0x1234',
  liveDemandContext: '0xabcd',
  requestedDemandContext: '0xabcd',
  demandOracle: '0x1111111111111111111111111111111111111111',
  connectedOracle: '0x1111111111111111111111111111111111111111',
}

describe('live Arkhai bridge guard', () => {
  test('records oracle decisions against the inner demand context', () => {
    const inner = '0x1234' as const
    const outer = encodeDemand({ oracle: '0x1111111111111111111111111111111111111111', data: inner })
    expect(oracleDecisionContext(outer)).toBe(inner)
  })

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

  test('reads only latest-final state and rejects a non-final instruction', async () => {
    let variant: TransactionHashVariant | undefined
    const read = async (request: any) => {
      variant = request.transactionHashVariant
      return { ...base, outcome: 'INCONCLUSIVE', decision: false }
    }
    await expect(readLatestFinalInstructionWith(read, '0x1111111111111111111111111111111111111111', 1))
      .rejects.toThrow('final')
    expect(variant).toBe(TransactionHashVariant.LATEST_FINAL)
  })

  test('rejects instructions for another network, escrow or fulfillment', () => {
    const instruction = validateInstruction(base)
    expect(() => assertSettlementContext(instruction, { ...context, network: 'base-sepolia' }))
      .toThrow('network')
    expect(() => assertSettlementContext(instruction, {
      ...context, escrowUid: `0x${'1'.repeat(64)}`,
    })).toThrow('escrow')
    expect(() => assertSettlementContext(instruction, {
      ...context, fulfillmentUid: `0x${'2'.repeat(64)}`,
    })).toThrow('fulfillment')
    expect(() => assertSettlementContext(instruction, {
      ...context, fulfillmentRefUid: `0x${'3'.repeat(64)}`,
    })).toThrow('reference')
  })

  test('rejects changed demand context and a different oracle wallet', () => {
    const instruction = validateInstruction(base)
    expect(() => assertSettlementContext(instruction, {
      ...context, requestedDemandContext: '0xdead',
    })).toThrow('demand')
    expect(() => assertSettlementContext(instruction, {
      ...context, connectedOracle: '0x2222222222222222222222222222222222222222',
    })).toThrow('oracle')
  })
})
