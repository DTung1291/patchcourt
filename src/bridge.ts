import { spawn, spawnSync } from 'node:child_process'
import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionHashVariant } from 'genlayer-js/types'

type Instruction = {
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

const uid = /^0x[0-9a-fA-F]{64}$/
const sha = /^[0-9a-fA-F]{40}$/
const address = /^0x[0-9a-fA-F]{40}$/
const fields = [
  'protocol', 'network', 'escrow_uid', 'fulfillment_uid', 'decision',
  'outcome', 'case_id', 'round', 'commit_sha',
].sort()

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

export function buildArbitrationCommand(value: Instruction): string[] {
  return ['nla', 'escrow:arbitrate', '--escrow-uid', value.escrow_uid]
}

async function readFinalInstruction(contract: string, caseId: number): Promise<Instruction> {
  if (!address.test(contract)) throw new Error('Invalid PatchCourt contract address.')
  const client = createClient({ chain: studionet })
  const raw = await client.readContract({
    address: contract as `0x${string}`,
    functionName: 'get_arbitration_instruction',
    args: [BigInt(caseId)],
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
  })
  const value = validateInstruction(raw)
  if (value.case_id !== caseId) throw new Error('Contract returned a different case ID.')
  return value
}

async function relay(value: Instruction): Promise<void> {
  const network = spawnSync('nla', ['network'], { encoding: 'utf8' })
  if (network.error) throw new Error(`Unable to run nla: ${network.error.message}`)
  if (network.status !== 0) throw new Error(network.stderr || 'nla network failed')
  if (!network.stdout.toLowerCase().includes(value.network)) {
    throw new Error(`nla is not configured for ${value.network}; switch it explicitly first.`)
  }
  const child = spawn('nla', buildArbitrationCommand(value).slice(1), {
    stdio: ['pipe', 'inherit', 'inherit'],
  })
  child.stdin.write(value.decision ? 'approve\n' : 'reject\n')
  child.stdin.end()
  const status = await new Promise<number>((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', code => resolve(code ?? 1))
  })
  if (status !== 0) throw new Error(`nla arbitration exited with status ${status}.`)
}

function usage(): never {
  throw new Error('Usage: bun run bridge -- --contract 0x... --case-id 1 [--execute]')
}

function parseArgs(argv: string[]): { contract: string; caseId: number; execute: boolean } {
  let contract = ''
  let caseId = 0
  let execute = false
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--contract') contract = argv[++index] ?? ''
    else if (arg === '--case-id') caseId = Number(argv[++index] ?? '')
    else if (arg === '--execute') execute = true
    else usage()
  }
  if (!contract || !Number.isSafeInteger(caseId) || caseId < 1) usage()
  return { contract, caseId, execute }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const instruction = await readFinalInstruction(args.contract, args.caseId)
  console.log(JSON.stringify({
    source: 'GenLayer latest-final state',
    contract: args.contract,
    mode: args.execute ? 'execute' : 'dry-run',
    instruction,
    command: buildArbitrationCommand(instruction),
  }, null, 2))
  if (args.execute) await relay(instruction)
}

if (import.meta.main) {
  main().catch(error => {
    console.error(`PatchCourt bridge error: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
