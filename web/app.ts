import { contractAddresses } from '../node_modules/alkahest-ts/sdks/ts/src/config'
import { makeErc20DefaultEscrowClient } from '../node_modules/alkahest-ts/sdks/ts/src/clients/obligations/erc20/escrow/default'
import { pickErc20Addresses } from '../node_modules/alkahest-ts/sdks/ts/src/clients/obligations/erc20'
import { makeCommitRevealObligationClient, pickCommitRevealAddresses } from '../node_modules/alkahest-ts/sdks/ts/src/clients/obligations/commitReveal'
import { makeTrustedOracleArbiterClient } from '../node_modules/alkahest-ts/sdks/ts/src/clients/arbiters/general/trustedOracle'
import { getAttestation } from '../node_modules/alkahest-ts/sdks/ts/src/utils'
import MockERC20Permit from '../node_modules/alkahest-ts/sdks/ts/tests/fixtures/MockERC20Permit.json'
import { oracleDecisionContext } from '../src/arkhai-demand'
import {
  createWalletClient, custom, encodeAbiParameters, formatEther, keccak256,
  parseAbi, parseAbiParameters, publicActions, toHex, type Address, type Hex,
} from 'viem'
import { sepolia } from 'viem/chains'

type Provider = { request(args: { method: string; params?: unknown[] | object }): Promise<unknown>; isOkxWallet?: boolean }
type FlowState = {
  token?: Address; escrowUid?: Hex; fulfillmentUid?: Hex; commitment?: Hex;
  salt?: Hex; schema?: Hex; payload?: Hex; commitTx?: Hex; demand?: Hex;
}

declare global { interface Window { okxwallet?: Provider; ethereum?: Provider & { providers?: Provider[] } } }

const STORAGE = 'patchcourt-okx-sepolia-v1'
const state: FlowState = JSON.parse(localStorage.getItem(STORAGE) ?? '{}')
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const logEl = $<HTMLPreElement>('log')
let wallet: any
let escrowClient: any
let commitClient: any
let oracleClient: any
let account: Address | undefined

function save() { localStorage.setItem(STORAGE, JSON.stringify(state)); hydrate() }
function hydrate() {
  if (state.token) $<HTMLInputElement>('token').value = state.token
  if (state.escrowUid) {
    $<HTMLElement>('escrowUid').textContent = state.escrowUid
    $<HTMLInputElement>('fulfillEscrow').value = state.escrowUid
  }
  if (state.fulfillmentUid) $<HTMLElement>('fulfillmentUid').textContent = state.fulfillmentUid
}
function log(message: string, value?: unknown) {
  const stamp = new Date().toLocaleTimeString()
  const detail = value === undefined ? '' : `\n${typeof value === 'string' ? value : JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2)}`
  logEl.textContent = `[${stamp}] ${message}${detail}\n\n${logEl.textContent}`
}
function provider(): Provider {
  const found = window.okxwallet ?? window.ethereum?.providers?.find(item => item.isOkxWallet)
  if (!found) throw new Error('OKX Wallet was not detected. Enable its site access and reload.')
  return found
}
async function connect() {
  const injected = provider()
  await injected.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] })
  const accounts = await injected.request({ method: 'eth_requestAccounts' }) as Address[]
  if (!accounts[0]) throw new Error('OKX returned no account.')
  account = accounts[0]
  wallet = createWalletClient({ account, chain: sepolia, transport: custom(injected) }).extend(publicActions)
  const addresses = contractAddresses.Sepolia
  escrowClient = makeErc20DefaultEscrowClient(wallet, pickErc20Addresses(addresses))
  commitClient = makeCommitRevealObligationClient(wallet, pickCommitRevealAddresses(addresses))
  oracleClient = makeTrustedOracleArbiterClient(wallet, addresses)
  const balance = await wallet.getBalance({ address: account })
  $('account').textContent = account
  $('balance').textContent = `${Number(formatEther(balance)).toFixed(6)} ETH`
  const oracle = $<HTMLInputElement>('oracle')
  if (!oracle.value) oracle.value = account
  log('Connected OKX on Ethereum Sepolia.', { account })
}
function ready() {
  if (!wallet || !escrowClient || !commitClient || !oracleClient || !account) throw new Error('Connect OKX first.')
  return { wallet, escrowClient, commitClient, oracleClient, account }
}
async function busy(button: HTMLButtonElement, task: () => Promise<void>) {
  button.disabled = true
  try { await task() } catch (error) { log('ERROR', error instanceof Error ? error.message : String(error)) }
  finally { button.disabled = false }
}
function value(id: string) {
  const result = ($<HTMLInputElement | HTMLTextAreaElement>(id).value ?? '').trim()
  if (!result) throw new Error(`${id} is required.`)
  return result
}
function escrowUid(): Hex { return value('fulfillEscrow') as Hex }
function buttonEvent(task: () => Promise<void>) {
  return (event: MouseEvent) => busy(event.currentTarget as HTMLButtonElement, task)
}

