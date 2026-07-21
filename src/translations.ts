export type Language = "pt" | "en" | "es" | "fr";

export interface TranslationDict {
  prototypeWing: string;
  classLabel: string;
  telemetry: string;
  speed: string;
  acceleration: string;
  turbo: string;
  energy: string;
  mass: string;
  dragToRotate: string;
  chooseRoute: string;
  chooseShip: string;
  backToHangar: string;
  back: string;
  restart: string;
  navSystem: string;
  selectRoute: string;
  testRings: string;
  totalDistance: string;
  difficulty: string;
  settings: string;
  graphics: string;
  graphicsHigh: string;
  graphicsLow: string;
  graphicsHighDesc: string;
  graphicsLowDesc: string;
  languageLabel: string;
  close: string;
  soundEffects: string;
  soundOn: string;
  soundOff: string;
  exit: string;
  unlockMouse: string;
  
  // Game HUD
  flightControls: string;
  yawPitch: string;
  roll: string;
  brake: string;
  speedLabel: string;
  ringsPassed: string;
  shieldLabel: string;
  armorLabel: string;
  
  // Game Over
  connectionLost: string;
  criticalDamage: string;
  shipUsed: string;
  score: string;
  tryAgain: string;
  
  // Victory
  missionComplete: string;
  masteredNavigation: string;
  finalScore: string;
  hullStatus: string;
  playAgain: string;

  // Difficulties
  diffBeginner: string;
  diffEasy: string;
  diffMedium: string;
  diffHard: string;
  diffElite: string;
  diffSurvival: string;

  // Ship classes
  classInterceptor: string;
  classRecon: string;
  classFighter: string;
  classHeavyFighter: string;
  prototypeLocked: string;
  skinLocked: string;
  continueJourney: string;
  temporaryLicense: string;
  openHangar: string;
}

