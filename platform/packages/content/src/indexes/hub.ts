import type { HubDestination, SearchableKind } from "./types.js";

/** Stable hub route contract from docs/04 for typed search results. */
export function hubDestinationFor(
  kind: SearchableKind,
  id: string,
): HubDestination {
  switch (kind) {
    case "Lexeme":
      return { hub: "vocabulary", path: `/vocabulary/${id}` };
    case "Verb":
      return { hub: "verbs", path: `/verbs/${id}` };
    case "GrammarConcept":
      return { hub: "grammar", path: `/grammar/${id}` };
    case "PhrasePattern":
    case "QAPair":
      return { hub: "phrases", path: `/phrases/${id}` };
    case "Dialogue":
    case "ListeningAsset":
      return { hub: "listening", path: `/listening/${id}` };
    case "Collection":
      return { hub: "concepts", path: `/concepts/${id}` };
    case "Lesson": {
      const slug = id.includes(":") ? id.slice(id.indexOf(":") + 1) : id;
      return { hub: "lessons", path: `/lessons/${slug}` };
    }
    case "LearningActivity":
      return { hub: "lessons", path: `/lessons/activity/${id}` };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