$<HTMLButtonElement>('connect').onclick = buttonEvent(connect)
$<HTMLButtonElement>('deployToken').onclick = buttonEvent(async () => {
  const { wallet, account } = ready()
  log('Confirm the PCT test-token deployment in OKX.')
  const hash = await wallet.deployContract({
    abi: MockERC20Permit.abi,
    bytecode: MockERC20Permit.bytecode.object as Hex,
    args: ['PatchCourt Test Token', 'PCT'], account,
    // OKX Sepolia occasionally fails its own estimate for contract creation.
    // Public-RPC simulation is ~5.50M gas; this explicit ceiling remains fail-safe.
    gas: 6_000_000n,
  })
  log('Token deployment submitted.', hash)
  const receipt = await wallet.waitForTransactionReceipt({ hash })
  if (!receipt.contractAddress) throw new Error('Deployment receipt has no contract address.')
  state.token = receipt.contractAddress
  save()
  log('PCT token deployed and test supply minted.', { token: state.token, tx: hash })
})
$<HTMLButtonElement>('createEscrow').onclick = buttonEvent(async () => {
  const { escrowClient, oracleClient, account } = ready()
  const token = value('token') as Address
  const oracle = (value('oracle') || account) as Address
  const arbitrationPrompt = 'PatchCourt GenLayer validators evaluate immutable GitHub evidence against every acceptance criterion. Demand: {{demand}} Fulfillment: {{obligation}}'
  const inner = encodeAbiParameters(
    parseAbiParameters('(string arbitrationProvider, string arbitrationModel, string arbitrationPrompt, string demand)'),
    [{ arbitrationProvider: 'GenLayer', arbitrationModel: 'PatchCourt consensus', arbitrationPrompt, demand: value('demand') }],
  )
  const outer = oracleClient.encodeDemand({ oracle, data: inner })
  state.demand = outer
  const amount = 10n ** 18n
  const spender = contractAddresses.Sepolia.erc20EscrowObligation
  const erc20 = parseAbi([
    'function allowance(address owner,address spender) view returns (uint256)',
    'function approve(address spender,uint256 amount) returns (bool)',
  ])
  const allowance = await wallet.readContract({
    address: token, abi: erc20, functionName: 'allowance', args: [account, spender],
  })
  if (allowance < amount) {
    log('Confirm approval of exactly 1 PCT in OKX.')
    const approvalHash = await wallet.writeContract({
      address: token, abi: erc20, functionName: 'approve', args: [spender, amount], account,
    })
    await wallet.waitForTransactionReceipt({ hash: approvalHash })
    log('1 PCT approval finalized before escrow creation.', { tx: approvalHash })
  } else {
    log('Existing 1 PCT allowance verified; no additional approval requested.')
  }
  log('Confirm Arkhai escrow creation in OKX.')
  const result = await escrowClient.create(
    { address: token, value: 10n ** 18n },
    { arbiter: contractAddresses.Sepolia.trustedOracleArbiter, demand: outer },
    0n,
  )
  state.token = token
  state.escrowUid = result.attested.uid
  save()
  log('Arkhai NLA escrow created.', { escrowUid: state.escrowUid, tx: result.hash })
})
$<HTMLButtonElement>('commit').onclick = buttonEvent(async () => {
  const { commitClient, account } = ready()
  state.schema = keccak256(toHex('{item:string}'))
  state.salt = keccak256(toHex(crypto.randomUUID()))
  state.payload = toHex(value('fulfillment'))
  state.commitment = await commitClient.computeCommitment(escrowUid(), account, {
    payload: state.payload, salt: state.salt, schema: state.schema,
  })
  log('Confirm the 1-wei commit/reveal bond in OKX.')
  const { hash } = await commitClient.commit(state.commitment, 1n, 3600n)
  state.commitTx = hash
  save()
  await wallet.waitForTransactionReceipt({ hash })
  log('Fulfillment commitment finalized.', { commitment: state.commitment, tx: hash })
})
$<HTMLButtonElement>('reveal').onclick = buttonEvent(async () => {
  const { commitClient } = ready()
  if (!state.payload || !state.salt || !state.schema || !state.commitTx) throw new Error('Commit step is incomplete.')
  log('Confirm the fulfillment reveal in OKX.')
  const result = await commitClient.doObligation(
    { payload: state.payload, salt: state.salt, schema: state.schema }, escrowUid(),
  )
  state.fulfillmentUid = result.attested.uid
  save()
  log('Arkhai fulfillment attestation created.', { fulfillmentUid: state.fulfillmentUid, tx: result.hash })
})
$<HTMLButtonElement>('request').onclick = buttonEvent(async () => {
  const { oracleClient, account } = ready()
  if (!state.fulfillmentUid) throw new Error('Reveal step is incomplete.')
  const escrow = await getAttestation(wallet, escrowUid(), contractAddresses.Sepolia)
  const decoded = escrowClient.decodeObligation(escrow.data)
  const oracle = (value('oracle') || account) as Address
  log('Confirm the arbitration request in OKX.')
  const hash = await oracleClient.requestArbitration(state.fulfillmentUid, oracle, decoded.demand)
  await wallet.waitForTransactionReceipt({ hash })
  state.demand = decoded.demand
  save()
  log('Arbitration requested from PatchCourt relay oracle.', { tx: hash })
})
$<HTMLButtonElement>('arbitrate').onclick = buttonEvent(async () => {
  const { oracleClient } = ready()
  if (!state.fulfillmentUid) throw new Error('Fulfillment UID is missing.')
  const escrow = await getAttestation(wallet, escrowUid(), contractAddresses.Sepolia)
  const decoded = escrowClient.decodeObligation(escrow.data)
  const decision = $<HTMLSelectElement>('decision').value === 'true'
  // TrustedOracleArbiter.check decodes the escrow's outer DemandData and
  // hashes its inner `data` field. Manual arbitration must therefore record
  // the decision against that same inner context, not the encoded wrapper.
  const innerDemand = oracleDecisionContext(decoded.demand)
  log(`Confirm the finalized ${decision ? 'APPROVED' : 'REJECTED'} decision in OKX.`)
  const hash = await oracleClient.arbitrate(state.fulfillmentUid, innerDemand, decision)
  await wallet.waitForTransactionReceipt({ hash })
  log('Oracle decision recorded on Arkhai.', { decision, tx: hash })
})
$<HTMLButtonElement>('collect').onclick = buttonEvent(async () => {
  const { escrowClient } = ready()
  if (!state.fulfillmentUid) throw new Error('Fulfillment UID is missing.')
  log('Confirm escrow collection in OKX.')
  const hash = await escrowClient.collect(escrowUid(), state.fulfillmentUid)
  await wallet.waitForTransactionReceipt({ hash })
  log('Approved escrow collected.', { tx: hash })
})
$<HTMLButtonElement>('clear').onclick = () => { logEl.textContent = 'Audit view cleared. Persistent flow IDs were kept.' }

