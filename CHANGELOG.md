# Changelog

Toutes les évolutions notables de myWaves sont listées ici, par version.

> Le suivi git du projet démarre à la version 1.2.0. Les tags des versions
> antérieures (1.0.0 → 1.1.2) ont été créés après coup pour archiver les APK
> déjà distribués ; ils pointent tous sur le même commit initial et ne
> reflètent donc pas l'état réel du code à l'époque de chaque version.

## 1.4.5 — 2026-08-25

- Détection des étales revue en profondeur : ancrée sur les extrema de marée
  (fiable même sur les sites à courant faible comme Saint-Cast) plutôt que sur
  un simple seuil de vitesse. Toutes les étales sont désormais affichées sur
  le graphique (plus une seule), chacune avec sa durée quand elle est
  significative, et « Prochaine étale » réaffiche l'heure.
- Couverture du courant de marée étendue à ~570 points le long du littoral
  français (marinas, ports, communes côtières), au lieu des seuls spots
  choisis à la main : rechercher n'importe quel lieu ou cliquer sur la carte
  donne désormais une vraie donnée de courant (recherche du point d'atlas
  MARC le plus proche), avec repli propre au-delà de 8 km de couverture.
- Ajout d'un point personnalisé en cliquant sur la carte, avec nom modifiable
  après coup. La recherche de lieu et le clic sur la carte ne font plus que
  prévisualiser un spot : il faut désormais l'étoile ★ pour l'ajouter
  vraiment aux favoris. Retirer un favori ramène à la liste des spots.
- Édition desktop : abandon d'Electron au profit exclusif de Tauri (plus
  léger). Les liens externes s'ouvrent enfin dans le navigateur système sur
  desktop.

## 1.2.0 — 2026-08-05

- Nouvelles éditions **desktop Windows** : Electron et Tauri (installeur
  ~2-3 Mo via WebView2, en plus de l'APK Android).
- Correctif d'un écran blanc sur les builds desktop packagées (routing
  `BrowserRouter` → `HashRouter`, incompatible avec un chargement `file://`).
- Flèche « ← Spots » sur la page d'un site pour revenir à la liste.
- Page « À propos » : police uniformisée sur tout le texte, numéro de version
  déplacé à côté du copyright.
- Android : le mode plein écran ne se réappliquait pas après une reprise de
  focus (retour au premier plan, fermeture d'une boîte de dialogue…) ; la
  barre système pouvait aussi laisser une bande grise résiduelle en haut de
  l'écran — les deux sont corrigés.
- Installeur Tauri traduit en français.

## 1.1.2

- Mode plein écran immersif sur Android.
- Correction empirique du marégraphe du seuil affinée (-0,2 m → -0,1 m) et
  affichage d'une incertitude ± 10 cm sur la valeur courante.
- Correctifs d'affichage sur les graphiques (étiquettes « Maintenant »
  rognées en haut du marégraphe, débordement des libellés « Seuil » côté
  gauche sur mobile, tooltips qui pouvaient déborder de l'écran).
- Suppression du menu de debug temporaire.

## 1.1.1

- Correction du délai de géolocalisation trop court pour « Ma position »
  (le délai par défaut de 10 s de Capacitor était souvent insuffisant).

## 1.1.0

- Icône de notification (silhouette de bateau) pour les alertes de seuil.
- Titre des alertes de seuil : « ⚠️ ALERTE SEUIL ».
- Traduction en français des erreurs de géolocalisation.
- Bouton « Ma position » : ne débordait plus de l'écran sur mobile, et ne
  met plus le spot en favori par défaut (aperçu simple avant validation).
- Suppression de « Spot le plus proche » (redondant avec « Ma position »).
- Renommage de l'onglet « Carte » en « Cartes ».
- Numéro de version déplacé en bas de la page « À propos ».
- Style des marqueurs de pleine mer / basse mer sur la courbe de marée
  aligné sur celui du repère « Maintenant ».

## 1.0.0

Première version numérotée, point de départ de la convention de versioning
(bump de version + APK nommé par version à chaque changement notable).
Fonctionnalités déjà en place à ce stade : conditions marines par site
(vagues, vent, courants, température), marégraphe SHOM et seuil du Port des
Sablons à Saint-Malo, coefficient de marée, alertes de franchissement de
seuil, carte, spots favoris.
