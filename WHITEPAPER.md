# Faultline Whitepaper

Version: 0.1
Date: 2026-04-04
Statut: draft de reference pour implementation complete

## Resume executif

Faultline est un jeu competitif on-chain sur Solana dans lequel chaque joueur doit predire comment les autres joueurs vont se repartir entre plusieurs zones, choisir sa propre zone, verrouiller cette decision via commit-reveal, puis laisser le programme calculer un resultat deterministe a partir des seules decisions humaines revelees.

Le protocole ne depend d'aucun oracle, d'aucune RNG externe, d'aucun moderateur et d'aucune source off-chain pour produire un resultat. La seule incertitude du systeme vient du comportement humain. Cette contrainte n'est pas un detail technique. C'est le coeur du produit, du moat, de la these legale et de la securite du jeu.

L'objectif de ce whitepaper est de fournir un document suffisamment precis pour permettre le developpement de Faultline de A a Z, incluant:

- la philosophie produit;
- les regles formelles du jeu;
- la machine d'etat on-chain;
- la specification des comptes, PDAs et instructions;
- la couche cryptographique commit-reveal;
- l'economie du protocole;
- l'integration frontend et indexation;
- le plan de tests, securite et deploiement.

Ce document est volontairement normatif. Sauf mention contraire, il doit etre considere comme la source de verite du protocole cible.

## 1. Philosophie de conception

### 1.1 Contraintes fondatrices

Faultline est bati sur six contraintes non negotiables:

1. Le resultat doit etre calcule a partir des seules decisions revelees des joueurs.
2. Le programme doit rester permissionless pour les actions critiques de progression de partie.
3. Toute information strategique d'une manche en cours doit rester opaque avant la phase reveal.
4. Toute defaite doit etre auditable et explicable a posteriori.
5. La skill doit venir de la lecture des humains, pas d'une source de hasard ou d'une vitesse d'execution hors de proportion.
6. Les fonds doivent rester dans des PDAs controles par des regles deterministes, avec un mode d'urgence qui rend aux joueurs ce qui peut l'etre au lieu de confisquer.

### 1.2 Interaction humaine cible

Faultline ne cherche pas a simuler un duel, une execution mecanique, ou une deduction narrative. Il exploite une interaction humaine plus rare: l'anticipation de congestion sociale. Le joueur doit choisir une position rentable dans un systeme ou la valeur diminue si trop de monde fait le meme choix.

Cette interaction existe dans des contextes reels non ludiques:

- choisir une file d'attente;
- prendre une position de marche avant les autres;
- adopter une mode avant sa saturation;
- trouver une ligne d'echappement lorsque tout le monde pense faire la meme chose.

Le coeur cognitif du jeu n'est pas "je lis les regles" mais "je lis la maniere dont les autres vont lire les autres".

### 1.3 Proposition produit

Faultline veut etre percu comme:

- un concours de prediction strategique et non un jeu de hasard;
- un spectacle socialement lisible en moins de 30 secondes;
- un protocole meilleur apres 10,000 parties qu'au jour 1, parce que l'historique on-chain cree une memoire collective exploitable;
- une base on-chain assez rigoureuse pour soutenir des frontends, des dashboards, des modes spectateurs, des profils, des classements et une meta durable.

## 2. Vue d'ensemble du jeu

### 2.1 Pitch court

Les joueurs predisent comment la foule va se repartir, choisissent une zone et un niveau de risque en secret, puis le protocole revele et classe les meilleurs lecteurs de congestion.

### 2.2 Structure d'une manche

Une manche Faultline suit ce cycle:

1. Creation de room.
2. Join des joueurs avec une mise uniforme.
3. Phase commit, ou chaque joueur soumet un hash SHA256 de sa decision.
4. Phase reveal, ou chaque joueur publie sa decision complete et son nonce.
5. Resolution permissionless et deterministe.
6. Claim des rewards ou remboursements.
7. Fermeture et garbage collection de la room.

### 2.3 Ce que choisit un joueur

Chaque joueur soumet quatre elements logiques:

1. `zone`: une zone parmi `A, B, C, D, E`.
2. `risk_band`: un niveau de risque parmi `Calm, Edge, Knife`.
3. `forecast`: un vecteur de 5 entiers representant la repartition finale predite de la room.
4. `nonce`: 32 bytes aleatoires pour securiser le commit.

Le joueur ne cherche pas seulement a choisir une zone faiblement peuplee. Il cherche aussi a predire correctement la distribution globale. La zone choisie agit comme un levier de multiplicateur. Le forecast agit comme la base de score analytique.

## 3. Regles formelles du protocole de jeu

### 3.1 Parametres globaux de v1

Parametres proposes pour la version de reference:

- nombre de zones: 5;
- min players par room: configurable entre 2 et 16 selon preset;
- max players par room: 128;
- mise uniforme par room: configurable a la creation;
- commit hash: SHA256;
- encode des multiplicateurs en basis points;
- phases temporelles mesurees en slots Solana;
- aucun reveal partiel, aucune edition de decision apres reveal valide.

### 3.2 Presets de room recommandes

Pour le lancement, le produit doit limiter les presets pour garder une meta lisible.

Presets recommandes:

1. Duel
- min 2, max 2
- stake faible
- join window courte
- commit window courte
- reveal window courte

2. Pulse
- min 5, max 12
- stake faible a moyen
- preset grand public

3. Swarm
- min 12, max 32
- stake moyen
- format streamer ideal

4. Faultline Max
- min 25, max 128
- stake variable
- format haute intensite / gros jackpot

Le protocole supporte une configuration libre, mais le frontend public doit initialement n'exposer que des presets validant l'equilibre produit.

### 3.3 Forecast

Le forecast est un tableau fixe de 5 entiers non signes `forecast[5]` tel que:

- chaque composant est un `u8`;
- chaque composant est compris entre `0` et `max_players`;
- la somme des 5 composantes est comprise entre `min_players` et `max_players`;
- la somme represente le nombre de joueurs actifs final prevu par le joueur.

Exemple valide pour une room max 20:

- `[3, 5, 4, 2, 6]`, somme = 20.

Exemple valide si le joueur anticipe des forfaits reveal:

- `[2, 4, 3, 1, 4]`, somme = 14.

Exemple invalide:

