# Faultline - protocole de jeu Solana 100% skill, sans oracle ni RNG externe

## 0. Processus obligatoire de reflexion

### 0A. Purge - 10 mecaniques tentantes, toutes eliminees

1. Social deduction type mafia: eliminee. Trop reconnaissable, depend trop de roleplay hors-chaine et de voix.
2. Encheres cachees type Highest Unique Bid: eliminee. Trop proche d'un precedent connu.
3. Poker simplifie: eliminee. Clone immediate, legalement plus fragile, deja sature.
4. Trivia live: eliminee. Requiert contenu externe et souvent un arbitre editorial.
5. Word game / puzzle: eliminee. Faible spectacle temps reel, rejouabilite limitee sans base de contenu.
6. Battle royale reflexe: eliminee. L'execution temps reel ne tient pas on-chain.
7. Draft / deckbuilding: eliminee. Trop lourd en UX et trop couteux en compute pour 100 joueurs.
8. Loot / chest / gacha: eliminee. RNG externe ou pseudo-hasard, invalide.
9. Prediction de prix / data externe: eliminee. Oracle obligatoire, invalide.
10. Farming asynchrone / idle game: eliminee. Peu de tension immediate, tres clonable.

### 0B. Interaction humaine cible

Interaction cible: se positionner avant la foule dans un espace social ou etre nombreux tue la valeur, mais etre seul trop tot est aussi risque.

Cette interaction existe partout hors du jeu competitif pur: choisir une file d'attente, une table au restaurant, un trade crowded, une posture en reunion, une ligne en manifestation, une mode naissante, un angle de fuite quand tout le monde panique. C'est profond parce que le cerveau ne lit pas un systeme fixe; il lit les autres lecteurs du systeme. La plupart des jeux exploitent soit la dexterite, soit l'information incomplete, soit la deduction. Tres peu exploitent la micro-psychologie de la congestion anticipee avec memoire publique du passe et opacite totale du present.

### 0C. Hook neurologique prioritaire

Hook prioritaire: attribution causale.

Le joueur perd et comprend exactement pourquoi: "j'ai vu juste sur la foule globale, mais j'ai sur-estime la zone 2" ou "j'ai cherche le multiplicateur Knife trop tot". Ce n'est pas une defaite opaque. Chaque defaite produit une hypothese concrete a corriger tout de suite. Le commit-reveal ajoute naturellement Zeigarnik pendant l'attente, mais le moteur de rechute immediate est l'impression qu'une petite correction de lecture sociale aurait suffi.

### 0D. Faisabilite on-chain auto-suffisante

- Les decisions sont protegees par commit-reveal sans casser la tension: oui. La tension augmente meme, car toute la room se verrouille avant de voir les reveals.
- Le resultat se calcule uniquement depuis les decisions revelees: oui. Aucun oracle, aucune RNG, aucune donnee externe.
- L'incertitude vient-elle du comportement humain: oui. L'incertitude est integralement due a l'anticipation recursive des choix des autres joueurs.
- Le calcul tient-il sous 200k CU: oui. Pour 128 joueurs, 5 zones fixes, l'algorithme est O(N x Z) avec Z = 5, plus tri leger pour les scores; cible 130k-170k CU selon taille de room.
- Si une source externe semble necessaire: non. Le concept reste valide sans aucune dependance externe.

## 1. Analyse des precedents

### Wordle

- Pourquoi c'est addictif: la rarete temporelle transforme chaque tentative en evenement; le joueur rumine entre les sessions.
- Lecon utile: limiter la frequence percue augmente la valeur subjective de la decision.
- Traduction Solana: partiellement valide. Le principe de fenetre de decision et d'analyse post-partie est transposable, mais le contenu editorial quotidien ne l'est pas sans source externe.
- Verdict: utile comme inspiration de cadence, pas comme mecanique centrale.

### Among Us

- Pourquoi la peur d'etre accuse bat la peur de mourir: l'accusation attaque l'identite sociale, pas seulement l'etat de partie.
- Lecon utile: la tension la plus forte vient du regard suppose des autres.
- Traduction Solana: partiellement invalide. Les discussions et mensonges hors-chaine ne sont pas auto-suffisants on-chain.
- Verdict: on retient la peur de la mauvaise lecture sociale, pas la deduction verbale.

### Squid Game

- Pourquoi regles simples + enjeux eleves marchent: comprehension immediate, consequence radicale.
- Lecon utile: la seconde la plus intense ne doit pas demander d'explication.
- Traduction Solana: valide si la simplicite reste purement algorithmique et sans arbitre.
- Verdict: inspire la lisibilite, pas le contenu.

### Highest Unique Bid

- Pourquoi c'est psychologiquement insupportable: chacun souffre de l'opacite de la foule et du regret ex post.
- Lecon utile: le cerveau sur-joue l'anti-congestion quand il ne voit rien.
- Traduction Solana: valide techniquement via commit-reveal, mais trop proche d'un precedent.
- Verdict: rejet comme concept final, conserve seulement la douleur de l'opacite.

### HQ Trivia

- Pourquoi l'elimination live est plus addictive qu'un classement: on regarde des vies disparaitre en temps reel.
- Lecon utile: la reduction visible du champ des gagnants cree du spectacle.
- Traduction Solana: partiellement valide. On peut montrer en reveal quelles strategies tombent, sans question exogene.
- Verdict: utile pour le mode spectateur.

### Poker televise

- Pourquoi les spectateurs sont parfois plus accros que les joueurs: ils voient la structure dramatique globale sans subir le stress de la mise.
- Lecon utile: l'information revelee au bon rythme cree un contenu naturellement commentable.
- Traduction Solana: valide. Les commits masquent, les reveals racontent, le resolve conclut.
- Verdict: c'est un precedent de mise en scene, pas de mecanique.

## 2. Tensions fondamentales exploitees

Ordre de priorite:

1. Anti-congestion: vouloir etre au bon endroit sans etre la ou tous vont aller.
2. Lecture recursive: je ne lis pas la room; je lis la lecture que la room fait d'elle-meme.
3. Risque volontaire: prendre un multiplicateur plus fort en acceptant une condition plus fragile.
4. Regret chirurgical: la defaite est expliquable par une erreur precise, donc corrigible.
5. Transparence asymetrique: le passe de chaque wallet est public, mais la decision courante est totalement opaque jusqu'au reveal.
6. Reputation cumulative: a force de rooms, certains wallets deviennent lisibles, ce qui change la meta.

Dualite blockchain exploitee:

- Passe transparent: l'historique des forecasts, des zones choisies et des niveaux de risque de chaque wallet forme une memoire collective exploitable.
- Present opaque: le commit SHA256 rend toute la room aveugle pendant la phase de decision.
- Resultat: le joueur ne "joue" pas seulement une manche; il joue contre les habitudes publiques d'adversaires dont il ne peut pas verifier l'intention courante.

