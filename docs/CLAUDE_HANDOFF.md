# Faultline Arena - Product and Design Handoff

This file is the fastest way to onboard another model or designer into the current state of Faultline Arena.

Use this together with:

- WHITEPAPER.md for the full protocol and scoring logic
- FAULTLINE_PROTOCOL.md for the original design reasoning and product psychology
- docs/OPERATIONS.md for implementation and operational details

This document focuses on two things:

1. What the game is, in practical product terms.
2. What the current site is trying to communicate, visually and behaviorally, from top to bottom.

## 1. Product summary

Faultline Arena is a Solana PvP strategy game built around crowd prediction, not RNG.

The player is not trying to guess a hidden oracle value, a price feed, or a random outcome. The player is trying to read how other humans in the room will distribute themselves across five zones.

The core emotional loop is:

1. Read the crowd.
2. Lock a private prediction.
3. Wait under uncertainty.
4. Reveal the exact payload.
5. Learn precisely why the read won or lost.
6. Re-enter with a sharper model.

The product goal is not casino chaos. It is high-tension, readable, replayable social forecasting.

## 2. Non-negotiable product truths

These constraints should survive any design pass.

1. The game must feel skill-based, deterministic, and auditable.
2. The result must come from revealed player choices only.
3. The UI should emphasize reading humans, not gambling on randomness.
4. A player should understand why they lost.
5. The site should feel premium, live, and high-conviction, not meme-like.
6. Engagement should come from social tension, near-miss learning, and clarity, not manipulative dark patterns.

## 3. Core game mechanic

### 3.1 What a player chooses

Each player decision contains four things:

1. Zone: one of five zones: A, B, C, D, E.
2. Risk band: Calm, Edge, or Knife.
3. Forecast: a 5-value vector describing the predicted final player distribution across the five zones.
4. Nonce: hidden randomness used only to secure the commit hash.

### 3.2 What makes this different

The player is making two simultaneous bets:

1. A positional bet: which zone will be least crowded or least punished by crowding.
2. A modeling bet: what the whole room histogram will look like at resolution.

That dual layer is the actual moat.

### 3.3 Risk bands

Current public labels:

- Calm: lowest upside, broadest survivability.
- Edge: better payoff if the chosen zone ends among the lightest areas.
- Knife: highest upside, but only if the chosen zone is the cleanest final lane.

The UI should keep these bands legible as personality choices:

- Calm = stable, lower-volatility posture.
- Edge = tactical ambition.
- Knife = aggressive conviction.

### 3.4 How scoring feels to the player

The player should walk away with a simple mental model:

1. Did I read the crowd correctly?
2. Did I choose a zone with the right congestion profile?
3. Did I take the right level of risk for that read?

The system computes this formally via the revealed histogram, forecast error, and risk multiplier rules. Exact math lives in WHITEPAPER.md.

### 3.5 Why players come back

The retention loop is based on explainable misses:

- I had the right zone but the wrong global forecast.
- I forecast the room well but was too greedy with Knife.
- I saw the crowd pressure but entered the wrong lane.

This is why result screens matter so much. They are not just post-game stats. They are the re-entry engine.

## 4. On-chain and gameplay flow

### 4.1 Canonical player flow

The intended player story is:

1. Open a persistent preset lobby.
2. If needed, initialize the room and join in the same flow.
3. Commit immediately in the same wallet action.
4. Come back for reveal.
5. Let anyone resolve or timeout the room if needed.
6. Claim reward if eligible.

### 4.2 One-transaction entry

This is a major product advantage and should stay visible in the UI.

The player no longer does a separate join transaction and then a second commit transaction when entering a live room. The public UX message is:

- enter the room
- claim the seat
- lock the read

all in one signed path.

### 4.3 Persistent preset lobbies

Each official stake bracket maps to a persistent on-chain room identity.

Current preset brackets:

- 0.01 SOL
- 0.02 SOL
- 0.04 SOL
- 0.08 SOL
- 0.16 SOL
- 0.32 SOL
- 0.64 SOL
- 1 SOL

These are not disposable throwaway rooms. The current site wants lobbies to feel always available, always visible, and always one click away from action.

### 4.4 Phase model

Room statuses currently exposed in the UI:

- Open
- Commit
- Reveal
- Resolved
- Cancelled
- Emergency
- Closed

Player statuses currently exposed in the UI:

- Empty
- Joined
- Committed
- Revealed
- CommitTimedOut
- RevealTimedOut

### 4.5 Timeouts and refunds

The game is intentionally permissionless after entry.

This means:

1. Any user can advance expired rooms.
2. Any user can force timeout when deadlines expire.
3. Any user can resolve once the room has enough information.
4. Refund and reset flows should work without requiring the original player to manually babysit the room.

This must remain obvious in the design and copy. The product should feel alive even when original players leave the page.

## 5. Current brand direction

Public brand name: Faultline Arena.

Internal/protocol name: Faultline.

Brand position:

- premium
- strategic
- live
- social
- readable
- deterministic

Avoid making it look like:

