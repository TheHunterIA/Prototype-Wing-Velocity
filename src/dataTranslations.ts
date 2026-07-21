import { Language } from "./translations";

export const skinTranslations: Record<Language, Record<string, { name: string; description: string }>> = {
  pt: {
    "red-fury": { name: "Fúria Vermelha", description: "Um acabamento escarlate agressivo que reflete o calor das estrelas em chamas." },
    "blue-void": { name: "Abismo Profundo", description: "Tonalidades de azul cobalto projetadas para camuflagem em nebulosas gasosas." },
    "green-acid": { name: "Radioativo", description: "Um brilho esmeralda radioativo que intimida qualquer oponente no vácuo." },
    "yellow-sun": { name: "Singularidade Solar", description: "Reflexos dourados polidos que capturam e amplificam a luz de sistemas binários." },
    "purple-nebula": { name: "Nébula de Antimatéria", description: "Cores profundas e misteriosas colhidas do coração das nebulosas mais distantes." },
    "cyan-ion": { name: "Feixe de Íons", description: "Revestimento experimental de íons para máxima eficiência em manobras rápidas." },
    "grey-carbonite": { name: "Liga de Carbonita", description: "Metal bruto e resistente, forjado para suportar impactos em cinturões de asteroides." },
    "black-vacuum": { name: "Vácuo Absoluto", description: "Nanotecnologia que absorve 99% da luz visível para operações furtivas de elite." },
    "white-neutron": { name: "Estrela de Nêutrons", description: "Brilho intenso e pureza absoluta." },
    "cammo-military": { name: "Camuflado Militar", description: "Padrão tático de camuflagem projetado para infiltração em campos de destroços." },
    "earth-harmony": { name: "Planeta Terra", description: "Inspirada na beleza azul e verde do nosso planeta de origem, a Terra." }
  },
  en: {
    "red-fury": { name: "Red Fury", description: "An aggressive scarlet finish reflecting the heat of burning stars." },
    "blue-void": { name: "Deep Abyss", description: "Cobalt blue hues designed for camouflage in gaseous nebulae." },
    "green-acid": { name: "Radioactive", description: "A radioactive emerald glow that intimidates any opponent in the vacuum." },
    "yellow-sun": { name: "Solar Singularity", description: "Polished gold reflections that capture and amplify light from binary systems." },
    "purple-nebula": { name: "Antimatter Nebula", description: "Deep, mysterious colors harvested from the heart of the most distant nebulae." },
    "cyan-ion": { name: "Ion Beam", description: "Experimental ion coating for maximum efficiency in rapid maneuvers." },
    "grey-carbonite": { name: "Carbonite Alloy", description: "Raw, resistant metal forged to withstand impacts in asteroid belts." },
    "black-vacuum": { name: "Absolute Vacuum", description: "Nanotechnology that absorbs 99% of visible light for elite stealth operations." },
    "white-neutron": { name: "Neutron Star", description: "Intense brilliance and absolute purity." },
    "cammo-military": { name: "Military Camo", description: "Tactical camouflage pattern designed for infiltration into debris fields." },
    "earth-harmony": { name: "Planet Earth", description: "Inspired by the blue and green beauty of our home planet, Earth." }
  },
  es: {
    "red-fury": { name: "Furia Roja", description: "Un acabado escarlata agresivo que refleja el calor de las estrellas ardientes." },
    "blue-void": { name: "Abismo Profundo", description: "Tonos azul cobalto diseñados para el camuflaje en nebulosas gaseosas." },
    "green-acid": { name: "Radiactivo", description: "Un brillo esmeralda radiactivo que intimida a cualquier oponente en el vacío." },
    "yellow-sun": { name: "Singularidad Solar", description: "Reflejos de oro pulido que capturan y amplifican la luz de sistemas binarios." },
    "purple-nebula": { name: "Nebulosa de Antimateria", description: "Colores profundos y misteriosos extraídos del corazón de las nebulosas más distantes." },
    "cyan-ion": { name: "Haz de Iones", description: "Revestimiento de iones experimental para la máxima eficiencia en maniobras rápidas." },
    "grey-carbonite": { name: "Aleación de Carbonita", description: "Metal en bruto y resistente, forjado para soportar impactos en cinturones de asteroides." },
    "black-vacuum": { name: "Vacío Absoluto", description: "Nanotecnología que absorbe el 99% de la luz visible para operaciones sigilosas de élite." },
    "white-neutron": { name: "Estrella de Neutrones", description: "Brillo intenso y pureza absoluta." },
    "cammo-military": { name: "Camuflaje Militar", description: "Patrón de camuflaje táctico diseñado para la infiltración en campos de escombros." },
    "earth-harmony": { name: "Planeta Tierra", description: "Inspirada en la belleza azul y verde de nuestro planeta de origen, la Tierra." }
  },
  fr: {
    "red-fury": { name: "Fureur Rouge", description: "Une finition écarlate agressive reflétant la chaleur des étoiles brûlantes." },
    "blue-void": { name: "Abîme Profond", description: "Teintes bleu cobalt conçues pour le camouflage dans les nébuleuses gazeuses." },
    "green-acid": { name: "Radioactif", description: "Une lueur émeraude radioactive qui intimide tout adversaire dans le vide." },
    "yellow-sun": { name: "Singularité Solaire", description: "Reflets dorés polis qui captent et amplifient la lumière des systèmes binaires." },
    "purple-nebula": { name: "Nébuleuse d'Antimatière", description: "Des couleurs profondes et mystérieuses récoltées au cœur des nébuleuses les plus lointaines." },
    "cyan-ion": { name: "Faisceau d'Ions", description: "Revêtement ionique expérimental pour une efficacité maximale dans les manœuvres rapides." },
    "grey-carbonite": { name: "Alliage de Carbonite", description: "Métal brut et résistant forgé pour résister aux impacts dans les ceintures d'astéroïdes." },
    "black-vacuum": { name: "Vide Absolu", description: "Nanotechnologie qui absorbe 99 % de la lumière visible pour les opérations furtives d'élite." },
    "white-neutron": { name: "Étoile à Neutrons", description: "Brillance intense et pureté absolue." },
    "cammo-military": { name: "Camouflage Militaire", description: "Motif de camouflage tactique conçu pour l'infiltration dans les champs de débris." },
    "earth-harmony": { name: "Planète Terre", description: "Inspiré par la beauté bleue et verte de notre planète d'origine, la Terre." }
  }
};

