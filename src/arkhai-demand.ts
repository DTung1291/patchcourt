import type { Hex } from 'viem'
import { decodeDemand } from '../node_modules/alkahest-ts/sdks/ts/src/clients/arbiters/general/trustedOracle'

/** Return the context key TrustedOracleArbiter.check hashes on-chain. */
export function oracleDecisionContext(encodedDemand: Hex): Hex {
  return decodeDemand(encodedDemand).data
}