- a degenerate casino slot product
- a cartoon meme coin site
- a generic cyberpunk clone
- a white-label web3 dashboard

The site should feel like a high-stakes strategy arena, not a trading terminal and not a lootbox funnel.

## 6. Current visual language

### 6.1 General mood

The current site uses a premium dark signal aesthetic:

- deep basalt background
- amber and ember heat accents
- cyan signal accents
- glassy layered cards
- subtle grid overlays
- live pulse indicators
- rounded capsules and large soft radii

The mood should feel like:

- atmospheric
- tactical
- expensive
- alive
- precise

### 6.2 Color direction

Current CSS variables and dominant tones are defined in app/globals.css.

Practical palette reading:

- Background: near-black charcoal and basalt
- Text: warm off-white, not cold pure white
- Ember: orange-red heat accent for urgency and active conflict
- Flare: warm gold/amber for high-value CTA and reward cues
- Signal: cyan for live state, telemetry, and system trust

The color relationship matters:

- amber/ember = action, heat, money, pressure
- cyan = trust, liveness, network, proof
- warm white = premium editorial readability

### 6.3 Typography

Current font roles:

- Syne: display type for headings and major callouts
- Manrope: body copy and readable UI text
- IBM Plex Mono: chips, system labels, slots, technical markers

This is intentional. Display should feel expressive, body should stay legible, and system text should feel precise.

### 6.4 Surface system

Current reusable surface families:

- fault-card: primary glass card with layered gradient and hover polish
- arena-surface: lighter inset surface for secondary blocks
- arena-stat: metric card surface
- arena-chip: pill metadata markers
- arena-kicker: editorial section label
- arena-meter: momentum/progress bar
- arena-quote: highlighted strategic quote block

These should be treated as a design system, not one-off styling.

## 7. Motion and animation language

### 7.1 Current motion principles

The existing site already uses restrained but meaningful motion:

- live pulse dot
- fade/rise entrance animation
- slight card hover lift
- CTA sheen sweep on primary buttons
- stagger helpers via arena-delay classes

The motion direction should remain:

- cinematic, not noisy
- confidence-driven, not playful
- layered, not gimmicky

### 7.2 Good animation targets for future pushes

Claude can safely push harder on:

1. page-load staging on hero and lobby cards
2. slot or state changes on live room telemetry
3. commit/reveal button state transitions
4. result histogram reveal choreography
5. spectator seat changes and status transitions
6. toast enter/exit polish

Claude should avoid:

1. constant looping distractions everywhere
2. cheap glitch effects
3. random particle spam
4. motion that slows action buttons or obscures state clarity

## 8. Notification system

Current notification model:

- global toast provider
- three tones: success, error, info
- auto-dismiss after 4200ms
- manual close button
- top-right stack on desktop, responsive width on mobile

Notifications are currently used in gameplay-critical flows:

- commit success/failure
- reveal success/failure
- action success/failure for resolve, timeout, cancel, claim

The design intent is to avoid cluttering forms with inline status spam. State feedback should feel immediate and premium.

Useful future pushes for Claude:

1. richer motion choreography for toast stack
2. more differentiated icons and semantic color glow per tone
3. possible progress bar or decay animation
4. stronger transactional language hierarchy
5. optional room-event ambient notices if done sparingly

## 9. Information architecture of the current site

### 9.1 Home page

Purpose:

- explain the product fast
- rank for strategy/PvP/commit-reveal search intent
- make the mechanics legible in under 30 seconds
- create premium trust before wallet interaction

Current sections:

1. top ambient strip with positioning message
2. hero with main value proposition
3. core loop summary card
4. how it works 3-step section
5. why it stands out section
6. search intent section
7. player tension section
8. FAQ section

Current emotional job:

- make the game feel skill-based
- make entry feel easy
- make depth feel real
- make replay feel intelligent

### 9.2 Lobby page

Purpose:

- present all official presets as always-on stake lanes
- show that rooms are live and updating
- reduce friction from lobby to seat entry

Major modules:

1. Program banner
2. Preset arenas explanation card
3. Persistent lobbies overview block
4. Live stats row
5. Reliability message about confirmed state and websocket refreshes
6. Grid of room cards

The lobby should feel like a board of open arenas, not a CRUD list.

### 9.3 Room page

Purpose:

- act as live game command center
- work for both players and spectators
- make every phase visible and actionable

Major modules:

1. room hero / telemetry block
2. room actions block
3. commit composer when applicable
4. reveal panel when applicable
5. spectator board
6. result analytics panel

The page should feel like a live round stage.

## 10. Page-by-page component intent

### 10.1 Program banner

Component: src/components/game/program-banner.tsx

Intent:

- establish brand and liveness immediately
- show network context and program confidence
- keep wallet entry visible

Current elements:

- brand mark with live dot
- Solana network badge
- short product positioning paragraph
- nav pills for Home, Arena, Mechanics
- RPC and program info block
- wallet button

### 10.2 Create room form block

Component: src/components/rooms/create-room-form.tsx

This is no longer a literal room creation form. It is an educational product block.

