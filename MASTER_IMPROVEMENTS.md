# FAULTLINE ARENA - MASTER IMPROVEMENTS
## Liste complete et priorisee des modifications

Genere le : 2026-04-05
Analyse par : GitHub Copilot (GPT-5.4), selon le brief Claude Opus 4.6
Fichiers analyses : HANDOFF.md absent, substitution via docs/CLAUDE_HANDOFF.md ; WHITEPAPER.md ; FAULTLINE_PROTOCOL.md ; app/globals.css ; app/layout.tsx ; app/page.tsx ; app/rooms/page.tsx ; app/rooms/[room]/page.tsx ; app/robots.ts ; app/sitemap.ts ; app/opengraph-image.tsx ; app/twitter-image.tsx ; src/components/game/automation-heartbeat.tsx ; src/components/game/commit-composer.tsx ; src/components/game/phase-badge.tsx ; src/components/game/program-banner.tsx ; src/components/game/result-panel.tsx ; src/components/game/reveal-panel.tsx ; src/components/game/room-actions.tsx ; src/components/game/room-page.tsx ; src/components/rooms/create-room-form.tsx ; src/components/rooms/room-card.tsx ; src/components/rooms/rooms-page.tsx ; src/components/ui/toast-provider.tsx ; src/components/providers.tsx ; src/lib/faultline/constants.ts ; src/lib/faultline/commit.ts ; src/lib/faultline/instructions.ts ; src/lib/faultline/logic.ts ; src/lib/faultline/rooms.ts ; src/lib/faultline/server-data.ts ; src/lib/faultline/storage.ts ; src/lib/faultline/system-rooms.ts ; src/lib/faultline/types.ts ; src/lib/solana/cluster.ts ; src/lib/solana/provider.tsx ; src/lib/solana/server.ts ; src/lib/solana/transactions.ts ; app/api/rooms/route.ts ; app/api/rooms/[room]/route.ts ; app/api/automation/commit/route.ts ; app/api/automation/heartbeat/route.ts ; app/api/automation/tick/route.ts ; solpg/program/src/lib.rs ; package.json ; tailwind.config.ts ; tests/*.test.ts

---

## PRIORITE 0 - CRITIQUE (bugs ou problemes qui cassent l'experience)

### Commit payload non canonique par rapport au protocole cible
- **Fichier(s) concerne(s) :** src/lib/faultline/commit.ts:24 ; solpg/program/src/lib.rs:1440 ; WHITEPAPER.md
- **Probleme :** Le hash commit utilise `FAULTLINE_COMMIT_V1 || room || player || zone || risk || forecast || nonce`, mais le protocole cible demande aussi `join_index(u16 LE)`. Dans des lobbies persistants, ce manque cree une ambiguite entre rounds pour un meme wallet dans une meme room si le joueur reutilise le meme payload.
- **Impact :** La promesse "commit-reveal deterministe et parfaitement specifie" n'est plus totalement vraie. C'est un risque de divergence entre spec produit, frontend et contrat, donc un risque de confiance et d'auditabilite.
- **Solution proposee :** Passer a un payload v2 qui inclut `join_index` ou un identifiant de round monotone, migrer simultanement le frontend, les tests et le contrat, afficher explicitement la version du hash dans le code et dans la documentation.

### Frais reserve envoyes au treasury hardcode au lieu du Reserve PDA
- **Fichier(s) concerne(s) :** solpg/program/src/lib.rs:26 ; solpg/program/src/lib.rs:910 ; solpg/program/src/lib.rs:1113
- **Probleme :** Le contrat deduit bien 2% de reserve, mais transfere ces lamports vers `TREASURY_PUBKEY` et non vers le `ReserveState`. Le produit parle pourtant d'une reserve free access et anti-grief accumulee on-chain.
- **Impact :** L'economie affichee au joueur ne correspond pas a l'economie reelle. Le message "free access" perd sa credibilite, la reserve n'est pas alimentee comme promis, et la confiance produit en prend un coup.
- **Solution proposee :** Router le reserve fee vers le Reserve PDA, tracer distinctement `protocol_fee`, `anti_grief`, `reveal_timeout`, ajouter des tests de conservation comptable et exposer ces chiffres en lecture seule dans l'UI.

### Chemin d'urgence desactive alors qu'il est un pilier du produit trustless
- **Fichier(s) concerne(s) :** solpg/program/src/lib.rs:210 ; solpg/program/src/lib.rs:522 ; src/lib/faultline/instructions.ts:197 ; src/lib/solana/cluster.ts:31
- **Probleme :** L'instruction d'urgence retourne immediatement `EmergencyDisabled`, alors que la spec produit et le whitepaper promettent un chemin d'urgence multi-sig time-locke. Le frontend contient un flag, mais aucun vrai flux operant n'existe.
- **Impact :** En cas de bug contrat ou incident critique, il n'y a pas de parachute credible. Cela casse le claim "trust-minimized, not trust-me".
- **Solution proposee :** Implementer un `EmergencyConfig` ou `ConfigState` avec autorites, time-lock, modes autorises, event on-chain, UI de lecture claire et runbook d'activation. Tant que ce n'est pas fait, retirer toute copy qui laisse croire que ce chemin existe deja.

### Sauvegarde reveal critique uniquement locale malgre l'existence d'un endpoint de backup
- **Fichier(s) concerne(s) :** src/components/game/commit-composer.tsx:127 ; src/components/game/commit-composer.tsx:282 ; src/lib/faultline/storage.ts:24 ; app/api/automation/commit/route.ts:64 ; src/lib/faultline/automation.ts:154
- **Probleme :** Le payload clair est persiste uniquement dans IndexedDB locale. L'API de backup automation existe, mais n'est jamais appelee au commit. Si le joueur change de device, efface le storage, perd son navigateur ou commit depuis mobile puis revient ailleurs, le reveal est perdu.
- **Impact :** C'est un point de casse direct sur la boucle emotionnelle. Le joueur vit un echec logistique, pas un echec strategique. Cela tue la confiance et la retention.
- **Solution proposee :** Ajouter un backup opt-in chiffre cote client au moment du commit, un export manuel immediat, un QR backup, un check de recouvrabilite, puis une UX de recuperation au reveal. A minima, brancher l'endpoint existant et l'expliquer clairement.

---

## PRIORITE 1 - IMPACT FORT SUR L'ADDICTION (a faire en premier)

### La home ne prouve pas qu'une arene vivante existe maintenant
- **Fichier(s) concerne(s) :** app/page.tsx ; app/rooms/page.tsx ; src/lib/faultline/server-data.ts
- **Probleme :** La page explique bien le produit, mais elle ne montre ni room live, ni winners recents, ni montant joue, ni leaderboard, ni revele progressif. Tout est conceptuel.
- **Impact :** La proposition de valeur se comprend, mais la desirabilite immediate reste basse. Le joueur lit un manifeste, pas une arene en train de vibrer.
- **Solution proposee :** Ajouter un module live au-dessus de la ligne de flottaison : room en cours, countdown, seats restants, dernier winner, total staked du jour, lien direct vers la room la plus chaude.
- **Emotion visee :** urgence sociale et FOMO legitime.

### Le lobby ressemble encore trop a un board d'etat plutot qu'a un board de pression
- **Fichier(s) concerne(s) :** src/components/rooms/rooms-page.tsx ; src/components/rooms/room-card.tsx ; src/components/rooms/create-room-form.tsx
- **Probleme :** Les room cards sont propres mais tres informatives. Elles disent l'etat, moins la pression. Il manque des signaux de tension : seats left critiques, rythme des reveals, derniers entrants, recent winner, expected top payout, lane heat.
- **Impact :** Le joueur voit une liste de brackets, pas un ensemble d'arenes qui s'appellent entre elles. La conversion lobby -> room en souffre.
- **Solution proposee :** Transformer chaque card en "pressure card" avec : statut dramatise, top payout estime, seats left accentues, progression de phase visible, relance "X players committed", et bouton principal plus desirant.
- **Emotion visee :** envie de rentrer avant les autres.

### La room page ne change pas assez d'atmosphere selon la phase
- **Fichier(s) concerne(s) :** src/components/game/room-page.tsx ; src/components/game/room-actions.tsx ; src/components/game/phase-badge.tsx ; app/globals.css
- **Probleme :** Open, Commit, Reveal et Resolved se distinguent en texte, mais pas suffisamment en tension visuelle. La scene ne "respire" presque pas differemment selon la phase.
- **Impact :** Le coeur du jeu perd de la dramaturgie. Or le produit promet une montee de tension par phase, pas un dashboard statique.
- **Solution proposee :** Introduire un theme par phase : accent color, background wash, countdown behavior, halo du badge, micro-copy, surfaces plus serre-es en Reveal, puis catharsis en Resolved.
- **Emotion visee :** suspense clair, puis relachement.

### Le Commit Composer reste un bon formulaire, pas encore une console de prediction
- **Fichier(s) concerne(s) :** src/components/game/commit-composer.tsx ; src/lib/faultline/storage.ts
- **Probleme :** La selection zone/risk/forecast est fonctionnelle, mais elle n'aide pas le cerveau a "lire la foule". Pas de heatmap, pas de projection du jackpot selon risk band, pas de validation visuelle fine, pas de recap verrouille, pas de backup exportable.
- **Impact :** La profondeur du "double bet" est sous-communiquee. Le joueur saisit des nombres au lieu de sentir qu'il modele une foule.
- **Solution proposee :** Ajouter une carte des zones, une projection dynamique du reward profile, un compteur de somme plus graphique, des presets forecast intelligents, un recap avant signature, et un backup/export immediat apres commit.
- **Emotion visee :** conviction strategique avant signature.

### Le Reveal Panel ne dramatise ni la preuve ni le moment de verite
- **Fichier(s) concerne(s) :** src/components/game/reveal-panel.tsx
- **Probleme :** La reveal step est informative mais plate. Le hash n'est pas mis en scene, la verification d'integrite n'est pas visible, et il n'y a aucun sentiment "j'ouvre une enveloppe scellee".
- **Impact :** L'un des moments les plus intenses du jeu passe en interaction utilitaire.
- **Solution proposee :** Afficher hash court, timestamp local du commit, recap scelle, etat "hash checking", puis confirmation d'integrite explicite. La CTA doit avoir une montee de tension distincte du commit.
- **Emotion visee :** tension binaire et soulagement de preuve.

### Le Result Panel explique, mais ne retient pas encore
- **Fichier(s) concerne(s) :** src/components/game/result-panel.tsx ; src/lib/faultline/logic.ts
- **Probleme :** Le panneau donne histogramme, rang, winner et top reads, mais il manque le vrai moteur de rechute : delta detaille vs winner, "tu aurais gagne si...", CTA replay same preset, partage, comparaison forecast visuelle, rank reveal memorisable.
- **Impact :** La defaite reste un peu froide et la victoire n'est pas assez clipable. Or c'est l'ecran qui doit fabriquer le "encore une".
- **Solution proposee :** Ajouter un bloc "why you lost / why you almost won", comparaison directe avec rank 1, histogramme anime, CTA "Play same stake again", CTA share, et template victoire/defaite distinct.
- **Emotion visee :** frustration productive et euphorie partageable.

### Aucune progression persistante publique n'existe encore dans l'experience
- **Fichier(s) concerne(s) :** src/components/rooms/rooms-page.tsx ; src/components/game/result-panel.tsx ; nouveaux composants/pages a creer
- **Probleme :** Il n'y a ni profil, ni historique, ni leaderboard, ni stats de maitrise, ni badges, ni free access visible. Le joueur n'accumule rien hors d'une room.
- **Impact :** La metagame et la retention longue sont severement amputees. Le jeu n'a pas encore de colonne vertebrale sociale.
- **Solution proposee :** Ajouter un profile hub, leaderboard global et par preset, historique des rounds, taux de hit par band, error moyen, streaks, timeout ratio et free access state.
- **Emotion visee :** fierte, progression, rivalite.

### L'experience spectateur et shareable est insuffisante pour etre streamable
- **Fichier(s) concerne(s) :** src/components/game/room-page.tsx ; src/components/game/result-panel.tsx ; app/page.tsx
- **Probleme :** Pas de mode watch live, pas d'invite link mise en avant, pas de partage resultat, pas de room hero orientee spectateur, pas de timeline de reveals.
- **Impact :** Faultline reste jouable mais peu regardable. Cela bride croissance organique, clips et bouche-a-oreille.
- **Solution proposee :** Ajouter spectator mode, copy room link, share card, event timeline, watch-live page et overlay simplifie pour streamers.
- **Emotion visee :** appartenance sociale et desir d'exposer ses reads.

---

## PRIORITE 2 - DESIGN ET ANIMATIONS (polish)

### Le systeme de design est coherent dans l'intention, incomplet dans l'execution
- **Fichier(s) concerne(s) :** app/globals.css ; tailwind.config.ts ; app/opengraph-image.tsx ; app/twitter-image.tsx
- **Probleme :** Les tokens principaux existent, mais une grande partie des surfaces utilisent encore des valeurs hardcodees en `rgba(...)` et en hex. Les OG images derivent aussi hors systeme.
- **Impact :** Le produit garde une bonne direction, mais perd en cohesion et en maintenabilite visuelle.
- **Solution proposee :** Centraliser palette, elevations, alpha steps et surfaces dans des variables semantiques (`ambient`, `ember`, `signal`, `flare`, `surface-1`, `surface-2`, `border-soft`, `text-muted`). Rebasculer les composants et les OG images dessus.
- **Emotion visee :** sensation premium plus nette et plus memorable.

### Contraste, hierarchie et scale visuelle doivent etre resserres
- **Fichier(s) concerne(s) :** app/globals.css ; app/page.tsx ; src/components/game/* ; src/components/rooms/*
- **Probleme :** Le produit repose beaucoup sur `text-white/68` et `text-white/72`, avec de multiples rayons, paddings et ombres proches mais non systematises.
- **Impact :** Sous tension gameplay, l'oeil scanne moins vite qu'il ne devrait. Le rendu est bon, pas encore chirurgical.
- **Solution proposee :** Definir une scale unique de radius, spacing et shadow ; relever le contraste des textes critiques ; reserver les nuances les plus faibles aux meta-labels, jamais aux informations de phase ou d'argent.
- **Emotion visee :** lisibilite froide sous pression.

### La motion actuelle est trop courte en vocabulaire pour porter la dramaturgie du jeu
- **Fichier(s) concerne(s) :** app/globals.css:176 ; app/globals.css:197 ; app/globals.css:279 ; src/components/game/room-page.tsx ; src/components/rooms/room-card.tsx
- **Probleme :** Le systeme utilise surtout `arenaPulse`, `arenaRise` et un sheen sweep. C'est propre, mais insuffisant pour soutenir commit, reveal, resolve et near-miss.
- **Impact :** Les micro-recompenses visuelles sont trop rares. L'interface n'insiste pas assez sur les changements importants.
- **Solution proposee :** Introduire un langage motion par moment : staging, urgency pulse, seat pop-in, phase wash, reveal unveil, histogram cascade, toast stack exit, payout settle.
- **Emotion visee :** sensation de room vivante, pas de simple dashboard.

### Le systeme de toast ne porte pas encore assez bien les evenements gameplay
- **Fichier(s) concerne(s) :** src/components/ui/toast-provider.tsx:54 ; src/components/ui/toast-provider.tsx:68 ; app/globals.css
- **Probleme :** Les toasts auto-dismiss a 4200 ms, n'ont pas d'exit motion, pas de barre de decay et une differenciation visuelle limitee entre succes critique, erreur bloquante et simple info.
- **Impact :** Des evenements importants comme le commit, la sauvegarde locale ou une erreur Solana peuvent etre lus trop vite ou se ressembler visuellement.
- **Solution proposee :** Allonger la duree pour les actions critiques, ajouter progress bar, enter/exit choreography, tone glows plus distincts et taille typographique differenciee entre titre et description.
- **Emotion visee :** feedback immediat, premium et rassurant.

### Les countdowns et meters n'injectent pas assez d'urgence
- **Fichier(s) concerne(s) :** src/components/game/room-actions.tsx ; src/components/rooms/room-card.tsx ; app/globals.css
- **Probleme :** Les deadlines bougent numeriquement, mais sans changement d'intensite quand la fenetre se referme. Le momentum meter est purement informatif.
- **Impact :** Le joueur sait qu'il reste du temps, mais ne le ressent pas.
- **Solution proposee :** Ajouter palette d'urgence progressive, pulse de fin de fenetre, anim de width des meters, et state change plus agressif sur les 30 dernieres secondes/slots.
- **Emotion visee :** acceleration cognitive et pression saine.

### Le mobile reste utilisable, pas encore vraiment nerveux ni confortable
- **Fichier(s) concerne(s) :** src/components/game/program-banner.tsx ; src/components/game/room-page.tsx ; src/components/game/commit-composer.tsx ; app/globals.css
- **Probleme :** La densite de contenu et la longueur verticale augmentent vite sur room page. Le wallet, la telemetry et le form demandent beaucoup de scroll avant l'action.
- **Impact :** La version mobile fonctionne, mais elle perd la sensation de "live command center".
- **Solution proposee :** Recomposer mobile avec barre sticky de phase + countdown + CTA, zone picker plus tactile, recap compact et surfaces collapsables pour l'analytics secondaire.
- **Emotion visee :** controle immediat sur petit ecran.

---

## PRIORITE 3 - SMART CONTRACT (securite, optimisation)

### Le contrat n'implante pas encore l'architecture produit cible
- **Fichier(s) concerne(s) :** solpg/program/src/lib.rs ; WHITEPAPER.md
- **Probleme :** Le code on-chain est un programme Solana manuel avec codec custom, sans `ProfileState`, sans `ConfigState`, sans `EmergencyConfig`, sans event schema exploitable. Le produit vise pourtant une couche durable pour stats, free access, gouvernance de presets et observabilite.
- **Impact :** Le protocole fonctionne en v0 de jeu, mais pas encore comme fondation durable d'un ecosysteme Faultline.
- **Solution proposee :** Introduire les comptes manquants, ajouter des events riches, documenter la version de layout, et choisir explicitement soit une trajectoire Anchor/IDL, soit une trajectoire custom formalisee avec schema et outils d'indexation equivalents.

### MAX_PLAYERS a 12 bloque la profondeur promise par le whitepaper
- **Fichier(s) concerne(s) :** solpg/program/src/lib.rs:22 ; src/lib/faultline/constants.ts:2 ; src/lib/faultline/types.ts
- **Probleme :** Le systeme complet est calibre a 12 joueurs max, alors que la vision produit parle de 25 a 128 joueurs, de Swarm/Faultline Max et d'une vraie meta macro.
- **Impact :** La profondeur sociale et la streamabilite restent sous plafond. Le jeu actuel peut etre bon en micro-lobby, mais il n'atteint pas encore la promesse du protocole.
- **Solution proposee :** Decider entre deux voies : assumer une v1 12 joueurs partout dans la copy et la roadmap, ou refactorer layout, tailles de compte, CU budget, decode/transport et UI pour supporter les grands presets.

### Le ReserveState existe, mais sa boucle free access n'existe pas encore
- **Fichier(s) concerne(s) :** solpg/program/src/lib.rs:210 ; src/components/rooms/rooms-page.tsx ; src/components/game/room-page.tsx
- **Probleme :** Le contrat stocke des compteurs de free access, mais aucun path de distribution, d'eligibilite, de claim ou d'affichage n'est expose.
- **Impact :** Le produit parle d'une economie plus humaine et anti-grief, mais le joueur ne voit ni l'etat ni l'utilite de cette reserve.
- **Solution proposee :** Completer les instructions reserve, l'eligibilite profile, le claim flow, l'audit trail et une UI publique read-only de la reserve.

### CloseRoom ne fait pas une vraie garbage collection economique
- **Fichier(s) concerne(s) :** solpg/program/src/lib.rs:1020+
- **Probleme :** `process_close_room` reset simplement la room au lobby. Le rent n'est pas reattribue, le mot "Closed" n'est pas une vraie fermeture economique, et la spec produit parle pourtant de garbage collection.
- **Impact :** Le comportement reel n'est pas celui annonce. Cela brouille la lecture operatoire du protocole.
- **Solution proposee :** Soit retirer la notion de close/garbage collection dans la spec publique si les lobbies sont permanents, soit implementer une vraie fermeture des comptes non-systeme avec restitution claire du rent.

### Treasury hardcode et faible configurabilite de lancement
- **Fichier(s) concerne(s) :** solpg/program/src/lib.rs:26 ; solpg/program/src/lib.rs:1113
- **Probleme :** Le treasury est hardcode dans le binaire. Aucun compte de config global ne permet d'ajuster presets, destinations de fees ou toggles de lancement sans redeploiement.
- **Impact :** L'operabilite et la gouvernance sont faibles. Cela augmente le risque en cas d'erreur d'adressage ou de migration.
- **Solution proposee :** Creer un `ConfigState` global avec authorities, treasury, flags de lancement, presets autorises et versioning.

### Couverture de tests insuffisante sur les chemins vraiment dangereux
- **Fichier(s) concerne(s) :** tests/*.test.ts ; solpg/program/src/lib.rs ; src/lib/faultline/commit.ts ; src/lib/faultline/logic.ts
- **Probleme :** Les tests actuels couvrent bien le noyau de logique TS, mais pas les cas critiques de protocole : payload v2, reserve routing, timeouts reveal/commit, close/reset, emergency, compat round persistante.
- **Impact :** Le repo parait stable a la surface, mais les chemins de confiance les plus sensibles restent peu verifies.
- **Solution proposee :** Ajouter une matrice de tests protocole ciblee sur conservation comptable, transitions monotones, penalties, reset, claim idempotent et version du hash.

---

## PRIORITE 4 - FONCTIONNALITES NOUVELLES (roadmap)

### Profil joueur complet et public
- **Fichier(s) concerne(s) :** nouveaux fichiers a creer ; surfaces a brancher dans src/components/game/result-panel.tsx et src/components/rooms/rooms-page.tsx
- **Probleme :** Aucun hub de progression durable n'existe.
- **Impact :** La maitrise n'a pas de lieu ou se deposer.
- **Solution proposee :** Creer une page profil avec historique des parties, net profit, average error, hit rate par band, streaks, timeout ratio, and last ten reads.
- **Emotion visee :** fierte et accumulation de skill.

### Leaderboards globaux et par preset
- **Fichier(s) concerne(s) :** nouveaux composants/pages a creer ; home et lobby a enrichir
- **Probleme :** Il n'existe aucun classement visible.
- **Impact :** Pas de rivalite stable, pas de noms a reconnaitre, pas de grind loop.
- **Solution proposee :** Ajouter weekly/global/by-stake leaderboards avec widgets home, lobby et room, et un focus sur les regulars recognisables.
- **Emotion visee :** comparaison sociale saine.

### Replay et analyse de rounds passes
- **Fichier(s) concerne(s) :** nouveaux composants/pages a creer ; src/components/game/result-panel.tsx
- **Probleme :** La post-mortem n'est visible que dans le present de la room resolue.
- **Impact :** Le jeu perd un axe de mastery profonde et de contenu partageable.
- **Solution proposee :** Creer un replay de round avec timeline join -> commit -> reveal -> resolve, histogramme anime, comparisons entre top reads et filtre par wallet.
- **Emotion visee :** apprentissage, obsession, commentaire social.

### Notifications opt-in utiles, pas invasives
- **Fichier(s) concerne(s) :** nouveaux endpoints/services et UI settings
- **Probleme :** Aucun systeme de rappel ou de re-engagement n'existe pour reveal, resolve ou free access.
- **Impact :** Le produit depend trop de la memoire du joueur.
- **Solution proposee :** Ajouter notifications opt-in pour "your room entered reveal", "your reward is claimable", "same preset is hot now", par email/push/Telegram/Discord.
- **Emotion visee :** retour opportun, pas spam.

### Watch Live et surfaces streamers
- **Fichier(s) concerne(s) :** nouvelle page watch live ; src/components/game/room-page.tsx
- **Probleme :** Le spectateur n'a pas de produit dedie.
- **Impact :** Faultline ne capte pas encore le potentiel Twitch, X clips, YouTube shorts et dashboards communautaires.
- **Solution proposee :** Ajouter page watch live, overlay streamer, mode grand ecran, event ticker et API publique read-only.
- **Emotion visee :** spectacle collectif.

### Achievements et badges a forte lisibilite
- **Fichier(s) concerne(s) :** nouveaux composants ; futurs etats profil
- **Probleme :** Aucune couche symbolique de progression n'existe.
- **Impact :** Le joueur ne garde pas de traces visibles de sa specialite.
- **Solution proposee :** Ajouter badges comme `Knife Hit`, `Perfect Forecast`, `Cold Blood`, `No Timeout Month`, avec progression visible et partages sociaux.
- **Emotion visee :** identite et statut.

### Free access visible et comprehensible
- **Fichier(s) concerne(s) :** src/components/rooms/rooms-page.tsx ; src/components/game/room-page.tsx ; futures pages profil/reserve
- **Probleme :** Le concept existe dans la these economique, pas dans l'experience publique.
- **Impact :** Une proposition produit differentiatrice reste invisible.
- **Solution proposee :** Afficher eligibility, prochaines fenetres, reserve status et explication claire de l'aide meritee.
- **Emotion visee :** justice procedurale et bienveillance credible.

### Variantes de preset et modes d'evenement
- **Fichier(s) concerne(s) :** futur ConfigState + nouvelles surfaces lobby
- **Probleme :** La meta actuelle est trop plate pour tenir sur le long terme.
- **Impact :** Rejouabilite limitee a la seule profondeur du core loop.
- **Solution proposee :** Ajouter variantes officielles : short windows, larger swarms, perfect-forecast bonus weeks, curated live events.
- **Emotion visee :** nouveaute sans casser la lisibilite.

---

## PRIORITE 5 - OPTIMISATIONS TECHNIQUES (performance, SEO)

### Support wallet incomplet pour un jeu Solana grand public
- **Fichier(s) concerne(s) :** src/lib/solana/provider.tsx:17 ; package.json
- **Probleme :** Seuls Phantom et Solflare sont branches. Backpack est absent, ainsi que toute communication sur la matrice de compatibilite.
- **Impact :** Friction evit-able a l'entree et manque de couverture sur une audience crypto native importante.
- **Solution proposee :** Ajouter Backpack, tester les etats connect/connecting/error, et harmoniser la copy et le style de tous les etats wallet.

### Aucun priority fee ou compute budget tuning en cas de congestion
- **Fichier(s) concerne(s) :** src/lib/solana/transactions.ts:80 ; src/lib/solana/server.ts:66
- **Probleme :** Les transactions utilisent blockhash + preflight, mais aucun `ComputeBudgetProgram`, aucun microLamports tuning, aucun fallback de fee, aucun control utilisateur.
- **Impact :** En congestion, les commits/reveals critiques peuvent rater au pire moment.
- **Solution proposee :** Ajouter une policy fee par type d'action, un override utilisateur optionnel et des retries guides pour les cas `expired before confirmation`.

### Parsing d'erreurs trop generique pour des flux a enjeu
- **Fichier(s) concerne(s) :** src/lib/solana/transactions.ts ; src/components/game/commit-composer.tsx ; src/components/game/reveal-panel.tsx ; src/components/game/room-actions.tsx
- **Probleme :** Les erreurs sont surtout relayees comme logs bruts ou messages generiques. Il n'y a pas de mapping semantique des erreurs custom du programme.
- **Impact :** Sous stress, le joueur ne sait pas quoi faire ensuite.
- **Solution proposee :** Mapper chaque erreur protocole a un message, un next step et une severity UI. Ajouter des CTA retry ou refresh quand pertinent.

### SEO room-level sous-exploite
- **Fichier(s) concerne(s) :** app/rooms/[room]/page.tsx ; app/sitemap.ts:14 ; app/page.tsx:33
- **Probleme :** Les room pages sont `noindex`, le sitemap ne reference que `/` et `/rooms`, et les metadata room sont generiques. Les schemas structurent la home, pas le produit vivant.
- **Impact :** La discoverability sociale et SEO du jeu live est tres limitee.
- **Solution proposee :** Generer metadata room dynamiques pour le partage social meme si l'indexation reste selective, enrichir le sitemap avec routes pertinentes, et ajouter des OG cards plus contextuelles.

### Pages critiques assez lourdes pour un produit live
- **Fichier(s) concerne(s) :** resultat de build Next.js ; src/components/game/room-page.tsx ; src/lib/solana/provider.tsx
- **Probleme :** Le build montre environ 197 kB sur `/rooms` et 206 kB sur `/rooms/[room]`. Pour un jeu live wallet-native, c'est acceptable mais deja dense.
- **Impact :** Le first meaningful interaction peut souffrir sur mobile ou reseaux faibles.
- **Solution proposee :** Isoler les sous-modules lourds, lazy-load certaines surfaces analytics, retarder les composants secondaires et limiter les re-renders de room.

### Polling, websocket et heartbeat peuvent etre plus sobres
- **Fichier(s) concerne(s) :** src/components/game/automation-heartbeat.tsx ; src/components/rooms/rooms-page.tsx ; src/components/game/room-page.tsx
- **Probleme :** Le client combine websocket listeners, polling toutes les 10s et heartbeat d'automation global. C'est robuste, mais couteux et peu selectif.
- **Impact :** Sur mobile et sur longues sessions, la batterie et le bruit reseau peuvent grimper.
- **Solution proposee :** Debouncer les refresh, rendre le heartbeat plus opportuniste, suspendre intelligemment selon visibilite/page, et distinguer spectator mode d'un mode joueur actif.

### OG/Twitter cards trop statiques pour le social sharing
- **Fichier(s) concerne(s) :** app/opengraph-image.tsx ; app/twitter-image.tsx
- **Probleme :** Les cartes sociales restent brand-first et non game-first.
- **Impact :** Faible taux de clic et faible envie de partager des moments de partie.
- **Solution proposee :** Produire des visuels dynamiques par room/result avec stake, phase, winner, histogramme ou badge event.

---

## ANNEXE A - ANIMATIONS A CREER (specifications completes)

### Hero staged entrance
- **Composant :** app/page.tsx
- **Declencheur :** premier chargement de la home
- **Emotion cible :** conviction immediate
- **Implementation :** CSS keyframes ou Framer Motion avec staggers legers
- **Duree :** 900 ms total
- **Easing :** cubic-bezier(0.22, 1, 0.36, 1)
- **Description visuelle :** ambient strip apparait d'abord, puis kicker, puis headline ligne par ligne, puis CTA, puis la core loop card glisse avec une legere profondeur.

### Lobby card stagger with pressure ramp
- **Composant :** src/components/rooms/rooms-page.tsx et src/components/rooms/room-card.tsx
- **Declencheur :** chargement de la grille et toute mise a jour de snapshot
- **Emotion cible :** impression de board vivant
- **Implementation :** CSS stagger avec animation de translate/opacity + width animate des meters
- **Duree :** 420 ms par card, decalage 60 ms
- **Easing :** ease-out
- **Description visuelle :** les cards rentrent par vagues, puis le meter se remplit legerement apres l'entree.

### Phase shift wash
- **Composant :** src/components/game/room-page.tsx
- **Declencheur :** changement `room.status`
- **Emotion cible :** la room change de nature
- **Implementation :** CSS custom properties animees sur fond, border glow et badge halo
- **Duree :** 600 ms
- **Easing :** cubic-bezier(0.2, 0.8, 0.2, 1)
- **Description visuelle :** Open reste stable, Commit chauffe en ember, Reveal pousse le cyan et le contraste, Resolved diffuse une catharsis plus claire.

### Countdown critical pulse
- **Composant :** src/components/game/room-actions.tsx ; src/components/rooms/room-card.tsx
- **Declencheur :** 30 dernieres secondes/slots equivalentes
- **Emotion cible :** urgence legitime
- **Implementation :** CSS pulse de scale/opacite sur label + transition palette
- **Duree :** boucle 900 ms
- **Easing :** ease-in-out
- **Description visuelle :** le countdown pulse plus vite, le texte passe de neutre a ember/flare, le contour des blocs se resserre.

### Seat join pop-in
- **Composant :** src/components/game/room-page.tsx
- **Declencheur :** augmentation de `playerCount`
- **Emotion cible :** "quelqu'un vient d'entrer"
- **Implementation :** animation CSS sur la seat concernee, ou keyed transition en React
- **Duree :** 320 ms
- **Easing :** cubic-bezier(0.34, 1.56, 0.64, 1)
- **Description visuelle :** la nouvelle seat pop avec glow discret, puis se stabilise dans la grille.

### Commit CTA signing sequence
- **Composant :** src/components/game/commit-composer.tsx
- **Declencheur :** clic sur la CTA commit
- **Emotion cible :** irreversibilite et gravite
- **Implementation :** etat bouton multistage : idle -> arming -> signing -> locked
- **Duree :** 180 ms press, puis etat pending tant que la tx n'est pas confirmee
- **Easing :** ease-out puis linear pour le pending
- **Description visuelle :** le bouton se contracte legerement, la surface se densifie, un tracer lumineux traverse la CTA, puis un etat locked stable remplace le label.

### Reveal envelope open
- **Composant :** src/components/game/reveal-panel.tsx
- **Declencheur :** clic reveal et confirmation hash
- **Emotion cible :** ouverture de decision scellee
- **Implementation :** CSS transform 3D legere + fade de la preuve hash
- **Duree :** 520 ms
- **Easing :** cubic-bezier(0.22, 1, 0.36, 1)
- **Description visuelle :** la carte reveal "s'ouvre", le hash devient valide, puis la confirmation tombe comme un sceau accepte.

### Histogram cascade resolve
- **Composant :** src/components/game/result-panel.tsx
- **Declencheur :** entree en statut Resolved
- **Emotion cible :** comprehension dramatique du resultat
- **Implementation :** CSS transitions ou Framer Motion sur les largeurs, avec reveal barre par barre
- **Duree :** 800 ms total
- **Easing :** ease-out
- **Description visuelle :** les 5 barres montent dans l'ordre de congestion du plus faible au plus fort, pendant qu'un label "final crowd map" apparait.

### Rank counter and payout settle
- **Composant :** src/components/game/result-panel.tsx
- **Declencheur :** apres l'histogram cascade
- **Emotion cible :** euphorie ou piqure nette
- **Implementation :** count-up pour le rang/payout, variation de ton selon victoire ou defaite
- **Duree :** 650 ms
- **Easing :** ease-out
- **Description visuelle :** le rang monte ou tombe dans une zone hero, puis le payout se fixe avec une faible impulsion lumineuse.

### Near-miss sting
- **Composant :** src/components/game/result-panel.tsx
- **Declencheur :** player non winner avec delta faible
- **Emotion cible :** frustration productive
- **Implementation :** animation courte de soulignement ember sur le message near-miss
- **Duree :** 300 ms
- **Easing :** ease-out
- **Description visuelle :** une ligne ember balaie la phrase "tu etais a X du seuil", puis s'eteint sans melodrame.

### Toast stack with decay bar
- **Composant :** src/components/ui/toast-provider.tsx
- **Declencheur :** creation et suppression d'un toast
- **Emotion cible :** feedback premium et lisible
- **Implementation :** enter slide, progress bar, exit compress/fade
- **Duree :** 240 ms enter, 180 ms exit
- **Easing :** cubic-bezier(0.2, 0.8, 0.2, 1)
- **Description visuelle :** les toasts rentrent avec inertie legere, la barre de vie descend en haut, puis le toast se comprime avant de sortir.

---

## ANNEXE B - MODIFICATIONS SMART CONTRACT

### Commit payload v2
- **Instruction concernee :** SubmitCommit / JoinAndCommit / RevealDecision
- **Probleme identifie :** Le payload commit ne porte pas d'identifiant de seat/round additionnel alors que le protocole cible le demande.
- **Correction proposee :** Etendre le hash avec `join_index` ou `round_nonce`, propager le champ dans le frontend, recalculer les vecteurs de test et versionner la methode de commit.
- **Risque si non corrige :** divergence spec/impl, confiance affaiblie, ambiguite sur l'unicite du commit dans des lobbies persistants.

### Reserve routing
- **Instruction concernee :** ResolveGame
- **Probleme identifie :** Les 2% de reserve partent vers un treasury hardcode, pas vers la reserve protocole.
- **Correction proposee :** Transferer vers Reserve PDA, differencier `protocol_fee` et `reserve`, exposer les compteurs dans `ReserveState`.
- **Risque si non corrige :** economie opaque, free access impossible a justifier.

### Emergency path reel
- **Instruction concernee :** EmergencyReturn
- **Probleme identifie :** L'instruction est desactivee.
- **Correction proposee :** Implementer `EmergencyConfig`, authorities, timelock, event journal, et remboursement limite a des paths predictibles.
- **Risque si non corrige :** aucun parachute credible en cas d'incident majeur.

### ConfigState global
- **Instruction concernee :** InitRoom / ResolveGame / routes d'admin futures
- **Probleme identifie :** Aucun compte global pour presets, treasury, flags ou versioning.
- **Correction proposee :** Introduire un `ConfigState` immutable-by-default avec modifs gouvernees et lecture publique.
- **Risque si non corrige :** hardcodes, redeploiements plus risques, gouvernance faible.

### ProfileState joueur
- **Instruction concernee :** JoinAndCommit / RevealDecision / ResolveGame / ClaimReward
- **Probleme identifie :** Aucune memoire on-chain ou indexable de la progression joueur.
- **Correction proposee :** Ajouter `games_played`, `games_won`, `cumulative_error`, `knife_hits`, `timeouts`, `net_result`, `last_seen_slot`.
- **Risque si non corrige :** leaderboard, free access et mastery system impossibles.

### Event emission riche
- **Instruction concernee :** toutes les instructions majeures
- **Probleme identifie :** Le contrat n'emet que des `msg!` minimalistes.
- **Correction proposee :** Emettre des evenements de type `RoomInitialized`, `PlayerJoined`, `CommitSubmitted`, `DecisionRevealed`, `TimeoutForced`, `GameResolved`, `RewardClaimed`.
- **Risque si non corrige :** indexation, analytics et surfaces live plus couteuses et moins fiables.

### CloseRoom / persistence semantics
- **Instruction concernee :** CloseRoom
- **Probleme identifie :** Le nom de l'instruction ne correspond pas a un vrai close economique.
- **Correction proposee :** Choisir clairement entre `ResetSystemLobby` permanent et un vrai `CloseRoom` destructif, puis aligner spec, noms et UI.
- **Risque si non corrige :** confusion operatoire et documentation trompeuse.

### Large preset support
- **Instruction concernee :** RoomState layout + ResolveGame
- **Probleme identifie :** Le layout actuel plafonne a 12 joueurs.
- **Correction proposee :** Refactorer tailles de tableau, calcul CU, decoding frontend, presets, tests et surfaces UI avant d'ouvrir les grands formats.
- **Risque si non corrige :** promesse produit non tenue et meta tronquee.

---

## ANNEXE C - NOUVEAU CONTENU COPY

### Home hero
- **Texte actuel :** "Predict the crowd. Lock the commit. Win the reveal."
- **Texte propose :** "Read the room before the room reads itself. Commit in secret. Reveal into a fully deterministic Solana arena."
- **Raison :** Monte la sophistication sociale du produit et rappelle immediatement l'absence de RNG.

### Home live module
- **Texte actuel :** absent
- **Texte propose :** "Live now: 0.08 SOL arena, 7 seats filled, reveal pressure building. Enter before the read locks."
- **Raison :** Injecte presence, urgence et desir d'action immediate.

### Lobby headline
- **Texte actuel :** "Enter any stake bracket from 0.01 to 1 SOL without waiting for a relayer."
- **Texte propose :** "Eight permanent arenas. One of them is getting crowded right now."
- **Raison :** Remplace la logique d'infrastructure par une logique de tension.

### Commit Composer warning
- **Texte actuel :** "The nonce and clear payload are stored locally before send. Lose this browser state and your manual reveal path is gone."
- **Texte propose :** "Your reveal key lives in this browser unless you back it up now. Export it before you sign if you may switch device."
- **Raison :** Rend le risque concret et actionnable, pas juste anxiogene.

### Reveal CTA block
- **Texte actuel :** "Open the sealed read and let the room score it."
- **Texte propose :** "Break the seal. If the bytes match, your read becomes law for this round."
- **Raison :** Accentue la preuve d'integrite et le caractere irreversible du moment.

### Room actions explainer
- **Texte actuel :** "Faultline rooms are built to keep moving."
- **Texte propose :** "No operator owns the round. If the clock expires, anyone can push the arena forward."
- **Raison :** Rend la permissionlessness plus nette et plus memorisable.

### Result winner card
- **Texte actuel :** "wins with the cleanest priced read"
- **Texte propose :** "priced the room best: tighter forecast, cleaner lane, stronger conviction."
- **Raison :** Explique mieux pourquoi le winner est legitime, donc pourquoi la defaite reste acceptable.

### Result loser card
- **Texte actuel :** message near-miss court issu de `describeNearMiss`
- **Texte propose :** "You were not wrong at random. You missed on [forecast delta / lane congestion / band threshold]. Fix that read and this stake is still yours to take."
- **Raison :** Transforme la defaite en plan de correction.

### Toast commit success
- **Texte actuel :** "Your reveal key was saved locally..."
- **Texte propose :** "Read locked. Backup your reveal key now if you may return on another device."
- **Raison :** Lie la gratification immediate a l'action preventive la plus critique.

---

## SYNTHESE EXECUTIVE

Faultline Arena a deja une vraie qualite rare : le produit sait ce qu'il veut etre. Le repo montre une direction de marque claire, une boucle commit-reveal lisible, et une UX deja superieure a beaucoup de surfaces web3 generiques. Mais dans son etat actuel, le projet est encore plus "prometteur" que "obsessionnel". Les cinq changements les plus impactants sont les suivants.

Premier point : corriger les ecarts de confiance. Le payload commit doit etre aligne sur la spec cible, la reserve doit etre routee vers la vraie reserve, et le chemin d'urgence doit exister pour de vrai. Sans cela, la promesse trustless reste fragile.

Deuxieme point : injecter du live reel dans la home et le lobby. Le joueur doit voir des rooms qui vivent maintenant, des winners recents, des brackets qui chauffent et des places qui se ferment. L'arene doit donner envie avant meme le premier clic.

Troisieme point : transformer la room en scene de tension par phase. Commit, Reveal et Resolve doivent chacun avoir leur atmosphere, leur cadence et leur gratification visuelle. C'est la que la dopamine legitime du produit se joue.

Quatrieme point : faire du result screen le moteur de rechute. La defaite doit produire une hypothese precise, la victoire doit etre clipable, et le replay sur le meme preset doit etre instantane. Aujourd'hui l'ecran explique ; demain il doit relancer.

Cinquieme point : ajouter une meta durable. Profil, leaderboard, historique, badges, watch live et share flows donneront enfin au jeu une memoire collective. C'est ce qui fera passer Faultline d'un bon protocole ludique a une arene que les joueurs veulent habiter, regarder et dominer.