- `[7, 7, 7, 7, 7]`, somme > `max_players`.

### 3.4 Risk bands

Le jeu comporte trois niveaux de risque.

#### Calm

- multiplicateur si reveal valide: `10000` bps;
- condition: aucune;
- role produit: entree de gamme, onboarding, ancre psychologique de securite.

#### Edge

- multiplicateur si la zone du joueur appartient aux 2 zones les moins peuplees: `15500` bps;
- multiplicateur sinon: `2500` bps;
- role produit: risque tactique lisible, coeur du midgame.

#### Knife

- multiplicateur si la zone du joueur appartient au minimum absolu d'occupation: `24000` bps;
- multiplicateur sinon: `0` bps;
- role produit: declaration de lecture aggressive, contenu streamer, moment clipable.

### 3.5 Histogramme reel

Lors de la resolution, le programme calcule l'histogramme reel `H[5]`:

- `H[z]` = nombre de joueurs actifs ayant revele une zone `z` valide.
- Les joueurs non reveales apres timeout sont exclus de `H` et marques forfaits.
- Les joueurs annules avant le demarrage de la room ne font pas partie de `H`.

### 3.6 Score exact

Soit:

- `N` = nombre de joueurs actifs retenus pour la resolution;
- `forecast_i[z]` = prediction du joueur `i` pour la zone `z`;
- `H[z]` = histogramme reel.

On definit:

`error_i = sum(abs(forecast_i[z] - H[z]))` pour `z` dans `0..4`.

`base_i = max(1, 5 * N - error_i)`.

`mult_i` depend du risk band et de la congestion finale de la zone choisie.

`score_i_bps = base_i * mult_i`.

Implementation conseillee:

- `base_i` en `u16` ou `u32`;
- `mult_i` en `u16` basis points;
- `score_i_bps` en `u32` ou `u64`.

### 3.7 Tie-break deterministic

Le classement final suit exactement cet ordre:

1. score le plus eleve;
2. erreur de forecast la plus faible;
3. occupation finale de la zone choisie la plus faible;
4. risk band le plus agressif, avec ordre `Knife > Edge > Calm`;
5. pubkey lexicographiquement plus petite.

Le tie-break doit etre strictement deterministic et documente dans le code.

### 3.8 Payout ladder

Le pot distribuable est defini comme:

`distributable = total_stakes - reserve_fee - slashed_to_reserve`

Le frontend affiche ce montant de maniere transparente.

Ladder de reference:

- si `2 <= N <= 4`: `90% / 8%` et `2% reserve`
- si `5 <= N <= 24`: `72% / 18% / 8%` et `2% reserve`
- si `25 <= N <= 128`: `64% / 20% / 10% / 4%` et `2% reserve`

Le reliquat d'arrondi doit suivre une regle simple et stable. Recommandation v1:

- arrondi vers le bas pour chaque reward;
- reliquat final route vers `rank 1`.

Cette regle doit etre testee et rendue explicite dans le code et dans l'interface.

### 3.9 Annulation de room

Une room est annulee si:

- le minimum de joueurs n'est pas atteint avant `join_deadline_slot`;
- ou si la phase commit est timeoutee et que le nombre de joueurs encore actifs descend sous `min_players`.

Effets d'annulation:

- les joueurs honnetes recuperent 100% de leur mise si la room n'a jamais atteint une phase jouable stable;
- les no-show commit peuvent subir une retention partielle pour rendre le griefing couteux;
- la room passe en mode refund claimable;
- elle ne peut plus etre resolue comme une manche valide.

### 3.10 Timeouts

Le protocole comporte deux familles de timeout.

#### Commit timeout

Si un joueur a join mais ne commit pas dans la fenetre commit:

- il est marque `CommitTimedOut`;
- il peut perdre une partie de sa mise selon la politique anti-grief;
- si le nombre d'actifs restants descend sous `min_players`, la room est annulee.

Recommandation v1:

- joueur commit-timeout recupere `50%` de sa mise;
- `50%` est route vers la reserve anti-grief;
- si la room est annulee suite a cela, les joueurs ayant effectivement commit recouvrent `100%`.

#### Reveal timeout

Si un joueur a commit mais ne reveal pas avant `reveal_deadline_slot`:

- il est marque `RevealTimedOut`;
- il est exclu de l'histogramme reel;
- il ne recupere aucun remboursement;
- sa mise est splitee selon la politique de penalite.

Recommandation v1:

- `75%` de sa mise est ajoute au prize pool;
- `25%` de sa mise va a la reserve free access.

### 3.11 Emergency return

Le protocole doit disposer d'un chemin d'urgence activable uniquement par un multisig externe `3/5` soumis a un timelock de `72h`.

Ce mecanisme n'est pas une fonction d'arbitrage du resultat. Il ne sert qu'a restituer les fonds de maniere predictable si un incident logiciel, un bug critique ou un defaut d'upgrade rend certaines rooms non fiables.

Regles:

- aucun fonds ne peut etre confisque par l'equipe;
- seuls des remboursements ou retours pro-rata sont autorises;
- l'activation doit etre visible et journalee on-chain;
- le frontend doit clairement afficher l'etat d'urgence.

## 4. Experience joueur

### 4.1 Boucle de jeu

La boucle mentale du joueur suit six etapes:

1. Il voit la taille de la room et les profils publics presents.
2. Il forme une hypothese sur la repartition probable de la foule.
3. Il choisit un niveau de risque qui amplifie sa lecture.
4. Il commit sans savoir si sa prediction est isolee ou commune.
5. Il attend le reveal de tous.
6. Il comprend exactement pourquoi il gagne ou perd.

Cette boucle explique la retention. La defaite n'est pas opaque. Elle est causale.

### 4.2 Experience par taille de room

#### A 2 joueurs

- experience de duel;
- peu de bruit statistique;
- forte part de lecture psychologique directe;
- `Knife` ressemble a une declaration de domination.

#### A 5 joueurs

- naissance de la congestion;
- debut de la meta sur la prudence et l'ego;
- les erreurs de forecast restent lisibles.

#### A 25 joueurs

- la partie bascule dans l'analyse de sous-groupes;
- les regulars commencent a devenir des objets strategiques;
- le forecast devient un vrai instrument de skill.

#### A 100+ joueurs