export const translations: Record<Language, TranslationDict> = {
  pt: {
    prototypeWing: "Prototype Wing: Velocity",
    classLabel: "Classe",
    telemetry: "TELEMETRIA",
    speed: "VELOCIDADE",
    acceleration: "ACELERAÇÃO",
    turbo: "TURBO (BOOST)",
    energy: "ENERGIA",
    mass: "MASSA",
    dragToRotate: "Arraste para rotacionar a nave 3D",
    chooseRoute: "ESCOLHER ROTA",
    chooseShip: "ESCOLHER NAVE",
    backToHangar: "Voltar ao Hangar",
    back: "Voltar",
    restart: "Reiniciar",
    navSystem: "SISTEMA DE NAVEGAÇÃO DE TESTES",
    selectRoute: "SELECIONAR TRAJETO",
    testRings: "Aros de Teste",
    totalDistance: "Distância Total",
    difficulty: "Dificuldade",
    settings: "Configurações",
    graphics: "Qualidade Gráfica",
    graphicsHigh: "Altos (Bloom & Efeitos)",
    graphicsLow: "Fluido (Mais Desempenho)",
    graphicsHighDesc: "Ativa efeitos cinematográficos de pós-processamento, Bloom e poeira espacial.",
    graphicsLowDesc: "Desativa o pós-processamento pesado para garantir máxima fluidez e taxa de quadros.",
    languageLabel: "Idioma do Sistema",
    close: "Confirmar",
    soundEffects: "Efeitos Sonoros",
    soundOn: "Efeitos de Som: Ativados",
    soundOff: "Efeitos de Som: Mudo",
    exit: "Sair",
    unlockMouse: "ESC - Mostrar Mouse",

    // Game HUD
    flightControls: "CONTROLES DO VOO",
    yawPitch: "GUINAR / ARREMESSO",
    roll: "INCLINAR",
    brake: "FREAR",
    speedLabel: "VELOCIDADE",
    ringsPassed: "AROS PASSADOS",
    shieldLabel: "ESCUDO",
    armorLabel: "CASCO",

    // Game Over
    connectionLost: "CONEXÃO PERDIDA",
    criticalDamage: "Danos críticos detectados no casco da nave.",
    shipUsed: "Nave Utilizada",
    score: "Pontuação",
    tryAgain: "Tentar Novamente",

    // Victory
    missionComplete: "MISSÃO COMPLETA!",
    masteredNavigation: "Você navegou com maestria por todos os aros de teste.",
    finalScore: "Pontuação Final",
    hullStatus: "Status do Casco",
    playAgain: "Jogar Novamente",

    // Difficulties
    diffBeginner: "Iniciante",
    diffEasy: "Fácil",
    diffMedium: "Médio",
    diffHard: "Difícil",
    diffElite: "Elite",
    diffSurvival: "Sobrevivência",

    // Ship Classes
    classInterceptor: "Interceptador",
    classRecon: "Reconhecimento",
    classFighter: "Caça",
    classHeavyFighter: "Caça Pesado",
    prototypeLocked: "PROTÓTIPO BLOQUEADO",
    skinLocked: "SKIN BLOQUEADA",
    continueJourney: "Continuar Jornada",
    temporaryLicense: "Licença Temporária",
    openHangar: "[ OPEN HANGAR ]"
  },
  en: {
    prototypeWing: "Prototype Wing: Velocity",
    classLabel: "Class",
    telemetry: "TELEMETRY",
    speed: "SPEED",
    acceleration: "ACCELERATION",
    turbo: "TURBO (BOOST)",
    energy: "ENERGY",
    mass: "MASS",
    dragToRotate: "Drag to rotate the 3D spaceship",
    chooseRoute: "CHOOSE ROUTE",
    chooseShip: "CHOOSE SHIP",
    backToHangar: "Back to Hangar",
    back: "Back",
    restart: "Restart",
    navSystem: "TEST NAVIGATION SYSTEM",
    selectRoute: "SELECT ROUTE",
    testRings: "Test Rings",
    totalDistance: "Total Distance",
    difficulty: "Difficulty",
    settings: "Settings",
    graphics: "Graphics Quality",
    graphicsHigh: "High (Bloom & Effects)",
    graphicsLow: "Fluid (Performance)",
    graphicsHighDesc: "Enables cinematic post-processing, Bloom, and atmospheric effects.",
    graphicsLowDesc: "Disables heavy post-processing for maximum frames per second.",
    languageLabel: "System Language",
    close: "Confirm",
    soundEffects: "Sound Effects",
    soundOn: "Sound Effects: Enabled",
    soundOff: "Sound Effects: Muted",
    exit: "Exit",
    unlockMouse: "ESC - Show Mouse",

    // Game HUD
    flightControls: "FLIGHT CONTROLS",
    yawPitch: "YAW / PITCH",
    roll: "ROLL",
    brake: "BRAKE",
    speedLabel: "SPEED",
    ringsPassed: "RINGS PASSED",
    shieldLabel: "SHIELD",
    armorLabel: "ARMOR",

    // Game Over
    connectionLost: "CONNECTION LOST",
    criticalDamage: "Critical hull damage detected. Ship destroyed.",
    shipUsed: "Spaceship",
    score: "Score",
    tryAgain: "Try Again",

    // Victory
    missionComplete: "MISSION COMPLETE!",
    masteredNavigation: "You have masterfully navigated all test rings.",
    finalScore: "Final Score",
    hullStatus: "Hull Status",
    playAgain: "Play Again",

    // Difficulties
    diffBeginner: "Beginner",
    diffEasy: "Easy",
    diffMedium: "Medium",
    diffHard: "Hard",
    diffElite: "Elite",
    diffSurvival: "Survival",

    // Ship Classes
    classInterceptor: "Interceptor",
    classRecon: "Recon",
    classFighter: "Fighter",
    classHeavyFighter: "Heavy Fighter",
    prototypeLocked: "PROTOTYPE LOCKED",
    skinLocked: "SKIN LOCKED",
    continueJourney: "Continue Journey",
    temporaryLicense: "Temporary License",
    openHangar: "[ OPEN HANGAR ]"
  },
  es: {
    prototypeWing: "Prototype Wing: Velocity",
    classLabel: "Clase",
    telemetry: "TELEMETRÍA",
    speed: "VELOCIDAD",
    acceleration: "ACELERACIÓN",
    turbo: "TURBO (IMPULSO)",
    energy: "ENERGÍA",
    mass: "MASA",
    dragToRotate: "Arrastra para rotar la nave 3D",
    chooseRoute: "ELEGIR RUTA",
    chooseShip: "ELEGIR NAVE",
    backToHangar: "Volver al Hangar",
    back: "Volver",
    restart: "Reiniciar",
    navSystem: "SISTEMA DE NAVEGACIÓN DE PRUEBAS",
    selectRoute: "SELECCIONAR TRAYECTO",
    testRings: "Anillos de Prueba",
    totalDistance: "Distancia Total",
    difficulty: "Dificultad",
    settings: "Configuraciones",
    graphics: "Calidad Gráfica",
    graphicsHigh: "Alta (Bloom y Efectos)",
    graphicsLow: "Fluida (Rendimiento)",
    graphicsHighDesc: "Activa efectos de postprocesado cinematográfico, Bloom y polvo espacial.",
    graphicsLowDesc: "Desactiva postprocesados exigentes para garantizar la máxima tasa de fotogramas.",
    languageLabel: "Idioma del Sistema",
    close: "Confirmar",
    soundEffects: "Efectos de Sonido",
    soundOn: "Efectos: Activados",
    soundOff: "Efectos: Silenciados",
    exit: "Salir",
    unlockMouse: "ESC - Mostrar Mouse",

    // Game HUD
    flightControls: "CONTROLES DE VUELO",
    yawPitch: "GUIÑADA / CABECEO",
    roll: "ALABEO / INCLINAR",
    brake: "FRENAR",
    speedLabel: "VELOCIDAD",
    ringsPassed: "ANILLOS PASADOS",
    shieldLabel: "ESCUDO",
    armorLabel: "CASCO",

    // Game Over
    connectionLost: "CONEXIÓN PERDIDA",
    criticalDamage: "Daño crítico detectado en el casco de la nave.",
    shipUsed: "Nave Utilizada",
    score: "Puntuación",
    tryAgain: "Intentar de Nuevo",

    // Victory
    missionComplete: "¡MISIÓN COMPLETADA!",
    masteredNavigation: "Has navegado magistralmente a través de todos los anillos de prueba.",
    finalScore: "Puntuación Final",
    hullStatus: "Estado del Casco",
    playAgain: "Jugar de Nuevo",

    // Difficulties
    diffBeginner: "Principiante",
    diffEasy: "Fácil",
    diffMedium: "Medio",
    diffHard: "Difícil",
    diffElite: "Élite",
    diffSurvival: "Supervivencia",

    // Ship Classes
    classInterceptor: "Interceptora",
    classRecon: "Reconocimiento",
    classFighter: "Caza",
    classHeavyFighter: "Caza Pesado",
    prototypeLocked: "PROTOTIPO BLOQUEADO",
    skinLocked: "SKIN BLOQUEADA",
    continueJourney: "Continuar Viaje",
    temporaryLicense: "Licencia Temporal",
    openHangar: "[ OPEN HANGAR ]"
  },
  fr: {
    prototypeWing: "Prototype Wing: Velocity",
    classLabel: "Classe",
    telemetry: "TÉLÉMÉTRIE",
    speed: "VITESSE",
    acceleration: "ACCÉLÉRATION",
    turbo: "TURBO (BOOST)",
    energy: "ÉNERGIE",
    mass: "MASSE",
    dragToRotate: "Glissez pour faire pivoter le vaisseau 3D",
    chooseRoute: "CHOISIR LA ROUTE",
    chooseShip: "CHOISIR LE VAISSEAU",
    backToHangar: "Retour au Hangar",
    back: "Retour",
    restart: "Recommencer",
    navSystem: "SYSTÈME DE NAVIGATION DE TEST",
    selectRoute: "SÉLECTIONNER LE TRAJET",
    testRings: "Anneaux de Test",
    totalDistance: "Distance Totale",
    difficulty: "Difficulté",
    settings: "Paramètres",
    graphics: "Qualité Graphique",
    graphicsHigh: "Haute (Bloom & Effets)",
    graphicsLow: "Fluide (Performance)",
    graphicsHighDesc: "Active les effets cinématographiques de post-traitement, le Bloom et la poussière spatiale.",
    graphicsLowDesc: "Désactive le post-traitement lourd pour assurer une fluidité d'image maximale.",
    languageLabel: "Langue du Système",
    close: "Confirmer",
    soundEffects: "Effets Sonores",
    soundOn: "Effets : Activés",
    soundOff: "Effets : Muets",
    exit: "Quitter",
    unlockMouse: "ESC - Afficher la Souris",

    // Game HUD
    flightControls: "COMMANDES DE VOL",
    yawPitch: "LACET / TANGAGE",
    roll: "ROULIS / INCLINAISON",
    brake: "FREINER",
    speedLabel: "VITESSE",
    ringsPassed: "ANNEAUX PASSÉS",
    shieldLabel: "BOUCLIER",
    armorLabel: "COQUE",

    // Game Over
    connectionLost: "CONNEXION PERDUE",
    criticalDamage: "Dégâts critiques détectés sur la coque du vaisseau.",
    shipUsed: "Vaisseau Utilisé",
    score: "Score",
    tryAgain: "Réessayer",

    // Victory
    missionComplete: "MISSION ACCOMPLIE !",
    masteredNavigation: "Vous avez navigué avec brio à travers tous les anneaux de test.",
    finalScore: "Score Final",
    hullStatus: "État de la Coque",
    playAgain: "Rejouer",

    // Difficulties
    diffBeginner: "Débutant",
    diffEasy: "Facile",
    diffMedium: "Moyen",
    diffHard: "Difficile",
    diffElite: "Élite",
    diffSurvival: "Survivance",

    // Ship Classes
    classInterceptor: "Intercepteur",
    classRecon: "Reconnaissance",
    classFighter: "Chasseur",
    classHeavyFighter: "Chasseur Lourd",
    prototypeLocked: "PROTOTYPE VERROUILLÉ",
    skinLocked: "SKIN VERROUILLÉE",
    continueJourney: "Continuer le Voyage",
    temporaryLicense: "Licence Temporaire",
    openHangar: "[ OPEN HANGAR ]"
  }
};