## 3. Generation de 6 concepts

### Concept 1 - Faultline

- Pitch: chaque joueur predit la repartition finale sur 5 zones, choisit sa zone et un niveau de risque. Le meilleur lecteur de panique gagne.
- Notes: addiction 9/10; spectacle 9/10; legalite 8/10; originalite 8/10; scalabilite 9/10; moat anti-clone 9/10; securite structurelle 9/10; faisabilite on-chain 9/10.
- Moment peak: la revelation des derniers commits lorsque la heatmap reelle apparait et que certains multiplicateurs s'effondrent.
- Mecanisme principal: attribution causale.
- Structure de gain: top 1 / top 2 / top 3 paies on-chain, car cela garde un jackpot visible sans tuer la retention des near-miss.
- Point faible honnete: un onboarding trop intellectuel si l'interface ne visualise pas les zones et les multiplicateurs.
- Resistance au clone: la meta vient de l'historique public des wallets, pas seulement des regles.
- Architecture on-chain: un RoomState PDA massif + Vault PDA + Profile PDA; commit SHA256 par joueur; resolve O(N x 5) puis classement. Cible 130k-170k CU a 128 joueurs.
- Validation auto-suffisante: valide; seules les decisions humaines revelees sont utilisees.
- Robustesse 1-6: 1) 5 complices peuvent biaiser la foule mais pas cacher leurs habitudes futures, le 6e peut gagner en lisant leur cluster. 2) avantage bot limite, car le bot n'obtient aucune info privee avant reveal; edge surtout analytique < 20% si UI correcte. 3) une baleine n'a aucun edge structurel car la mise est uniforme par room. 4) un saboteur ne peut saboter qu'en perdant sa propre EV. 5) le MEV ne voit qu'un hash. 6) un validateur censeur retarde, mais ne peut pas lire ni changer une decision et le slot deadline laisse des retries.

### Concept 2 - Black Mirror

- Pitch: chaque joueur choisit secretement quelle zone il pense que les imitateurs vont sur-choisir, puis parie contre cette imitation.
- Notes: addiction 8/10; spectacle 8/10; legalite 8/10; originalite 9/10; scalabilite 8/10; moat 8/10; securite 8/10; faisabilite 8/10.
- Moment peak: quand la zone "evidente" sature exactement comme prevu.
- Mecanisme principal: near-miss.
- Structure de gain: winner-takes-most, pour maximiser la violence du bon call.
- Point faible honnete: trop conceptuel pour un streamer a froid.
- Resistance au clone: la valeur vient surtout de la lecture du player pool historique.
- Architecture on-chain: commit d'une zone-reflet + niveau de confiance; resolve sur histogrammes. 90k-140k CU.
- Validation auto-suffisante: oui.
- Robustesse 1-6: 1) la collusion s'auto-congestionne. 2) bots avantages modere. 3) baleine sans edge. 4) sabotage auto-penalisant. 5) commit-reveal neutralise la lecture mempool. 6) deadline protege les retries.

### Concept 3 - Quiet Ladder

- Pitch: les joueurs choisissent un barreau secret sur une echelle de risque; les barreaux trop charges cassent et seuls les survivants les mieux places marquent.
- Notes: addiction 8/10; spectacle 9/10; legalite 8/10; originalite 7/10; scalabilite 9/10; moat 7/10; securite 8/10; faisabilite 10/10.
- Moment peak: le barreau central cede et une minorite discrere capture la value.
- Mecanisme principal: Zeigarnik.
- Structure de gain: top-heavy, pour rendre chaque barreau charge dramatique.
- Point faible honnete: ressemble davantage a un jeu abstrait qu'a une interaction humaine brute.
- Resistance au clone: moyenne; les regles seules sont clonables.
- Architecture on-chain: un choix discret par joueur, resolve O(N). 70k-110k CU.
- Validation auto-suffisante: oui.
- Robustesse 1-6: 1) collusion partielle possible mais auto-crowding. 2) bot edge modere. 3) baleine neutre. 4) sabotage peu rentable. 5) hash mempool aveugle. 6) retries possibles jusqu'au slot limite.

### Concept 4 - Blind Thermals

- Pitch: chaque joueur anticipe quelles zones vont chauffer ou refroidir et choisit la seule ligne de fuite qui restera sous le radar.
- Notes: addiction 7/10; spectacle 8/10; legalite 8/10; originalite 8/10; scalabilite 8/10; moat 8/10; securite 9/10; faisabilite 9/10.
- Moment peak: le reveal de la derniere prediction de chaleur.
- Mecanisme principal: dopamine anticipatoire.
- Structure de gain: top 1 / top 2 pour garder une lecture simple.
- Point faible honnete: moins lisible qu'une simple heatmap de zones.
- Resistance au clone: depend beaucoup de l'interface de visualisation.
- Architecture on-chain: commit d'une prediction de gradient + position; resolve par somme et classement. 120k-160k CU.
- Validation auto-suffisante: oui.
- Robustesse 1-6: 1) coalition visible dans l'historique. 2) bot edge contenu. 3) baleine neutre. 4) sabotage payant rarement. 5) MEV neutralise. 6) censure = retard, pas fuite d'info.

### Concept 5 - Dead Angle

- Pitch: chacun choisit l'angle mort qu'il croit ignore par les autres; la room revele ensuite quelles zones ont vraiment ete negligees.
- Notes: addiction 7/10; spectacle 7/10; legalite 9/10; originalite 8/10; scalabilite 10/10; moat 7/10; securite 9/10; faisabilite 10/10.
- Moment peak: plusieurs joueurs croyaient avoir trouve le meme angle mort.
- Mecanisme principal: near-miss.
- Structure de gain: winner-takes-most pour renforcer la violence du bon angle.
- Point faible honnete: moins riche en meta longue que Faultline.
- Resistance au clone: moyenne.
- Architecture on-chain: un angle + un nonce; resolve pur histogramme. 60k-90k CU.
- Validation auto-suffisante: oui.
- Robustesse 1-6: 1) collusion se transforme en crowding. 2) bot edge faible. 3) baleine neutre. 4) sabotage auto-destructeur. 5) hashes inutilisables pour MEV. 6) deadlines absorbent la censure ponctuelle.

### Concept 6 - Split Signal

- Pitch: chaque joueur annonce secretement comment il croit que la room va se splitter, puis choisit le fragment ou il veut se cacher.
- Notes: addiction 8/10; spectacle 8/10; legalite 8/10; originalite 8/10; scalabilite 9/10; moat 8/10; securite 8/10; faisabilite 9/10.
- Moment peak: quand deux joueurs avec la meme prediction choisissent des fragments opposes.
- Mecanisme principal: progression masquee.
- Structure de gain: top 3 pour entretenir la retention.
- Point faible honnete: moins immediate a expliquer qu'une simple zone et un multiplicateur.
- Resistance au clone: bonne mais pas exceptionnelle.
- Architecture on-chain: prediction compressable + fragment choisi; resolve O(N x Z). 110k-150k CU.
- Validation auto-suffisante: oui.
- Robustesse 1-6: 1) coalition pas garantie gagnante. 2) bot edge surtout analytique. 3) baleine sans edge. 4) sabotage coute sa propre mise. 5) commit-reveal neutralise la mempool. 6) retry jusqu'au slot deadline.

