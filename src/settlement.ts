import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionHashVariant } from 'genlayer-js/types'

export type Instruction = {
  protocol: 'arkhai-nla-v1'
  network: 'sepolia' | 'base-sepolia'
  escrow_uid: `0x${string}`
  fulfillment_uid: `0x${string}`
  decision: boolean
  outcome: 'APPROVED' | 'REJECTED'
  case_id: number
  round: number
  commit_sha: string
}

export type SettlementContext = {
  network: 'sepolia' | 'base-sepolia'
  escrowUid: `0x${string}`
  escrowAttestationUid: `0x${string}`
  fulfillmentUid: `0x${string}`
  fulfillmentAttestationUid: `0x${string}`
  fulfillmentRefUid: `0x${string}`
  escrowRevocationTime: bigint
  fulfillmentRevocationTime: bigint
  liveDemand: `0x${string}`
  requestedDemand: `0x${string}`
  liveDemandContext: `0x${string}`
  requestedDemandContext: `0x${string}`
  demandOracle: `0x${string}`
  connectedOracle: `0x${string}`
}

type ReadContract = (request: {
  address: `0x${string}`
  functionName: string
  args: bigint[]
  transactionHashVariant: TransactionHashVariant
}) => Promise<unknown>

const uid = /^0x[0-9a-fA-F]{64}$/
const sha = /^[0-9a-fA-F]{40}$/
const address = /^0x[0-9a-fA-F]{40}$/
const fields = [
  'protocol', 'network', 'escrow_uid', 'fulfillment_uid', 'decision',
  'outcome', 'case_id', 'round', 'commit_sha',
].sort()

const normalized = (value: string): string => value.toLowerCase()

function asObject(raw: unknown): Record<string, unknown> {
  if (raw instanceof Map) return Object.fromEntries(raw)
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  throw new Error('Contract returned a non-object arbitration instruction.')
}

function integer(value: unknown, label: string): number {
  const parsed = typeof value === 'bigint' ? Number(value) : value
  if (!Number.isSafeInteger(parsed) || Number(parsed) < 1) {
    throw new Error(`${label} must be a positive safe integer.`)
  }
  return Number(parsed)
}

export function validateInstruction(raw: unknown): Instruction {
  const value = asObject(raw)
  if (Object.keys(value).sort().join(',') !== fields.join(',')) {
    throw new Error('Instruction fields do not match the PatchCourt schema.')
  }
  if (value.protocol !== 'arkhai-nla-v1') throw new Error('Unsupported protocol.')
  if (value.network !== 'sepolia' && value.network !== 'base-sepolia') {
    throw new Error('Unsupported Arkhai network.')
  }
  if (typeof value.escrow_uid !== 'string' || !uid.test(value.escrow_uid)) {
    throw new Error('Invalid escrow UID.')
  }
  if (typeof value.fulfillment_uid !== 'string' || !uid.test(value.fulfillment_uid)) {
    throw new Error('Invalid fulfillment UID.')
  }
  if (typeof value.decision !== 'boolean') throw new Error('Decision must be boolean.')
  if (value.outcome !== 'APPROVED' && value.outcome !== 'REJECTED') {
    throw new Error('Only final outcomes can be relayed.')
  }
  if (value.decision !== (value.outcome === 'APPROVED')) {
    throw new Error('Decision does not match outcome.')
  }
  if (typeof value.commit_sha !== 'string' || !sha.test(value.commit_sha)) {
    throw new Error('Invalid commit SHA.')
  }
  return {
    protocol: value.protocol,
    network: value.network,
    escrow_uid: value.escrow_uid as `0x${string}`,
    fulfillment_uid: value.fulfillment_uid as `0x${string}`,
    decision: value.decision,
    outcome: value.outcome,
    case_id: integer(value.case_id, 'case_id'),
    round: integer(value.round, 'round'),
    commit_sha: value.commit_sha.toLowerCase(),
  }
}

export async function readLatestFinalInstructionWith(
  readContract: ReadContract,
  contract: string,
  caseId: number,
): Promise<Instruction> {
  if (!address.test(contract)) throw new Error('Invalid PatchCourt contract address.')
  if (!Number.isSafeInteger(caseId) || caseId < 1) throw new Error('Case ID must be a positive safe integer.')
  const raw = await readContract({
    address: contract as `0x${string}`,
    functionName: 'get_arbitration_instruction',
    args: [BigInt(caseId)],
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
  })
  const value = validateInstruction(raw)
  if (value.case_id !== caseId) throw new Error('Contract returned a different case ID.')
  return value
}

export async function readLatestFinalInstruction(contract: string, caseId: number): Promise<Instruction> {
  const client = createClient({ chain: studionet })
  return readLatestFinalInstructionWith(
    client.readContract.bind(client) as unknown as ReadContract,
    contract,
    caseId,
  )
}

export function assertSettlementContext(instruction: Instruction, context: SettlementContext): Instruction {
  if (instruction.network !== context.network) {
    throw new Error(`Instruction network ${instruction.network} does not match ${context.network}.`)
  }
  if (normalized(instruction.escrow_uid) !== normalized(context.escrowUid)
    || normalized(context.escrowAttestationUid) !== normalized(context.escrowUid)) {
    throw new Error('Instruction does not match the live escrow attestation.')
  }
  if (normalized(instruction.fulfillment_uid) !== normalized(context.fulfillmentUid)
    || normalized(context.fulfillmentAttestationUid) !== normalized(context.fulfillmentUid)) {
    throw new Error('Instruction does not match the live fulfillment attestation.')
  }
  if (normalized(context.fulfillmentRefUid) !== normalized(context.escrowUid)) {
    throw new Error('Fulfillment does not reference this escrow.')
  }
  if (context.escrowRevocationTime !== 0n || context.fulfillmentRevocationTime !== 0n) {
    throw new Error('A revoked attestation cannot be settled.')
  }
  if (normalized(context.liveDemand) !== normalized(context.requestedDemand)
    || normalized(context.liveDemandContext) !== normalized(context.requestedDemandContext)) {
    throw new Error('Live escrow demand does not match the requested arbitration context.')
  }
  if (normalized(context.demandOracle) !== normalized(context.connectedOracle)) {
    throw new Error('Connected wallet is not the oracle named by the escrow demand.')
  }
  return instruction
}
