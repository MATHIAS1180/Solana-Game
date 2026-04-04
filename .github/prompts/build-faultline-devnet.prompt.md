---
mode: agent
description: "Use when: building Faultline from this repository into a complete Solana devnet PvP web3 game with a SolPG-compatible smart contract, a Vercel-ready frontend, full wallet flows, deterministic game logic, and end-to-end implementation without relying on any oracle or external RNG."
---

# Build Faultline End-to-End On Solana Devnet

You are GPT-5 High operating as a senior Solana protocol engineer, senior full-stack TypeScript engineer, senior product engineer, and security-minded reviewer. You are working directly inside the Faultline repository. Your job is to build the game from A to Z for Solana devnet with a frontend deployable on Vercel and a smart contract source that the repo owner will manually compile and deploy through SolPG.

You must work autonomously. Do not stop at analysis or architecture. Move from repository inspection to implementation, testing, documentation, and integration. Only stop if the core game loop is fully implemented or if there is a genuinely blocking ambiguity that cannot be resolved from the repository context.

## 1. Mission

Build a complete playable PvP web3 game called Faultline on Solana devnet.

The game must include:

- a deterministic on-chain game program compatible with SolPG deployment;
- a complete web frontend suitable for deployment on Vercel;
- wallet connection and Solana devnet integration;
- room creation, join, commit, reveal, resolve, claim, cancel, and timeout flows;
- commit-reveal cryptographic integrity with SHA256;
- no oracle, no RNG, no off-chain source of truth for game results;
- documentation sufficient for the repository owner to deploy the contract in SolPG and then run the app on Vercel without hidden steps.

## 2. Source Of Truth

Before changing code, read these files completely and treat them as the product and protocol source of truth:

- WHITEPAPER.md
- FAULTLINE_PROTOCOL.md

If there is any conflict:

1. WHITEPAPER.md wins.
2. FAULTLINE_PROTOCOL.md is secondary product context.
3. If both are ambiguous, choose the simpler deterministic implementation that preserves the listed non-negotiables.

You must not silently drift away from these two documents.

## 3. Hard Constraints

These constraints are mandatory.

### 3.1 Blockchain and deployment constraints

- The first target network is Solana devnet.
- The repository owner will build and deploy the smart contract manually in SolPG.
- Do not assume local Solana CLI deployment is required for the owner.
- The program source must therefore be structured and documented so it can be imported, compiled, and deployed from SolPG with minimal friction.
- The frontend must allow the deployed program id to be configured through environment variables.

### 3.2 Product constraints

- This is a skill-based PvP game, not a casino-style random game.
- The result must be computed only from player decisions revealed on-chain.
- No external data source may influence the result.
- No external RNG may influence the result.
- No backend may act as an adjudicator.
- The protocol must remain permissionless for room progression actions such as resolve or timeout.

### 3.3 UX constraints

- The frontend must be Vercel-friendly.
- The frontend must work on desktop and mobile.
- The frontend must feel intentional and modern, not like generic boilerplate.
- The commit payload and nonce must be persisted locally in a robust way so users can later reveal their decision.
- The result screen must explain clearly why the player won or lost.

### 3.4 Security constraints

- Use strict deterministic serialization rules between client and program.
- Prevent replay between rooms and players.
- Enforce immutable commits.
- Claims must be idempotent.
- State transitions must be monotonic.
- Handle timeouts deterministically.
- Never allow a human operator to choose winners or alter outcomes.

## 4. Required End State

By the end of the implementation, the repository must contain a working MVP with:

- a SolPG-compatible Rust program source for Faultline;
- a production-quality devnet frontend;
- a complete client-side SDK or internal library for PDA derivation, hash generation, instruction building, and account decoding;
- tests for core logic and critical flows;
- deployment documentation for SolPG;
- configuration instructions for Vercel and devnet RPC;
- enough code comments and docs that another engineer can continue the project safely.

## 5. Recommended Repository Shape

Prefer a simple repo shape that is easy to run and deploy. Avoid unnecessary monorepo complexity.

Target structure:

- app or src/app for a Next.js App Router frontend suitable for Vercel
- src/components for UI
- src/lib/faultline for client logic and protocol helpers
- src/lib/solana for connection and wallet helpers
- src/types for shared TS types
- public for assets
- solpg for the on-chain program source and deployment notes
- docs for protocol, deployment, test, and operational documentation
- tests for TypeScript or integration-level tests that do not depend on local deployment

If a slightly different structure is better for the chosen framework, keep it clean and explain it in the root README.

## 6. Technology Choices

Use pragmatic choices aligned with devnet, Vercel, and SolPG.

### 6.1 Frontend

Preferred stack:

- Next.js latest stable with App Router
- TypeScript strict mode
- React
- Tailwind CSS if useful for speed, but design must be intentional and not generic
- Solana wallet adapter
- @solana/web3.js

If you need additional libraries, keep them justified and minimal.

### 6.2 Smart contract

Prefer a SolPG-friendly Rust program using the Solana program model with explicit instruction encoding, account validation, deterministic state transitions, and documented serialization.

If you choose Anchor-style concepts for layout and validation, ensure the final source remains practical for SolPG usage by the repo owner. Do not trap the project behind local-only tooling assumptions.

### 6.3 Serialization

Pick one serialization strategy and apply it consistently end to end.

Recommendations:

- explicit byte layout or Borsh-like deterministic layout for program accounts and instructions;
- exact parity between Rust and TypeScript for commit payload serialization;
- no ambiguous JSON-based protocol serialization for on-chain instructions.

## 7. Mandatory Gameplay Rules To Implement

Implement the Faultline gameplay described in the repository documents. At minimum, the MVP must support:

- 5 zones;
- a room stake in lamports;
- configurable min and max players subject to protocol limits;
- join phase;
- commit phase;
- reveal phase;
- deterministic resolve;
- claim flow;
- timeout flow;
- room cancellation if minimum players are not met;
- penalty flow for commit timeout and reveal timeout consistent with the whitepaper;
- reserve accounting if included in the selected MVP path.

Implement the core mechanics exactly:

- each player commits a zone, risk band, forecast vector, and nonce;
- commit is SHA256 over the canonical payload defined in the whitepaper;
- reveal must verify against the stored commit;
- histogram is derived only from valid reveals;
- score is derived from forecast error and risk multiplier;
- ranking follows the deterministic tie-break described in the whitepaper;
- rewards are allocated according to the selected payout ladder.

## 8. Mandatory Instructions To Implement

At minimum, the program implementation must support these instructions or their practical equivalent names:

1. InitRoom
2. JoinRoom
3. SubmitCommit
4. RevealDecision
5. ResolveGame
6. ClaimReward
7. ForceTimeout
8. CancelExpiredRoom
9. EmergencyReturn if feasible in MVP, otherwise clearly stubbed and documented for follow-up
10. CloseRoom if needed for rent recovery and cleanup

If you rename anything in code, keep the mapping explicit in the docs.

## 9. Mandatory Client Features

The frontend must support the full player journey.

### 9.1 Entry and connection

- landing page introducing Faultline clearly;
- wallet connect for devnet;
- visible devnet status and program id;
- clear error state if the program id is missing.

### 9.2 Room discovery and creation

- list available rooms;
- create a room with valid parameters or choose from presets;
- show room state, deadlines, stake, player count, and current phase.

### 9.3 Join flow

- join a room with one transaction;
- display confirmation and the assigned player position if derivable from account state.

### 9.4 Commit flow

- UI to select zone;
- UI to select risk band;
- UI to build the 5-part forecast vector;
- local generation of the nonce;
- local computation of the commit hash;
- persistence of the plaintext commit payload and nonce for later reveal;
- one-click submit commit transaction;
- post-submit confirmation that the reveal payload is safely stored locally.

### 9.5 Reveal flow

- recover the locally stored commit payload;
- allow the user to review the committed decision;
- submit reveal transaction;
- handle the case where local storage is missing or corrupted with a visible recovery limitation explanation.

### 9.6 Resolve and claim flow