## 4. Selection et developpement

Concept retenu: Faultline.

Pourquoi:

- Meilleur ratio addiction x moat x securite x faisabilite.
- Lisible en moins de 30 secondes pour un spectateur: "ou la foule va-t-elle s'entasser, et qui ose viser le multiplicateur le plus dangereux?"
- Meta profonde sans oracle: l'historique public des wallets nourrit la prediction future.
- Architecture propre: un hash par joueur, puis un calcul deterministe simple et auditable.

Hybrides empruntes:

- De Quiet Ladder: l'idee de paliers de risque tres lisibles.
- De Split Signal: la richesse metagame du forecast de repartition complete.

Le mecanisme final ne ressemble a aucun precedent liste, car il combine prediction de distribution, positionnement anti-congestion et declaration de risque sous commit-reveal integral.

## A. Regles du jeu

### Pitch en moins de 20 mots

Predis la foule, place-toi hors de la foule, revele, et le meilleur lecteur de panique capture le pot.

### Version complete des regles

Parametres fixes d'une room:

- 5 zones: A, B, C, D, E.
- Mise uniforme par joueur.
- Min players configurable, max players 128.
- Fenetre de join en slots.
- Fenetre de commit en slots, declenchee par le premier commit valide des que le minimum est atteint.
- Fenetre de reveal en slots, declenchee a la fin de commit phase ou des que tous les commits sont recus.

Ce que chaque joueur decide:

1. une zone parmi 5;
2. un niveau de risque parmi 3;
3. une prediction complete de repartition finale sur les 5 zones, sous forme de 5 entiers dont la somme egale le nombre final de joueurs actifs prevu par le joueur;
4. un nonce de 32 bytes.

Les 3 niveaux de risque:

- Calm: multiplicateur 1.00x, toujours valide.
- Edge: multiplicateur 1.55x si la zone choisie finit dans les 2 zones les moins peuplees; sinon 0.25x.
- Knife: multiplicateur 2.40x si la zone choisie finit a l'occupation minimale; sinon 0x.

Definition du score a la resolution:

- Histogramme reel H[5] calcule depuis toutes les reveals valides.
- Erreur de forecast du joueur i: e_i = somme sur 5 zones de |forecast_i[z] - H[z]|.
- Base_i = max(1, 5 x N - e_i), ou N est le nombre de joueurs actifs resolves.
- Mult_i = 1.00 / 1.55 / 2.40 selon le niveau de risque et la condition de congestion constatee.
- Score_i = Base_i x Mult_i, calcule en basis points pour rester entier on-chain.

Classement:

1. score le plus eleve;
2. en cas d'egalite, erreur de forecast la plus faible;
3. puis occupation de zone la plus faible;
4. puis ordre lexicographique du pubkey pour determinisme.

Payout ladder sur 98% du pot:

- 2 a 4 joueurs actifs: 90 / 8.
- 5 a 24 joueurs actifs: 72 / 18 / 8.
- 25 a 128 joueurs actifs: 64 / 20 / 10 / 4.
- 2% du total des mises vont au Reserve PDA.

### Cas limites

- Room sous-remplie avant join_deadline_slot: CancelExpiredRoom rembourse integralement tous les joueurs et ferme la room.
- Timeout commit: ForceTimeout marque les joueurs non-committed comme absents. Si le nombre d'actifs retombe sous le minimum, la room est annulee; les joueurs honnetes recuperent 100%, les absents 50%, le reste allant a la reserve anti-grief.
- Timeout reveal: ForceTimeout marque les joueurs committed mais non-revealed comme forfait. Ils recuperent 0%; 75% de leur mise alimente le prize pool, 25% alimente la reserve free access.

### Fonctionnement a 2, 5, 20, 100 joueurs

- A 2 joueurs: c'est un duel de lecture frontale. Le bon forecast est moins large, le niveau Knife ressemble a une declaration de lecture psychologique pure.
- A 5 joueurs: la room devient assez dense pour que le choix de multiplicateur cree deja un vrai metagame.
- A 20 joueurs: la perception de foule domine. Les forecast vectors deviennent le coeur du skill edge.
- A 100 joueurs: le jeu devient une macro-lecture de congestion. L'historique des wallets, des heures de jeu et des habitudes de la playerbase devient un vrai moat cognitif.

### Regles de fin de partie

- Si tous les reveals arrivent avant le deadline, n'importe qui peut appeler ResolveGame immediatement.
- Si des reveals manquent a l'expiration, n'importe qui peut appeler ForceTimeout puis ResolveGame.
- Apres resolution, ClaimReward est permissionless pour chaque gagnant et idempotent.
- Quand tous les rewards et remboursements sont claims, la room est closee et le rent est recupere.

### Regles anti-triche et anti-collusion structurelles

- Commit SHA256 immuable: aucun joueur ne peut adapter sa decision aux reveals adverses.
- L'information mempool est inutile: elle ne contient qu'un hash.
- Les coalitions se rendent predictibles dans l'historique et paient leur coordination en crowding.
- Le sabotage est auto-penalisant: faire perdre les autres suppose aussi d'immoler sa propre EV.
- Les mises sont uniformes par room: la taille de bankroll ne change pas le calcul du resultat.

## B. Architecture de l'addiction - section critique

### A. Dopamine anticipatoire

- Implementation: multiplicateurs Calm / Edge / Knife affiches avant commit, avec projection du jackpot selon la taille courante de la room.
- Declenchement exact: au moment ou le joueur choisit son niveau de risque juste avant de signer le commit.
- Pourquoi il rejoue: il veut retenter le multiplicateur qu'il a soit rate de peu, soit refuse par prudence.

### B. Near-miss

- Implementation: l'UI montre apres resolve si une zone du joueur a manque la condition Edge ou Knife d'un seul joueur.
- Declenchement exact: au reveal de l'histogramme final et du rang de congestion.
- Pourquoi il rejoue: la defaite ressemble a un ajustement d'une unite, pas a un echec arbitraire.

### C. Attribution causale

- Implementation: pour chaque partie, le protocole expose zone, risque, forecast, histogramme reel, erreur et score pour tous.
- Declenchement exact: juste apres ResolveGame, quand le joueur compare son forecast et celui du gagnant.
- Pourquoi il rejoue: il formule une correction concrete, donc son cerveau attribue la defaite a une erreur reparable.

### D. Progression masquee

