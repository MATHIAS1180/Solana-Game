# VOLTA (ex-DRIFT) — Analyse Complète & Design Final

## Résumé exécutif des changements clés par rapport à V1

### Mécanisme
- **Formule ajustée** : `Score = Précision² × Hardiesse × Unicité` (Précision² pour un résultat plus intuitif)
- **Hardiesse plafonnée** : `1 + min(|P - Médiane|, 35) / 50` → max 1.70x au lieu de ~3.0x
- **Unicité adaptative** : fenêtre `±(3 + floor(N/10))` au lieu de ±5 fixe
- **Minimum 6 joueurs** par salle compétitive (la moyenne tronquée est cassée en dessous)
- **Phase 2 réduite** à 15 secondes (au lieu de 20), avec skip si tous soumis
- **Reveal ordonné** par écart croissant (crescendo dramatique garanti)
- **Jackpot renommé** "Bonus d'Audace" avec seuils recalibrés (0.85 accumulation / 1.20 déblocage)
- **Bouton "Et si..."** post-game pour maximiser le near-miss interactif

### Identité
- **Nom** : VOLTA
- **Tagline** : "The Turn Is Everything." / "Annonce un. Pense un autre."
- **Palette** : Obsidian (#0A0A0F) / Phosphor (#C8FF00) / Volta White (#F0F0FF) / Deep Slate (#1A1A2E)
- **Typographie** : Monument Extended (titres/Seeds) + Inter (UI/données)
- **Identité en 5 mots** : "Tectonic calm before electric fracture."

## Contraintes immuables respectées
1. ✅ Parties de 62-68 secondes (< 90s)
2. ✅ Mise fixe identique par joueur
3. ✅ 98% redistribué / 2% Trésor
4. ✅ Zéro hasard — 100% décisions humaines
5. ✅ Mécanisme non-réductible à un comparatif
6. ✅ Near-miss viscéral (formule Précision² + bouton "Et si...")
7. ✅ Valeur spectacle streaming (Reveal ordonné + animation VOLTA!)
8. ✅ Le Reveal est le moment le plus fort
