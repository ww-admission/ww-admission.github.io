# WWA | World Wise Admission

World Wise Admission est une start-up panafricaine accompagnant les bacheliers et étudiants dans leurs démarches pour étudier à l'étranger, de la candidature à l'admission.

![just-the-basics](https://services.qatorze.com/public/wwa-showup-image.png)

[![Visit le site WWA](https://services.qatorze.com/public/wwa-btn-readme-1.png)](https://worldwise-admission.com)[![Page Insight du site WWA](https://services.qatorze.com/public/wwa-btn-readme-2.png)](https://pagespeed.web.dev/analysis/https-worldwise-admission-com/skh3uv5a2y?hl=fr&form_factor=desktop)

## Introduction

### À Propos

Le site WWA est un site web développé avec AstroJS et Tailwind CSS. Designé à partir d'un template Astro, taillé pour optimiser les performances, le référencement SEO et offrir une expérience utilisateur agréable grâce à son design simple et moderne et responsive.

![just-the-basics](https://services.qatorze.com/public/wwa-showup-image-2.png)

### Fonctionnalités

- **Conçu avec Tailwind CSS :** Propulsé par Tailwind CSS pour un développement d'interface rapide et un design réactif.
- **Scores parfaits dans PageSpeed Insights :** Obtenez des scores parfaits de 100 pour les performances desktop et mobile.
- **Support des modes clair et sombre :** Basculez facilement entre les thèmes clair et sombre selon les préférences de l'utilisateur.
- **Entièrement responsive et personnalisable :** Assurez-vous que votre site soit magnifique sur tous les appareils, avec une personnalisation facile pour correspondre à l'identité de votre marque.
- **Optimisé pour le SEO :** Optimisé pour les moteurs de recherche afin d'améliorer la visibilité et le trafic organique.
- **Pages pré-conçues :** Comprend une variété de pages telles que Accueil, Tarifs, Fonctionnalités, Contact, et plus encore, pour démarrer rapidement.
- **Blog avec support MDX et tags :** Créez du contenu de blog dynamique avec Markdown et JSX, avec un système de tags pour une meilleure organisation.
- **Mises à jour faciles avec des fichiers JSON :** Simplifiez la gestion et les mises à jour du contenu à l'aide de fichiers JSON structurés.
- **Animations de chargement de page et de transition :** Améliorez l'expérience utilisateur avec des effets de chargement et de transition fluides.
- **Code propre et structure de dossiers claire :** Maintenez une base de code bien organisée, facile à naviguer et à étendre.
- **Heroicons par Tailwind :** Accédez à une large gamme d'icônes de haute qualité à utiliser sur votre site.
- **Formulaire de contact intégré :** Formulaire de contact prêt à l'emploi inclus.
- **Utilise les composants WindUI :** Intègre des composants TailwindCSS WindUI optionnels.
- **Design modulaire :** Le template est organisé en blocs réutilisables permettant une personnalisation et une expansion faciles.
- **Analytiques intégrées :** Comprend les fonctionnalités intégrées de Google Analytics et Google Tag Manager.
- **Sitemap inclus :** Inclut un sitemap pour améliorer la navigation sur le site et l'indexation par les moteurs de recherche.

### Passer à la version Pro

| Fonctionnalité                 | Version gratuite           | Version Pro                                                      |
| :----------------------------- | :------------------------- | :--------------------------------------------------------------- |
| Tailwind CSS                   | ✅                         | ✅                                                               |
| Responsive mobile              | ✅                         | ✅                                                               |
| Optimisé SEO                   | ✅                         | ✅                                                               |
| Support multilingue i18n       | ❌                         | ✅                                                               |
| CMS Keystatic                  | ❌                         | ✅                                                               |
| Collections de contenu         | ✅                         | ✅                                                               |
| Méga menu                      | ❌                         | ✅                                                               |
| Popup vidéo                    | ❌                         | ✅                                                               |
| Intégration de fichiers Lottie | ❌                         | ✅                                                               |
| Variations de page d'accueil   | ❌                         | ✅                                                               |
| Variations de page fonctionnalités | ❌                     | ✅                                                               |
| Page intégrations              | ❌                         | ✅                                                               |
| Page tarifs avancée            | ❌                         | ✅                                                               |
| Collection blog                | ✅                         | ✅                                                               |
| Catégories de blog             | ✅                         | ✅                                                               |
| Auteurs de blog                | ❌                         | ✅                                                               |
| Pagination des articles        | ❌                         | ✅                                                               |
| Collection de guides           | ❌                         | ✅                                                               |
| Page feuille de route          | ❌                         | ✅                                                               |
| Page d'inscription             | ❌                         | ✅                                                               |
| Page process                 | ✅                         | ✅                                                               |
| Page FAQ                       | ✅                         | ✅                                                               |
| Page conditions d'utilisation  | ✅                         | ✅                                                               |
| Page contact fonctionnelle     | ❌                         | ✅                                                               |
| Nombre total de pages          | 10                         | 20+                                                              |
|                                |                            |                                                                  |
| Mises à jour gratuites         | ✅                         | ✅                                                               |
| Licence                        | MIT                        | Commerciale                                                      |


## Pour commencer

### Commandes

Après avoir git clone le repo du site, vous devrez installer quelques dépendances. Une fois cela fait, vous pourrez le lancer sur votre serveur local. Consultez le fichier package.json pour voir quels scripts sont disponibles.

| Commande          | Action                                                                                                   |
| :---------------- | :------------------------------------------------------------------------------------------------------- |
| `nvm use ...`     | [Installer node js](https://nodejs.org/en/download/) Vous devrez utiliser Node.js version 20.3.0 ou ultérieure. |
| `npm install`     | Installe les dépendances                                                                                 |
| `npm run dev`     | Démarre le serveur de développement local sur `localhost:4321`                                           |
| `npm run build`   | Construit le site version pour la production, disponible dans `./dist/`                                                        |
| `npm run preview` | Prévisualiser le build localement, avant le déploiement                                                |

### Structure des dossiers

Dans le projet WWA, vous verrez les dossiers et fichiers suivants :

```plaintext
/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── blocks/
│   │   │   └── ...
│   │   └── ui/
│   │       └── ...
│   ├── config/
│   │   └── ...
│   ├── content/
│   │   └── blog/
│   │       └── ...
│   ├── data/
│   │   └── ...
│   ├── icons/
│   │   └── ...
│   ├── layouts/
│   │   └── ...
│   ├── page-sections/
│   │   └── home/
│   │       └── ...
│   └── pages/
│       └── ...
└── package.json
```

| Répertoire/Fichier       | Description                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `public/`                | Contient les ressources statiques comme les images et le favicon. Ces fichiers sont servis directement à l'URL racine.             |
| `src/assets/`            | Contient toutes les images et ressources utilisées dans le projet.                                                                |
| `src/components/`        | Contient les composants réutilisables dans le site. Ce répertoire est divisé en `ui` pour les composants UI et `blocks` pour les blocs de section. |
| `src/components/blocks/` | Contient les blocs de section utilisés sur l'ensemble du site.                                                                    |
| `src/components/ui/`     | Contient les composants UI individuels.                                                                                           |
| `src/config/`            | Contient les fichiers de configuration du projet au format TypeScript.                                                            |
| `src/content/`           | Contient les données de collection, telles que les articles de blog.                                                              |
| `src/content/blog/`      | Contient les articles de blog individuels en markdown.                                                                            |
| `src/data/`              | Contient les fichiers JSON et md avec les données de contenu (comme les fonctionnalités, témoignages, blog, etc.).                      |
| `src/icons/`             | Contient toutes les icônes utilisées dans le projet, provenant de [Heroicons](https://heroicons.com/).                            |
| `src/layouts/`           | Contient les composants de mise en page qui définissent la structure globale de vos pages.                                        |
| `src/pages/`             | Contient les fichiers `.astro` pour chaque page. Chaque fichier ici est exposé comme une route basée sur son nom de fichier.      |
| `package.json`           | Liste les dépendances et scripts pour votre projet, y compris les métadonnées et diverses exigences de packages.                  |

## Configuration du thème utilisé

Les fichiers de configuration sont dans le répertoire `src/config`. Les fichiers de configuration sont écrits en TypeScript et contiennent divers paramètres pour le thème utilisé sur le site, tels que les informations de base, la barre de navigation, la navigation du pied de page, les analyses et les liens sociaux. Ces paramètres peuvent être modifiés, mis à jour et/ou personnalisés.

| Fichier de configuration         | Description                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/config/config.ts`           | Inclut les paramètres de configuration de base, notamment le SEO, le mode et les animations de défilement. |
| `src/config/navigationBar.ts`    | Inclut les options de menu pour la barre de navigation.                                         |
| `src/config/footerNavigation.ts` | Inclut les options de menu pour la navigation du pied de page.                                  |
| `src/config/analytics.ts`        | Inclut les codes requis pour Google Analytics, Google Tag Manager et Google Search Console.     |
| `src/config/socialLinks.ts`      | Contient les données des liens sociaux pour le site web.                                        |

### Paramètres de configuration de base

Dans le fichier `src/config/config.ts`, se trouvent les paramètres de configuration de base.
Ceux-ci incluent les paramètres SEO par défaut :

- `siteTitle` : Le titre par défaut du site (WWA | World Wise Admission).
- `siteDescription` : La description par défaut du site. C'est important pour le SEO.
- `ogImage` : L'image open graph pour le site. L'image vu un peu partout lorsqu'on partage un lien sur les réseaux sociaux par exemple.
- `logo` : Le logo du site.
- `canonical` : Indique s'il faut utiliser des liens canoniques sur le site.
- `noindex` : Empêche les moteurs de recherche d'indexer le site si défini sur true.

ainsi que les paramètres de site par défaut :

- `mode` : Le mode par défaut du site. Peut être défini sur 'auto', 'light' ou 'dark'. Le mode auto basculera automatiquement entre les modes clair et sombre en fonction des paramètres système de l'utilisateur, tandis que 'light' et 'dark' forceront le site à utiliser le mode correspondant.
- `scrollAnimations` : Indique s'il faut activer les animations de défilement fluides pour votre site web.

## Personnalisation du thème

### Personnaliser les couleurs

Le thème utilise deux couleurs principales : primary et neutral. Ces couleurs sont définies dans le fichier de configuration Tailwind CSS. Pour personnaliser la palette de couleurs du projet tout entier, vous pouvez facilement modifier ces valeurs de couleur.

Pour personnaliser les couleurs, suivez ces étapes :

1. Ouvrez le fichier `tailwind.config.js`.
2. Trouvez la section `theme` dans le fichier.
3. Sous `theme`, localisez la propriété `extend` puis l'objet `colors`.
4. Modifiez les valeurs de couleur pour `primary` et `neutral` pour correspondre à la palette de couleurs souhaitée.

Vous pouvez utiliser les [couleurs Tailwind CSS](https://nodejs.org/en/download/) ou créer une palette de couleurs personnalisée [propre palette](https://uicolors.app/create).

### Personnaliser les polices

Pour personnaliser les polices utilisées dans le projet, suivez ces étapes :

1. **Mettre à jour la configuration Tailwind CSS**

   Ouvrez le fichier `tailwind.config.js`. Dans la section `theme`, trouvez la propriété `extend` et mettez à jour l'objet `fontFamily`.

2. **Assurer que les packages de polices sont installés**

   Vérifiez que les packages de polices nécessaires sont inclus dans votre fichier `package.json` et également importés dans le fichier `src/layouts/Layout.astro`.

Vous pouvez ajouter vos propres polices en suivant [ce guide](https://docs.astro.build/en/guides/fonts/#using-fontsource)

### Mode sombre/clair

Par défaut, le site utilise un commutateur de mode automatique, permettant aux utilisateurs de basculer entre les modes clair et sombre en fonction des paramètres système de l'utilisateur ou en utilisant le commutateur de mode dans la barre de navigation. Ceci est réalisé en définissant la classe `mode-auto` dans le fichier `Layout.astro`.

Si vous devez imposer un thème spécifique, vous pouvez définir la classe ci-dessus comme **`mode-light`** ou **`mode-dark`**. Lorsque **`mode-light`** est appliqué, le site s'affichera systématiquement en mode clair et le commutateur ne sera pas fonctionnel. De même, **`mode-dark`** forcera le site en mode sombre, le commutateur étant rendu non fonctionnel. Ces paramètres vous permettent de maintenir une apparence fixe sur l'ensemble du site, quels que soient les préférences de l'utilisateur ou les paramètres système.

## Licence

Copyright WWA - World Wise Admission & QATÔRZE SARL © 2025 - Conçu et développé par [QATÔRZE SERVCES](https://services.qatorze.com/)

Publié sous licence MIT.

## Nous contacter 

Vous pouvez nous contacter via [Whatsapp](https://api.whatsapp.com/message/ULZITK5PFZDLK1?autoload=1&app_absent=0) !

[![Travailler avec QATÔRZE](https://services.qatorze.com/public/wwa-image-contact-us.png)](mailto:info@qatorze.com,steeve.mk@qatorze.com)