- Implementation: ProfileState stocke games_played, precision moyenne, taux de knife reussi, taux de timeout, elo de lecture sociale.
- Declenchement exact: sur l'ecran post-game et dans le profil wallet.
- Pourquoi il rejoue: meme sans cash-out, il sent une competence cumulative qui se construit.

### E. Zeigarnik

- Implementation: commit et reveal sont separes par design; une partie reste cognitivement "ouverte" tant que les reveals n'ont pas leve le voile.
- Declenchement exact: entre le commit et le dernier reveal.
- Pourquoi il rejoue: la tension non resolue laisse un residue mental qui appelle un nouvel essai immediat.

### F. Ratio variable

- Implementation: le jackpot en multiple de mise varie selon la taille finale de room et le rang de payout.
- Declenchement exact: durant la phase de join puis au choix du risque, quand le joueur voit le multiple projete monter.
- Pourquoi il rejoue: la prochaine room peut offrir un multiple plus fort pour la meme competence.

## C. Invariance au nombre de joueurs

- A 2: l'experience est intime. On lit un cerveau.
- A 5: l'experience devient tactique. On lit une micro-foule.
- A 25: l'experience devient strategique. On lit des sous-groupes, des habitudes de tranche horaire, des reputations publiques.
- A 100+: l'experience devient presque economique. On lit des mouvements de congestion, des effets de reputation, des clusters de style.

La tension ne monte donc pas lineairement avec N. Elle change de nature:

- duel psychologique a 2;
- anti-coordination tactique a 5;
- prediction de distribution a 25;
- lecture de marche social a 100+.

## D. Mecanique economique

### Distribution des 98%

- 2 a 4 actifs: 90 / 8.
- 5 a 24 actifs: 72 / 18 / 8.
- 25 a 128 actifs: 64 / 20 / 10 / 4.
- 2% vont au Reserve PDA.
- Les penalites de reveal timeout ne sont jamais du revenu equipe: 75% prize pool, 25% reserve free access.

### Structure de gain retenue + justification neuropsychologique

Le protocole paie peu de places mais pas une seule. Cela preserve trois choses a la fois:

- un top prize assez violent pour que le multiple soit obsesseur pendant la partie;
- des near-miss monnayes pour que le joueur reste vivant psychologiquement;
- une lecture simple pour les spectateurs.

### Simulation chiffree P&L

Hypothese:

- room a 20 joueurs;
- mise unitaire 0.05 SOL;
- ladder 72 / 18 / 8;
- total stakes = 1.00 SOL;
- pot distribuable = 0.98 SOL.

Si un joueur perd 10 parties puis gagne la 11e en top 1:

- pertes cumulees: -0.50 SOL;
- gain brut top 1: 0.7056 SOL;
- gain net de la partie gagnee, mise incluse: +0.6556 SOL;
- bilan total apres 11 parties: +0.1556 SOL.

Effet comportemental: le joueur sait qu'une seule lecture juste en room dense peut compenser une longue serie de petites erreurs. Cela pousse au "encore une", mais reste ancre a une competence observable, pas a la chance.

### Influence du multiplicateur affiche en temps reel

- Avant le start: plus la room grossit, plus le multiple top 1 monte.
- Pendant la preparation du commit: le joueur choisit s'il verrouille un Calm prudent ou s'il tente Edge / Knife pour capturer un multiple socialement plus rare.
- Effet: le multiplicateur n'anesthesie pas; il amplifie la prise de position. Il force a choisir entre EV stable et lecture agressive.

### Reserve free access

- Taille cible initiale: 250 SOL.
- Alimentation: 2% protocolaires + 25% des reveal timeouts + 50% des commit no-shows quand une room demarre puis avorte.
- Conditions d'acces meritees: profil wallet age d'au moins 5 parties, profit net 30 jours <= 0, timeout ratio < 5%, une aide toutes les 24h, cap de mise sponsorisee 0.02 SOL.
- Protections anti-drain: eligibility purement on-chain via ProfileState; quota journalier; exclusion automatique des wallets fraichement crees; la reserve ne couvre jamais plus d'un seat par epoch par wallet.

### Couts on-chain

- Frais de transaction utilisateur: ordre de grandeur 0.00002 a 0.00015 SOL pour le cycle complet selon priorite fee et congestion.
- Couts de rent de room: environ 0.07 a 0.09 SOL pour RoomState a 128 joueurs, recuperes a la fermeture.
- Impact sur la mise minimale viable: techniquement 0.005 SOL reste jouable; commercialement 0.01 SOL ou plus est plus sain pour ne pas noyer l'experience dans le bruit des fees.

## E. Metagame et progression

### Strategie day-1 d'un debutant

- Jouer Calm.
- Predire des repartitions simples et symetriques.
- Eviter de sur-optimiser Knife sans historique de room.

### Strategie d'un joueur 50 parties

- Identifier les habitudes de fuseau horaire.
- Lire quels wallets sur-jouent Edge par ego.
- Biaiser ses forecasts contre les clusters de regulars connus.

### Strategie d'un joueur 500 parties

- Construire des modeles mentaux de sous-populations.
- Manipuler sa propre reputation historique pour devenir moins lisible.
- Changer volontairement de profil de risque a certaines tailles de room pour casser les lecteurs de second ordre.

### Evolution de la meta

La meta passe de "ne sois pas ou tout le monde sera" a "predis quel sous-groupe va croire que tout le monde sera quelque part". Ce glissement en lecture de second et troisieme ordre cree la profondeur durable.

### Barriere a l'entree pour les clones

Un clone peut copier les regles. Il ne peut pas copier:

- des milliers de reveals historiques lies aux memes wallets;
- la memoire des regulars;
- les reputations de style;
- les modeles de sous-populations construits par la communaute.

### Reequilibrage si la meta se resolvait completement

Le protocole n'introduit jamais de patch secret. Si une meta se fige:

- publication d'un audit de meta;
- deploiement d'une v2 avec preset de room additionnel, pas modification silencieuse de v1;
- migration volontaire des joueurs;
- archive intacte de v1 pour preserver la confiance.

## F. Moat anti-clone

### Memoire collective on-chain

- Construction: chaque reveal reste dans RoomState et dans les logs d'evenements.
- Seuil defensif: apres quelques milliers de rooms.
- Non replicable instantanement: un clone n'a pas le meme passe strategique.
- Ce qu'un concurrent 10x budget ne peut pas acheter: des annees de pattern memory authentique.

### Identite soulbound

- Construction: ProfileState derive du wallet, non transferable, enrichi par performance et discipline.
- Seuil defensif: des qu'un wallet reputee emerge.
- Non replicable: impossible de transferer la reputation sans transferer la cle.
- Ce qu'un concurrent ne peut pas acheter: la credibilite accumulee d'un pseudo-on-chain.

### Meta vivante