- experience macro;
- lecture de cohortes, d'heures, de profils de risque;
- la meta historique devient elle-meme un asset cognitif.

### 4.3 Pourquoi le joueur rejoue

Faultline active plusieurs ressorts, mais le principal est l'attribution causale.

Le joueur ne pense pas: "j'ai perdu, dommage".

Il pense plutot:

- "j'ai bien lu la zone mais mal lu la taille du groupe";
- "j'aurais du jouer Edge et pas Knife";
- "ce wallet overplay toujours la zone C en room dense".

Cette qualite de post-mortem doit etre preservee dans tout le design produit, des evenements aux ecrans de resultats.

## 5. Machine d'etat du protocole

### 5.1 Etats de room

Reference v1:

```text
Open -> Commit -> Reveal -> Resolved -> Closed
Open -> Cancelled -> Closed
Commit -> Cancelled -> Closed
Open/Commit/Reveal/Resolved -> Emergency -> Closed
```

Definitions:

- `Open`: join autorise, aucun commit n'a encore verrouille la room.
- `Commit`: room scellee, commits attendus.
- `Reveal`: reveals attendus.
- `Resolved`: classement et rewards calcules.
- `Cancelled`: room annulee, seulement des remboursements restent a claim.
- `Emergency`: voie d'urgence, seulement des retours definis restent possibles.
- `Closed`: comptes garbage-collected.

### 5.2 Etats de joueur dans une room

Reference v1:

- `Empty`
- `Joined`
- `Committed`
- `Revealed`
- `CommitTimedOut`
- `RevealTimedOut`
- `RefundClaimed`
- `RewardClaimed`

Une implementation compacte peut encoder cela en `u8` avec un enum ferme.

### 5.3 Transitions autorisees

- `Empty -> Joined`
- `Joined -> Committed`
- `Joined -> CommitTimedOut`
- `Committed -> Revealed`
- `Committed -> RevealTimedOut`
- `Revealed -> RewardClaimed`
- `CommitTimedOut -> RefundClaimed`
- `Cancelled -> RefundClaimed`
- `Emergency -> RefundClaimed`

Aucune transition inverse n'est autorisee.

### 5.4 Invariants critiques

Le programme doit maintenir ces invariants en permanence:

1. Un joueur ne peut apparaitre qu'une seule fois dans une room.
2. Un join_index attribue est stable pour toute la vie de la room.
3. Un commit stocke est immuable.
4. Un reveal ne peut reussir qu'une fois et uniquement si le commit matche.
5. Une room `Resolved`, `Cancelled` ou `Emergency` ne peut plus accepter de commit ni de reveal.
6. La somme des depots du vault doit toujours se decomposer en montants claimables, reserve deja routee, ou soldes restants.
7. Un claim ne peut etre execute qu'une fois.
8. Le calcul du resolve est purement derive des donnees de room.

## 6. Architecture on-chain

### 6.1 Programmes et composants

Composants minimaux de v1:

1. Un programme Anchor Faultline.
2. Un indexeur d'evenements ou une couche d'aggregation hors-chaine.
3. Un frontend web.
4. Un SDK TypeScript.
5. Un multisig externe pour l'upgrade authority et l'emergency path.

Le coeur de confiance reste dans le programme et ses PDAs. L'indexeur et le frontend ne doivent jamais etre des dependances de l'execution du jeu.

### 6.2 PDAs

PDAs de reference:

1. `RoomState`
- seeds: `[b"room", room_seed]`
- role: config, participants, commits, reveals, scores, rewards, status

2. `Vault`
- seeds: `[b"vault", room_state.key()]`
- role: escrow des mises et soldes de room

3. `ProfileState`
- seeds: `[b"profile", player_pubkey]`
- role: stats persistantes par wallet

4. `ReserveState`
- seeds: `[b"reserve"]`
- role: reserve protocol, free access, anti-grief

5. `EmergencyConfig`
- seeds: `[b"emergency-config"]`
- role: autorite multisig et parametres globaux d'urgence

6. `ConfigState` optionnel
- seeds: `[b"config"]`
- role: versioning, presets autorises, fees globaux, toggles de lancement

### 6.3 Structure logique de RoomState

Recommendation v1: utiliser une structure a tableaux fixes plutot qu'un `Vec<PlayerEntry>` pour reduire l'overhead de serialisation et garder une taille previsible.

#### Champs logiques

Header:

- `version: u8`
- `room_bump: u8`
- `vault_bump: u8`
- `status: u8`
- `zone_count: u8`
- `min_players: u8`
- `max_players: u8`
- `player_count: u8`
- `committed_count: u8`
- `revealed_count: u8`
- `active_count: u8`
- `winner_count: u8`
- `stake_lamports: u64`
- `created_slot: u64`
- `join_deadline_slot: u64`
- `commit_deadline_slot: u64`
- `reveal_deadline_slot: u64`
- `resolve_slot: u64`
- `creator: Pubkey`
- `vault: Pubkey`
- `reserve: Pubkey`
- `room_seed: [u8; 32]`
- `final_histogram: [u8; 5]`
- `winner_indices: [u8; 4]`
- `payout_bps: [u16; 4]`

Participants en tableaux paralleles de taille `MAX_PLAYERS = 128`:

- `player_keys: [Pubkey; 128]`
- `player_status: [u8; 128]`
- `player_zone: [u8; 128]`
- `player_risk: [u8; 128]`
- `player_commit_hashes: [[u8; 32]; 128]`
- `player_forecasts: [[u8; 5]; 128]`
- `player_errors: [u16; 128]`
- `player_scores_bps: [u32; 128]`
- `player_rewards_lamports: [u64; 128]`

#### Taille approximative

Estimation brute:

- header et metadata: ~180 bytes
- pubkeys joueurs: 4096 bytes
- statuses, zones, risks: 384 bytes
- commit hashes: 4096 bytes
- forecasts: 640 bytes
- errors: 256 bytes
- scores: 512 bytes
- rewards: 1024 bytes
- total + discriminator + marge: ~11.2 KB a ~11.8 KB

Cette taille reste raisonnable pour une room haute densite sur Solana, surtout si le rent est recupere a la fermeture.

### 6.4 Structure logique de ProfileState

Champs recommandes:

- `version: u8`
- `bump: u8`
- `flags: u16`
- `owner: Pubkey`
- `games_joined: u32`
- `games_committed: u32`
- `games_revealed: u32`
- `games_resolved: u32`
- `games_won: u32`
- `top1_count: u32`
- `top2_count: u32`
- `top3_count: u32`
- `calm_count: u32`
- `edge_count: u32`
- `knife_count: u32`
- `knife_hits: u32`
- `commit_timeout_count: u16`
- `reveal_timeout_count: u16`
- `cumulative_abs_error: u64`
- `cumulative_profit_lamports: i64`
- `last_free_access_slot: u64`
- `last_game_slot: u64`
- `reserved: [u8; 16]`

Usage:

- affichage profil;
- conditions de reserve free access;
- dashboards reputations;
- metagame et retention.

### 6.5 Structure logique de ReserveState

Champs recommandes:

- `version: u8`
- `bump: u8`
- `paused: bool`
- `free_access_enabled: bool`
- `total_collected_lamports: u64`
- `total_distributed_lamports: u64`
- `anti_grief_collected_lamports: u64`
- `reveal_timeout_collected_lamports: u64`
- `free_access_distributed_lamports: u64`
- `authority: Pubkey`

### 6.6 Structure logique de EmergencyConfig

Champs recommandes:

- `version: u8`
- `bump: u8`
- `timelock_slots_min: u64`
- `emergency_multisig: Pubkey`
- `upgrade_multisig: Pubkey`
- `can_new_rooms_be_created: bool`
- `can_existing_rooms_progress: bool`
- `reserved: [u8; 30]`

## 7. Schema cryptographique commit-reveal

### 7.1 Objectif

Le commit-reveal de Faultline doit garantir:

- l'opacite strategique pendant la phase commit;
- l'impossibilite de changer sa decision apres coup;
- l'impossibilite de rejouer un commit ou un reveal dans une autre room;
- une verification simple et auditable on-chain.

### 7.2 Payload canonique du commit

Le commit est `SHA256` de la concatenation stricte des bytes suivants, dans cet ordre:

1. `FAULTLINE_COMMIT_V1` en ASCII
2. `room_pubkey` sur 32 bytes
3. `player_pubkey` sur 32 bytes
4. `join_index` encode en `u16` little-endian
5. `zone` encode en `u8`
6. `risk_band` encode en `u8`
7. `forecast[0]` en `u8`
8. `forecast[1]` en `u8`
9. `forecast[2]` en `u8`
10. `forecast[3]` en `u8`
11. `forecast[4]` en `u8`
12. `nonce` sur 32 bytes

Domain separation obligatoire:

- le prefixe `FAULTLINE_COMMIT_V1` ne doit jamais changer au sein d'une version de commit;
- si la version evolue, un nouveau domain separator doit etre introduit.

### 7.3 Nonce

Regles:

- 32 bytes choisis cote client avec une source cryptographiquement forte;
- non stocke avant reveal;
- utilise une seule fois;
- les nonces tous-zero peuvent etre refuses en hygiene protocolaire.

### 7.4 Verification on-chain

Le programme doit:

1. reconstruire le payload en bytes dans le meme ordre;
2. recalculer le SHA256;
3. comparer le hash au commit stocke;
4. refuser toute divergence.

### 7.5 Proprietes de securite

Ce schema neutralise:

- la lecture mempool du contenu strategique;
- le replay inter-room;
- le replay inter-joueur;
- la modification du forecast apres observation de reveals adverses.

## 8. Specification des instructions

### 8.1 InitRoom

#### Args

```text
room_seed: [u8; 32]
stake_lamports: u64
min_players: u8
max_players: u8
join_window_slots: u64
commit_window_slots: u64
reveal_window_slots: u64
preset_id: u8
```

#### Comptes

- `creator: Signer`
- `room_state: init, seeds = [b"room", room_seed]`
- `vault: init, seeds = [b"vault", room_state.key()]`
- `reserve: mut, seeds = [b"reserve"]`
- `config: optional, seeds = [b"config"]`
- `system_program`

#### Preconditions

- `stake_lamports > 0`
- `2 <= min_players <= max_players <= 128`
- toutes les windows > 0
- si `config` existe, le preset doit etre autorise

#### Postconditions

- room creee en statut `Open`
- deadlines initialisees
- vault cree
- payout ladder derive de `max_players` ou du preset

#### Evenement

- `RoomInitialized`

#### Budget CU cible

- 20k a 35k

### 8.2 JoinRoom

#### Args

- aucun

#### Comptes

- `player: Signer`
- `room_state: mut`
- `vault: mut`
- `profile: init_if_needed, seeds = [b"profile", player.key()]`
- `system_program`

#### Preconditions

- room en statut `Open`
- slot courant <= `join_deadline_slot`
- `player_count < max_players`
- le joueur n'est pas deja inscrit

#### Postconditions

- transfert de la mise vers le vault
- attribution d'un `join_index`
- maj `games_joined`

#### Evenement

- `PlayerJoined`

#### Budget CU cible

- 25k a 40k

### 8.3 SubmitCommit

#### Args

```text
commit_hash: [u8; 32]
```

#### Comptes

- `player: Signer`
- `room_state: mut`
- `profile: mut`

#### Preconditions

- room en statut `Open` ou `Commit`
- joueur deja `Joined`
- joueur pas deja `Committed`
- si room encore `Open`, alors `player_count >= min_players`

#### Postconditions

- si premier commit, room passe en `Commit`
- `commit_deadline_slot` est fixe si necessaire
- hash stocke de maniere immuable
- statut joueur -> `Committed`

#### Evenement

- `CommitSubmitted`

#### Budget CU cible

- 20k a 30k

### 8.4 StartRevealPhase optionnel

Cette instruction est optionnelle. Deux approches sont possibles:

1. phase reveal implicite, activee automatiquement lorsque tous les commits attendus sont recues ou au premier reveal apres commit window;
2. phase reveal explicite via instruction `StartRevealPhase` permissionless.

Recommendation v1: utiliser une transition implicite pour limiter le nombre d'instructions. Le code doit neanmoins modeliser l'etat `Reveal` explicitement.

### 8.5 RevealDecision

#### Args

```text
zone: u8
risk_band: u8
forecast: [u8; 5]
nonce: [u8; 32]
```

#### Comptes

- `player: Signer`
- `room_state: mut`
- `profile: mut`

