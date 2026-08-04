export type SearchScope = "all" | "modules" | "records" | "ai";

export interface ParsedSearchQuery {
  scope: SearchScope;
  cleanQuery: string;
  isAI: boolean;
}

export function parseSearchQuery(input: string): ParsedSearchQuery {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith("ai:") ||
    lower.startsWith(">") ||
    lower.startsWith("ask:") ||
    lower.startsWith("@ai")
  ) {
    let clean = trimmed;
    if (lower.startsWith("ai:")) clean = trimmed.slice(3).trim();
    else if (lower.startsWith(">")) clean = trimmed.slice(1).trim();
    else if (lower.startsWith("ask:")) clean = trimmed.slice(4).trim();
    else if (lower.startsWith("@ai")) clean = trimmed.slice(3).trim();

    return {
      scope: "ai",
      cleanQuery: clean,
      isAI: true,
    };
  }

  if (
    lower.startsWith("m:") ||
    lower.startsWith("module:") ||
    lower.startsWith("modules:")
  ) {
    let clean = trimmed;
    if (lower.startsWith("m:")) clean = trimmed.slice(2).trim();
    else if (lower.startsWith("module:")) clean = trimmed.slice(7).trim();
    else if (lower.startsWith("modules:")) clean = trimmed.slice(8).trim();

    return {
      scope: "modules",
      cleanQuery: clean,
      isAI: false,
    };
  }

  if (
    lower.startsWith("r:") ||
    lower.startsWith("record:") ||
    lower.startsWith("records:") ||
    lower.startsWith("#")
  ) {
    let clean = trimmed;
    if (lower.startsWith("r:")) clean = trimmed.slice(2).trim();
    else if (lower.startsWith("record:")) clean = trimmed.slice(7).trim();
    else if (lower.startsWith("records:")) clean = trimmed.slice(8).trim();
    else if (lower.startsWith("#")) clean = trimmed.slice(1).trim();

    return {
      scope: "records",
      cleanQuery: clean,
      isAI: false,
    };
  }

  return {
    scope: "all",
    cleanQuery: trimmed,
    isAI: false,
  };
}