- Construction: les joueurs lisent des joueurs, pas seulement une formule.
- Seuil defensif: des que les regulars deviennent nombreux.
- Non replicable: un clone sans regulars ne reproduit pas la meme ecologie.
- Non achetable: la boucle sociale de lecture recursive.

### Reseau de reputation

- Construction: dashboards, profils, winrate par niveau de risque, precision moyenne.
- Seuil defensif: des que des leaders d'opinion et streamers sont suivis.
- Non replicable: la relation audience-wallet se construit dans le temps.
- Non achetable: la legitimite d'avoir gagne devant tout le monde.

### Cout d'opportunite

- Construction: quitter le protocole, c'est repartir sans historique interpretable.
- Seuil defensif: 50+ parties par wallet regulier.
- Non replicable: un clone peut subventionner, pas restituer l'historique perdu.
- Non achetable: le temps deja investi dans la lecture de cet ecosysteme precis.

### Donnees comportementales

- Construction: dataset public des forecasts, zones, risques, timings, no-shows.
- Seuil defensif: des milliers de rooms.
- Non replicable: la forme du dataset depend des joueurs originels.
- Non achetable: la densite de signaux comportementaux honestes.

## G. Mode stream / spectateur

- Role du streamer: commenter la taille de room, les profils connus, les joueurs qui osent Knife, et les patterns historiques visibles.
- Role du chat: speculer sur la zone surchargee et sur les wallets qui overplay Edge.
- Moment de tension visible: fin de join puis reveal progressif de l'histogramme reel.
- Moment de reveal: les commits s'ouvrent un par un sans risque d'adaptation, car tout est deja verrouille.
- Pourquoi c'est clipable: le clip parfait montre un joueur qui se croit genial sur Knife, puis perd parce qu'un seul wallet de plus a rejoint sa zone.

## H. Argument legal

### Classification en une phrase simple

Concours de prediction strategique pair-a-pair, sans hasard, dont le resultat depend exclusivement de la qualite de lecture des decisions humaines adverses.

### Pourquoi le resultat depend uniquement de la competence

- Aucun tirage.
- Aucun oracle.
- Aucun seed aleatoire.
- Le seul input incertain est la decision humaine des autres joueurs.
- Les regles de score sont fixes, publiques, deterministes et auditablement reproduisibles.

### Pourquoi l'absence totale d'oracle ou de RNG externe renforce l'argument skill-based

Elle supprime le seul espace ou un regulateur pourrait dire que la machine a introduit une chance externe. Ici, le protocole ne fait que verrouiller, reveler et calculer.

### Zones de lancement les plus pragmatiques

- Lancement geofence hors US, UK, France, Belgique au debut.
- Priorite a des juridictions plus ouvertes aux concours de skill et aux actifs numeriques, sous validation counsel locale.
- Structure legale prudente: B2B offshore + front-end geofence + KYC eventuel selon pays.

### Compatibilite avec les reglementations sur les actifs numeriques

Le fait d'utiliser des mises en SOL ne change pas la these centrale: ce n'est pas un jeu de hasard si le resultat ne depend d'aucun hasard. En revanche, la couche AML, geo-restrictions et qualification locale des concours payants doit etre traitee pays par pays.

## I. Securite / anti-exploit - section critique

### I1. Matrice des vecteurs d'attaque

#### Couche jeu

1. Collusion
- Attaque: 5 wallets coordonnes essaient de concentrer la room pour nourrir un 6e.
- Pourquoi ca echoue: ils doivent se commit sans connaitre le forecast outsider; leur coordination devient un signal exploitable et crowding leurs propres zones.
- Signal: clusters repetitifs de zones/risques entre memes wallets.
- Reponse auto: scoring purement deterministe, aucune discretion humaine; dashboards de collusion publics.

2. Information
- Attaque: reverse-engineer l'intention depuis la transaction avant reveal.
- Pourquoi ca echoue: seul le commit hash est visible, domain-separated et sale par nonce 32 bytes.
- Signal: aucun signal utile pre-reveal.
- Reponse auto: reject de toute reveal dont le hash ne matche pas.

3. Temporel
- Attaque: attendre le dernier slot pour commit ou reveal afin de griefer la room.
- Pourquoi ca echoue: deadlines en slots, ForceTimeout permissionless, no-show commit et no-show reveal economiquement punis.
- Signal: wallets avec reveal au dernier slot et fort timeout ratio.
- Reponse auto: slash deterministe selon phase.

4. Multi-comptes
- Attaque: sybil farm pour se donner plus de surface de lecture.
- Pourquoi ca echoue: une room impose mise uniforme, la sybilie coute lineairement des mises reelles et augmente le risque de crowding interne.
- Signal: wallets neufs jouant ensemble, timings correles.
- Reponse auto: aucune faveur protocolaire; soulbound reputation ne se transfere pas.

5. Bots
- Attaque: bot qui modelise l'historique mieux qu'un humain.
- Pourquoi ca reste contenu: le bot n'obtient aucune information privee, seulement de la discipline analytique. Le jeu reste skill-based; l'edge bot vient de l'interface / modele, pas d'une faille de protocole.
- Signal: regularite extreme de temps de commit et de choix de risque.
- Reponse auto: aucune, hors eventuelles rooms segreguees en front-end si necessaire.

6. Economique
- Attaque: sacrifier plusieurs comptes pour nourrir un compte cible.
- Pourquoi ca devient irrationnel: chaque compte nourricier paie sa mise, le fee de reserve, le risque de crowding et l'exposition du pattern; la coalition ne cree pas de value, elle la redistribue a cout fixe.
- Signal: pertes systematiques concentrees vers un meme wallet.
- Reponse auto: aucun arbitre; le protocole rend simplement la manoeuvre chere et visible.

7. Reputation
- Attaque: forger une fausse image de style pour pieger les lecteurs, puis switch brutal.
- Pourquoi ce n'est pas un exploit: c'est du metagame legitime, pas une faille.
- Signal: drift soudain de style, visible a tous.
- Reponse auto: aucune; c'est une strate de competence normale.

#### Couche blockchain

8. Front-running / MEV
- Attaque: lire les tx pending pour copier une decision.
- Pourquoi ca echoue: le commit ne revele rien d'exploitable; le hash ne se copie pas car player pubkey et room pubkey sont inclus.
- Signal: neant.
- Reponse auto: verification du domain separator + room + player dans le hash.

9. Replay
- Attaque: rejouer un vieux reveal ou un vieux commit dans une autre room.
- Pourquoi ca echoue: room pubkey, player pubkey et join_index sont dans le hash; revealed flag empeche toute seconde utilisation.
- Signal: mismatch hash immediat.
- Reponse auto: reject programmatique.

10. Account confusion
- Attaque: passer un autre vault ou un autre room_state compatible en taille.
- Pourquoi ca echoue: toutes les accounts critiques sont PDAs avec seeds verifiees Anchor.
- Signal: seeds mismatch.
- Reponse auto: transaction revert.

