# Deploiement Faultline

Ce document couvre le chemin prevu par le projet: deploiement du programme via SolPG, puis deploiement du frontend sur Vercel en pointant vers ce Program ID sur devnet.

## 1. Deployer le programme dans SolPG

### Sources a importer

- Programme: solpg/program/src/lib.rs
- Manifest: solpg/program/Cargo.toml

### Etapes

1. Ouvrir SolPG et creer un nouveau projet Rust.
2. Remplacer le contenu du projet par les fichiers du dossier solpg/program.
3. Compiler dans SolPG.
4. Deployer sur Solana devnet.
5. Recuperer le Program ID retourne par SolPG.
6. Verifier que la constante TREASURY_PUBKEY dans solpg/program/src/lib.rs correspond bien a la treasury de production.

### Comptes derives par seeds

- Room PDA: seed room + room_seed[32]
- Vault PDA: seed vault + room_pubkey
- Profile PDA: seed profile + player_pubkey
- Reserve PDA: seed reserve

### Instructions attendues

- 0 InitRoom
- 1 JoinRoom
- 2 SubmitCommit
- 3 RevealDecision
- 4 ResolveGame
- 5 ClaimReward
- 6 ForceTimeout
- 7 CancelExpiredRoom
- 8 EmergencyReturn actuellement desactive
- 9 CloseRoom

### Treasury de frais

- Les 2 pourcents de frais sont envoyes a la fin de la partie vers la treasury externe fixee dans le smart contract.
- Le compte treasury est aussi recopie dans l'etat Room pour que le frontend fournisse automatiquement le bon compte lors du resolve.
- La treasury configuree actuellement dans le contrat est 12dZBGCWRKtLnZVSc1Nxa2uUnvrbjCwpkkbbwHiybHoQ.

### Parametres room recommandes au lancement

- Duel: 2 a 2 joueurs
- Pulse: 5 a 12 joueurs
- Swarm: 12 a 32 joueurs
- Faultline Max: 25 a 128 joueurs

Les presets publics sont definis dans src/lib/faultline/constants.ts.

## 2. Configurer le frontend local

1. Copier .env.example vers .env.local.
2. NEXT_PUBLIC_FAULTLINE_PROGRAM_ID doit pointer vers 7rMMERfdSFC3PJXMUytdoUGCikKLiqS7ha9ZE3KFx3Ns.
3. Verifier NEXT_PUBLIC_SOLANA_RPC_URL.
4. Installer les dependances avec npm install.
5. Lancer npm run dev.

## 3. Deployer sur Vercel

### Variables d'environnement Vercel

Configurer les variables suivantes dans le projet Vercel:

- NEXT_PUBLIC_SOLANA_NETWORK=devnet
- NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
- NEXT_PUBLIC_FAULTLINE_PROGRAM_ID=7rMMERfdSFC3PJXMUytdoUGCikKLiqS7ha9ZE3KFx3Ns
- NEXT_PUBLIC_SOLANA_EXPLORER_BASE_URL=https://explorer.solana.com
- NEXT_PUBLIC_ENABLE_EMERGENCY_ACTIONS=false
- FAULTLINE_RELAYER_SECRET_KEY=<SECRET_KEY_BASE58_OU_JSON_64_BYTES>
- UPSTASH_REDIS_REST_URL=<URL_UPSTASH>
- UPSTASH_REDIS_REST_TOKEN=<TOKEN_UPSTASH>
- CRON_SECRET=<SECRET_PARTAGE_AVEC_VERCEL_CRON>
- FAULTLINE_AUTOMATION_MAX_ACTIONS=25

### Relayer automatique

- Ajouter une integration Redis Upstash depuis le Marketplace Vercel.
- Renseigner les variables UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN.
- Renseigner FAULTLINE_RELAYER_SECRET_KEY avec la cle privee du wallet serveur.
- Configurer CRON_SECRET dans Vercel pour proteger /api/automation/tick.
- Le fichier vercel.json declenche ensuite le tick automatiquement chaque minute.

### Build

- commande d'installation: npm install
- commande de build: npm run build
- output: Next.js standard

## 4. Checklist de verification apres deploiement

1. Le bandeau du site affiche devnet et le bon Program ID.
2. La page Rooms charge sans erreur RPC.
3. Une room peut etre creee depuis un wallet devnet finance.
4. Un second wallet peut rejoindre.
5. Le commit cree bien une entree locale IndexedDB et la transaction passe.
6. Le flux Join + Commit peut se faire en une seule transaction depuis une room ouverte.
7. Le commit synchronise bien le payload reveal vers le backend Redis.
8. Le relayer Vercel fait automatiquement reveal, timeout, resolve, claim et close.
9. Resolve route les 2 pourcents de frais vers la treasury configuree.
10. Claim et CloseRoom vident correctement les rewards restants.

## 5. Limitations connues de l'environnement de developpement

- Le frontend et les tests TypeScript sont validables dans ce depot avec npm test et npm run build.
- La compilation Rust n'est pas executable dans tous les environnements de travail si cargo n'est pas installe. Le chemin cible pour l'owner reste SolPG.
