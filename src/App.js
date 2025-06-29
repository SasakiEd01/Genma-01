import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, addDoc, getDocs } from 'firebase/firestore';

// Importation des icônes Lucide-React
import { Home, User, Settings, Code, Bot, BookOpen, Image, ExternalLink, MessageCircle, Mail, Phone, Github, Youtube, MessageSquare, Facebook, Send, PlayCircle, Layers, Star, Info, ChevronDown, Lightbulb, CheckCircle } from 'lucide-react';

// Configuration Firebase et Clé API Gemini :
// Ces variables sont lues depuis les variables d'environnement.
// Pendant le développement local avec `npm start`, elles seront lues depuis un fichier .env (ex: REACT_APP_FIREBASE_API_KEY).
// Lors du déploiement sur des plateformes comme Vercel, Netlify, Render, Firebase Hosting,
// vous devrez configurer ces variables d'environnement dans le tableau de bord de votre hébergeur.
// Pour les tests dans l'environnement Canvas, les variables __app_id, __firebase_config, __initial_auth_token
// sont fournies automatiquement. Elles sont remplacées par les variables d'environnement pour le déploiement externe.

// Récupération de l'ID de l'application (pour Firestore, souvent lié au nom du projet)
const appId = process.env.REACT_APP_APP_ID || 'default-sasaki-academy'; // Utilisez un ID par défaut ou l'ID Firebase Project

// Configuration Firebase (pour le déploiement)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Clé API Gemini (pour les appels aux LLMs)
const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY || '';


// Initialisation de Firebase
let app, db, auth;
// Vérifier si la configuration Firebase est complète avant d'initialiser
if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error("Erreur lors de l'initialisation de Firebase:", error);
    // Gérer l'erreur, peut-être en désactivant les fonctionnalités Firestore
  }
} else {
  console.warn("Configuration Firebase incomplète ou manquante (variables d'environnement). Les fonctionnalités Firestore seront désactivées.");
}

