// @aequa-finance/sdk: build on aequa from TypeScript.
//
//   AequaClient        reads the protocol and a wallet, quotes, builds and simulates the user
//                      paths, and sends what the wallet signed
//   instructions       one builder for each of the program's 37 instructions
//   fetchProtocol …    the state in one read, and what it says (fees, capacity, rates, NAV)
//   quote, math        the program's arithmetic in bigint
//   parseUnits …       decimal strings to raw units and back, exactly
//   pyth               signed Pyth Pro prices for the xStock paths and the cranks
//   parseEvents        the program's events from logs; AequaError for its refusals

export * from "./constants.js";
export * from "./pda.js";
export * from "./program.js";
export * from "./errors.js";
export * from "./math.js";
export * from "./units.js";
export * from "./pyth.js";
export * from "./token.js";
export * from "./state.js";
export * from "./events.js";
export * from "./transaction.js";
export * from "./jupiter.js";
export * from "./cctp.js";
export * from "./client.js";
export * as instructions from "./instructions/index.js";
export type { AequaToken, Priced, Route } from "./instructions/index.js";
export * as quote from "./quote.js";
export type { Price } from "./quote.js";