11. Reentrancy
- Attaque: callback pendant ClaimReward ou CPI vicieuse.
- Pourquoi ca echoue: Solana n'a pas de reentrancy EVM-style; de plus claimed flag est ecrit avant le transfer.
- Signal: double claim tente.
- Reponse auto: idempotence stricte, second call sans effet utile.

12. Signer escalation
- Attaque: utiliser signer seeds pour drainer le vault hors path normal.
- Pourquoi ca echoue: seules les seeds internes du vault sont derivees en scope local, et les destinations sont bornees a player key du reward calcule ou reserve PDA.
- Signal: destination non conforme.
- Reponse auto: contraintes account + checks d'index gagnant.

13. Overflow / underflow
- Attaque: manipuler montants ou scores pour depasser les bornes.
- Pourquoi ca echoue: types u64 / u128 pour agregats, checked math partout, max players borne a 128, zone count fixe a 5.
- Signal: checked operation failure.
- Reponse auto: revert.

14. Exploitation du determinisme
- Attaque: precalculer parfaitement les meilleurs coups a partir du code.
- Pourquoi ca n'est pas une faille: le code est public, mais les inputs humains restent prives jusqu'au reveal. Le determinisme garantit l'equite, pas une exploitabilite.
- Signal: none.
- Reponse auto: none; c'est la propriete voulue.

### I2. Architecture de validation on-chain

#### InitRoom

- Comptes requis:
  - creator: Signer.
  - room_state: init, payer = creator, seeds = [b"room", room_seed], bump.
  - vault: init, payer = creator, seeds = [b"vault", room_state.key().as_ref()], bump.
  - reserve: mut, seeds = [b"reserve"], bump.
  - system_program.
- Contraintes Anchor exactes:
  - stake_lamports > 0.
  - 2 <= min_players <= max_players <= 128.
  - join_window_slots > 0, commit_window_slots > 0, reveal_window_slots > 0.
  - room_state.status == Open a l'init.
- Logique: ecrit la config, les deadlines de join, initialise le vault vide.
- Compute units estimes: 20k-35k.
- Echec: room_seed deja utilise, config invalide, ou financement insuffisant du rent.

#### JoinRoom

- Comptes requis:
  - player: Signer.
  - room_state: mut, seeds = [b"room", room_seed], bump.
  - vault: mut, seeds = [b"vault", room_state.key().as_ref()], bump.
  - profile: init_if_needed, payer = player, seeds = [b"profile", player.key().as_ref()], bump.
  - system_program.
- Contraintes:
  - room_state.status == Open.
  - current_slot <= join_deadline_slot.
  - player_count < max_players.
  - player non deja present.
- Logique: transfere la mise au vault, enregistre le pubkey a un join_index stable.
- Compute units estimes: 25k-40k.
- Echec: room pleine, deadline depassee, double join.

#### SubmitCommit

- Comptes requis:
  - player: Signer.
  - room_state: mut, seeds = [b"room", room_seed], bump.
  - profile: mut, seeds = [b"profile", player.key().as_ref()], bump.
- Contraintes:
  - player deja join.
  - joueur non deja commited.
  - si room_state.status == Open, alors player_count >= min_players; le premier commit scelle la room et fixe commit_deadline_slot = current_slot + commit_window_slots.
  - current_slot <= commit_deadline_slot si la phase est deja ouverte.
- Logique: stocke le commit hash de maniere immuable dans RoomState.
- Compute units estimes: 20k-30k.
- Echec: commit hors fenetre, room encore sous minimum, double submit.

#### RevealDecision

- Comptes requis:
  - player: Signer.
  - room_state: mut, seeds = [b"room", room_seed], bump.
  - profile: mut, seeds = [b"profile", player.key().as_ref()], bump.
- Contraintes:
  - joueur deja commited et non revelead.
  - current_slot <= reveal_deadline_slot.
  - somme du forecast <= 128 et > 0.
  - hashv(domain, room, player, join_index, zone, risk, forecast[5], nonce) == commit_hash stocke.
- Logique: ecrit zone, risk, forecast, flag reveal; ne permet jamais de modification apres succes.
- Compute units estimes: 35k-55k.
- Echec: hash invalide, double reveal, hors fenetre, forecast malforme.

#### ResolveGame

- Comptes requis:
  - caller: Signer.
  - room_state: mut, seeds = [b"room", room_seed], bump.
  - vault: mut, seeds = [b"vault", room_state.key().as_ref()], bump.
  - reserve: mut, seeds = [b"reserve"], bump.
- Contraintes:
  - room non deja resolue.
  - tous les committed ont revele, ou bien les absents ont ete traites par ForceTimeout, ou bien reveal_deadline_slot est depasse et aucun reveal supplementaire n'est valide.
  - active_players >= 2, sinon annulation/refund path.
- Logique: calcule H[5], erreurs, scores, ladder, rewards exacts; marque room resolue; emet event.
- Compute units estimes: 130k-170k a 128 joueurs.
- Echec: phase incorrecte, room deja resolue, etat partiel non timeoute.

#### ClaimReward

- Comptes requis:
  - player: Signer.
  - room_state: mut, seeds = [b"room", room_seed], bump.
  - vault: mut, seeds = [b"vault", room_state.key().as_ref()], bump.
  - system_program.
- Contraintes:
  - room resolue ou emergency_refund active.
  - reward_lamports[player_index] > 0.
  - claimed[player_index] == false.
- Logique: ecrit claimed = true avant CPI de transfer vers player.
- Compute units estimes: 15k-25k.
- Echec: zero reward, double claim, seeds mismatch.

#### ForceTimeout

- Comptes requis:
  - caller: Signer.
  - room_state: mut, seeds = [b"room", room_seed], bump.
  - vault: mut, seeds = [b"vault", room_state.key().as_ref()], bump.
  - reserve: mut, seeds = [b"reserve"], bump.
- Contraintes:
  - current_slot > la deadline pertinente.
  - room non resolue.
- Logique:
  - en phase commit: marque les no-show commits, attribue refund/penalty, et annule si actifs < minimum.
  - en phase reveal: marque les no-show reveals comme forfaits, route 75% au pot et 25% a la reserve.
- Compute units estimes: 35k-80k selon nombre d'absents.
- Echec: appelee avant deadline, ou room deja resolue.

#### CancelExpiredRoom

- Comptes requis:
  - caller: Signer.
  - room_state: mut, seeds = [b"room", room_seed], bump.
  - vault: mut, seeds = [b"vault", room_state.key().as_ref()], bump.
  - reserve: mut, seeds = [b"reserve"], bump.
- Contraintes:
  - room_state.status == Open.
  - current_slot > join_deadline_slot.
  - player_count < min_players.
