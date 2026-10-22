// Temario v1: cada meta (unidad) es una estación de su línea (spec 5.1 y 7.2).
// Cada meta trae 6 frases clave (Aprender las enseña y entran al repaso) y dos escenas para
// Conversar: una de trabajo y otra de viajes. Los criterios de aprobación llegan en la fase 5.
import type { PictogramName } from "./pictograms.ts";
import type { LevelId } from "./levels.ts";

// Frase clave: inglés, español y, si hace falta, una nota corta en español
export interface KeyPhrase {
  en: string;
  es: string;
  nota?: string;
}

// Escena de la conversación (spec 7.2): el personaje, dónde están y qué tiene que lograr la persona.
// rol_en va en inglés porque es para la IA; lo demás se muestra en la app.
export interface Situation {
  personaje_es: string;
  rol_en: string;
  escena_es: string;
  objetivo_es: string;
  pictograma: "waiter" | "person";
}

export interface Unit {
  id: string;
  nivel: LevelId;
  orden: number;
  titulo_es: string;
  meta_puedes: string;
  pictograma: PictogramName;
  frases_clave: KeyPhrase[];
  // El motivo solo cambia la escena (spec 5.1); con "ambos" se alternan por día
  escenas: { trabajo: Situation; viajes: Situation };
}