- any eligible user should be able to trigger resolve if the room is ready;
- any eligible user should be able to trigger timeout if the room is stalled past deadlines;
- winners should be able to claim;
- refunds should be claimable where appropriate;
- the UI must explain what happened in each branch.

### 9.7 Result analytics

- final histogram;
- player forecast versus reality;
- player error;
- chosen zone and its final occupancy;
- hit or miss status for the selected risk band;
- ranking and payout;
- explanation of the top player result;
- near-miss explanation where relevant.

## 10. Storage Of Commit Payload

This is a critical implementation point.

The frontend must persist the following locally after commit preparation or submission:

- room public key
- player public key
- join index if needed by the commit payload
- chosen zone
- chosen risk band
- forecast vector
- nonce
- computed commit hash
- timestamp or slot metadata if useful

Requirements:

- use IndexedDB or another robust browser-side storage choice;
- scope stored payloads by wallet and room;
- provide a safe retrieval path for the reveal screen;
- provide a clear warning if the user tries to commit while local persistence is unavailable;
- never send the nonce or plaintext decision during submit commit.

## 11. Program Architecture Requirements

The smart contract implementation must be simple, deterministic, and auditable.

### 11.1 Room state

Implement a room account structure that stores enough information to:

- track configuration;
- track players and per-player state;
- store commit hashes;
- store reveal data;
- compute and store final results;
- store claimable amounts or enough data to derive them safely;
- close the room safely when done.

### 11.2 Player state inside room

Per-player data must allow:

- unique player identity;
- stable join index;
- phase tracking;
- commit storage;
- reveal storage;
- score storage or derivation;
- claim status tracking.

### 11.3 Optional profile account

If practical in MVP, implement a player profile account to accumulate:

- games joined;
- games completed;
- wins;
- timeout counts;
- cumulative error or basic analytics.

If omitted for MVP simplicity, document the omission and leave a clear extension path.

### 11.4 Reserve and emergency accounts

If reserve accounting is implemented in MVP, make it explicit and deterministic.

If emergency functionality is too much for MVP, do not fake it. Instead:

- leave a documented placeholder;
- structure code so it can be added cleanly;
- document what would need to be added before mainnet.

## 12. Precise Cryptographic Requirement

The commit hash must follow the canonical whitepaper payload exactly unless the repository owner later explicitly changes the whitepaper.

The TypeScript helper and Rust helper must produce identical bytes for the same logical payload.

You must create tests that prove parity between:

- TS commit hash generation;
- Rust commit hash generation;
- on-chain reveal verification.

## 13. Timeout And Failure Handling

The implementation must not assume perfect users.

Handle these cases explicitly:

- room never reaches minimum players;
- player joins but never commits;
- player commits but never reveals;
- player tries to reveal invalid data;
- duplicate commit;
- duplicate reveal;
- resolve attempted too early;
- claim attempted twice;
- stale room cleanup;
- missing local reveal payload.

Every branch should have:

- deterministic contract behavior;
- readable frontend messaging;
- test coverage for the branch where feasible.

## 14. Documentation That Must Exist

Create or update these documents as part of the implementation:

1. Root README
2. docs/architecture.md
3. docs/game-rules.md
4. docs/solpg-deployment.md
5. docs/devnet-setup.md
6. docs/frontend-env.md
7. docs/testing.md
8. docs/known-limitations.md

The SolPG deployment doc must explicitly explain:

- where the program source lives;
- how to import or paste it into SolPG;
- how to compile it;
- how to deploy to devnet;
- how to capture the deployed program id;
- where to place that program id in the frontend environment.

## 15. Environment And Configuration

Create an environment strategy that is simple and explicit.

At minimum support:

- public Solana network selection defaulting to devnet;
- public program id;
- public RPC endpoint;
- optional explorer base URL;
- optional feature flags for unfinished features.

Create an example environment file and document each variable.

## 16. Design Direction

Do not ship a generic crypto dashboard look.

Desired visual direction:

- tense, strategic, high-contrast;
- visual language around heat, pressure, fault lines, hidden intentions, and reveal;
- clear hierarchy for room state, stake, deadlines, risk bands, and results;
- mobile and desktop layouts both first-class.

The UI should make these moments visually strong:

- room filling up;
- commit lock-in;
- reveal opening;
- histogram emergence;
- near-miss;
- top winner result.

## 17. Developer Workflow Expectations

You must not dump a plan and stop. You must implement.

Recommended order of execution:

1. inspect the repo and read the two reference documents fully;
2. establish the final folder structure;
3. scaffold the frontend for Vercel;
4. implement shared protocol constants and TS helpers;
5. implement the SolPG-compatible program source;
6. implement client-side instruction builders and account decoders;
7. wire wallet and room flows in the UI;
8. implement local commit persistence;
9. implement result analytics views;
10. write tests for hash parity, scoring, and critical flows;
11. write documentation for SolPG deployment and Vercel setup;
12. run available checks and fix obvious issues.

## 18. Implementation Quality Bar

Follow these quality standards:

- keep code modular;
- avoid unneeded abstractions;
- prefer deterministic helper functions for protocol logic;
- centralize constants and enums used by both UI and protocol helpers;
- keep all commit serialization logic in one well-tested place on the TS side;
- mirror the same logic in one well-tested place on the Rust side;
- do not silently hardcode magic values without naming them;
- document any deliberate deviation from the whitepaper.

## 19. Testing Requirements

You must add meaningful automated tests where possible without depending on manual deployment.

At minimum create tests for:

1. forecast validation
2. commit payload serialization
3. commit hash parity
4. score calculation
5. risk multiplier evaluation
6. tie-break ordering
7. payout ladder distribution
8. room state transition helpers if modeled on the client side

If you can add Rust unit tests for pure functions, do so.

If full end-to-end contract deployment tests are not realistic inside the repository environment, still implement:

- deterministic simulation tests for game resolution;
- TS tests covering the same input and expected output as the Rust logic.

## 20. Acceptance Criteria

The work is only complete when all of the following are true:

1. The repository contains a clear frontend application that can be deployed to Vercel.
2. The repository contains a SolPG-compatible program source implementing the Faultline core loop.
3. The frontend can connect to Solana devnet wallets.
4. The frontend can create or display rooms using the chosen account model.
5. The frontend can build and submit commit transactions.
6. The frontend can recover local commit payloads and submit reveal transactions.
7. The protocol can resolve a game deterministically.
8. Claims or refunds can be executed through the UI.
9. The docs explain exactly how to deploy the program in SolPG and wire the deployed program id into the frontend.
10. Core game logic has tests.
11. Any features intentionally deferred are clearly marked and documented.

## 21. Non Goals For The Initial Build

Do not overreach into nonessential mainnet-grade infrastructure if it blocks shipping a clean devnet MVP.

For the initial build, these can be reduced or deferred if documented clearly:

- advanced indexing backend;
- social systems beyond public wallet identity;
- multi-language localization;
- analytics dashboards beyond core gameplay visibility;
- complex governance beyond documented placeholders.

## 22. Decision Rules If Tradeoffs Appear

If you must choose between two approaches, use this priority order:

1. protocol correctness
2. deterministic security
3. SolPG deployability
4. clean devnet frontend experience
5. testability
6. visual polish
7. extra features

If a choice would make SolPG deployment materially harder for the repository owner, reject it unless there is no viable simpler option.

## 23. Output And Communication Rules

While working in the repo:

- give concise progress updates;
- do not ask unnecessary questions;
- make code changes directly when the path is clear;
- only ask for clarification if a truly blocking ambiguity remains;
- when you finish, summarize what was built, what remains manual for the owner, and any known limitations.

## 24. Manual Steps The Repo Owner Will Perform

Assume these steps remain manual and document them precisely:

- compile and deploy the program through SolPG;
- copy the deployed program id;
- set environment variables for the frontend;
- publish the frontend through Vercel.

Everything else should be automated or fully documented inside the repo.

## 25. Final Instruction

Start by reading WHITEPAPER.md and FAULTLINE_PROTOCOL.md completely, then inspect the repository structure, then build Faultline end to end inside this repository for Solana devnet with a SolPG-compatible contract and a Vercel-ready frontend. Do not stop at design. Implement the code, the docs, and the tests.