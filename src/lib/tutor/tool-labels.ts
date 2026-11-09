/** Libellés courts des appels d'outils (sans dépendance : utilisable côté navigateur). */
export function describeToolCall(name: string, input: unknown): string {
  const i = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case "analyser_poutre":
      return `Analyse d'une poutre de ${i.longueur ?? "?"} m`;
    case "analyser_portique":
      return `Analyse d'un portique ${i.portee ?? "?"} × ${i.hauteur ?? "?"} m`;
    case "analyser_treillis":
      return `Analyse d'un treillis (${Array.isArray(i.barres) ? i.barres.length : "?"} barres)`;
    case "caracteristiques_section":
      return `Caractéristiques de section (${i.forme ?? "?"})`;
    case "calculer":
      return `Calcul : ${String(i.expression ?? "").slice(0, 60)}`;
    default:
      return name;
  }
}