- Logique: bascule en refund mode; chaque joueur recupere 100% via ClaimReward; room closeable apres tous les claims.
- Compute units estimes: 25k-40k.
- Echec: minimum atteint ou mauvais etat.

#### EmergencyReturn

- Comptes requis:
  - emergency_authority: Signer, doit egaler le vault du multisig 3/5 timelocke externe.
  - emergency_config: seeds = [b"emergency-config"], bump.
  - room_state: mut, seeds = [b"room", room_seed], bump.
  - vault: mut, seeds = [b"vault", room_state.key().as_ref()], bump.
- Contraintes:
  - emergency_config.authority == emergency_authority.key().
  - le timelock 72h est deja enforce par le multisig externe avant execution.
  - room non deja closee.
- Logique: fige la room, remplace tout resultat non claim par remboursement pro-rata des depots restants; aucun fonds ne part a l'equipe.
- Compute units estimes: 30k-50k.
- Echec: autorite incorrecte, room deja finalisee/closee.

### I3. Transparence verifiable

#### Comment verifier une defaite legitime on-chain

1. Lire RoomState.
2. Recuperer le join_index du wallet perdant.
3. Recalculer le commit hash avec le nonce revele et verifier l'egalite.
4. Recalculer l'histogramme H[5].
5. Recalculer e_i, Base_i, Mult_i, Score_i.
6. Rejouer le tie-break deterministe.
7. Verifier le reward stocke et l'event ResolveGame.

#### Ou sont stockees les preuves

- Commit hashes: dans RoomState.
- Reveals complets: zone, risk, forecast, flags dans RoomState.
- Resultat final: winners, rewards, final histogram et event logs.

#### Comment l'algorithme est auditable par des tiers

- L'algorithme est court, purement deterministe et open-source.
- Tous les inputs sont on-chain.
- Les sorties peuvent etre reexecutees hors-chaine bit a bit.

#### Si le programme est hacke en cours de partie

- Les rooms non resolues passent en emergency mode via multisig + timelock.
- Les fonds restants du vault sont rendus aux joueurs, jamais confisques.
- Les rooms deja resolues mais non claims restent claimables si les soldes sont sains; sinon elles passent aussi en refund mode.

#### Si Solana connait une panne reseau de plusieurs heures

- Les fonds restent bloques dans les PDAs, donc custodialement intacts.
- Les deadlines en slots ne progressent pas tant que la chaine ne finalise pas de nouveaux slots; le joueur censure ou coupe n'est pas puni par le mur de temps reel.
- Au redemarrage, la room reprend proprement depuis son etat exact.

### I4. Tests de robustesse detailles sur le concept final

1. Table ronde, 5 complices sur 6:
Ils peuvent tenter de surcharger une ou deux zones ou de nourrir un wallet cible. Le 6e peut quand meme gagner s'il lit correctement ce pattern de coalition et choisit un forecast compatible. La coalition ne peut pas adapter apres commit, et sa coordination laisse des signatures publiques reutilisables contre elle aux parties suivantes.

2. Bot parfait:
Le bot peut mieux exploiter l'historique public et la discipline de sizing de risque, mais il ne voit aucune decision privee. Son edge vient d'une meilleure modelisation, pas d'un avantage informationnel structurel. Avec une UX correcte pour humains et sans rooms ultra-larges par defaut, l'edge bot reste analytique, pas asymetrique.

3. Baleine:
Elle ne peut pas sur-miser dans une meme room. Son seul avantage est le volume de parties, donc l'apprentissage. Le design neutralise l'avantage de bankroll en imposant la mise uniforme et en faisant reposer le gain sur la lecture, pas sur l'enchere.

4. Saboteur:
S'il veut faire perdre les autres, il doit occuper des zones, bruler des mises et rigidifier un pattern reconnaissable. Son sabotage devient un cout recurrent et un dataset public contre lui.

5. MEV:
Le searcher lit les tx pending et ne voit qu'un hash. Il sait qu'un commit existe, mais pas quelle zone, quel risque ni quel forecast. Son edge structurel est donc nul avant reveal.

6. Rogue validator:
Il peut retarder une tx d'un joueur, pas la comprendre ni la modifier. Les deadlines en slots laissent des retries. Une longue panne reseau fige aussi le compteur de slots, ce qui protege le joueur honnete.

### I5. Red team - adversaire 6 mois de preparation

Plan plausible de l'adversaire:

1. Construire un modele complet de la meta a partir des reveals publics.
2. Monter un cluster de sybils pour influencer certaines rooms.
3. Tenter de reconnaitre les commits dans la mempool.
4. Chercher des bugs de vault accounting et de double claim.
5. Etudier les race conditions de timeout.

Pourquoi il echoue a chaque etape:

- Etape 1: il gagne peut-etre une competence, mais c'est autorise; ce n'est pas un exploit.
- Etape 2: la sybilie coute des mises reelles, crowd ses propres zones et degrade son camouflage historique.
- Etape 3: les commits sont aveugles et lies au player pubkey et a la room.
- Etape 4: claimed-before-transfer, seeds strictes, reward precalcule et idempotent ferment la porte au drain.
- Etape 5: ForceTimeout et ResolveGame ont des transitions d'etat monotones; aucun retour en arriere ni branche arbitraire.

### I6. Anticipation d'audit

Les 3 vulnerabilites les plus probables a soulever par un audit:

1. Mauvaise comptabilite des timeouts commit qui pourrait laisser un etat partiellement remboursable.
- Anticipation: un champ de status explicite par joueur et une machine d'etat monotone sont imposes.

2. Mauvais calcul ou arrondi du payout ladder sur gros volumes.
- Anticipation: calcul en u128, arrondi vers le bas, reliquat explicite route a la reserve ou au top rank selon regle documentee et testee.

3. Mauvaise protection du close de room avant epuisement des claims.
- Anticipation: close uniquement si somme des rewards non claims = 0 et tous les flags claims/refunds sont finalises.

## J. Architecture technique Solana

### J1. Structure des comptes

#### PDAs

1. RoomState
- Seeds: [b"room", room_seed[32]].
- Taille cible: environ 10,752 bytes pour max 128 joueurs et 5 zones.
- Rent-exemption estime: environ 0.07 a 0.09 SOL, a recalculer via getMinimumBalanceForRentExemption au deploiement.

2. Vault
- Seeds: [b"vault", room_state.key().as_ref()].
- Taille: 0 data utile ou 8 bytes de discriminant selon implementation.
- Rent-exemption: negligeable compare a RoomState.

3. ProfileState
- Seeds: [b"profile", player.key().as_ref()].
- Taille: environ 128 bytes.
- Rent-exemption estime: ~0.001 a 0.002 SOL.

4. ReserveState
- Seeds: [b"reserve"].
- Taille: environ 96 bytes.
- Role: accumuler fees et aides.