Its job is to explain:

- permanent preset lobbies
- one-signature entry
- automatic refunds/reset behavior
- why the loop is engaging

### 10.3 Room card

Component: src/components/rooms/room-card.tsx

Intent:

- compress one stake bracket into a strong tactical card
- show liveness at a glance
- make the next action obvious

Current elements:

- preset name and description
- phase badge or standby/reset badge
- stake and time window stats
- commit/reveal activity strip
- room momentum meter
- explanatory paragraph based on live state
- open/enter CTA

Important current idea:

The card should communicate not only status, but pressure.

Examples:

- fresh lobby
- seats left
- commits are live
- reveal pressure building

### 10.4 Commit composer

Component: src/components/game/commit-composer.tsx

Intent:

- make the player feel they are pricing the room, not filling a generic form
- clarify target zone, risk band, and forecast vector
- explain local storage importance for reveal

Current copy direction:

- strategic
- precise
- pressure-aware

The form should feel like a prediction console, not a checkout form.

### 10.5 Reveal panel

Component: src/components/game/reveal-panel.tsx

Intent:

- frame reveal as proof of integrity
- show the exact locked read before submission
- create a sense of opening a sealed decision

The reveal action should feel high-tension and binary: exact or invalid.

### 10.6 Room actions

Component: src/components/game/room-actions.tsx

Intent:

- explain that the protocol can keep moving without an operator
- surface available actions clearly
- make timing windows readable

Current actions include:

- cancel expired room
- force timeout
- resolve room
- claim reward

This block is half gameplay control, half trust signal.

### 10.7 Spectator board

Component: part of src/components/game/room-page.tsx

Intent:

- make the room feel socially populated
- let a viewer track seat status fast
- reward spectatorship, not just participation

The spectator board is important for streamability and “someone is here right now” energy.

### 10.8 Result analytics

Component: src/components/game/result-panel.tsx

Intent:

- explain the outcome
- create near-miss learning
- encourage immediate re-entry

Current elements:

- final histogram
- your finish card
- winning read callout
- top reads ranking

This is one of the most important upgrade surfaces for advanced UX and animation work.

## 11. Content and copy tone

The current copy direction is:

- smart
- sharp
- premium
- strategic
- not ironic
- not overhyped

Avoid copy that feels:

- spammy
- casino-bro
- fake-military
- meme-heavy
- overtechnical on first read

The voice should sound like a competitive strategy product with strong design taste.

## 12. SEO direction

The current homepage and metadata are oriented around these search buckets:

- Solana PvP game
- Solana strategy game
- crypto strategy game
- on-chain prediction game
- commit-reveal game

Structured data already exists for:

- VideoGame
- FAQPage

Metadata routes already exist for:

- robots
- sitemap
- Open Graph image
- Twitter image

If Claude pushes the design, it should preserve these SEO positions and not replace clear strategic language with generic branding fluff.

## 13. Technical UX constraints Claude should respect

1. Do not break wallet-native flows.
2. Do not add friction before entry.
3. Do not make live state less readable in pursuit of style.
4. Do not hide deadlines, statuses, or outcome explanation.
5. Do not turn result screens into decorative noise.
6. Do not remove the sense that everything is driven by confirmed on-chain state.
7. Do not regress mobile usability.

## 14. Best areas to push next

If Claude is asked to take the design further, the highest-upside areas are:

1. Hero motion and page-load staging.
2. Room card interactivity and stronger live-state transitions.
3. Commit composer as a more dramatic prediction console.
4. Reveal moment choreography.
5. Result panel storytelling and animated histogram logic.
6. Toast motion polish and event hierarchy.
7. Spectator board animation when room states change.
8. Micro-interactions on countdowns, pressure states, and CTA hover/press behavior.

## 15. Files that matter most for design work

Primary design files:

- app/globals.css
- app/layout.tsx
- app/page.tsx
- src/components/game/program-banner.tsx
- src/components/rooms/rooms-page.tsx
- src/components/rooms/room-card.tsx
- src/components/rooms/create-room-form.tsx
- src/components/game/room-page.tsx
- src/components/game/room-actions.tsx
- src/components/game/commit-composer.tsx
- src/components/game/reveal-panel.tsx
- src/components/game/result-panel.tsx
- src/components/ui/toast-provider.tsx

Gameplay/product reference files:

- WHITEPAPER.md
- FAULTLINE_PROTOCOL.md
- src/lib/faultline/constants.ts
- solpg/program/src/lib.rs

## 16. Short brief for Claude

If you need one compact prompt starter, use this:

Faultline Arena is a premium Solana PvP strategy game about reading crowd behavior, not RNG. Preserve one-transaction entry, persistent stake lobbies, deterministic commit-reveal gameplay, permissionless room progression, and clear result explainability. Push the UI toward a more cinematic, high-conviction, strategy-arena feel with stronger motion, richer live-state feedback, better result storytelling, sharper toasts, and more polished micro-interactions, while keeping the product readable, ethical, mobile-safe, and obviously on-chain.