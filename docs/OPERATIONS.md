# Operations Faultline

## Commit-reveal canonique

Le hash commit est calcule comme suit, dans cet ordre exact:

1. domaine ASCII FAULTLINE_COMMIT_V1
2. pubkey de room sur 32 bytes
3. pubkey du joueur sur 32 bytes
4. zone en u8
5. risk_band en u8
6. forecast sur 5 bytes
7. nonce sur 32 bytes

Le client TypeScript et le programme Rust doivent rester strictement alignes sur cette serialisation.

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

Le frontend enregistre localement et synchronise aussi cote serveur:

- room
- player
- zone
- riskBand
- forecast
- nonce
- commitHash
- createdAt

Sans cet enregistrement, le reveal automatique par relayer est impossible. Sans l'enregistrement local, le reveal manuel est aussi impossible.

## Tests critiques actuellement presents

- parite du hash commit sur vecteur de reference
- tie-break lexicographique cote client
- distribution des payouts et du reliquat
- decode binaire d'un compte room