5. EmergencyConfig
- Seeds: [b"emergency-config"].
- Taille: environ 96 bytes.
- Role: pointer vers le multisig externe autorise.

#### Schema de relations entre comptes

- Un RoomState pointe vers un seul Vault.
- Chaque joueur peut avoir un seul ProfileState par wallet.
- Toutes les rooms alimentent le meme ReserveState.
- EmergencyConfig est global et unique.

#### Garbage collection

- Une room peut etre closee quand tous les rewards/refunds ont ete claims.
- Le rent du RoomState et du Vault revient au close authority determine par la room, typiquement le createur ou un garbage collector permissionless remunere par un petit bounty de close fixe dans la room.
- Les profiles ne sont jamais closes automatiquement; ils sont le moat reputational.

### J2. Instructions du programme et evenements

Evenements emis:

- RoomInitialized(room, creator, stake, min_players, max_players)
- PlayerJoined(room, player, join_index)
- CommitSubmitted(room, player, join_index)
- DecisionRevealed(room, player, zone, risk)
- TimeoutForced(room, phase, affected_players)
- GameResolved(room, active_players, histogram, winner_indices)
- RewardClaimed(room, player, lamports)
- RoomCancelled(room)
- EmergencyModeEnabled(room)

### J3. Schema de securite cryptographique

#### Format exact des donnees hashees

Ordre exact des bytes:

1. domain separator ASCII: FAULTLINE_COMMIT_V1
2. room_pubkey: 32 bytes
3. player_pubkey: 32 bytes
4. join_index: u16 little-endian
5. zone: u8
6. risk_band: u8
7. forecast[0]: u8
8. forecast[1]: u8
9. forecast[2]: u8
10. forecast[3]: u8
11. forecast[4]: u8
12. nonce: [u8; 32]

Hash final: SHA256 de la concatenation ci-dessus.

#### Gestion des nonces

- Un nonce par commit, 32 bytes choisis client-side.
- Nonce non stocke avant reveal, seul le hash est stocke.
- Apres reveal, le nonce n'a plus de valeur reutilisable car room + player + join_index + revealed flag rendent tout replay invalide.
- Les nonces tous-zero peuvent etre refuses pour hygiene.

#### Verification SHA256 on-chain

- Utiliser solana_program::hash::hashv ou l'equivalent Anchor.
- Recomposer exactement la sequence de bytes, sans serialisation ambigue.
- Comparer byte a byte au commit stocke.

### J4. Integration frontend

#### Construction des transactions

- Wallet Adapter pour la signature.
- @solana/web3.js pour la construction low-level.
- @coral-xyz/anchor pour les instructions programmees et les account constraints.
- Une instruction par phase utilisateur pour garder le taux de succes maximal: Join, Commit, Reveal, Claim.

#### Gestion des erreurs de transaction

- Dropped tx: re-soumission avec blockhash frais et priority fee ajustee.
- Timeout client: polling de signature + fallback getSignatureStatuses.
- Blockhash expire: regeneration automatique et re-signature si l'utilisateur l'autorise.
- Duplicate submit: lecture pessimiste de RoomState avant retry.

#### Strategie d'indexation

- Temps reel: websocket account subscription sur RoomState.
- Historique: Helius webhooks ou indexeur custom pour events GameResolved et DecisionRevealed.
- Profils: aggregation par wallet depuis les events et les ProfileState.

#### Affichage de l'etat en temps reel

- Polling websocket sur changements de RoomState.
- Compte a rebours par slots, pas par secondes, pour coller au modele de securite.
- Heatmap de room, projection de payout, historique public du wallet.

### J5. Roadmap de deploiement securise

1. Devnet
- Tests end-to-end complets.
- Fuzzing des transitions d'etat.
- Simulation des 6 scenarios d'attaque obligatoires.

2. Mainnet beta
- Rooms capees, par exemple max 0.1 SOL.
- Monitoring actif des tx, timeouts, close rates.

3. Audit de securite
- Publication integrale du rapport avant augmentation des caps.

4. Mainnet full
- Levee progressive des plafonds.
- Activation de la reserve free access.

5. Gouvernance
- Transfert de l'upgrade authority vers multisig communautaire 3/5 timelocke 72h.

## K. Nom et univers

### 3 noms courts, memorables, originaux

1. Faultline
2. Crowdslip
3. QuietCut

### Direction visuelle en 5 mots

Signal, chaleur, faille, verre, tension.

### Phrase signature du jeu

"Je savais qu'ils allaient tous y aller."

### Tagline virale

Lis la panique avant qu'elle n'existe.

## Exigence finale - 9 tests

### Test 1 - minimum joueurs

Passe. Des que le minimum est atteint, le premier SubmitCommit valide scelle la room immediatement. Si le minimum n'est jamais atteint avant join deadline, CancelExpiredRoom rembourse integralement sans friction.

### Test 2 - "encore une"

Passe. Le joueur comprend immediatement pourquoi il a perdu, car tout est publiquement recalculable: sa zone, son risque, son forecast et ceux du gagnant.

### Test 3 - clone

Passe. Un clone copie le code, pas la memoire collective on-chain, la reputation des wallets ni la meta construite sur ces donnees.

### Test 4 - streamer

Passe. En moins de 30 secondes, le chat comprend: "ils choisissent une zone en secret, parient sur la foule, puis la foule apparait".

### Test 5 - temps

Passe. Le jeu devient meilleur avec les annees parce que son dataset public de comportements humains s'enrichit.

### Test 6 - exploit

Passe sous l'hypothese d'implementation correcte et auditee. Avec 3 complices et un dev Solana senior, l'adversaire peut s'ameliorer, pas casser le protocole de facon rentable et repetable sans trouver un bug logiciel.

### Test 7 - multiplicateur

Passe. Le multiplicateur est pense pendant la partie, au moment du choix Calm / Edge / Knife. Il amplifie la decision au lieu de la paralyser parce qu'il est attache a une condition lisible de congestion, pas a un tirage opaque.

### Test 8 - test du programme

Passe. Un dev Solana senior peut reconstruire les regles a partir du code: zones, risques, deadlines, hash format, scoring, ladder et claims sont tous explicites on-chain.

### Test 9 - test de la panne

Passe. Les fonds restent dans les PDAs. Les slots n'avancent pas pendant une panne, donc les deadlines protegent les joueurs honnetes. La partie reprend proprement au redemarrage, ou bascule vers EmergencyReturn si un incident logiciel l'exige.

## Conclusion

Faultline est un protocole de lecture sociale pure, pas un casino de hasard deguise. Son coeur n'est ni un oracle, ni une RNG, ni une dexterite hors-chaine: c'est la capacite a predire comment des humains vont se congestionner quand chacun sait que la congestion detruit la valeur. C'est auto-suffisant on-chain, juridiquement plus defendable qu'un jeu aleatoire, et surtout structurellement meilleur apres 10,000 parties qu'au jour 1.