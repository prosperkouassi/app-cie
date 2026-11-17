# Illustrations originales de bienvenue app-CIE

Ces trois animations vectorielles ont été créées spécifiquement pour ce projet par l’assistant de développement, sans modèle ni ressource graphique externe.

| Fichier | Sujet | Auteur / source | Licence |
| --- | --- | --- | --- |
| home.json | Maison, télévision et réfrigérateur | Création originale app-CIE ; générateur local ci-dessous | MIT, usage commercial autorisé |
| energy.json | Compteur et batterie, sans valeur numérique | Création originale app-CIE ; générateur local ci-dessous | MIT, usage commercial autorisé |
| comparison.json | Comparaison illustrative de deux consommations | Création originale app-CIE ; générateur local ci-dessous | MIT, usage commercial autorisé |

Source reproductible : `scripts/generate-welcome-animations.cjs`. Génération : `node scripts/generate-welcome-animations.cjs`.

La licence complète figure dans LICENSE.txt et doit être conservée avec les ressources lors de leur redistribution. Aucune attribution visible supplémentaire n’est imposée. Aucune ressource externe ni police, image ou fichier distant n’est utilisé dans les JSON.

Chaque animation dure quatre secondes, sans boucle. Les premières images sont complètes et servent d’état statique en réduction des animations. Aucun chiffre, tarif, pourcentage ni économie mesurée n’est affiché dans les illustrations. Les hauteurs des barres sont fictives et ne représentent aucune donnée de foyer ; la légende à l’écran indique qu’il s’agit d’une illustration.

Les lecteurs logiciels ont leurs propres licences : lottie-react-native (licence Apache-2.0 de son paquet) et lottie-web (licence MIT de son paquet). Le lecteur web SVG léger est embarqué avec le code, sans CDN ni téléchargement de moteur WASM.

Ces illustrations simples sont des créations livrées pour l’application, pas des assets tiers à licence non vérifiée. Leur rendu natif doit encore être contrôlé sur iPhone.
