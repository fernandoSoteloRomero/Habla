// Avisos cuando la IA no pudo preparar una conversación o su resumen (diseño: avisos):
// qué pasó y qué sí se puede hacer. Los usan la sesión de hoy y "Seguir practicando".
import type { SessionClientError } from "@/Services/interfaces/Session/SessionInterface";

export interface Notice {
  tone: string;
  icon: string;
  title: string;
  body: string;
  // Texto del botón para volver a intentar; vacío = no tiene caso reintentar
  retry: string;
}

export function aiNotice(
  code: SessionClientError,
  budget: { mes: string; siguiente: string },
): Notice {
  switch (code) {
    case "presupuesto":
      return {
        tone: "bg-yellow",
        icon: "#i-wallet",
        title: `Se terminó el presupuesto de IA de ${budget.mes}`,
        body: `Vuelve el ${budget.siguiente}. El repaso sigue disponible.`,
        retry: "",
      };
    case "limite":
      return {
        tone: "bg-concrete",
        icon: "#i-clock",
        title: "Ya practicaste mucho hoy",
        body: "Vuelve mañana o repasa tus frases.",
        retry: "",
      };
    case "sin-conexion":
      return {
        tone: "bg-concrete",
        icon: "#i-nowifi",
        title: "Sin conexión a internet",
        body: "Lo que hiciste hoy está guardado. Revisa tu conexión y vuelve a intentar.",
        retry: "Intentar de nuevo",
      };
    case "sesion":
      return {
        tone: "bg-concrete",
        icon: "#i-group",
        title: "Tu sesión se cerró",
        body: "Vuelve a entrar con Google para seguir.",
        retry: "",
      };
    default:
      return {
        tone: "bg-concrete",
        icon: "#i-clock",
        title: "La IA no respondió",
        body: "Lo intentamos dos veces. Prueba de nuevo en un minuto.",
        retry: "Intentar de nuevo",
      };
  }
}
