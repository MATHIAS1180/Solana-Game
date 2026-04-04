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

- landing page et listing des rooms systeme
- join + commit en une transaction
- submit commit avec hash SHA256 canonique
- stockage local et serveur du payload de reveal
- reveal decision manuel ou automatise via relayer
- resolve permissionless automatise via relayer
- force timeout automatise via relayer
- claim reward ou refund automatise via relayer
- cancel expired room automatise via relayer
- close room automatise via relayer
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
- NEXT_PUBLIC_FAULTLINE_PROGRAM_ID=7rMMERfdSFC3PJXMUytdoUGCikKLiqS7ha9ZE3KFx3Ns
- NEXT_PUBLIC_SOLANA_EXPLORER_BASE_URL=https://explorer.solana.com
- NEXT_PUBLIC_ENABLE_EMERGENCY_ACTIONS=false

Pour l'automatisation Vercel, ajouter aussi:

- FAULTLINE_RELAYER_SECRET_KEY=<SECRET_KEY_BASE58_32_OU_64_BYTES_OU_TABLEAU_JSON>
- UPSTASH_REDIS_REST_URL=<URL_UPSTASH>
- UPSTASH_REDIS_REST_TOKEN=<TOKEN_UPSTASH>
- CRON_SECRET=<SECRET_CRON_VERCEL>
- FAULTLINE_AUTOMATION_MAX_ACTIONS=25
- FAULTLINE_AUTOMATION_HEARTBEAT_INTERVAL_MS=15000

## Lancer l'application localement

1. Installer les dependances avec npm install.
2. Configurer .env.local.
3. Lancer npm run dev.
4. Ouvrir http://localhost:3000.

## Verifications utiles

- npm test execute les tests critiques du protocole client.
- npm run build valide le build de production Next.js.

## Automatisation Vercel

- le smart contract ne s'auto-execute pas tout seul sur Solana
- le depot expose une route protegee /api/automation/tick pour cron/admin et une route publique /api/automation/heartbeat declenchee automatiquement par l'app
- sur Vercel Hobby, vercel.json ne peut planifier qu'un cron quotidien
- le heartbeat navigateur evite les appels manuels tant qu'au moins un visiteur a l'app ouverte
- le relayer peut faire reveal, timeout, resolve, claim et close avec un wallet serveur
- les payloads de reveal sont synchronises dans Redis Upstash via /api/automation/commit
- les rooms de base 0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64 et 1 SOL sont recreees automatiquement par le relayer
- le programme Rust du depot verrouille aussi InitRoom sur l'autorite du reserve apres upgrade ou redeploiement du programme

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
10. CloseRoom

## Documentation complementaire

- docs/DEPLOYMENT.md pour le deploiement SolPG puis Vercel
- docs/OPERATIONS.md pour les PDAs, seeds, flux et points d'attention
