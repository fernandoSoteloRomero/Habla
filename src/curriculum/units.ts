// Temario v1: cada meta (unidad) es una estación de su línea (spec 5.1 y 7.2).
// Cada meta trae 6 frases clave: Aprender (fase 3) las enseña de 4 en 4 y entran al repaso.
// La situación, el personaje y los criterios de aprobación se agregan en las fases 4 y 5.
import type { PictogramName } from "../common/PictogramTypes.ts";
import type { LevelId } from "./levels.ts";

// Frase clave: inglés, español y, si hace falta, una nota corta en español
export interface KeyPhrase {
  en: string;
  es: string;
  nota?: string;
}

export interface Unit {
  id: string;
  nivel: LevelId;
  orden: number;
  titulo_es: string;
  meta_puedes: string;
  pictograma: PictogramName;
  frases_clave: KeyPhrase[];
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