// Composant principal de l'application
const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [courses, setCourses] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [aiChatHistory, setAiChatHistory] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiChatEndRef = useRef(null); // Ref pour le défilement automatique du chat IA

  // États pour l'éditeur de code
  const [htmlCode, setHtmlCode] = useState(`<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mon Aperçu</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #1A1A1A; color: #E0E0E0; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background-color: #2D3748; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); text-align: center; }
        .text-neon-blue { color: #00F5D4; }
    </style>
</head>
<body>
    <div class="card">
        <h1 class="text-3xl font-bold text-neon-blue mb-4">Bienvenue !</h1>
        <p class="text-lg">Ceci est votre espace de codage.</p>
        <button class="mt-6 px-6 py-3 bg-neon-blue text-gray-900 font-semibold rounded-md hover:bg-opacity-80 transition-colors duration-200">
            Cliquez-moi
        </button>
    </div>
</body>
</html>
`);
  const [previewSrc, setPreviewSrc] = useState('');

  // États pour l'expliqueur de code IA
  const [codeExplainerInput, setCodeExplainerInput] = useState('');
  const [codeExplainerOutput, setCodeExplainerOutput] = useState('');
  const [codeExplainerLoading, setCodeExplainerLoading] = useState(false);

  // Effet pour l'authentification Firebase et le chargement des données
  useEffect(() => {
    if (!auth) {
      console.warn("Firebase Auth n'est pas initialisé. L'authentification ne fonctionnera pas.");
      setIsAuthReady(true); // Permettre aux autres parties de l'application de s'exécuter même sans auth
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Tenter de se connecter anonymement si aucune authentification n'est présente
        try {
          await signInAnonymously(auth);
          console.log("Connecté anonymement.");
        } catch (anonError) {
          console.error("Échec de la connexion anonyme:", anonError);
        }
      }
      setUserId(auth.currentUser?.uid || crypto.randomUUID()); // Assurez-vous d'avoir un userId
      setIsAuthReady(true);
    });

    return () => unsubscribe(); // Nettoyage de l'écouteur
  }, []);

  // Effet pour charger les données de Firestore une fois que l'authentification est prête
  useEffect(() => {
    if (isAuthReady && db && userId) {
      // Charger les cours
      const coursesCollectionRef = collection(db, `artifacts/${appId}/public/data/courses`);
      const unsubscribeCourses = onSnapshot(coursesCollectionRef, (snapshot) => {
        const loadedCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCourses(loadedCourses);
        console.log("Cours chargés depuis Firestore:", loadedCourses);
      }, (error) => {
        console.error("Erreur lors du chargement des cours:", error);
      });

      // Charger les FAQs
      const faqsCollectionRef = collection(db, `artifacts/${appId}/public/data/faqs`);
      const unsubscribeFaqs = onSnapshot(faqsCollectionRef, (snapshot) => {
        const loadedFaqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFaqs(loadedFaqs);
        console.log("FAQs chargées depuis Firestore:", loadedFaqs);
      }, (error) => {
        console.error("Erreur lors du chargement des FAQs:", error);
      });

      // Ajouter des données initiales si les collections sont vides (pour la démonstration)
      const addInitialData = async () => {
        const coursesSnapshot = await getDocs(coursesCollectionRef);
        if (coursesSnapshot.empty) {
          console.log("Ajout de données de cours initiales...");
          await addDoc(coursesCollectionRef, {
            title: "Fondations du Web : HTML & CSS",
            description: "Apprenez les bases de la création de pages web.",
            category: "Web",
            level: "Débutant",
            imageUrl: "https://placehold.co/400x200/2D3748/00F5D4?text=HTML+CSS",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?si=iQ7Q8hC6q-o42N_T"
          });
          await addDoc(coursesCollectionRef, {
            title: "Introduction à Python",
            description: "Découvrez les fondamentaux de la programmation avec Python.",
            category: "Web",
            level: "Débutant",
            imageUrl: "https://placehold.co/400x200/2D3748/00F5D4?text=Python",
            videoUrl: "https://www.youtube.com/embed/rfscVS0vtbw?si=UoX9e_n1N79R7wIe"
          });
          await addDoc(coursesCollectionRef, {
            title: "Cybersécurité : Hacking Éthique",
            description: "Comprenez les bases du pentesting et de la sécurité réseau.",
            category: "Hacking",
            level: "Intermédiaire",
            imageUrl: "https://placehold.co/400x200/2D3748/00F5D4?text=Hacking",
            videoUrl: "https://www.youtube.com/embed/inWd8w3i0-Y?si=S_V-z2R5t0zY5p3s"
          });
          await addDoc(coursesCollectionRef, {
            title: "Intelligence Artificielle : Les Fondamentaux",
            description: "Explorez les concepts clés de l'IA et de l'apprentissage automatique.",
            category: "IA",
            level: "Intermédiaire",
            imageUrl: "https://placehold.co/400x200/2D3748/00F5D4?text=IA",
            videoUrl: "https://www.youtube.com/embed/JcNiB0jQW_U?si=1mE0fX8H1W9sL6U_"
          });
        }

        const faqsSnapshot = await getDocs(faqsCollectionRef);
        if (faqsSnapshot.empty) {
          console.log("Ajout de données FAQ initiales...");
          await addDoc(faqsCollectionRef, {
            question: "Qu'est-ce que l'Académie Sasaki ?",
            answer: "L'Académie Sasaki est une plateforme d'apprentissage en ligne spécialisée dans la technologie, la programmation et le hacking éthique, visant à émanciper les jeunes développeurs."
          });
          await addDoc(faqsCollectionRef, {
            question: "Les cours sont-ils adaptés aux débutants ?",
            answer: "Oui, nous proposons des parcours dédiés aux débutants absolus, ainsi que des cours plus avancés pour les développeurs juniors et les passionnés."
          });
          await addDoc(faqsCollectionRef, {
            question: "Qu'est-ce que le 'code visuel' ?",
            answer: "C'est une approche pédagogique innovante qui utilise des animations interactives, des schémas et l'exécution de code pas à pas pour rendre les concepts complexes plus intuitifs et engageants."
          });
        }
      };

      addInitialData();

      return () => {
        unsubscribeCourses();
        unsubscribeFaqs();
      }; // Nettoyage des écouteurs
    }
  }, [isAuthReady, db, userId]);

  // Défilement automatique du chat IA
  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiChatHistory]);

  const updatePreview = () => {
    const iframe = document.getElementById('code-preview-iframe');
    if (iframe) {
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlCode);
      doc.close();
    }
  };

  useEffect(() => {
    updatePreview();
  }, [htmlCode]); // Mettre à jour l'aperçu chaque fois que le code HTML change

  // Fonction pour l'explication de code par l'IA
  const handleCodeExplain = async () => {
    if (!codeExplainerInput.trim()) return;

    setCodeExplainerOutput('');
    setCodeExplainerLoading(true);

    try {
      const prompt = `Expliquez ce code en détail, identifiez les problèmes potentiels et proposez des améliorations. Répondez en français.
      Code:
      \`\`\`
      ${codeExplainerInput}
      \`\`\`
      `;

      const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const aiResponseText = result.candidates[0].content.parts[0].text;
        setCodeExplainerOutput(aiResponseText);
      } else {
        setCodeExplainerOutput("Désolé, je n'ai pas pu analyser ce code.");
        console.error("Réponse inattendue de l'API Gemini pour l'expliqueur de code:", result);
      }
    } catch (error) {
      console.error("Erreur lors de l'appel à l'API Gemini pour l'expliqueur de code:", error);
      setCodeExplainerOutput("Une erreur est survenue lors de la communication avec l'IA.");
    } finally {
      setCodeExplainerLoading(false);
    }
  };


  const handleAiSubmit = async () => {
    if (!aiInput.trim()) return;

    const newUserMessage = { role: "user", parts: [{ text: aiInput }] };
    setAiChatHistory(prev => [...prev, { type: 'user', message: aiInput }]);
    setAiInput('');
    setAiLoading(true);

    let chatHistoryForAPI = [...aiChatHistory.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'model',
      parts: [{ text: msg.message }]
    })), newUserMessage];

    try {
      const payload = { contents: chatHistoryForAPI };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const aiResponseText = result.candidates[0].content.parts[0].text;
        setAiChatHistory(prev => [...prev, { type: 'ai', message: aiResponseText }]);
      } else {
        setAiChatHistory(prev => [...prev, { type: 'ai', message: "Désolé, je n'ai pas pu générer de réponse." }]);
        console.error("Réponse inattendue de l'API Gemini:", result);
      }
    } catch (error) {
      console.error("Erreur lors de l'appel à l'API Gemini:", error);
      setAiChatHistory(prev => [...prev, { type: 'ai', message: "Une erreur est survenue lors de la communication avec l'IA." }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Composant pour l'en-tête de l'application
  const Header = () => (
    <header className="flex justify-between items-center p-4 bg-gray-800 text-white shadow-md">
      <div className="flex items-center space-x-3">
        <Layers className="text-neon-blue" size={30} />
        <h1 className="text-2xl font-bold text-neon-blue">Académie Sasaki</h1>
      </div>
      <div className="flex items-center space-x-4">
        {userId && (
          <span className="text-sm font-mono text-gray-400">ID Utilisateur: {userId}</span>
        )}
        <button className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <User className="text-white" size={24} />
        </button>
      </div>
    </header>
  );

  // Composant pour la barre latérale de navigation
  const Sidebar = () => (
    <nav className="w-64 bg-gray-900 text-gray-300 flex flex-col p-4 shadow-lg h-full overflow-y-auto">
      <div className="flex items-center space-x-3 mb-8">
        <Layers className="text-neon-blue" size={30} />
        <h2 className="text-xl font-bold text-neon-blue">Sasaki</h2>
      </div>
      <ul className="space-y-4">
        <li>
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`flex items-center p-3 rounded-lg w-full text-left transition-all duration-200 ${
              currentPage === 'dashboard' ? 'bg-neon-blue text-gray-900 shadow-lg' : 'hover:bg-gray-800'
            }`}
          >
            <Home size={20} className="mr-3" /> Tableau de bord
          </button>
        </li>
        <li>
          <button
            onClick={() => setCurrentPage('profile')}
            className={`flex items-center p-3 rounded-lg w-full text-left transition-all duration-200 ${
              currentPage === 'profile' ? 'bg-neon-blue text-gray-900 shadow-lg' : 'hover:bg-gray-800'
            }`}
          >
            <User size={20} className="mr-3" /> Profil
          </button>
        </li>
        <li>
          <button
            onClick={() => setCurrentPage('settings')}
            className={`flex items-center p-3 rounded-lg w-full text-left transition-all duration-200 ${
              currentPage === 'settings' ? 'bg-neon-blue text-gray-900 shadow-lg' : 'hover:bg-gray-800'
            }`}
          >
            <Settings size={20} className="mr-3" /> Paramètres
          </button>
        </li>
        <li>
          <button
            onClick={() => setCurrentPage('code-editor')}
            className={`flex items-center p-3 rounded-lg w-full text-left transition-all duration-200 ${
              currentPage === 'code-editor' ? 'bg-neon-blue text-gray-900 shadow-lg' : 'hover:bg-gray-800'
            }`}
          >
            <Code size={20} className="mr-3" /> Espace de Code
          </button>
        </li>
        <li>
          <button
            onClick={() => setCurrentPage('ai-space')}
            className={`flex items-center p-3 rounded-lg w-full text-left transition-all duration-200 ${
              currentPage === 'ai-space' ? 'bg-neon-blue text-gray-900 shadow-lg' : 'hover:bg-gray-800'
            }`}
          >
            <Bot size={20} className="mr-3" /> Sasaki-Genma (IA)
          </button>
        </li>
        <li>
          <button
            onClick={() => setCurrentPage('courses')}
            className={`flex items-center p-3 rounded-lg w-full text-left transition-all duration-200 ${
              currentPage === 'courses' ? 'bg-neon-blue text-gray-900 shadow-lg' : 'hover:bg-gray-800'
            }`}
          >
            <BookOpen size={20} className="mr-3" /> Cours
          </button>
        </li>
        <li>
          <button
            onClick={() => setCurrentPage('gallery')}
            className={`flex items-center p-3 rounded-lg w-full text-left transition-all duration-200 ${
              currentPage === 'gallery' ? 'bg-neon-blue text-gray-900 shadow-lg' : 'hover:bg-gray-800'
            }`}
          >
            <Image size={20} className="mr-3" /> Galerie
          </button>
        </li>
        <li>
          <button
            onClick={() => setCurrentPage('external-apps')}
            className={`flex items-center p-3 rounded-lg w-full text-left transition-all duration-200 ${
              currentPage === 'external-apps' ? 'bg-neon-blue text-gray-900 shadow-lg' : 'hover:bg-gray-800'
            }`}
          >
            <ExternalLink size={20} className="mr-3" /> Applications externes
          </button>
        </li>
        <li>
          <button
            onClick={() => setCurrentPage('faq')}
            className={`flex items-center p-3 rounded-lg w-full text-left transition-all duration-200 ${
              currentPage === 'faq' ? 'bg-neon-blue text-gray-900 shadow-lg' : 'hover:bg-gray-800'
            }`}
          >
            <MessageCircle size={20} className="mr-3" /> FAQ
          </button>
        </li>
        <li>
          <button
            onClick={() => setCurrentPage('contact')}
            className={`flex items-center p-3 rounded-lg w-full text-left transition-all duration-200 ${
              currentPage === 'contact' ? 'bg-neon-blue text-gray-900 shadow-lg' : 'hover:bg-gray-800'
            }`}
          >
            <Mail size={20} className="mr-3" /> Contact
          </button>
        </li>
      </ul>
    </nav>
  );

  // Contenu principal de l'application basé sur la page sélectionnée
  const MainContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <h2 className="text-4xl font-bold text-neon-blue mb-6 animate-fade-in-down">Bienvenue sur votre Tableau de Bord !</h2>
            <p className="text-xl text-gray-300 mb-8 animate-fade-in-up">Commencez votre parcours d'apprentissage dès aujourd'hui.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
              {courses.slice(0, 3).map(course => ( // Afficher les 3 premiers cours comme exemples
                <div key={course.id} className="bg-gray-800 p-6 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <PlayCircle size={48} className="text-neon-blue mb-4 mx-auto" />
                  <h3 className="text-xl font-semibold text-white mb-2">{course.title}</h3>
                  <p className="text-gray-400 text-sm">{course.description}</p>
                  <button className="mt-4 px-4 py-2 bg-neon-blue text-gray-900 font-semibold rounded-md hover:bg-opacity-80 transition-colors duration-200 text-sm">
                    Continuer le cours
                  </button>
                </div>
              ))}
              {courses.length === 0 && (
                 <p className="text-gray-400 col-span-full">Chargement des cours ou aucune donnée disponible...</p>
              )}
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <User size={64} className="text-neon-blue mb-6" />
            <h2 className="text-4xl font-bold text-neon-blue mb-4">Votre Profil</h2>
            <p className="text-xl text-gray-300 mb-8">Gérez vos informations personnelles et votre progression.</p>
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
              <div className="mb-4 text-left">
                <label className="block text-gray-400 text-sm font-bold mb-2">Nom d'utilisateur:</label>
                <input type="text" value="Akashi Sasaki" readOnly className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-600 text-white" />
              </div>
              <div className="mb-4 text-left">
                <label className="block text-gray-400 text-sm font-bold mb-2">Email:</label>
                <input type="email" value="akashi.sasaki@example.com" readOnly className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-600 text-white" />
              </div>
              <div className="mb-4 text-left">
                <label className="block text-gray-400 text-sm font-bold mb-2">Statut:</label>
                <input type="text" value="Développeur Junior" readOnly className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-600 text-white" />
              </div>
              <button className="mt-6 px-6 py-3 bg-neon-blue text-gray-900 font-semibold rounded-md hover:bg-opacity-80 transition-colors duration-200">
                Modifier le Profil
              </button>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Settings size={64} className="text-neon-blue mb-6" />
            <h2 className="text-4xl font-bold text-neon-blue mb-4">Paramètres de l'Application</h2>
            <p className="text-xl text-gray-300 mb-8">Personnalisez votre expérience d'apprentissage.</p>
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
              <div className="mb-4 flex items-center justify-between">
                <label className="block text-gray-400 text-lg font-bold">Mode Sombre (Par défaut):</label>
                <label htmlFor="dark-mode-toggle" className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" id="dark-mode-toggle" className="sr-only" defaultChecked />
                    <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 transform translate-x-full"></div>
                  </div>
                  <style>{`
                    #dark-mode-toggle:checked + div .dot {
                      transform: translateX(0);
                      background-color: #00F5D4;
                    }
                    #dark-mode-toggle:checked + div {
                      background-color: #00F5D4;
                    }
                  `}</style>
                </label>
              </div>
              <div className="mb-4 flex items-center justify-between">
                <label className="block text-gray-400 text-lg font-bold">Notifications Email:</label>
                <label htmlFor="email-notifications-toggle" className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" id="email-notifications-toggle" className="sr-only" defaultChecked />
                    <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 transform translate-x-full"></div>
                  </div>
                  <style>{`
                    #email-notifications-toggle:checked + div .dot {
                      transform: translateX(0);
                      background-color: #00F5D4;
                    }
                    #email-notifications-toggle:checked + div {
                      background-color: #00F5D4;
                    }
                  `}</style>
                </label>
              </div>
              <button className="mt-6 px-6 py-3 bg-neon-blue text-gray-900 font-semibold rounded-md hover:bg-opacity-80 transition-colors duration-200">
                Sauvegarder les Paramètres
              </button>
            </div>
          </div>
        );
      case 'code-editor':
        return (
          <div className="flex flex-col h-full p-6">
            <h2 className="text-4xl font-bold text-neon-blue mb-6 text-center">Espace de Code Interactif</h2>
            <p className="text-xl text-gray-300 mb-8 text-center">Testez votre code HTML, CSS et JavaScript en direct ou obtenez une explication IA !</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
              {/* Section Éditeur de Code et Aperçu */}
              <div className="flex flex-col bg-gray-800 rounded-lg shadow-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center"><Code size={20} className="mr-2 text-gray-400" /> Éditeur de Code et Aperçu</h3>
                <textarea
                  className="flex-1 bg-gray-900 text-white font-mono p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-neon-blue resize-none mb-4"
                  value={htmlCode}
                  onChange={(e) => setHtmlCode(e.target.value)}
                  placeholder="// Écrivez votre code HTML, CSS ou JavaScript ici"
                  style={{ minHeight: '150px' }}
                ></textarea>
                <button
                  onClick={updatePreview}
                  className="px-6 py-3 bg-neon-blue text-gray-900 font-semibold rounded-md hover:bg-opacity-80 transition-colors duration-200 self-start mb-4"
                >
                  Exécuter le Code
                </button>
                <h3 className="text-lg font-semibold text-white mb-2">Aperçu du Résultat</h3>
                <iframe
                  id="code-preview-iframe"
                  srcDoc={htmlCode}
                  title="Aperçu du code"
                  className="flex-1 bg-white rounded-md border border-gray-700 w-full"
                  style={{ minHeight: '200px' }}
                ></iframe>
              </div>

              {/* Section Explicateur de Code par IA */}
              <div className="flex flex-col bg-gray-800 rounded-lg shadow-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center"><Lightbulb size={20} className="mr-2 text-yellow-400" /> Analyse de Code par Sasaki-Genma ✨</h3>
                <textarea
                  className="flex-1 bg-gray-900 text-white font-mono p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-neon-blue resize-none mb-4"
                  value={codeExplainerInput}
                  onChange={(e) => setCodeExplainerInput(e.target.value)}
                  placeholder="// Collez le code que vous souhaitez faire expliquer par l'IA ici (Python, JS, HTML, etc.)"
                  style={{ minHeight: '150px' }}
                ></textarea>
                <button
                  onClick={handleCodeExplain}
                  className="px-6 py-3 bg-neon-blue text-gray-900 font-semibold rounded-md hover:bg-opacity-80 transition-colors duration-200 self-start mb-4 flex items-center justify-center"
                  disabled={codeExplainerLoading}
                >
                  {codeExplainerLoading ? (
                    <span className="animate-spin mr-2">⚙️</span>
                  ) : (
                    <CheckCircle size={20} className="mr-2" />
                  )}
                  {codeExplainerLoading ? 'Analyse en cours...' : 'Expliquer mon code ✨'}
                </button>
                <h3 className="text-lg font-semibold text-white mb-2">Réponse de l'IA</h3>
                <div className="flex-1 bg-gray-900 text-white font-mono p-4 rounded-md border border-gray-700 overflow-y-auto" style={{ minHeight: '200px' }}>
                  {codeExplainerOutput || (
                    <p className="text-gray-500">
                      Le résultat de l'analyse par Sasaki-Genma apparaîtra ici.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 'ai-space':
        return (
          <div className="flex flex-col h-full p-6">
            <h2 className="text-4xl font-bold text-neon-blue mb-6 text-center">Sasaki-Genma: Votre Assistant IA</h2>
            <p className="text-xl text-gray-300 mb-8 text-center">Posez-lui n'importe quelle question sur la technologie, le code ou le hacking.</p>
            <div className="flex-1 flex flex-col bg-gray-800 rounded-lg shadow-xl p-6">
              <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-900 rounded-lg border border-gray-700 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800" style={{ maxHeight: 'calc(100% - 100px)' }}>
                {aiChatHistory.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-lg">Posez votre première question à Sasaki-Genma !</p>
                  </div>
                )}
                {aiChatHistory.map((message, index) => (
                  <div key={index} className={`mb-4 p-3 rounded-lg max-w-[80%] ${
                    message.type === 'user' ? 'bg-neon-blue text-gray-900 ml-auto' : 'bg-gray-700 text-white mr-auto'
                  }`}>
                    <p className="font-semibold text-sm mb-1">{message.type === 'user' ? 'Vous' : 'Sasaki-Genma'}</p>
                    <p>{message.message}</p>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex items-center mb-4 p-3 rounded-lg bg-gray-700 text-white mr-auto max-w-[80%]">
                    <span className="animate-spin mr-2">⚙️</span> L'IA réfléchit...
                  </div>
                )}
                <div ref={aiChatEndRef} /> {/* Point de défilement */}
              </div>
              <div className="flex items-center">
                <input
                  type="text"
                  className="flex-1 p-3 rounded-l-lg bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-neon-blue"
                  placeholder="Écrivez votre question ici..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter') handleAiSubmit(); }}
                  disabled={aiLoading}
                />
                <button
                  onClick={handleAiSubmit}
                  className="px-6 py-3 bg-neon-blue text-gray-900 font-semibold rounded-r-lg hover:bg-opacity-80 transition-colors duration-200"
                  disabled={aiLoading}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        );
      case 'courses':
        return (
          <div className="flex flex-col h-full p-6">
            <h2 className="text-4xl font-bold text-neon-blue mb-6 text-center">Nos Cours en Ligne</h2>
            <p className="text-xl text-gray-300 mb-8 text-center">Découvrez nos parcours d'apprentissage et maîtrisez les technologies de demain.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto flex-1 pb-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
              {courses.length === 0 ? (
                <p className="col-span-full text-center text-gray-400">Chargement des cours ou aucune donnée disponible...</p>
              ) : (
                courses.map(course => (
                  <div key={course.id} className="bg-gray-800 p-6 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group">
                    <div className="relative overflow-hidden rounded-md mb-4 aspect-video">
                      <img src={course.imageUrl} alt={`Image du cours ${course.title}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x200/2D3748/00F5D4?text=Cours`; }} />
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <PlayCircle size={60} className="text-neon-blue" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{course.title}</h3>
                    <p className="text-gray-400 text-sm mb-3">{course.description}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                      <span>Catégorie: <span className="font-medium text-gray-300">{course.category}</span></span>
                      <span>Niveau: <span className="font-medium text-gray-300">{course.level}</span></span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Cours disponibles en plusieurs langues.</p>
                    <a href={course.videoUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center px-4 py-2 bg-neon-blue text-gray-900 font-semibold rounded-md hover:bg-opacity-80 transition-colors duration-200 text-sm">
                      Voir le cours
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case 'gallery':
        return (
          <div className="flex flex-col h-full p-6">
            <h2 className="text-4xl font-bold text-neon-blue mb-6 text-center">Galerie Visuelle</h2>
            <p className="text-xl text-gray-300 mb-8 text-center">Découvrez des aperçus de nos cours de développement et de hacking éthique.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto flex-1 pb-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
              {[
                { title: "Développement Web", img: "https://placehold.co/600x400/2D3748/00F5D4?text=Dev+Web", desc: "Création d'interfaces réactives." },
                { title: "Algorithmes Python", img: "https://placehold.co/600x400/2D3748/00F5D4?text=Algo+Python", desc: "Visualisation d'algorithmes complexes." },
                { title: "Laboratoire de Pentesting", img: "https://placehold.co/600x400/2D3748/00F5D4?text=Pentesting", desc: "Simulations d'attaques sécurisées." },
                { title: "Conception UI/UX", img: "https://placehold.co/600x400/2D3748/00F5D4?text=UI/UX", desc: "Principes de design intuitif." },
                { title: "Cybersécurité Avancée", img: "https://placehold.co/600x400/2D3748/00F5D4?text=CyberSec", desc: "Techniques de défense réseau." },
                { title: "Machine Learning", img: "https://placehold.co/600x400/2D3748/00F5D4?text=ML", desc: "Apprentissage supervisé et non supervisé." },
              ].map((item, index) => (
                <div key={index} className="bg-gray-800 p-4 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group">
                  <img src={item.img} alt={item.title} className="w-full h-auto rounded-md mb-4 group-hover:scale-105 transition-transform duration-300" onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/600x400/2D3748/00F5D4?text=Image`; }} />
                  <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'external-apps':
        return (
          <div className="flex flex-col h-full p-6">
            <h2 className="text-4xl font-bold text-neon-blue mb-6 text-center">Applications & Pages Externes</h2>
            <p className="text-xl text-gray-300 mb-8 text-center">Accédez rapidement à nos communautés et ressources partenaires.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <a href="https://whatsapp.com/channel/0029Vajrhmz96H4IsEjh4a41" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 bg-gray-800 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group">
                <MessageSquare size={60} className="text-green-500 mb-4 group-hover:scale-110 transition-transform duration-200" />
                <h3 className="text-xl font-semibold text-white mb-2">WhatsApp Channel</h3>
                <p className="text-gray-400 text-center text-sm">Rejoignez notre chaîne pour les dernières annonces.</p>
              </a>
              <a href="https://t.me/sasaki_compagnie" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 bg-gray-800 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group">
                <Send size={60} className="text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-200" />
                <h3 className="text-xl font-semibold text-white mb-2">Telegram Group</h3>
                <p className="text-gray-400 text-center text-sm">Discutez avec la communauté Sasaki.</p>
              </a>
              <a href="https://www.youtube.com/@SASAKICOMPAGNIE" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 bg-gray-800 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group">
                <Youtube size={60} className="text-red-600 mb-4 group-hover:scale-110 transition-transform duration-200" />
                <h3 className="text-xl font-semibold text-white mb-2">YouTube Channel</h3>
                <p className="text-gray-400 text-center text-sm">Découvrez nos tutoriels vidéo.</p>
              </a>
              <a href="https://facebook.com/groups/1647361686155215/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 bg-gray-800 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group">
                <Facebook size={60} className="text-blue-600 mb-4 group-hover:scale-110 transition-transform duration-200" />
                <h3 className="text-xl font-semibold text-white mb-2">Facebook Group</h3>
                <p className="text-gray-400 text-center text-sm">Connectez-vous avec d'autres membres.</p>
              </a>
            </div>
          </div>
        );
      case 'faq':
        const FaqItem = ({ question, answer }) => {
          const [isOpen, setIsOpen] = useState(false);
          return (
            <div className="mb-4 bg-gray-800 p-6 rounded-lg shadow-md">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex justify-between items-center w-full text-left text-lg font-semibold text-white hover:text-neon-blue transition-colors duration-200"
              >
                {question}
                <ChevronDown size={20} className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <p className="mt-4 text-gray-300 text-sm">{answer}</p>
              )}
            </div>
          );
        };
        return (
          <div className="flex flex-col h-full p-6">
            <h2 className="text-4xl font-bold text-neon-blue mb-6 text-center">Foire Aux Questions (FAQ)</h2>
            <p className="text-xl text-gray-300 mb-8 text-center">Trouvez les réponses aux questions les plus fréquentes.</p>
            <div className="overflow-y-auto flex-1 pb-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800 max-w-2xl mx-auto w-full">
              {faqs.length === 0 ? (
                <p className="text-center text-gray-400">Chargement des FAQs ou aucune donnée disponible...</p>
              ) : (
                faqs.map(faq => (
                  <FaqItem key={faq.id} question={faq.question} answer={faq.answer} />
                ))
              )}
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Mail size={64} className="text-neon-blue mb-6" />
            <h2 className="text-4xl font-bold text-neon-blue mb-4">Contactez-nous</h2>
            <p className="text-xl text-gray-300 mb-8">Nous sommes là pour vous aider !</p>
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
              <div className="mb-6 text-left">
                <h3 className="text-lg font-semibold text-white mb-2">Informations de Contact:</h3>
                <p className="text-gray-300 flex items-center mb-2"><Phone size={18} className="mr-2 text-neon-blue" /> Akashi: <a href="tel:+242067274660" className="ml-2 text-neon-blue hover:underline">+242 06 727 4660</a></p>
                <p className="text-gray-300 flex items-center mb-2"><Phone size={18} className="mr-2 text-neon-blue" /> Arthur: <a href="tel:+22898555306" className="ml-2 text-neon-blue hover:underline">+228 98 55 53 06</a></p>
                <p className="text-gray-300 flex items-center"><Mail size={18} className="mr-2 text-neon-blue" /> Email: <a href="mailto:sasakicompagny01@gmail.com" className="ml-2 text-neon-blue hover:underline">sasakicompagny01@gmail.com</a></p>
              </div>
              <form className="space-y-4">
                <input type="text" placeholder="Votre Nom" className="w-full p-3 rounded-md bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-neon-blue" />
                <input type="email" placeholder="Votre Email" className="w-full p-3 rounded-md bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-neon-blue" />
                <textarea placeholder="Votre Message" rows="5" className="w-full p-3 rounded-md bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-neon-blue resize-y"></textarea>
                <button type="submit" className="w-full px-6 py-3 bg-neon-blue text-gray-900 font-semibold rounded-md hover:bg-opacity-80 transition-colors duration-200">
                  Envoyer le Message
                </button>
              </form>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#1A1A1A] text-gray-100 font-sans">
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        body {
          font-family: 'Inter', sans-serif;
        }
        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }
        .text-neon-blue {
          color: #00F5D4;
        }
        .bg-neon-blue {
          background-color: #00F5D4;
        }
        .hover\\:bg-opacity-80:hover {
            background-color: rgba(0, 245, 212, 0.8); /* 80% opacity */
        }
        /* Custom scrollbar styles */
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #4A5568 #2D3748; /* thumb and track color */
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
          height: 8px; /* For horizontal scrollbars */
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #2D3748;
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: #4A5568;
          border-radius: 4px;
          border: 2px solid #2D3748;
        }

        /* Animations for "magical effects" */
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translateY(-20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.6s ease-out forwards;
        }

        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          animation-delay: 0.2s; /* Delay for sequence */
        }

        /* Simple pulse for code lines on hover */
        .code-line-hover-effect:hover {
          background-color: rgba(0, 245, 212, 0.1); /* Light neon blue background */
          transform: scale(1.01);
          box-shadow: 0 0 15px rgba(0, 245, 212, 0.3);
          transition: all 0.2s ease-in-out;
        }
        `}
      </style>

      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
          <MainContent />
        </main>
      </div>
    </div>
  );
};

export default App;