#### Preconditions

- room en statut `Commit` ou `Reveal`
- joueur en statut `Committed`
- slot courant <= `reveal_deadline_slot`
- `forecast` valide
- hash reconstruit == commit stocke

#### Postconditions

- room passe en `Reveal` si ce n'etait pas deja le cas
- zone, risk, forecast ecrits dans les tableaux
- statut joueur -> `Revealed`
- compteurs mis a jour
- maj stats de profile au moment opportun

#### Evenement

- `DecisionRevealed`

#### Budget CU cible

- 35k a 55k

### 8.6 ForceTimeout

#### Args

- aucun

#### Comptes

- `caller: Signer`
- `room_state: mut`
- `vault: mut`
- `reserve: mut`

#### Preconditions

- room non `Resolved`, non `Closed`
- slot courant > deadline pertinente

#### Postconditions commit phase

- les `Joined` non commits deviennent `CommitTimedOut`
- si actifs < min, room -> `Cancelled`
- sinon room -> `Reveal`

#### Postconditions reveal phase

- les `Committed` non reveals deviennent `RevealTimedOut`
- leurs penalites sont comptabilisees
- room reste eligible a `ResolveGame`

#### Evenement

- `TimeoutForced`

#### Budget CU cible

- 35k a 80k

### 8.7 ResolveGame

#### Args

- aucun

#### Comptes

- `caller: Signer`
- `room_state: mut`
- `vault: mut`
- `reserve: mut`

#### Preconditions

- room pas encore resolue
- room pas en `Cancelled`
- room pas en `Emergency`
- tous les reveals possibles ont ete traites, ou la deadline est passee et les no-show ont ete forces
- `active_count >= min_players`

#### Postconditions

- calcul histogramme reel
- calcul erreurs
- calcul scores
- tri des joueurs actifs
- calcul rewards exacts
- room -> `Resolved`
- `resolve_slot` enregistre

#### Evenement

- `GameResolved`

#### Budget CU cible

- 130k a 170k a 128 joueurs

### 8.8 ClaimReward

#### Args

- aucun

#### Comptes

- `player: Signer`
- `room_state: mut`
- `vault: mut`
- `system_program`

#### Preconditions

- room en `Resolved`, `Cancelled` ou `Emergency`
- joueur a un montant claimable > 0
- joueur pas deja claim

#### Postconditions

- `claimed` logique materialise via status ou flag
- transfert vers le joueur

#### Evenement

- `RewardClaimed` ou `RefundClaimed`

#### Budget CU cible

- 15k a 25k

### 8.9 CancelExpiredRoom

#### Args

- aucun

#### Comptes

- `caller: Signer`
- `room_state: mut`
- `vault: mut`

#### Preconditions

- room en `Open`
- `current_slot > join_deadline_slot`
- `player_count < min_players`

#### Postconditions

- room -> `Cancelled`
- tous les joueurs `Joined` obtiennent un remboursement de 100%

#### Evenement

- `RoomCancelled`

#### Budget CU cible

- 25k a 40k

### 8.10 EmergencyReturn

#### Args

- aucun

#### Comptes

- `emergency_authority: Signer`
- `emergency_config`
- `room_state: mut`
- `vault: mut`

#### Preconditions

- autorite = multisig configure
- timelock deja satisfait hors programme
- room non fermee

#### Postconditions

- room -> `Emergency`
- les montants restants sont rendus selon la politique de retour definie

#### Evenement

- `EmergencyModeEnabled`

#### Budget CU cible

- 30k a 50k

### 8.11 CloseRoom

Instruction de maintenance recommandee, non mentionnee dans l'UX joueur mais necessaire a la production.

#### Preconditions

- room en `Resolved`, `Cancelled` ou `Emergency`
- aucun montant non claimable ne subsiste
- vault vide ou a solde final attendu

#### Postconditions

- room et vault fermes
- rent recupere

#### Budget CU cible

- 15k a 25k

## 9. Pseudocode de resolution

Pseudocode de reference:

```text
resolve(room):
  assert room.status in {Reveal, Commit}
  assert all unresolved reveals have been timeouted if deadline passed

  active_indices = [i for i in players if status(i) == Revealed]
  N = len(active_indices)
  assert N >= room.min_players

  H = [0, 0, 0, 0, 0]
  for i in active_indices:
    H[player_zone[i]] += 1

  for i in active_indices:
    error = 0
    for z in 0..4:
      error += abs(player_forecasts[i][z] - H[z])
    base = max(1, 5 * N - error)
    mult = risk_multiplier(player_risk[i], player_zone[i], H)
    score = base * mult
    player_errors[i] = error
    player_scores_bps[i] = score

  ranked = sort(active_indices, tie_break)
  winner_indices = first_k_by_ladder(ranked)
  rewards = compute_rewards(vault_balance_after_penalties, ladder)
  assign_rewards(winner_indices, rewards)
  room.final_histogram = H
  room.status = Resolved
```

## 10. Economie du protocole

### 10.1 Flux d'argent par room

Pour une room sans incidents:

- chaque joueur depose `stake_lamports`
- `2%` vont a la reserve
- `98%` constituent le montant distribuable
- le ladder determine les gagnants

Pour une room avec incidents:

- les commit timeouts peuvent alimenter l'anti-grief reserve
- les reveal timeouts alimentent le prize pool et la reserve free access

### 10.2 Reserve protocol

La reserve a quatre fonctions:

1. absorber une partie des comportements de griefing;
2. financer un mode free access merite;
3. servir de cushion pour le lancement et les incentives;
4. financer eventuellement des bounty de maintenance, close ou operations de support protocolaires.

La reserve n'est pas un pot discretionnaire. Toute sortie de reserve doit suivre une regle de protocole ou une gouvernance explicite.

### 10.3 Free access

Objectif:

- permettre a un joueur honnete, perdant et engage de rejouer occasionnellement sans casser l'equilibre economique.

Eligibilite recommandee v1:

- au moins 5 parties historisees;
- timeout ratio faible;
- PnL recent <= 0;
- cooldown 24h;
- montant sponsorise plafonne.

Le frontend peut masquer cette complexite et afficher simplement une invitation "seat sponsorise disponible".

### 10.4 Effet psychologique du multiplicateur

