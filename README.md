# Académie Sasaki

![Image of Sasaki Academy Logo Placeholder](https://placehold.co/800x200/1A1A1A/00F5D4?text=Sasaki+Academy+%F0%9F%A7%A0)
*(Vous pouvez remplacer cette image par votre logo final. C'est un placeholder avec l'esthétique suggérée : fond sombre, texte bleu/vert néon.)*

## Description du Projet

L'Académie Sasaki est une plateforme d'apprentissage en ligne innovante, spécialisée dans la technologie, la programmation et le hacking éthique. Elle vise à émanciper les jeunes développeurs grâce à des cours immersifs et une approche pédagogique unique basée sur le "visual code". L'application intègre des fonctionnalités d'intelligence artificielle pour enrichir l'expérience d'apprentissage.

## Fonctionnalités Principales

* **Tableau de bord personnalisé :** Vue d'ensemble de la progression et des cours recommandés.
* **Catalogue de cours :** HTML, CSS, JavaScript, Python, Cybersécurité, IA et plus.
* **Espace de code interactif :** Un bac à sable pour tester du code HTML/CSS/JS en direct.
* **Explicateur de code intelligent (Sasaki-Genma) :** Une fonctionnalité basée sur l'API Gemini pour expliquer, identifier les problèmes et suggérer des améliorations pour tout morceau de code.
* **Assistant IA (Sasaki-Genma) :** Un chatbot général pour répondre aux questions techniques des utilisateurs.
* **Galerie visuelle :** Aperçus de concepts et de projets de développement et de hacking éthique.
* **Applications externes intégrées :** Accès direct à nos communautés sur WhatsApp, Telegram, YouTube et Facebook.
* **Foire Aux Questions (FAQ) :** Réponses aux questions courantes sur la plateforme.
* **Page de Contact :** Informations de contact pour Akashi, Arthur et Sasaki Company.
* **Support multilingue :** Les cours sont conçus pour être disponibles en plusieurs langues.

## Technologies Utilisées

* **Front-end:** React.js (créé avec Create React App), Tailwind CSS, Lucide-React pour les icônes.
* **Base de données:** Google Firestore (via Firebase SDK).
* **Authentification:** Firebase Authentication (connexion anonyme par défaut, mais extensible).
* **IA:** Gemini API (Google Generative AI) pour l'explication de code et le chatbot.

## Installation et Lancement (Local)

Pour exécuter cette application en local, suivez les étapes suivantes :

1.  **Cloner le dépôt :**
    Ouvrez votre terminal ou invite de commande et exécutez :
    ```bash
    git clone [https://github.com/votre-utilisateur/sasaki-academy.git](https://github.com/votre-utilisateur/sasaki-academy.git)
    cd sasaki-academy
    ```
    *(Remplacez `votre-utilisateur` par votre nom d'utilisateur GitHub une fois le dépôt créé.)*

2.  **Installer les dépendances :**
    Assurez-vous d'avoir [Node.js](https://nodejs.org/en/) (version LTS recommandée) et [npm](https://www.npmjs.com/) (généralement inclus avec Node.js) ou [Yarn](https://yarnpkg.com/) installés.
    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Configuration des Variables d'Environnement :**
    Cette application utilise Firebase pour la base de données (Firestore) et l'authentification, ainsi que l'API Gemini. Pour des raisons de sécurité et de flexibilité de déploiement, ces configurations sont gérées via des variables d'environnement.

    * **Projet Firebase :**
        * Accédez à la [Console Firebase](https://console.firebase.google.com/).
        * Créez un nouveau projet ou sélectionnez un projet existant.
        * Ajoutez une application web à votre projet pour obtenir votre objet de configuration Firebase (il ressemble à `{ apiKey: "...", authDomain: "...", ... }`).
        * Configurez Firestore (créez la base de données en mode test pour commencer si vous le souhaitez) et les règles de sécurité.
        * **Important :** Configurez les règles de sécurité Firestore pour autoriser la lecture et l'écriture comme discuté précédemment (e.g., `allow read, write: if request.auth != null;` pour les collections publiques et `allow read, write: if request.auth != null && request.auth.uid == userId;` pour les collections privées).
    * **Clé API Gemini :**
        * Obtenez une clé API pour l'API Gemini depuis la [Google AI Studio](https://aistudio.google.com/app/apikey).

    * **Créer un fichier `.env` :**
        À la racine de votre projet (`sasaki-academy/.env`), créez un fichier nommé `.env` (notez le point au début) et ajoutez-y les lignes suivantes en remplaçant les valeurs par les vôtres :

        ```
        REACT_APP_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
        REACT_APP_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
        REACT_APP_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
        REACT_APP_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
        REACT_APP_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
        REACT_APP_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
        REACT_APP_FIREBASE_MEASUREMENT_ID=YOUR_FIREBASE_MEASUREMENT_ID

        REACT_APP_GEMINI_API_KEY=YOUR_GEMINI_API_KEY

        # Un ID pour votre application, utilisé dans le chemin Firestore
        REACT_APP_APP_ID=sasaki-academy-prod # Ou un autre identifiant unique pour votre app
        ```
    * **Sécurité :** Ne jamais pousser votre fichier `.env` sur GitHub. Il est déjà listé dans le `.gitignore`.

4.  **Lancer l'application :**
    ```bash
    npm start
    # ou
    yarn start
    ```
    L'application sera disponible sur `http://localhost:3000`.

## Déploiement

Cette application est une application web React standard et peut être déployée sur diverses plateformes d'hébergement de sites statiques ou de front-ends.

**Avant le déploiement sur toutes les plateformes, vous devez d'abord construire votre application :**
```bash
npm run build
# ou
yarn build