// Traduções completas para os nomes e descrições das rotas
export const routeTranslations: Record<Language, Record<string, { name: string; description: string }>> = {
  pt: {
    "route-asteroid-alpha": {
      name: "Cinturão de Asteroides Alpha",
      description: "Navegue pelo setor de testes cercado por asteroides flutuantes e luas. Perfeito para calibragem de propulsores."
    },
    "route-orion-nebula": {
      name: "Vórtice da Nebulosa de Órion",
      description: "Uma corrida tática através de um labirinto instável de gás superaquecido e poeira cósmica ionizada."
    },
    "route-saturn-rings": {
      name: "Anéis Táticos de Saturno",
      description: "Circuito de precisão máxima situado nas fendas geladas dos icônicos anéis planetários de Saturno."
    },
    "route-supernova": {
      name: "Remanescente de Supernova",
      description: "Voe através dos restos incandescentes de uma estrela morta, onde detritos em chamas voam em todas as direções."
    },
    "route-black-hole": {
      name: "Horizonte de Eventos",
      description: "A gravidade distorce o espaço-tempo. Curvas impossíveis e uma força invisível puxam sua nave para o abismo."
    },
    "route-highway": {
      name: "Via Láctea Expressa",
      description: "Uma rodovia interestelar de alta velocidade. Baixa densidade de obstáculos, mas distância extrema."
    },
    "route-ice-field": {
      name: "Campos Glaciais de Europa",
      description: "Navegue por um oceano congelado suspenso no espaço. Milhares de blocos de gelo estáticos bloqueiam o caminho."
    },
    "route-plasma": {
      name: "Tormenta Energética",
      description: "Relâmpagos cósmicos e nuvens de plasma ionizado. A visibilidade é baixa e as curvas são fechadas."
    },
    "route-dyson": {
      name: "Sucata de Dyson",
      description: "Os restos de uma megaestrutura antiga. Destroços metálicos densos tornam a navegação um pesadelo de sobrevivência."
    },
    "route-void": {
      name: "Silêncio do Vazio",
      description: "Um teste de velocidade pura e controle inercial. Sem obstáculos, apenas o vácuo absoluto e curvas extremas."
    },
    "route-certification": {
      name: "Vôo de Certificação",
      description: "Um trajeto para aprender a pilotar. Começa fácil com aros alinhados e sem obstáculos, ficando um pouco mais difícil com curvas e asteroides no final."
    }
  },
  en: {
    "route-asteroid-alpha": {
      name: "Alpha Asteroid Belt",
      description: "Navigate the test sector surrounded by floating asteroids and moons. Perfect for thruster calibration."
    },
    "route-orion-nebula": {
      name: "Orion Nebula Vortex",
      description: "A tactical race through an unstable labyrinth of superheated gas and ionized cosmic dust."
    },
    "route-saturn-rings": {
      name: "Saturn Tactical Rings",
      description: "Maximum precision circuit located in the icy gaps of Saturn's iconic planetary rings."
    },
    "route-supernova": {
      name: "Supernova Remnant",
      description: "Fly through the incandescent remains of a dead star, where burning debris flies in all directions."
    },
    "route-black-hole": {
      name: "Event Horizon",
      description: "Gravity warps space-time. Impossible curves and an invisible force pull your ship into the abyss."
    },
    "route-highway": {
      name: "Milky Way Express",
      description: "A high-speed interstellar highway. Low obstacle density, but extreme distance."
    },
    "route-ice-field": {
      name: "Icy Fields of Europa",
      description: "Navigate a frozen ocean suspended in space. Thousands of static ice blocks block the way."
    },
    "route-plasma": {
      name: "Energy Storm",
      description: "Cosmic lightning and ionized plasma clouds. Visibility is low and turns are extremely tight."
    },
    "route-dyson": {
      name: "Dyson Scraps",
      description: "The remnants of an ancient megastructure. Dense metallic debris makes navigation a survival nightmare."
    },
    "route-void": {
      name: "Silence of the Void",
      description: "A test of pure speed and inertial control. No obstacles, just absolute vacuum and extreme curves."
    },
    "route-certification": {
      name: "Certification Flight",
      description: "A trajectory to learn flight controls. Starts easy with aligned rings and no obstacles, getting slightly harder with curves and asteroids at the end."
    }
  },
  es: {
    "route-asteroid-alpha": {
      name: "Cinturón de Asteroides Alfa",
      description: "Navega por el sector de pruebas rodeado de asteroides flotantes y lunas. Perfecto para calibrar propulsores."
    },
    "route-orion-nebula": {
      name: "Vórtice de la Nebulosa de Orión",
      description: "Una carrera táctica a través de un laberinto inestable de gas sobrecalentado y polvo cósmico ionizado."
    },
    "route-saturn-rings": {
      name: "Anillos Tácticos de Saturno",
      description: "Circuito de máxima precisión situado en las grietas heladas de los icónicos anillos de Saturno."
    },
    "route-supernova": {
      name: "Remanente de Supernova",
      description: "Vuela a través de los restos incandescentes de una estrella muerta, donde vuelan desechos en llamas."
    },
    "route-black-hole": {
      name: "Horizonte de Sucesos",
      description: "La gravedad distorsiona el espacio-tiempo. Curvas imposibles y una fuerza invisible atraen tu nave."
    },
    "route-highway": {
      name: "Vía Láctea Express",
      description: "Una autopista interestelar de alta velocidad. Baja densidad de obstáculos pero distancia extrema."
    },
    "route-ice-field": {
      name: "Campos Glaciales de Europa",
      description: "Navega por un océano congelado suspendido en el espacio. Miles de bloques de hielo bloquean el camino."
    },
    "route-plasma": {
      name: "Tormenta de Plasma",
      description: "Relámpagos cósmicos y nubes de plasma ionizado. La visibilidad es baja y las curvas cerradas."
    },
    "route-dyson": {
      name: "Chatarra de Dyson",
      description: "Los restos de una antigua megaestructura. Los densos desechos metálicos hacen que sea una pesadilla sobrevivir."
    },
    "route-void": {
      name: "Silencio del Vacío",
      description: "Una prueba de velocidad pura y control inercial. Sin obstáculos, solo el vacío absoluto y curvas extremas."
    },
    "route-certification": {
      name: "Vuelo de Certificación",
      description: "Una trayectoria para aprender a pilotar. Comienza fácil con aros alineados y sin obstáculos, haciéndose un poco más difícil con curvas y asteroides al final."
    }
  },
  fr: {
    "route-asteroid-alpha": {
      name: "Ceinture d'Astéroïdes Alpha",
      description: "Naviguez dans le secteur de test entouré d'astéroïdes et de lunes. Parfait pour calibrer les propulseurs."
    },
    "route-orion-nebula": {
      name: "Vortex de la Nébuleuse d'Orion",
      description: "Une course tactique à travers un labyrinthe instable de gaz surchauffé et de poussière cosmique ionisée."
    },
    "route-saturn-rings": {
      name: "Anneaux Tactiques de Saturne",
      description: "Circuit de précision maximale situé dans les brèches glacées des célèbres anneaux planétaires."
    },
    "route-supernova": {
      name: "Rémanent de Supernova",
      description: "Volez à travers les restes incandescents d'une étoile morte, où des débris enflammés volent partout."
    },
    "route-black-hole": {
      name: "Horizon des Événements",
      description: "La gravité déforme l'espace-temps. Des courbes impossibles et une force invisible vous attirent vers l'abîme."
    },
    "route-highway": {
      name: "Autoroute de la Voie Lactée",
      description: "Une autoroute interstellaire à grande vitesse. Faible densité d'obstacles, mais distance extrême."
    },
    "route-ice-field": {
      name: "Champs Glaciaires d'Europe",
      description: "Naviguez sur un océan gelé suspendu dans l'espace. Des milliers de blocs de glace statiques bloquent la voie."
    },
    "route-plasma": {
      name: "Tempête d'Énergie",
      description: "Foudres cosmiques et nuages de plasma ionisé. La visibilité est faible et les virages sont serrés."
    },
    "route-dyson": {
      name: "Débris de Dyson",
      description: "Les restes d'une ancienne mégastructure. Des débris métalliques denses font de la navigation un cauchemar."
    },
    "route-void": {
      name: "Silence du Vide",
      description: "Un test de vitesse pure et de contrôle inertiel. Sans obstacles, juste le vide absolu et des courbes extrêmes."
    },
    "route-certification": {
      name: "Vol de Certification",
      description: "Une trajectoire pour apprendre le pilotage. Commence facilement avec des anneaux alignés et sans obstacles, devenant un peu plus difficile avec des courbes et des astéroïdes à la fin."
    }
  }
};

// Helpers para tradução sob demanda
export function translateDifficulty(diff: string, lang: Language): string {
  const dict = translations[lang];
  switch (diff) {
    case "Iniciante": return dict.diffBeginner;
    case "Fácil": return dict.diffEasy;
    case "Médio": return dict.diffMedium;
    case "Difícil": return dict.diffHard;
    case "Elite": return dict.diffElite;
    case "Sobrevivência": return dict.diffSurvival;
    default: return diff;
  }
}

export function translateClass(cls: string, lang: Language): string {
  const dict = translations[lang];
  switch (cls) {
    case "Interceptor": return dict.classInterceptor;
    case "Recon": return dict.classRecon;
    case "Fighter": return dict.classFighter;
    case "Heavy Fighter": return dict.classHeavyFighter;
    default: return cls;
  }
}