Faultline ne doit pas faire du multiplicateur une decoration post-game. Il doit influencer la decision au moment du commit.

Pour cela, l'interface doit montrer:

- le jackpot actuel;
- la taille de room;
- la condition exacte de reussite de `Edge` et `Knife`;
- l'effet d'un coup reussi sur le PnL du joueur.

### 10.5 Simulation PnL de reference

Exemple `Pulse` a 20 joueurs:

- mise: `0.05 SOL`
- total stakes: `1.00 SOL`
- reserve: `0.02 SOL`
- distributable: `0.98 SOL`
- ladder: `0.7056 / 0.1764 / 0.0784 SOL`

Un joueur qui perd 10 fois puis termine `rank 1` a la 11e partie:

- pertes: `-0.50 SOL`
- gain net de la 11e: `+0.6556 SOL`
- bilan: `+0.1556 SOL`

Le protocole doit toutefois communiquer avec prudence. Cette simulation illustre la dynamique du ladder. Elle n'est pas une promesse d'EV positive.

## 11. UX et frontend

### 11.1 Principes UX

Le frontend doit rendre simple un moteur mathematique riche. Trois erreurs sont interdites:

1. rendre la composition du commit abstraite au point d'effacer la profondeur;
2. exposer le joueur a trop de champs sans aide visuelle;
3. cacher les raisons exactes d'une victoire ou d'une defaite.

### 11.2 Ecrans minimaux

1. Home / room list
2. Room lobby
3. Commit composer
4. Pending reveal room
5. Reveal composer
6. Resolve / result screen
7. Player profile
8. Spectator mode
9. History explorer
10. Admin / monitoring panel interne

### 11.3 Room lobby

Doit afficher:

- preset de room;
- stake;
- min et max players;
- countdown en slots;
- jackpot courant;
- liste publique des wallets presents;
- tags de profils si disponibles;
- etat de progression de room.

### 11.4 Commit composer

Composants UI recommandes:

- une heatmap ou cinq colonnes A-E;
- un slider ou segmented control pour `Calm / Edge / Knife`;
- un mini tableau forecast totalisant automatiquement la somme;
- validation visuelle de la somme;
- recapitulatif du commit avant signature.

Comportement UX:

- le joueur compose sa decision en clair cote client;
- le client derive le hash localement;
- seule la valeur hash est envoyee dans `SubmitCommit`;
- la decision claire et le nonce sont stockes localement de maniere securisee jusqu'au reveal.

### 11.5 Reveal composer

Le reveal screen doit:

- recuperer localement la decision precedemment stockee;
- permettre une verification manuelle;
- signer et envoyer `RevealDecision`;
- detecter les cas de donnees locales perdues et guider l'utilisateur si necessaire.

Important:

- si le client ne conserve pas le `nonce` et le payload committe, le reveal devient impossible.
- le produit doit donc implementer une persistence locale robuste, chiffrable et exportable.

Recommendation:

- IndexedDB cote web;
- backup optionnel chiffrable par phrase de passe locale;
- avertissement explicite avant commit si persistence indisponible.

### 11.6 Ecran de resultat

L'ecran post-game est critique. Il doit afficher:

- l'histogramme reel;
- le forecast du joueur;
- l'erreur absolue du joueur;
- la zone choisie du joueur;
- son risk band et sa condition de hit/miss;
- le top classement;
- une comparaison avec le `rank 1`;
- le reward ou la perte nette;
- les raisons exactes du near-miss.

### 11.7 Mode spectateur

Le mode spectateur doit privilegier la comprehension dramatique:

- progression de room;
- profils reputes;
- nombre de commits recus;
- compte a rebours reveal;
- reveal progressif;
- histogramme qui se remplit;
- winners et multiplicateurs reussis.

Le spectateur ne doit jamais voir les decisions en clair avant la reveal phase.

### 11.8 Gestion des erreurs transactionnelles

Le frontend doit gerer proprement:

- `blockhash expired`
- dropped transaction
- congestion et priority fee insuffisante
- signature refusee
- double clic / double submit
- desynchronisation locale de nonce et payload

Flux recommande:

1. simulation preflight
2. envoi
3. suivi de signature
4. retry guide si necessaire
5. resynchronisation avec `RoomState`

## 12. SDK client

### 12.1 Fonctions minimales

Le SDK TypeScript doit fournir:

- `deriveRoomPda(roomSeed)`
- `deriveVaultPda(roomPda)`
- `deriveProfilePda(player)`
- `buildCommitHash(payload)`
- `createInitRoomIx(args)`
- `createJoinRoomIx(args)`
- `createSubmitCommitIx(args)`
- `createRevealDecisionIx(args)`
- `createForceTimeoutIx(args)`
- `createResolveGameIx(args)`
- `createClaimRewardIx(args)`
- `createCancelExpiredRoomIx(args)`
- `createEmergencyReturnIx(args)`

### 12.2 Types minimaux

Types recommandes:

```text
type Zone = 0 | 1 | 2 | 3 | 4
type RiskBand = 0 | 1 | 2

type CommitPayload = {
  room: PublicKey
  player: PublicKey
  joinIndex: number
  zone: Zone
  riskBand: RiskBand
  forecast: [number, number, number, number, number]
  nonce: Uint8Array
}
```

Le SDK est critique pour eviter des divergences de serialisation entre clients.

## 13. Indexation et donnees derivees

### 13.1 Pourquoi un indexeur est utile

Le protocole n'a pas besoin d'un indexeur pour vivre, mais le produit en a besoin pour:

- historique de room;
- profils enrichis;
- classement;
- analytics de meta;
- mode spectateur fluide;
- detection comportementale;
- moderation de front-end si necessaire.

### 13.2 Evenements a indexer

Evenements de reference:

- `RoomInitialized`
- `PlayerJoined`
- `CommitSubmitted`
- `DecisionRevealed`
- `TimeoutForced`
- `GameResolved`
- `RewardClaimed`
- `RefundClaimed`
- `RoomCancelled`
- `EmergencyModeEnabled`
- `RoomClosed`

### 13.3 Vues derivees utiles

1. historique d'un wallet;
2. precision moyenne de forecast;
3. hit rate `Edge`;
4. hit rate `Knife`;
5. timeout ratio;
6. PnL cumule;
7. leaderboard par preset;
8. hotspots temporels;
9. graph de co-presence entre wallets;
10. signaux de collusion pour affichage analytique.

