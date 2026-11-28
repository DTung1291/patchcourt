import { spawn, spawnSync } from 'node:child_process'
import { readLatestFinalInstruction, type Instruction } from './settlement'

export { validateInstruction } from './settlement'

export function buildArbitrationCommand(value: Instruction): string[] {
  return ['nla', 'escrow:arbitrate', '--escrow-uid', value.escrow_uid]
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
  const instruction = await readLatestFinalInstruction(args.contract, args.caseId)
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
