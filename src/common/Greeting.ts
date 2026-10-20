// Saludo de la pantalla Hoy: "Buenas tardes, Fernando."
// Días de 5:00 a 11:59, tardes de 12:00 a 18:59, noches el resto.
export function getGreeting(now: Date, name: string): string {
  const hour = now.getHours();
  let greeting = "Buenas noches";
  if (hour >= 5 && hour < 12) greeting = "Buenos días";
  else if (hour >= 12 && hour < 19) greeting = "Buenas tardes";

  // Google a veces guarda el nombre en minúsculas ("fernando Sotelo")
  const word = name.trim().split(/\s+/)[0];
  const firstName = word.charAt(0).toUpperCase() + word.slice(1);
  return firstName ? `${greeting}, ${firstName}.` : `${greeting}.`;
}