// Ordenado por nivel y luego por orden: ese es el camino de cada persona
export const units: Unit[] = [
  // Nivel 0, línea rosa
  {
    id: "l0-saludar",
    nivel: "L0",
    orden: 1,
    titulo_es: "Saludar y despedirte",
    meta_puedes: "Ya puedes saludar y despedirte",
    pictograma: "hand",
    escenas: {
      trabajo: {
        personaje_es: "tu compañera Ana",
        rol_en:
          "Ana, a friendly coworker you meet in the office hallway in the morning",
        escena_es: "Llegas a la oficina y te encuentras a Ana en el pasillo.",
        objetivo_es: "Salúdala, pregúntale cómo está y despídete.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "el recepcionista del hotel",
        rol_en:
          "a friendly hotel receptionist greeting a guest in the lobby in the morning",
        escena_es: "Bajas al lobby del hotel en la mañana.",
        objetivo_es: "Saluda, responde cómo estás y despídete.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "Hello.",
        es: "Hola.",
        nota: "“Hi” es más informal; “Hello” sirve en cualquier lugar.",
      },
      { en: "Good morning.", es: "Buenos días." },
      {
        en: "Good afternoon.",
        es: "Buenas tardes.",
        nota: "Se usa de mediodía a las 6, más o menos. Después es “Good evening”.",
      },
      { en: "How are you?", es: "¿Cómo estás?" },
      { en: "I'm fine, thank you.", es: "Estoy bien, gracias." },
      {
        en: "See you later.",
        es: "Nos vemos luego.",
        nota: "“Goodbye” es más formal; “Bye” es lo más común.",
      },
    ],
  },
  {
    id: "l0-numeros",
    nivel: "L0",
    orden: 2,
    titulo_es: "Números, precios y la hora",
    meta_puedes: "Ya puedes decir números, precios y la hora",
    pictograma: "clock",
    escenas: {
      trabajo: {
        personaje_es: "tu compañero Tom",
        rol_en:
          "Tom, a coworker at the office cafeteria who asks you the time and the price of your lunch",
        escena_es: "Estás en el comedor de la oficina con Tom.",
        objetivo_es: "Dile qué hora es y cuánto cuesta tu comida.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "la vendedora del mercado",
        rol_en:
          "a market vendor selling fruit to a tourist; prices are simple dollar amounts",
        escena_es: "Estás en un mercado y quieres comprar fruta.",
        objetivo_es: "Pregunta el precio y di cuántas quieres.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "How much is it?",
        es: "¿Cuánto cuesta?",
        nota: "“How much” es para precios; “How many” es para contar cosas.",
      },
      { en: "It's ten dollars.", es: "Son diez dólares." },
      { en: "What time is it?", es: "¿Qué hora es?" },
      {
        en: "It's three o'clock.",
        es: "Son las tres en punto.",
        nota: "“O'clock” solo se usa con la hora exacta.",
      },
      {
        en: "My phone number is 555 1234.",
        es: "Mi número de teléfono es 555 1234.",
        nota: "Los teléfonos se dicen dígito por dígito: five, five, five…",
      },
      {
        en: "Thirteen or thirty?",
        es: "¿Trece o treinta?",
        nota: "ThirTEEN (13) se acentúa al final; THIRty (30), al principio.",
      },
    ],
  },
  {
    id: "l0-dias",
    nivel: "L0",
    orden: 3,
    titulo_es: "Días, meses y colores",
    meta_puedes: "Ya puedes decir días, meses y colores",
    pictograma: "calendar",
    escenas: {
      trabajo: {
        personaje_es: "tu jefa Laura",
        rol_en:
          "Laura, your manager, choosing a day for a short meeting next week",
        escena_es: "Laura quiere agendar una junta contigo la próxima semana.",
        objetivo_es: "Di qué día puedes y qué día no puedes.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "el vendedor de la tienda",
        rol_en:
          "a clerk at a souvenir shop asking which color T-shirt you want and what day you leave",
        escena_es: "Compras una playera de recuerdo en una tienda.",
        objetivo_es: "Elige el color de la playera y di qué día te vas.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "Today is Monday.",
        es: "Hoy es lunes.",
        nota: "Los días y los meses en inglés siempre van con mayúscula.",
      },
      { en: "See you on Friday.", es: "Nos vemos el viernes." },
      {
        en: "My birthday is in May.",
        es: "Mi cumpleaños es en mayo.",
        nota: "Con meses se usa “in”; con días, “on”: on Monday.",
      },
      { en: "What color is it?", es: "¿De qué color es?" },
      { en: "It's blue.", es: "Es azul." },
      {
        en: "I like the red one.",
        es: "Me gusta el rojo.",
        nota: "En inglés el color va antes de la cosa: a red car, no a car red.",
      },
    ],
  },
  {
    id: "l0-nombre",
    nivel: "L0",
    orden: 4,
    titulo_es: "Decir y deletrear tu nombre",
    meta_puedes: "Ya puedes decir y deletrear tu nombre",
    pictograma: "chat",
    escenas: {
      trabajo: {
        personaje_es: "la recepcionista de la empresa",
        rol_en:
          "a receptionist at a company front desk writing down a visitor's name",
        escena_es: "Llegas a una empresa y te registras en la entrada.",
        objetivo_es: "Di tu nombre y deletréalo.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "el recepcionista del hotel",
        rol_en:
          "a hotel receptionist looking for a reservation who asks you to spell your last name",
        escena_es: "Llegas al hotel y buscan tu reservación.",
        objetivo_es: "Di tu nombre y deletrea tu apellido.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "My name is Ana.",
        es: "Me llamo Ana.",
        nota: "Se dice “My name is…” o “I'm…”, nunca “I call me”.",
      },
      { en: "What's your name?", es: "¿Cómo te llamas?" },
      { en: "Nice to meet you.", es: "Mucho gusto." },
      {
        en: "How do you spell that?",
        es: "¿Cómo se escribe?",
        nota: "“Spell” es deletrear, letra por letra.",
      },
      {
        en: "Can you repeat that, please?",
        es: "¿Puede repetirlo, por favor?",
      },
      {
        en: "My last name is García.",
        es: "Mi apellido es García.",
        nota: "“Last name” es el apellido; “first name” es el nombre.",
      },
    ],
  },
  // A1, línea azul
  {
    id: "a1-quien-eres",
    nivel: "A1",
    orden: 1,
    titulo_es: "Decir quién eres y de dónde",
    meta_puedes: "Ya puedes decir quién eres y de dónde",
    pictograma: "hand",
    escenas: {
      trabajo: {
        personaje_es: "un compañero nuevo",
        rol_en:
          "Sam, a new coworker from Canada who introduces himself at the coffee machine",
        escena_es: "Conoces a Sam, un compañero nuevo, junto a la cafetera.",
        objetivo_es: "Dile tu nombre, de dónde eres y a qué te dedicas.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "una viajera en el tren",
        rol_en:
          "Emma, a friendly traveler from England sitting next to you on a train",
        escena_es: "Vas en un tren y la persona de al lado te saluda.",
        objetivo_es: "Di quién eres, de dónde eres y adónde vas.",
        pictograma: "person",
      },
    },
    frases_clave: [
      { en: "I'm from Mexico.", es: "Soy de México." },
      { en: "Where are you from?", es: "¿De dónde eres?" },
      { en: "I live in Mexico City.", es: "Vivo en la Ciudad de México." },
      {
        en: "I'm thirty years old.",
        es: "Tengo treinta años.",
        nota: "En inglés la edad se “es”: I am 30, no I have 30.",
      },
      { en: "I work in an office.", es: "Trabajo en una oficina." },
      {
        en: "I'm married and I have two kids.",
        es: "Estoy casado y tengo dos hijos.",
        nota: "“Kids” es más común que “children” al platicar.",
      },
    ],
  },
  {
    id: "a1-familia",
    nivel: "A1",
    orden: 2,
    titulo_es: "Hablar de tu familia",
    meta_puedes: "Ya puedes hablar de tu familia",
    pictograma: "group",
    escenas: {
      trabajo: {
        personaje_es: "tu compañera Mia",
        rol_en:
          "Mia, a coworker chatting with you at lunch who asks about your family",
        escena_es: "Comes con Mia y te pregunta por tu familia.",
        objetivo_es: "Cuenta quiénes son tu familia y cómo se llaman.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "el dueño de la casa",
        rol_en:
          "the friendly owner of a small guest house who asks about your family and who you travel with",
        escena_es: "Llegas a una casa de huéspedes y el dueño platica contigo.",
        objetivo_es: "Cuenta con quién viajas y cómo es tu familia.",
        pictograma: "person",
      },
    },
    frases_clave: [
      { en: "This is my family.", es: "Esta es mi familia." },
      {
        en: "I have one brother and two sisters.",
        es: "Tengo un hermano y dos hermanas.",
        nota: "“Brothers” son solo hombres; para hermanos en general di “siblings”.",
      },
      {
        en: "My mother is a teacher.",
        es: "Mi mamá es maestra.",
        nota: "Con profesiones se usa “a”: she is a teacher.",
      },
      { en: "My son is ten.", es: "Mi hijo tiene diez años." },
      { en: "Do you have kids?", es: "¿Tienes hijos?" },
      { en: "We live together.", es: "Vivimos juntos." },
    ],
  },
  {
    id: "a1-tienda",
    nivel: "A1",
    orden: 3,
    titulo_es: "Comprar en una tienda",
    meta_puedes: "Ya puedes comprar en una tienda",
    pictograma: "wallet",
    escenas: {
      trabajo: {
        personaje_es: "el vendedor de la papelería",
        rol_en:
          "a clerk at an office supply store helping a customer find things and pay",
        escena_es: "Vas a una papelería a comprar cosas para la oficina.",
        objetivo_es: "Pide dos cosas, pregunta el precio y paga.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "la vendedora de la farmacia",
        rol_en: "a pharmacy cashier helping a tourist buy sunscreen and water",
        escena_es: "Entras a una farmacia durante tu viaje.",
        objetivo_es: "Pide bloqueador y agua, pregunta cuánto es y paga.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "Do you have this in a medium?",
        es: "¿Tiene esto en mediana?",
        nota: "Las tallas son small, medium y large.",
      },
      { en: "How much is this shirt?", es: "¿Cuánto cuesta esta camisa?" },
      { en: "Can I try it on?", es: "¿Me lo puedo probar?" },
      {
        en: "I'm just looking, thanks.",
        es: "Solo estoy viendo, gracias.",
        nota: "Es la respuesta típica cuando alguien de la tienda te ofrece ayuda.",
      },
      { en: "Can I pay by card?", es: "¿Puedo pagar con tarjeta?" },
      { en: "I'll take it.", es: "Me lo llevo." },
    ],
  },
  {
    id: "a1-rutina",
    nivel: "A1",
    orden: 4,
    titulo_es: "Tu rutina diaria",
    meta_puedes: "Ya puedes contar tu rutina diaria",
    pictograma: "clock",
    escenas: {
      trabajo: {
        personaje_es: "tu compañero Ben",
        rol_en:
          "Ben, a coworker who asks about your daily schedule to plan a call",
        escena_es: "Ben quiere saber tu horario para agendar una llamada.",
        objetivo_es: "Cuenta a qué hora llegas, comes y te vas.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "tu guía de viaje",
        rol_en:
          "a tour guide planning tomorrow who asks about your usual morning routine",
        escena_es: "Tu guía planea el día de mañana contigo.",
        objetivo_es: "Cuenta a qué hora te levantas y qué haces en la mañana.",
        pictograma: "person",
      },
    },
    frases_clave: [
      { en: "I get up at six.", es: "Me levanto a las seis." },
      { en: "I take a shower and get dressed.", es: "Me baño y me visto." },
      {
        en: "I have breakfast at home.",
        es: "Desayuno en casa.",
        nota: "Para las comidas lo natural es “have”: have breakfast, have lunch.",
      },
      {
        en: "I go to work by bus.",
        es: "Voy al trabajo en camión.",
        nota: "Se dice by bus y by car, pero on foot (a pie).",
      },
      {
        en: "I usually get home at seven.",
        es: "Normalmente llego a casa a las siete.",
        nota: "Es “get home”, sin “to”.",
      },
      { en: "I go to bed at eleven.", es: "Me acuesto a las once." },
    ],
  },
  {
    id: "a1-cafeteria",
    nivel: "A1",
    orden: 5,
    titulo_es: "Pedir algo en una cafetería",
    meta_puedes: "Ya puedes pedir algo en una cafetería",
    pictograma: "food",
    escenas: {
      trabajo: {
        personaje_es: "el barista",
        rol_en: "a barista at a busy coffee shop near the office",
        escena_es: "Pasas por un café antes de entrar a trabajar.",
        objetivo_es: "Pide una bebida y algo de comer, y paga.",
        pictograma: "waiter",
      },
      viajes: {
        personaje_es: "la barista",
        rol_en: "a barista at a small coffee shop at the airport",
        escena_es: "Esperas tu vuelo y vas por un café.",
        objetivo_es: "Pide una bebida de un tamaño y algo de comer.",
        pictograma: "waiter",
      },
    },
    frases_clave: [
      {
        en: "Can I get a coffee, please?",
        es: "¿Me da un café, por favor?",
        nota: "“Can I get…” es la forma más común de pedir en EE. UU.",
      },
      {
        en: "A small latte to go.",
        es: "Un latte chico para llevar.",
        nota: "“To go” es para llevar; “for here” es para tomar aquí.",
      },
      { en: "With milk, no sugar.", es: "Con leche, sin azúcar." },
      { en: "What do you have to eat?", es: "¿Qué tiene de comer?" },
      { en: "That's all, thanks.", es: "Es todo, gracias." },
      { en: "Can I have the receipt?", es: "¿Me da el ticket?" },
    ],
  },
  // A2, línea verde
  {
    id: "a2-junta",
    nivel: "A2",
    orden: 1,
    titulo_es: "Presentarte en una junta",
    meta_puedes: "Ya puedes presentarte en una junta",
    pictograma: "hand",
    escenas: {
      trabajo: {
        personaje_es: "tu nueva jefa",
        rol_en:
          "Karen, your new manager, who opens a team meeting and asks you to introduce yourself",
        escena_es:
          "Es tu primera junta con el equipo y la jefa te da la palabra.",
        objetivo_es:
          "Preséntate, di cuál es tu puesto y en qué vas a trabajar.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "la organizadora del tour",
        rol_en:
          "the leader of a group tour who asks each traveler to introduce themselves",
        escena_es: "Empieza un tour en grupo y cada quien se presenta.",
        objetivo_es: "Preséntate, di de dónde eres y por qué viajas.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "Hi everyone, I'm Ana from the IT team.",
        es: "Hola a todos, soy Ana, del equipo de sistemas.",
      },
      {
        en: "I'm in charge of the new system.",
        es: "Estoy a cargo del sistema nuevo.",
        nota: "“In charge of” es a cargo de; siempre lleva “of”.",
      },
      {
        en: "I've worked here for two years.",
        es: "Llevo dos años trabajando aquí.",
        nota: "Para algo que sigue hasta hoy: I have worked here for…, no I work here since.",
      },
      {
        en: "I'm looking forward to working with you.",
        es: "Me da gusto trabajar con ustedes.",
        nota: "Después de “looking forward to” el verbo va con -ing.",
      },
      {
        en: "Let me introduce my coworker.",
        es: "Les presento a mi compañero de trabajo.",
      },
      {
        en: "Feel free to ask me anything.",
        es: "Con confianza, pregúntenme lo que quieran.",
      },
    ],
  },
  {
    id: "a2-trabajo",
    nivel: "A2",
    orden: 2,
    titulo_es: "Hablar de tu trabajo",
    meta_puedes: "Ya puedes hablar de tu trabajo",
    pictograma: "work",
    escenas: {
      trabajo: {
        personaje_es: "un cliente nuevo",
        rol_en:
          "Mr. Lee, a new client who asks what you do and how your team works",
        escena_es:
          "Un cliente nuevo quiere conocerte antes de empezar un proyecto.",
        objetivo_es: "Explica tu puesto, qué haces y con quién trabajas.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "un viajero en el avión",
        rol_en:
          "a curious passenger next to you on a plane who asks about your job",
        escena_es:
          "En el avión, la persona de al lado te pregunta a qué te dedicas.",
        objetivo_es: "Cuenta en qué trabajas y qué te gusta de tu trabajo.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "I work as a software developer.",
        es: "Trabajo como desarrollador de software.",
        nota: "Es “work as” más el puesto, no “work of”.",
      },
      {
        en: "I'm responsible for the web systems.",
        es: "Soy responsable de los sistemas web.",
      },
      {
        en: "Right now I'm working on a new project.",
        es: "Ahorita estoy trabajando en un proyecto nuevo.",
        nota: "“Right now” con -ing es para lo que haces estos días.",
      },
      { en: "My team has five people.", es: "Mi equipo tiene cinco personas." },
      {
        en: "I usually start at eight.",
        es: "Normalmente empiezo a las ocho.",
      },
      {
        en: "What I like most is solving problems.",
        es: "Lo que más me gusta es resolver problemas.",
        nota: "Después de “like” puedes usar -ing: I like solving problems.",
      },
    ],
  },
  {
    id: "a2-restaurante",
    nivel: "A2",
    orden: 3,
    titulo_es: "Pedir comida en un restaurante",
    meta_puedes: "Ya puedes pedir comida en un restaurante",
    pictograma: "food",
    escenas: {
      trabajo: {
        personaje_es: "el mesero",
        rol_en:
          "a waiter at a restaurant serving you and a client at a business lunch",
        escena_es: "Comes con un cliente en un restaurante.",
        objetivo_es: "Pide un plato y una bebida, y al final pide la cuenta.",
        pictograma: "waiter",
      },
      viajes: {
        personaje_es: "el mesero",
        rol_en: "a friendly waiter at Sam's Diner, a casual restaurant",
        escena_es: "Entras a un restaurante en tu viaje y el mesero se acerca.",
        objetivo_es: "Pide un plato y una bebida, y pregunta cuánto es.",
        pictograma: "waiter",
      },
    },
    frases_clave: [
      { en: "A table for two, please.", es: "Una mesa para dos, por favor." },
      {
        en: "Can I see the menu, please?",
        es: "¿Puedo ver el menú, por favor?",
      },
      {
        en: "I'd like the chicken, please.",
        es: "Quisiera el pollo, por favor.",
        nota: "“I'd like” es la forma amable de decir “I want”.",
      },
      { en: "What do you recommend?", es: "¿Qué me recomienda?" },
      {
        en: "Could we have the check, please?",
        es: "¿Nos trae la cuenta, por favor?",
        nota: "En EE. UU. es “check”; en Inglaterra, “bill”.",
      },
      {
        en: "Is the tip included?",
        es: "¿Está incluida la propina?",
        nota: "En EE. UU. la propina normal es de 15 a 20 por ciento.",
      },
    ],
  },
  {
    id: "a2-direcciones",
    nivel: "A2",
    orden: 4,
    titulo_es: "Pedir direcciones",
    meta_puedes: "Ya puedes pedir direcciones",
    pictograma: "sign",
    escenas: {
      trabajo: {
        personaje_es: "un guardia del edificio",
        rol_en:
          "a security guard in a large office building giving directions to a meeting room",
        escena_es:
          "Llegas a un edificio grande y no encuentras la sala de juntas.",
        objetivo_es: "Pregunta cómo llegar a la sala y confirma el camino.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "una señora en la calle",
        rol_en:
          "a local woman on the street giving directions to the city museum",
        escena_es:
          "No encuentras el museo y le preguntas a una señora en la calle.",
        objetivo_es: "Pregunta cómo llegar y repite el camino para confirmar.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "Excuse me, how do I get to the train station?",
        es: "Disculpe, ¿cómo llego a la estación de tren?",
      },
      { en: "Is it far from here?", es: "¿Está lejos de aquí?" },
      {
        en: "Go straight and turn left at the light.",
        es: "Siga derecho y dé vuelta a la izquierda en el semáforo.",
        nota: "“Turn left” es dar vuelta; “go straight” es seguir derecho.",
      },
      {
        en: "It's next to the bank.",
        es: "Está junto al banco.",
        nota: "“Next to” es junto a; “across from” es enfrente de.",
      },
      {
        en: "It's about ten minutes on foot.",
        es: "Está como a diez minutos a pie.",
      },
      {
        en: "Sorry, could you say that again?",
        es: "Perdón, ¿me lo puede repetir?",
      },
    ],
  },
  {
    id: "a2-hotel",
    nivel: "A2",
    orden: 5,
    titulo_es: "Reservar un hotel",
    meta_puedes: "Ya puedes reservar un hotel",
    pictograma: "bed",
    escenas: {
      trabajo: {
        personaje_es: "el recepcionista del hotel",
        rol_en:
          "a hotel receptionist on the phone taking a reservation for a business trip",
        escena_es: "Llamas a un hotel para reservar un viaje de trabajo.",
        objetivo_es:
          "Reserva dos noches, pregunta el precio y si incluye desayuno.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "la recepcionista del hotel",
        rol_en:
          "a hotel receptionist at the front desk helping a guest without a reservation",
        escena_es: "Llegas a un hotel sin reservación.",
        objetivo_es:
          "Pide un cuarto para tres noches y pregunta la hora de salida.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "I'd like to book a room for three nights.",
        es: "Quisiera reservar una habitación por tres noches.",
        nota: "“Book” es reservar; también se dice “make a reservation”.",
      },
      {
        en: "Do you have any rooms available?",
        es: "¿Tiene habitaciones disponibles?",
      },
      {
        en: "I have a reservation under García.",
        es: "Tengo una reservación a nombre de García.",
        nota: "“Under” más el apellido es a nombre de.",
      },
      { en: "Is breakfast included?", es: "¿Está incluido el desayuno?" },
      { en: "What time is check-out?", es: "¿A qué hora es la salida?" },
      {
        en: "The air conditioning isn't working.",
        es: "El aire acondicionado no funciona.",
      },
    ],
  },
  {
    id: "a2-aeropuerto",
    nivel: "A2",
    orden: 6,
    titulo_es: "En el aeropuerto",
    meta_puedes: "Ya puedes moverte en el aeropuerto",
    pictograma: "plane",
    escenas: {
      trabajo: {
        personaje_es: "la agente de la aerolínea",
        rol_en:
          "an airline check-in agent helping a passenger on a business trip",
        escena_es: "Documentas tu maleta para un viaje de trabajo.",
        objetivo_es:
          "Documenta tu maleta, pide asiento de pasillo y pregunta tu sala.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "el agente de migración",
        rol_en:
          "a friendly immigration officer asking the usual questions at the airport",
        escena_es: "Llegas a otro país y pasas por migración.",
        objetivo_es: "Di a qué vienes, cuántos días te quedas y dónde.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "Where is the check-in counter?",
        es: "¿Dónde está el mostrador para documentar?",
      },
      {
        en: "I'd like a window seat, please.",
        es: "Quisiera un asiento de ventanilla, por favor.",
        nota: "Ventanilla es “window seat”; pasillo es “aisle seat”.",
      },
      {
        en: "I only have a carry-on.",
        es: "Solo traigo equipaje de mano.",
        nota: "“Carry-on” es equipaje de mano; “checked bag” es maleta documentada.",
      },
      {
        en: "What gate does the flight leave from?",
        es: "¿De qué puerta sale el vuelo?",
      },
      { en: "My flight was delayed.", es: "Mi vuelo se retrasó." },
      {
        en: "I'm here on vacation for a week.",
        es: "Vengo de vacaciones por una semana.",
        nota: "En migración te van a preguntar a qué vienes y cuánto tiempo te quedas.",
      },
    ],
  },
  {
    id: "a2-llamada",
    nivel: "A2",
    orden: 7,
    titulo_es: "Una llamada corta",
    meta_puedes: "Ya puedes hacer una llamada corta",
    pictograma: "phone",
    escenas: {
      trabajo: {
        personaje_es: "la asistente de un cliente",
        rol_en:
          "the assistant of a client who answers the phone; the client is not available",
        escena_es: "Llamas a un cliente, pero contesta su asistente.",
        objetivo_es: "Di quién eres, deja un mensaje y tu número.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "el empleado del restaurante",
        rol_en:
          "a restaurant employee answering the phone to take a dinner reservation",
        escena_es: "Llamas a un restaurante para reservar una mesa.",
        objetivo_es: "Reserva una mesa para una hora y un número de personas.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "Hi, this is Ana. Is Mark there?",
        es: "Hola, habla Ana. ¿Está Mark?",
        nota: "Por teléfono se dice “This is Ana”, no “I am Ana”.",
      },
      {
        en: "Could I speak to the manager, please?",
        es: "¿Podría hablar con el gerente, por favor?",
      },
      { en: "Can I leave a message?", es: "¿Puedo dejar un recado?" },
      {
        en: "Sorry, I can't hear you very well.",
        es: "Perdón, no te escucho bien.",
      },
      {
        en: "Could you call me back later?",
        es: "¿Me puedes regresar la llamada más tarde?",
        nota: "“Call back” es regresar la llamada.",
      },
      { en: "Thanks for calling. Bye.", es: "Gracias por llamar. Adiós." },
    ],
  },
  {
    id: "a2-fin-de-semana",
    nivel: "A2",
    orden: 8,
    titulo_es: "Contar qué hiciste el fin de semana",
    meta_puedes: "Ya puedes contar qué hiciste el fin de semana",
    pictograma: "calendar",
    escenas: {
      trabajo: {
        personaje_es: "tu compañero Alex",
        rol_en:
          "Alex, a coworker who asks about your weekend on Monday morning",
        escena_es: "Es lunes y Alex te pregunta qué hiciste el fin de semana.",
        objetivo_es: "Cuenta dos cosas que hiciste y pregúntale por el suyo.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "un amigo del hostal",
        rol_en:
          "a friendly traveler at a hostel who asks what you did over the weekend in the city",
        escena_es:
          "En el hostal, otro viajero te pregunta por tu fin de semana.",
        objetivo_es: "Cuenta adónde fuiste y qué te gustó más.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "What did you do last weekend?",
        es: "¿Qué hiciste el fin de semana pasado?",
      },
      {
        en: "I went to the beach with my family.",
        es: "Fui a la playa con mi familia.",
        nota: "“Go” en pasado es “went”, no “goed”.",
      },
      {
        en: "I stayed home and watched a movie.",
        es: "Me quedé en casa y vi una película.",
        nota: "Muchos verbos en pasado terminan en -ed: stayed, watched.",
      },
      {
        en: "We had dinner at my parents' house.",
        es: "Cenamos en casa de mis papás.",
      },
      { en: "It was really fun.", es: "Estuvo muy divertido." },
      {
        en: "I didn't do much, I just rested.",
        es: "No hice mucho, solo descansé.",
        nota: "Con “didn't” el verbo regresa a su forma normal: didn't do, no didn't did.",
      },
    ],
  },
  // B1, línea naranja
  {
    id: "b1-opinion",
    nivel: "B1",
    orden: 1,
    titulo_es: "Dar tu opinión en una junta",
    meta_puedes: "Ya puedes dar tu opinión en una junta",
    pictograma: "work",
    escenas: {
      trabajo: {
        personaje_es: "tu jefe",
        rol_en:
          "David, your manager, who asks the team's opinion about moving a project deadline",
        escena_es:
          "En una junta, tu jefe pregunta si conviene mover la fecha de entrega.",
        objetivo_es: "Da tu opinión, explica por qué y propone una opción.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "tu compañera de viaje",
        rol_en:
          "Sofia, a travel friend who asks your opinion about two different plans for tomorrow",
        escena_es: "Planean el día de mañana y hay dos opciones.",
        objetivo_es:
          "Da tu opinión sobre los dos planes y lleguen a un acuerdo.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "In my opinion, we should test it first.",
        es: "En mi opinión, deberíamos probarlo primero.",
      },
      {
        en: "I see your point, but I'm not sure.",
        es: "Entiendo tu punto, pero no estoy seguro.",
      },
      {
        en: "I agree with you on that.",
        es: "En eso estoy de acuerdo contigo.",
        nota: "Es “I agree”, no “I am agree”.",
      },
      {
        en: "What if we tried a different approach?",
        es: "¿Y si probamos otro enfoque?",
        nota: "“What if we…” es una forma suave de proponer algo.",
      },
      { en: "Could I add something here?", es: "¿Puedo agregar algo aquí?" },
      {
        en: "Let's focus on the main problem.",
        es: "Enfoquémonos en el problema principal.",
      },
    ],
  },
  {
    id: "b1-queja",
    nivel: "B1",
    orden: 2,
    titulo_es: "Resolver un problema (una queja)",
    meta_puedes: "Ya puedes resolver un problema o hacer una queja",
    pictograma: "chat",
    escenas: {
      trabajo: {
        personaje_es: "el técnico de soporte",
        rol_en:
          "a tech support agent on a call about a work laptop that stopped working",
        escena_es:
          "Tu computadora del trabajo dejó de funcionar y llamas a soporte.",
        objetivo_es: "Explica el problema, cuándo empezó y pide una solución.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "el gerente del hotel",
        rol_en:
          "a hotel manager handling a complaint about a noisy room with no hot water",
        escena_es: "Tu cuarto de hotel tiene ruido y no hay agua caliente.",
        objetivo_es:
          "Explica el problema con calma y pide un cambio de cuarto.",
        pictograma: "person",
      },
    },
    frases_clave: [
      { en: "I'd like to make a complaint.", es: "Quisiera poner una queja." },
      {
        en: "I ordered this last week and it hasn't arrived.",
        es: "Lo pedí la semana pasada y no ha llegado.",
        nota: "Es “hasn't arrived” porque hasta hoy todavía no llega.",
      },
      { en: "This isn't what I ordered.", es: "Esto no es lo que pedí." },
      {
        en: "Could you give me a refund?",
        es: "¿Me podría hacer un reembolso?",
        nota: "“Refund” es que te regresen el dinero; “exchange” es cambiarlo por otro.",
      },
      {
        en: "I understand, but this is the second time.",
        es: "Entiendo, pero es la segunda vez.",
      },
      {
        en: "What can you do to fix this?",
        es: "¿Qué puede hacer para solucionarlo?",
      },
    ],
  },
  {
    id: "b1-proceso",
    nivel: "B1",
    orden: 3,
    titulo_es: "Explicar un proceso de tu trabajo",
    meta_puedes: "Ya puedes explicar un proceso de tu trabajo",
    pictograma: "work",
    escenas: {
      trabajo: {
        personaje_es: "una compañera nueva",
        rol_en:
          "Nina, a new team member who asks you to explain how a process works on your team",
        escena_es: "Nina acaba de entrar al equipo y no conoce el proceso.",
        objetivo_es: "Explica los pasos en orden y revisa que te entendió.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "un turista en la estación",
        rol_en:
          "a confused tourist at a train station who asks how to buy a ticket at the machine",
        escena_es: "Un turista no sabe usar la máquina de boletos.",
        objetivo_es: "Explícale en orden los pasos para comprar su boleto.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "First, the user fills out the form.",
        es: "Primero, el usuario llena el formulario.",
        nota: "“Fill out” es llenar un formulario.",
      },
      {
        en: "Then the request goes to the manager for approval.",
        es: "Luego la solicitud pasa al gerente para que la apruebe.",
      },
      {
        en: "Once it's approved, we process the payment.",
        es: "Una vez aprobada, procesamos el pago.",
        nota: "Después de “once” va presente, no futuro: once it's approved.",
      },
      {
        en: "If something is missing, the request is sent back.",
        es: "Si falta algo, la solicitud se regresa.",
      },
      {
        en: "The whole process takes about three days.",
        es: "Todo el proceso tarda como tres días.",
      },
      {
        en: "Does that make sense?",
        es: "¿Se entiende?",
        nota: "Es la pregunta común para confirmar que te entendieron.",
      },
    ],
  },
  {
    id: "b1-llamadas",
    nivel: "B1",
    orden: 4,
    titulo_es: "Llamadas de trabajo",
    meta_puedes: "Ya puedes atender llamadas de trabajo",
    pictograma: "phone",
    escenas: {
      trabajo: {
        personaje_es: "un proveedor",
        rol_en:
          "Mark, a supplier who calls about a delayed delivery and wants to reschedule",
        escena_es: "Un proveedor te llama porque su entrega se va a retrasar.",
        objetivo_es:
          "Entiende el problema, acuerda una fecha nueva y confírmala.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "la agente de la aerolínea",
        rol_en:
          "an airline agent on the phone helping you change a canceled flight",
        escena_es: "Cancelaron tu vuelo y llamas a la aerolínea.",
        objetivo_es: "Explica tu situación y acuerda un vuelo nuevo.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "I'm calling about the meeting on Thursday.",
        es: "Te llamo por la junta del jueves.",
        nota: "“Calling about” es llamar por un tema.",
      },
      {
        en: "Can we move the call to tomorrow?",
        es: "¿Podemos pasar la llamada a mañana?",
      },
      {
        en: "Let me check my calendar and get back to you.",
        es: "Déjame revisar mi agenda y te confirmo.",
        nota: "“Get back to you” es te respondo después.",
      },
      { en: "You're on mute.", es: "Estás en silencio." },
      { en: "Can everyone see my screen?", es: "¿Todos ven mi pantalla?" },
      {
        en: "I'll send you a summary by email.",
        es: "Te mando un resumen por correo.",
      },
    ],
  },
  {
    id: "b1-experiencia",
    nivel: "B1",
    orden: 5,
    titulo_es: "Contar una experiencia",
    meta_puedes: "Ya puedes contar una experiencia",
    pictograma: "chat",
    escenas: {
      trabajo: {
        personaje_es: "la entrevistadora",
        rol_en:
          "an interviewer who asks you to describe a difficult situation at work and how you solved it",
        escena_es: "Estás en una entrevista de trabajo.",
        objetivo_es:
          "Cuenta un problema que resolviste: qué pasó, qué hiciste y cómo terminó.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "un amigo nuevo",
        rol_en:
          "a friendly local at a café who asks about the best trip you have ever taken",
        escena_es:
          "Platicas con alguien en un café y te pregunta por tus viajes.",
        objetivo_es:
          "Cuenta tu mejor viaje: adónde fuiste, qué pasó y qué aprendiste.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "Let me tell you what happened.",
        es: "Déjame contarte lo que pasó.",
      },
      {
        en: "It was the first time I had traveled alone.",
        es: "Era la primera vez que viajaba solo.",
        nota: "“Had traveled” porque pasó antes de otro momento del pasado.",
      },
      {
        en: "At first I was nervous, but then it was fine.",
        es: "Al principio estaba nervioso, pero luego todo salió bien.",
      },
      { en: "I'll never forget that day.", es: "Nunca voy a olvidar ese día." },
      {
        en: "If I had known, I would have gone earlier.",
        es: "Si hubiera sabido, habría ido antes.",
        nota: "“If I had known…, I would have…” es para lo que ya no se puede cambiar.",
      },
      {
        en: "Looking back, it was a great experience.",
        es: "Viéndolo ahora, fue una gran experiencia.",
      },
    ],
  },
  {
    id: "b1-viaje",
    nivel: "B1",
    orden: 6,
    titulo_es: "Planear un viaje",
    meta_puedes: "Ya puedes planear un viaje",
    pictograma: "plane",
    escenas: {
      trabajo: {
        personaje_es: "tu compañero de equipo",
        rol_en:
          "Chris, a teammate planning a business trip with you to visit a client",
        escena_es: "Tienen que visitar a un cliente en otra ciudad.",
        objetivo_es:
          "Pónganse de acuerdo en las fechas, el transporte y el hotel.",
        pictograma: "person",
      },
      viajes: {
        personaje_es: "la agente de viajes",
        rol_en: "a travel agent helping you plan a one-week vacation",
        escena_es: "Vas a una agencia para planear una semana de vacaciones.",
        objetivo_es: "Explica qué buscas y tu presupuesto, y elige un plan.",
        pictograma: "person",
      },
    },
    frases_clave: [
      {
        en: "We're planning a trip to New York in March.",
        es: "Estamos planeando un viaje a Nueva York en marzo.",
      },
      {
        en: "Which would you recommend, the train or the plane?",
        es: "¿Qué me recomiendas, el tren o el avión?",
      },
      {
        en: "It depends on the price.",
        es: "Depende del precio.",
        nota: "Es “depends on”, no “depends of”.",
      },
      {
        en: "We should book the hotel in advance.",
        es: "Deberíamos reservar el hotel con anticipación.",
      },
      {
        en: "I'd rather stay somewhere central.",
        es: "Prefiero quedarme en algún lugar céntrico.",
        nota: "“I'd rather” es preferiría; va con el verbo sin “to”.",
      },
      {
        en: "Let's make a list of what to pack.",
        es: "Hagamos una lista de lo que hay que empacar.",
      },
    ],
  },
];

// Si el id no existe (por ejemplo, una meta que se renombró), se regresa la primera
export function getUnit(id: string): Unit {
  return units.find((u) => u.id === id) ?? units[0];
}

// La escena de hoy según el motivo. Con "ambos" (o sin motivo) se alternan: día par trabajo, impar viajes.
export function sceneFor(
  unit: Unit,
  motive: "trabajo" | "viajes" | "ambos" | null,
  date: string,
): Situation {
  if (motive === "trabajo") return unit.escenas.trabajo;
  if (motive === "viajes") return unit.escenas.viajes;
  return Number(date.slice(8, 10)) % 2 === 0
    ? unit.escenas.trabajo
    : unit.escenas.viajes;
}