### 13.4 Stack recommandee

MVP:

- RPC websocket pour live room updates
- worker d'indexation TypeScript
- Postgres
- cache Redis optionnel
- Helius webhook ou polling si necessaire

## 14. Securite et modeles d'attaque

### 14.1 Menaces de couche jeu

Les menaces principales ne sont pas uniquement techniques. Faultline est un jeu de lecture sociale, donc une partie du travail securitaire consiste a rendre les strategies toxiques couteuses.

Menaces a traiter structurellement:

- collusion
- sybil
- sabotage
- overfitting de bots
- griefing par no-show
- manipulation reputational

### 14.2 Menaces de couche blockchain

Menaces principales:

- front-running / MEV
- replay
- confusion d'accounts
- overflow
- signer escalation
- double claim
- incorrect vault accounting
- machine d'etat non monotone

### 14.3 Reponses protocolaires

Faultline repond a ces menaces par:

- commit-reveal domain-separated;
- seeds strictes et verifies Anchor;
- claims idempotents;
- status monotones;
- timeout permissionless;
- penalites non discretionnaires;
- open-source et audit externe.

### 14.4 Invariants a tester pendant audit

L'audit doit essayer de casser:

1. la conservation comptable du vault;
2. l'unicite du commit;
3. la validite des transitions de room;
4. la validite des transitions joueur;
5. la resistance au replay;
6. la justesse du score;
7. la justesse du ladder;
8. la securite du close;
9. la robustesse face a des comptes mal formes;
10. la robustesse face a des arrays partiellement remplis.

### 14.5 Cas de panne reseau Solana

Le protocole doit raisonner en slots, pas en secondes. Si Solana s'arrete:

- les slots n'avancent plus;
- les deadlines n'expirent pas artificiellement;
- les fonds restent dans les PDAs;
- les rooms reprennent au redemarrage.

Le frontend doit afficher cette logique clairement pour eviter les paniques utilisateur.

## 15. Strategie de tests

### 15.1 Niveaux de tests

Le plan de tests doit couvrir:

1. unit tests sur les fonctions pures
2. integration tests des instructions Anchor
3. property tests sur score et tie-break
4. fuzzing des args et transitions d'etat
5. simulations de grandes rooms
6. chaos tests sur retries, dropped tx, pannes RPC
7. replay tests sur historiques de room

### 15.2 Unit tests critiques

Fonctions pures a isoler:

- validation de forecast
- calcul d'histogramme
- calcul de `error`
- calcul des multiplicateurs
- tie-break
- payout ladder
- arrondis et reliquats
- transitions de status

### 15.3 Integration tests critiques

Scenarios minimaux:

1. init -> join -> commit -> reveal -> resolve -> claim
2. room annulee faute de min players
3. commit timeout conduisant a annulation
4. reveal timeout conduisant a forfait
5. double claim refuse
6. reveal invalide refuse
7. replay inter-room refuse
8. emergency return actif
9. close room apres claims complets

### 15.4 Property tests

Examples d'invariants property-based:

- la somme des rewards + reserve + soldes refunds = total vault historique
- le classement est stable pour une meme room
- deux reveals identiques donnent le meme score
- tout joueur `RevealTimedOut` n'apparait pas dans `H`
- aucun joueur sans reveal valide n'obtient de score non nul

### 15.5 Fuzzing

Le fuzzing doit cibler:

- tailles limites de room;
- forecasts mal formes;
- hash incoherent;
- status invalides;
- ordres d'appel non prevus;
- comptes partiellement faux;
- donnees repetitives ou nulles.

### 15.6 Simulation game theory

En plus des tests techniques, il faut lancer des simulations de population pour mesurer:

- reussite moyenne de `Calm / Edge / Knife`
- avantage d'un agent purement random
- avantage d'un agent heuristique simple
- avantage d'un agent exploitant l'historique
- impact de coalitions partielles
- impact des penalites reveal timeout

Ces simulations servent a calibrer les multiplicateurs et les ladder percentages avant mainnet.

## 16. Roadmap de developpement de A a Z

### Phase 0 - Freeze du design

Livrables:

- whitepaper valide
- tableau des presets
- schema final des comptes
- nomenclature des evenements
- catalogue des erreurs

Critere de sortie:

- aucune ambiguite restante sur score, tie-break, timeout, remboursements, urgence.

### Phase 1 - Scaffold du repo

Livrables:

- workspace Anchor
- crate programme
- package SDK TS
- package frontend
- package indexer
- CI initiale

Critere de sortie:

- build vide mais reproductible;
- lint/test pipeline en place.

### Phase 2 - Moteur on-chain

Ordre recommande:

1. types et constants
2. comptes PDAs
3. utils hash
4. init/join
5. submit/reveal
6. timeout
7. resolve
8. claim
9. cancel/emergency/close

Critere de sortie:

- 100% des flows core fonctionnent sur local validator.

### Phase 3 - SDK

Livrables:

- deriveurs PDA
- encodeurs commit payload
- builders d'instructions
- decodeurs d'evenements
- helpers de simulation

Critere de sortie:

- un client TS peut jouer une manche complete sans code ad hoc.

### Phase 4 - Frontend joueur

Livrables:

- room list
- room lobby
- commit builder
- persistence locale commit payload
- reveal flow
- result screen
- profile basic

Critere de sortie:

- un testeur externe peut jouer sans aide technique.

### Phase 5 - Indexer et analytics

Livrables:

- ingestion events
- historique room
- profil enrichi
- leaderboard
- alertes de timeout et close

Critere de sortie:

- UX historique et mode spectateur de base fonctionnels.

### Phase 6 - Securite interne

Livrables:

- fuzzing
- property tests
- checklists manuelles
- revue de code interne
- simulations d'attaque

Critere de sortie:

- aucune faille critique ou haute connue ouverte.

### Phase 7 - Devnet public

Livrables:

- deploiement devnet
- monitoring
- rooms capees
- feedback UX

Critere de sortie:

- au moins plusieurs centaines de parties completes;
- faible taux de room bloquee;
- faible taux d'echec reveal pour cause UX.

### Phase 8 - Audit externe

Livrables:

- rapport d'audit
- correctifs
- publication integrale