hydrate()

function initLanding() {
  const reveal = document.querySelectorAll<HTMLElement>('[data-reveal]')
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        revealObserver.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 })
    reveal.forEach(item => revealObserver.observe(item))

    const storyItems = [...document.querySelectorAll<HTMLElement>('.story-item')]
    const storyPictures = [...document.querySelectorAll<HTMLElement>('.story-pictures img')]
    const storyCount = document.querySelector<HTMLElement>('.story-count')
    const showStory = (index: number) => {
      storyItems.forEach((item, itemIndex) => item.classList.toggle('is-active', itemIndex === index))
      storyPictures.forEach((picture, pictureIndex) => picture.classList.toggle('is-on', pictureIndex === index))
      if (storyCount) storyCount.textContent = `${index + 1} of ${storyItems.length} · ${storyItems[index]?.dataset.state ?? ''}`
    }
    const storyObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) showStory(storyItems.indexOf(entry.target as HTMLElement))
    }, { rootMargin: '-45% 0px -45% 0px' })
    storyItems.forEach(item => storyObserver.observe(item))
    showStory(0)
  } else {
    reveal.forEach(item => item.classList.add('is-in'))
  }

  const evidenceForm = document.querySelector<HTMLFormElement>('#evidenceCheck')
  const evidenceInput = document.querySelector<HTMLInputElement>('#evidenceInput')
  const evidenceResult = document.querySelector<HTMLOutputElement>('#evidenceResult')
  const checkEvidence = () => {
    if (!evidenceInput || !evidenceResult) return
    const submitted = evidenceInput.value.trim()
    const fullSha = /(?:^|\/)([a-f0-9]{40})(?:\/|$)/i.exec(submitted)?.[1] ?? (/^[a-f0-9]{40}$/i.test(submitted) ? submitted : '')
    const mutable = /(?:\/|^)(main|master|head)(?:\/|$)/i.test(submitted)
    const httpError = /(?:^|\b)(404|403|500)(?:\b|$)/.test(submitted)
    if (fullSha && !mutable && !httpError) {
      evidenceResult.dataset.status = 'pass'
      evidenceResult.innerHTML = '<strong>SHA MATCH</strong><span>Immutable ref is eligible for validator review.</span>'
    } else {
      evidenceResult.dataset.status = 'fail'
      const reason = mutable ? 'Mutable GitHub refs cannot produce approval.' : httpError ? 'A non-success response fails closed.' : 'A full 40-character commit SHA is required.'
      evidenceResult.innerHTML = `<strong>FAIL CLOSED</strong><span>${reason}</span>`
    }
  }
  evidenceForm?.addEventListener('submit', (event) => { event.preventDefault(); checkEvidence() })
  document.querySelectorAll<HTMLButtonElement>('[data-evidence]').forEach(button => {
    button.addEventListener('click', () => {
      if (!evidenceInput) return
      evidenceInput.value = button.dataset.evidence ?? ''
      checkEvidence()
    })
  })
}

initLanding()