export const classProfileTranslations: Record<Language, Record<string, { name: string; focus: string; advantage: string; disadvantage: string }>> = {
  pt: {
    Interceptor: {
      name: "Interceptor (Interceptadora)",
      focus: "Velocidade & Aceleração Extrema",
      advantage: "Aceleração instantânea e massa levíssima para manobras rápidas.",
      disadvantage: "Blindagem e escudos reduzidos devido ao chassi ultraleve."
    },
    Recon: {
      name: "Recon (Exploradora)",
      focus: "Mobilidade Ágil & Varredura",
      advantage: "Altíssima agilidade com excelente taxa de recarga dos motores.",
      disadvantage: "Poder de fogo reduzido focado em evasão e furtividade."
    },
    Fighter: {
      name: "Fighter (Caça de Combate)",
      focus: "Equilíbrio de Atributos",
      advantage: "Desempenho balanceado em combate, velocidade e blindagem.",
      disadvantage: "Não possui nenhuma especialização extrema nos sistemas."
    },
    "Heavy Fighter": {
      name: "Heavy Fighter (Caça Pesado)",
      focus: "Ataque Frontal & Blindagem",
      advantage: "Alta resistência e canhões de plasma pesados.",
      disadvantage: "Inércia perceptível nas curvas e velocidade de cruzeiro menor."
    },
    Bomber: {
      name: "Bomber (Bombardeira)",
      focus: "Demolição & Destruição",
      advantage: "Poder destrutivo massivo com mísseis e cargas sísmicas.",
      disadvantage: "Massa muito alta, manobras lentas e baixa agilidade."
    },
    Corvette: {
      name: "Corvette (Corveta Escolta)",
      focus: "Duração de Turbo & Energia",
      advantage: "Turbo Boost de longa duração e geradores de escudos robustos.",
      disadvantage: "Frenagem lenta e grande arrasto inercial de massa."
    },
    Dreadnought: {
      name: "Dreadnought (Couraçado)",
      focus: "Energia Máxima & Escudos",
      advantage: "Geradores de energia de fusão massivos com recarga rápida de turbo.",
      disadvantage: "Massa extrema, curva inercial difícil e velocidade base reduzida."
    }
  },
  en: {
    Interceptor: {
      name: "Interceptor",
      focus: "Extreme Speed & Acceleration",
      advantage: "Instant acceleration and ultra-light mass for quick maneuvers.",
      disadvantage: "Reduced armor and shields due to ultra-light chassis."
    },
    Recon: {
      name: "Recon (Scout)",
      focus: "Agile Mobility & Scanning",
      advantage: "Very high agility with excellent engine recharge rate.",
      disadvantage: "Reduced firepower focused on evasion and stealth."
    },
    Fighter: {
      name: "Fighter",
      focus: "Attribute Balance",
      advantage: "Balanced performance in combat, speed, and armor.",
      disadvantage: "Does not have any extreme system specialization."
    },
    "Heavy Fighter": {
      name: "Heavy Fighter",
      focus: "Frontal Attack & Armor",
      advantage: "High resistance and heavy plasma cannons.",
      disadvantage: "Noticeable inertia in turns and lower cruise speed."
    },
    Bomber: {
      name: "Bomber",
      focus: "Demolition & Destruction",
      advantage: "Massive destructive power with missiles and seismic charges.",
      disadvantage: "Very high mass, slow maneuvers, and low agility."
    },
    Corvette: {
      name: "Corvette (Escort)",
      focus: "Turbo Duration & Energy",
      advantage: "Long-duration turbo boost and robust shield generators.",
      disadvantage: "Slow braking and large inertial mass drag."
    },
    Dreadnought: {
      name: "Dreadnought (Battleship)",
      focus: "Maximum Energy & Shields",
      advantage: "Massive fusion power generators with fast turbo recharge.",
      disadvantage: "Extreme mass, difficult inertial turns, and reduced base speed."
    }
  },
  es: {
    Interceptor: {
      name: "Interceptora",
      focus: "Velocidad y Aceleración Extrema",
      advantage: "Aceleración instantánea y masa ultraligera para maniobras rápidas.",
      disadvantage: "Blindaje y escudos reducidos debido al chasis ultraligero."
    },
    Recon: {
      name: "Recon (Exploradora)",
      focus: "Mobilidad Ágil y Escaneo",
      advantage: "Agilidad muy alta con excelente tasa de recarga del motor.",
      disadvantage: "Poder de fuego reducido enfocado en evasión y sigilo."
    },
    Fighter: {
      name: "Caza de Combate",
      focus: "Equilibrio de Atributos",
      advantage: "Rendimiento equilibrado en combate, velocidad y blindaje.",
      disadvantage: "No tiene ninguna especialización extrema en sus sistemas."
    },
    "Heavy Fighter": {
      name: "Caza Pesado",
      focus: "Ataque Frontal y Blindaje",
      advantage: "Alta resistencia y cañones de plasma pesados.",
      disadvantage: "Inercia notable en curvas y menor velocidad de crucero."
    },
    Bomber: {
      name: "Bombardero",
      focus: "Demolición y Destrucción",
      advantage: "Poder destructivo masivo con misiles y cargas sísmicas.",
      disadvantage: "Massa muy alta, maniobras lentas y baja agilidad."
    },
    Corvette: {
      name: "Corbeta (Escolta)",
      focus: "Duración de Turbo y Energía",
      advantage: "Impulso turbo de larga duración y generadores de escudo robustos.",
      disadvantage: "Frenado lento y gran arrastre de masa inercial."
    },
    Dreadnought: {
      name: "Acorazado",
      focus: "Energía Máxima y Escudos",
      advantage: "Generadores masivos de energía de fusión con recarga rápida de turbo.",
      disadvantage: "Masa extrema, curvas inerciales difíciles y velocidad base reducida."
    }
  },
  fr: {
    Interceptor: {
      name: "Intercepteur",
      focus: "Vitesse et Accélération Extrêmes",
      advantage: "Accélération instantanée et masse ultra-légère pour des manœuvres rapides.",
      disadvantage: "Blindage et boucliers réduits à cause du châssis ultra-léger."
    },
    Recon: {
      name: "Recon (Éclaireur)",
      focus: "Mobilité Agile et Scan",
      advantage: "Agilité très élevée avec un excellent taux de recharge du moteur.",
      disadvantage: "Puissance de feu réduite axée sur l'évasion et la furtivité."
    },
    Fighter: {
      name: "Chasseur",
      focus: "Équilibre des Attributs",
      advantage: "Performance équilibrée au combat, vitesse et blindage.",
      disadvantage: "Ne possède aucune spécialisation extrême du système."
    },
    "Heavy Fighter": {
      name: "Chasseur Lourd",
      focus: "Attaque Frontale et Blindage",
      advantage: "Haute résistance et lourds canons à plasma.",
      disadvantage: "Inertie notable dans les virages et vitesse de croisière réduite."
    },
    Bomber: {
      name: "Bombardier",
      focus: "Démolition et Destruction",
      advantage: "Puissance de destruction massive avec missiles et charges sismiques.",
      disadvantage: "Masse très élevée, manœuvres lentes et faible agilité."
    },
    Corvette: {
      name: "Corvette (Escorte)",
      focus: "Durée du Turbo et Énergie",
      advantage: "Turbo boost longue durée et générateurs de boucliers robustes.",
      disadvantage: "Freinage lent et traînée de masse inertielle importante."
    },
    Dreadnought: {
      name: "Cuirassé",
      focus: "Énergie Maximale et Boucliers",
      advantage: "Générateurs d'énergie à fusion massifs avec recharge turbo rapide.",
      disadvantage: "Masse extrême, virages inertiels difficiles et vitesse de base réduite."
    }
  }
};