Critere de sortie:

- toutes les critiques resolues ou acceptees explicitement avec rationale publique.

### Phase 9 - Mainnet beta

Livrables:

- caps de stake faibles
- surveillance active
- gouvernance preparee

Critere de sortie:

- stabilite du protocole;
- economie saine;
- absence d'incident critique.

### Phase 10 - Mainnet full et gouvernance

Livrables:

- hausse progressive des caps
- reserve free access activee
- upgrade authority transferee vers multisig communautaire

Critere de sortie:

- operation stable sans dependance a une equipe centrale pour les actions de partie.

## 17. Work breakdown technique detaille

### 17.1 Programme Anchor

Tickets de travail recommandes:

1. definir enums, constants et errors
2. definir account layouts
3. implementer PDA derivation helpers
4. implementer init room
5. implementer join room
6. implementer commit hash verification util
7. implementer submit commit
8. implementer reveal decision
9. implementer force timeout phase commit
10. implementer force timeout phase reveal
11. implementer resolve
12. implementer claim
13. implementer cancel expired room
14. implementer emergency return
15. implementer close room
16. ajouter events
17. ajouter tests unitaires et integration

### 17.2 Frontend

Tickets recommandes:

1. connexion wallet
2. room discovery
3. room detail live
4. join tx flow
5. commit composer UI
6. persistence commit payload locale
7. reveal UI et recover flow
8. result analytics UI
9. profile UI
10. spectateur UI
11. gestion d'erreurs reseau et tx

### 17.3 Backend / indexer

Tickets recommandes:

1. schema DB
2. consumer events
3. projections profil
4. projections room history
5. leaderboard jobs
6. endpoints API publics
7. alerting et health checks

## 18. Open questions a arbitrer avant implementation definitive

Ces sujets doivent etre figees avant ecriture finale du programme:

1. La retention exacte du commit timeout doit-elle etre `50/50` ou autre?
2. Les presets exposes au lancement doivent-ils etre 3 ou 4?
3. Faut-il autoriser des rooms custom hors frontend officiel?
4. Le tie-break doit-il vraiment preferer le risk band plus agressif avant la pubkey, ou faut-il l'omettre?
5. Faut-il stocker les rewards dans `RoomState` ou les recalculer a la demande de claim?
6. Faut-il introduire un `ConfigState` global des la v1?
7. Le close bounty doit-il exister des le lancement?
8. La reserve free access doit-elle etre activee seulement apres audit et mainnet beta?

Recommendation produit:

- geler v1 avec le moins de variabilite possible;
- repousser les options non indispensables a v1.1;
- ne jamais cacher une regle economique dans le frontend.

## 19. Positionnement legal et compliance

Faultline doit etre presente comme un concours de prediction strategique pair-a-pair. Le resultat depend d'un calcul deterministic applique aux seules decisions humaines revelees.

Arguments structurants:

- aucune RNG;
- aucun oracle;
- aucun tirage;
- aucune intervention humaine dans le resultat;
- auditabilite complete des resultats;
- possibilite de verifier toute defaite on-chain.

Ce positionnement ne dispense pas du travail compliance. Il faut preparer:

- geofencing;
- analyse juridictionnelle;
- politique AML si necessaire;
- communication prudente sur les gains.

## 20. Conclusion

Faultline n'est pas seulement un concept de jeu. C'est un protocole de lecture sociale implementable on-chain sans source externe de verite. Sa force vient de l'alignement entre produit, cryptographie, economie et legalite:

- le jeu est tendu parce que les decisions sont cachees;
- la defaite est acceptable parce qu'elle est explicable;
- la meta est defendable parce que l'historique est public;
- le protocole est credible parce que le resultat est deterministic et permissionless.

Si ce whitepaper est respecte a la lettre, une equipe peut construire Faultline de A a Z avec une chaine de verite claire entre la vision produit, le programme Solana, le frontend et les operations de lancement.

## Annexe A - Codes d'erreur recommandes

Catalogue initial:

- `InvalidRoomStatus`
- `JoinWindowExpired`
- `CommitWindowExpired`
- `RevealWindowExpired`
- `RoomFull`
- `PlayerAlreadyJoined`
- `PlayerNotJoined`
- `PlayerAlreadyCommitted`
- `PlayerAlreadyRevealed`
- `InvalidForecast`
- `InvalidZone`
- `InvalidRiskBand`
- `CommitHashMismatch`
- `ResolveNotReady`
- `InsufficientActivePlayers`
- `NothingToClaim`
- `AlreadyClaimed`
- `UnauthorizedEmergency`
- `RoomNotClosable`

## Annexe B - Evenements recommandes

```text
RoomInitialized {
  room: Pubkey,
  creator: Pubkey,
  stake_lamports: u64,
  min_players: u8,
  max_players: u8,
  join_deadline_slot: u64
}

PlayerJoined {
  room: Pubkey,
  player: Pubkey,
  join_index: u8
}

CommitSubmitted {
  room: Pubkey,
  player: Pubkey,
  join_index: u8
}

DecisionRevealed {
  room: Pubkey,
  player: Pubkey,
  zone: u8,
  risk_band: u8
}

TimeoutForced {
  room: Pubkey,
  phase: u8,
  affected_count: u8
}

GameResolved {
  room: Pubkey,
  active_count: u8,
  histogram: [u8; 5],
  winner_indices: [u8; 4]
}

RewardClaimed {
  room: Pubkey,
  player: Pubkey,
  amount: u64
}

RefundClaimed {
  room: Pubkey,
  player: Pubkey,
  amount: u64
}

RoomCancelled {
  room: Pubkey
}

EmergencyModeEnabled {
  room: Pubkey
}

RoomClosed {
  room: Pubkey
}
```

## Annexe C - Exemple de payload commit cote client

Exemple logique:

```text
room = <32 bytes>
player = <32 bytes>
join_index = 7
zone = 2
risk_band = 1
forecast = [3, 4, 5, 2, 6]
nonce = <32 bytes>
```

Bytes concatenees:

```text
"FAULTLINE_COMMIT_V1" || room || player || 0x0700 || 0x02 || 0x01 || 0x03 || 0x04 || 0x05 || 0x02 || 0x06 || nonce
```

Le hash de cette sequence est la valeur envoyee dans `SubmitCommit`.