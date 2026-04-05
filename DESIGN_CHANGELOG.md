# FAULTLINE ARENA - DESIGN CHANGELOG

## Summary
This pass focused on structural redesign work that unlocks the broader visual refactor without breaking the live Solana game loop. The app now has the missing route architecture for arena, how-it-works, and profile aliases, stronger SEO metadata coverage, themed loading and 404 states, and reusable UI primitives for navigation and loading skeletons. The global design system was expanded with a fuller token vocabulary so future component refactors can stop hardcoding one-off values. Backend coverage also improved with missing stats and profile API endpoints.

## Files Modified
- app/globals.css - Expanded the design token layer with color, spacing, radius, shadow, z-index, timing, ambient, and skeleton primitives.
- app/layout.tsx - Reworked site-wide metadata defaults, title template, canonical handling, authorship, and social metadata.
- app/page.tsx - Updated homepage SEO copy and pointed primary conversion paths to arena and how-it-works.
- app/leaderboard/page.tsx - Added dedicated metadata for leaderboard indexing and sharing.
- app/watch/page.tsx - Added dedicated metadata for the watch surface.
- app/reserve/page.tsx - Added dedicated metadata for the reserve console.
- app/rooms/[room]/page.tsx - Switched room pages from noindex to indexable for transparency.
- app/sitemap.ts - Added arena and how-it-works to the sitemap.
- src/components/game/program-banner.tsx - Shifted navigation toward the new page architecture, made the banner sticky, and wired reusable live-dot and wallet-button primitives.

## Files Created
- app/arena/page.tsx - Added the public arena route as the canonical lobby entry point.
- app/arena/loading.tsx - Added a themed loading state for the arena route.
- app/how-it-works/page.tsx - Added the long-form explanatory page with FAQ JSON-LD.
- app/how-it-works/loading.tsx - Added a themed loading state for the guide route.
- app/profile/[wallet]/page.tsx - Added the profile alias route that mirrors the existing player page.
- app/profile/[wallet]/loading.tsx - Added a themed loading state for the profile alias.
- app/loading.tsx - Added a root-level branded loading state.
- app/not-found.tsx - Added a branded 404 experience.
- app/players/[wallet]/loading.tsx - Added a themed loading state for player profiles.
- app/rooms/[room]/loading.tsx - Added a themed loading state for live rooms.
- app/api/stats/route.ts - Added global platform stats for hero and overview surfaces.
- app/api/profile/[wallet]/route.ts - Added a profile API endpoint for player dossier data.
- src/components/ui/live-dot.tsx - Added a reusable live status dot primitive.
- src/components/ui/skeleton.tsx - Added a reusable shimmer skeleton primitive.
- src/components/ui/stat-card.tsx - Added a reusable metric card primitive.
- src/components/ui/countdown.tsx - Added a reusable countdown primitive with urgency states.
- src/components/ui/wallet-button.tsx - Added a wrapper primitive for wallet connection UI.
- src/components/ui/page-skeleton.tsx - Added a reusable full-page loading shell.

## Design Decisions
- Arena was introduced as an alias instead of replacing rooms immediately: this preserves existing links and gameplay flows while aligning the public information architecture with the new product framing.
- Profile was introduced as an alias instead of moving players outright: this avoids breaking internal links and lets both paths coexist during transition.
- The design system was expanded by adding tokens alongside the current arena variables: this is safer than replacing all existing variables in one pass and keeps current styling stable.
- The sticky ProgramBanner was upgraded instead of replaced: this preserves wallet integration and live environment context while improving navigation utility.
- Loading states use reusable skeleton primitives instead of route-specific ad hoc markup: this makes future route loading files cheap to add and consistent by default.

## Information Architecture Changes
- Added a dedicated arena entry route at /arena for the lobby experience.
- Added a dedicated explanatory route at /how-it-works.
- Added a profile alias at /profile/[wallet] while preserving /players/[wallet].
- Added branded loading and not-found states so the app no longer drops to generic or blank transitions on major route boundaries.
- Reoriented global navigation toward Home, Arena, How It Works, Leaderboard, and Watch.

## SEO Changes
- app/layout.tsx now carries stronger defaults for title, description, creator, canonical, and social metadata.
- app/page.tsx copy was updated to target Solana PvP game and on-chain prediction intent more directly.
- app/leaderboard/page.tsx now exports page-specific metadata.
- app/watch/page.tsx now exports page-specific metadata.
- app/reserve/page.tsx now exports page-specific metadata.
- app/how-it-works/page.tsx now exports page-specific metadata and FAQPage JSON-LD.
- app/rooms/[room]/page.tsx now allows indexing.
- app/sitemap.ts now includes /arena and /how-it-works.

## Animations Added
- Global ambient grid drift in app/globals.css: slow background movement for premium atmosphere.
- Global shimmer skeleton animation in app/globals.css: themed loading feedback for route transitions.
- Sticky banner behavior in src/components/game/program-banner.tsx: improves persistent navigation presence without new motion complexity.

## Missing Data / Backend Requirements
- /api/leaderboard still lacks true period and stake-segmented aggregates because the current persistent metagame snapshot is global and not indexed by those dimensions.
- A richer /api/profile payload with time-series PnL, risk-band hit rates, favorite zone, and streaks requires stronger historical indexing than the current dossier snapshot exposes.
- The how-it-works page still uses editorial explanation rather than fully interactive worked examples because there is no dedicated teaching dataset or reusable simulation component yet.
- Home live stats still rely on existing server snapshots; a richer stats cadence may require caching or a dedicated analytics aggregation layer.

## Known Issues / Not Implemented
- The full component-library migration requested in the prompt is not complete yet. Existing large gameplay components still contain monolithic UI logic rather than being fully rebuilt on top of the new primitives.
- Not every major route has its own bespoke loading file yet; the most important user-facing segments now do, plus the root app loading state.
- /api/leaderboard query-param support for period and stake was not implemented because the necessary segmented backend data is not available yet and returning fake filtered rankings would be misleading.
- The complete room/result choreography redesign described in the prompt was not replaced end-to-end in this pass; current live-room functionality remains intact and stable.

## Performance Notes
- The new loading states are lightweight and CSS-based, avoiding heavy client-side animation libraries.
- The new arena/profile aliases reuse existing server components instead of duplicating gameplay logic, limiting bundle growth.
- Build remains green and tests remain green after the route, metadata, and UI-primitive additions.
