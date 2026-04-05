# Operations Faultline

## Commit-reveal canonique

Le hash commit est calcule comme suit, dans cet ordre exact:

1. domaine ASCII FAULTLINE_COMMIT_V2
2. pubkey de room sur 32 bytes
3. pubkey du joueur sur 32 bytes
4. round_id en u64 little-endian
5. zone en u8
6. risk_band en u8
7. forecast sur 5 bytes
8. nonce sur 32 bytes

Le client TypeScript et le programme Rust doivent rester strictement alignes sur cette serialisation.

Compatibilite temporaire:

- le reveal on-chain accepte encore FAULTLINE_COMMIT_V1 pour les commits legacy deja en circulation
- tout nouveau commit frontend part en V2 avec round_id

## Etats de room

- 0 Open
- 1 Commit
- 2 Reveal
- 3 Resolved
- 4 Cancelled
- 5 Emergency
- 6 Closed

## Etats joueur

- 0 Empty
- 1 Joined
- 2 Committed
- 3 Revealed
- 4 CommitTimedOut
- 5 RevealTimedOut

## Timeouts de reference

### Commit timeout

- no-show commit: 50% refund joueur
- 50% vers reserve anti-grief
- si les joueurs actifs passent sous le minimum: room annulee et refund complet pour les committed honnetes

### Reveal timeout

- committed mais non revealed: 0% refund
- 75% vers prize pool
- 25% vers reserve

## Tie-break deterministe

Ordre exact:

1. score le plus haut
2. erreur de forecast la plus faible
3. occupation finale de zone la plus faible
4. risk band le plus agressif: Knife puis Edge puis Calm
5. pubkey lexicographiquement plus petite

## Stockage du reveal

Le frontend enregistre localement:

- room
- player
- roundId
- commitVersion
- zone
- riskBand
- forecast
- nonce
- commitHash
- createdAt

Sans cet enregistrement local, le reveal manuel est impossible.

Backup automation optionnel:

- le joueur peut aussi mirrorer explicitement ce payload vers /api/automation/commit
- ce backup est opt-in et garde le payload en clair cote serveur pour permettre auto-reveal et recovery cross-device
- si le reveal manuel reussit, le client tente ensuite de supprimer ce backup serveur

## Tests critiques actuellement presents

- parite du hash commit sur vecteur de reference
- tie-break lexicographique cote client
- distribution des payouts et du reliquat
- decode binaire d'un compte room

## Evenements protocole structures

Le programme emet maintenant une ligne de log stable et parseable sur les transitions majeures:

- prefixe: `faultline:event:v1`
- format: `type=... key=value key=value ...`
- evenements couverts: `RoomInitialized`, `PlayerJoined`, `PlayerJoinedAndCommitted`, `CommitSubmitted`, `DecisionRevealed`, `TimeoutForced`, `GameResolved`, `RewardClaimed`, `RoomCancelled`

But:

- rendre l'indexation off-chain et les surfaces watch plus fiables
- eviter de dependre uniquement de messages libres type `msg!("GameResolved")`
- versionner explicitement le schema d'evenements pour les futurs outils
