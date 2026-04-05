# Faultline Devnet

Faultline est un jeu PvP web3 sur Solana devnet base sur un commit-reveal deterministe. Les joueurs rejoignent une room, verrouillent une zone, un niveau de risque et un forecast de foule, puis revelent plus tard leur decision exacte. Le resultat depend uniquement des reveals valides. Aucun oracle, aucune RNG externe, aucun arbitre.

## Ce que contient le depot

- Frontend Next.js App Router pour Vercel dans app et src.
- Bibliotheque client Faultline dans src/lib/faultline pour les PDAs, hashes, layouts et instructions.
- Provider Solana et flux wallet dans src/lib/solana.
- Programme SolPG-compatible dans solpg/program.
- Tests critiques Vitest dans tests.
- Specifications produit et protocole dans FAULTLINE_PROTOCOL.md et WHITEPAPER.md.

## MVP inclus

- landing page et listing des rooms actives
- creation de room depuis le wallet a partir de presets simples
- join + commit en une transaction
- submit commit avec hash SHA256 canonique
- stockage local du payload de reveal
- reveal decision manuel depuis le wallet
- resolve permissionless
- force timeout permissionless
- claim reward ou refund permissionless
- cancel expired room permissionless
- reset automatique des rooms persistantes apres le dernier claim
- analytics de resultat cote frontend

## Prerequis

- Node.js 20+
- npm 10+
- un wallet Solana navigateur compatible devnet
- un programme Faultline deployee sur devnet depuis SolPG

## Variables d'environnement

Copier .env.example vers .env.local et renseigner au minimum:

- NEXT_PUBLIC_SOLANA_NETWORK=devnet
- NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
- NEXT_PUBLIC_SOLANA_EXPLORER_BASE_URL=https://explorer.solana.com
- NEXT_PUBLIC_ENABLE_EMERGENCY_ACTIONS=false

Optionnel:

- NEXT_PUBLIC_FAULTLINE_PROGRAM_ID=ESRu4YMdPS7WHRLAcwRmm1rHBFyEoMm7Qrcn6KMhCNWr

Optionnel pour un backend d'automatisation avance:

- FAULTLINE_SERVER_RPC_URL=<RPC_DEVNET_DEDIE_RECOMMANDE_POUR_LE_BACKEND>
- FAULTLINE_RELAYER_SECRET_KEY=<SECRET_KEY_BASE58_32_OU_64_BYTES_OU_TABLEAU_JSON>
- UPSTASH_REDIS_REST_URL=<URL_UPSTASH>
- UPSTASH_REDIS_REST_TOKEN=<TOKEN_UPSTASH>
- CRON_SECRET=<SECRET_CRON_VERCEL>
- FAULTLINE_AUTOMATION_MAX_ACTIONS=25
- FAULTLINE_AUTOMATION_HEARTBEAT_INTERVAL_MS=10000

Notes RPC:

- garder NEXT_PUBLIC_SOLANA_RPC_URL pour le wallet navigateur si besoin
- utiliser FAULTLINE_SERVER_RPC_URL pour un endpoint dedie cote serveur afin d'eviter les 429 du RPC public devnet
- le mode simple n'a pas besoin de relayer ni de Redis pour jouer

## Lancer l'application localement

1. Installer les dependances avec npm install.
2. Configurer .env.local.
3. Lancer npm run dev.
4. Ouvrir http://localhost:3000.

## Verifications utiles

- npm test execute les tests critiques du protocole client.
- npm run build valide le build de production Next.js.

## Mode simple

- le smart contract ne s'auto-execute pas tout seul sur Solana
- le premier joueur peut maintenant initialiser la room persistante d'un preset, la rejoindre et commit dans la meme transaction wallet
- si une room ouverte expire sous le minimum de joueurs, la transaction d'annulation peut refund tous les joueurs directement et remettre aussitot le lobby a zero
- apres une annulation ou un settlement complet, la room revient a l'etat de lobby au lieu d'etre fermee
- sans stockage local du payload commit, le reveal manuel est impossible plus tard
- toutes les actions de phase restantes sont permissionless et peuvent etre declenchees par n'importe quel visiteur
- les routes d'automatisation Vercel restent optionnelles si tu veux reintroduire un relayer plus tard

## Programme on-chain

Le programme Rust se trouve dans solpg/program/src/lib.rs.

Instructions exposees:

1. InitRoom
2. JoinRoom
3. SubmitCommit
4. RevealDecision
5. ResolveGame
6. ClaimReward
7. ForceTimeout
8. CancelExpiredRoom
9. EmergencyReturn actuellement desactive et documente comme reserve
10. CloseRoom utilise comme reset de compatibilite pour une room persistante deja soldee
11. JoinAndCommit pour le flux joueur en une seule instruction on-chain

## Documentation complementaire

- docs/DEPLOYMENT.md pour le deploiement SolPG puis Vercel
- docs/OPERATIONS.md pour les PDAs, seeds, flux et points d'attention
