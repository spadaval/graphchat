export const BASE_TYPE_IDS = [
  "general",
  "story",
  "person",
  "place",
  "organization",
  "culture",
  "magic_system",
  "technology",
  "natural_law",
  "species",
] as const;

export type BaseTypeId = (typeof BASE_TYPE_IDS)[number];

export interface DocumentTypeDefinitionV2 {
  id: BaseTypeId;
  name: string;
  description: string;
}

export interface TemplateDefinition {
  id: string;
  baseTypeId: BaseTypeId;
  name: string;
  description: string;
}

const BASE_TYPE_SET = new Set<string>(BASE_TYPE_IDS);

export const DOCUMENT_TYPES_V2: Record<BaseTypeId, DocumentTypeDefinitionV2> = {
  general: {
    id: "general",
    name: "General",
    description: "Unstructured worldbuilding notes.",
  },
  story: {
    id: "story",
    name: "Story",
    description: "Narratives, scenes, and plot-focused documents.",
  },
  person: {
    id: "person",
    name: "Person",
    description: "Individuals, identities, and character records.",
  },
  place: {
    id: "place",
    name: "Place",
    description: "Geographic or spatial entities.",
  },
  organization: {
    id: "organization",
    name: "Organization",
    description: "Institutions, factions, and formal groups.",
  },
  culture: {
    id: "culture",
    name: "Culture",
    description: "Shared beliefs, customs, and social identities.",
  },
  magic_system: {
    id: "magic_system",
    name: "Magic System",
    description: "Rules, traditions, or systems of magic.",
  },
  technology: {
    id: "technology",
    name: "Technology",
    description: "Tools, inventions, and technical frameworks.",
  },
  natural_law: {
    id: "natural_law",
    name: "Natural Law",
    description: "Physical or metaphysical constraints of the world.",
  },
  species: {
    id: "species",
    name: "Species",
    description: "Biological, synthetic, or hybrid life categories.",
  },
};

export const TEMPLATE_DEFINITIONS: Record<string, TemplateDefinition> = {
  religion: {
    id: "religion",
    baseTypeId: "organization",
    name: "Religion",
    description: "A faith institution or organized religion.",
  },
  guild: {
    id: "guild",
    baseTypeId: "organization",
    name: "Guild",
    description: "A professional or trade guild.",
  },
  corporation: {
    id: "corporation",
    baseTypeId: "organization",
    name: "Corporation",
    description: "A commercial organization.",
  },
  military_order: {
    id: "military_order",
    baseTypeId: "organization",
    name: "Military Order",
    description: "A disciplined military organization.",
  },
  government_agency: {
    id: "government_agency",
    baseTypeId: "organization",
    name: "Government Agency",
    description: "An administrative arm of government.",
  },
  rebel_faction: {
    id: "rebel_faction",
    baseTypeId: "organization",
    name: "Rebel Faction",
    description: "A resistance or insurgent group.",
  },
  city: {
    id: "city",
    baseTypeId: "place",
    name: "City",
    description: "An urban settlement.",
  },
  nation_state: {
    id: "nation_state",
    baseTypeId: "place",
    name: "Nation State",
    description: "A sovereign political territory.",
  },
  region: {
    id: "region",
    baseTypeId: "place",
    name: "Region",
    description: "A broad geographical region.",
  },
  planet: {
    id: "planet",
    baseTypeId: "place",
    name: "Planet",
    description: "A planetary body.",
  },
  station_ship: {
    id: "station_ship",
    baseTypeId: "place",
    name: "Station/Ship",
    description: "A mobile or fixed space habitat.",
  },
  landmark: {
    id: "landmark",
    baseTypeId: "place",
    name: "Landmark",
    description: "A notable location.",
  },
  ruler: {
    id: "ruler",
    baseTypeId: "person",
    name: "Ruler",
    description: "A political or symbolic leader.",
  },
  hero: {
    id: "hero",
    baseTypeId: "person",
    name: "Hero",
    description: "A protagonist or culturally celebrated figure.",
  },
  antagonist: {
    id: "antagonist",
    baseTypeId: "person",
    name: "Antagonist",
    description: "A principal opposition figure.",
  },
  deity: {
    id: "deity",
    baseTypeId: "person",
    name: "Deity",
    description: "A divine personhood.",
  },
  historical_figure: {
    id: "historical_figure",
    baseTypeId: "person",
    name: "Historical Figure",
    description: "A notable figure in world history.",
  },
  religion_tradition_set: {
    id: "religion_tradition_set",
    baseTypeId: "culture",
    name: "Religion/Tradition Set",
    description: "A grouped set of faith traditions.",
  },
  ethnic_culture: {
    id: "ethnic_culture",
    baseTypeId: "culture",
    name: "Ethnic Culture",
    description: "Culture associated with ancestry and heritage.",
  },
  diaspora_culture: {
    id: "diaspora_culture",
    baseTypeId: "culture",
    name: "Diaspora Culture",
    description: "Culture shaped through migration and dispersal.",
  },
  hard_rule: {
    id: "hard_rule",
    baseTypeId: "magic_system",
    name: "Hard Rule",
    description: "A tightly constrained magic system.",
  },
  soft_mythic: {
    id: "soft_mythic",
    baseTypeId: "magic_system",
    name: "Soft Mythic",
    description: "A symbolic or loosely defined magic system.",
  },
  ritual: {
    id: "ritual",
    baseTypeId: "magic_system",
    name: "Ritual",
    description: "A practice-based magical framework.",
  },
  artifact_driven: {
    id: "artifact_driven",
    baseTypeId: "magic_system",
    name: "Artifact Driven",
    description: "Magic channeled via objects.",
  },
  transport: {
    id: "transport",
    baseTypeId: "technology",
    name: "Transport",
    description: "Travel and movement technology.",
  },
  weapon_system: {
    id: "weapon_system",
    baseTypeId: "technology",
    name: "Weapon System",
    description: "Offensive or defensive weapon technology.",
  },
  communication: {
    id: "communication",
    baseTypeId: "technology",
    name: "Communication",
    description: "Information transmission technology.",
  },
  biotech: {
    id: "biotech",
    baseTypeId: "technology",
    name: "Biotech",
    description: "Biological engineering technology.",
  },
  ai_synthetic: {
    id: "ai_synthetic",
    baseTypeId: "technology",
    name: "AI/Synthetic",
    description: "Artificial intelligence and synthetic systems.",
  },
  physics_variant: {
    id: "physics_variant",
    baseTypeId: "natural_law",
    name: "Physics Variant",
    description: "A custom law of physics.",
  },
  metaphysical_rule: {
    id: "metaphysical_rule",
    baseTypeId: "natural_law",
    name: "Metaphysical Rule",
    description: "A metaphysical world constraint.",
  },
  cosmological_constraint: {
    id: "cosmological_constraint",
    baseTypeId: "natural_law",
    name: "Cosmological Constraint",
    description: "A rule shaping cosmic structure.",
  },
  afterlife_rule: {
    id: "afterlife_rule",
    baseTypeId: "natural_law",
    name: "Afterlife Rule",
    description: "A rule governing post-death existence.",
  },
  biological: {
    id: "biological",
    baseTypeId: "species",
    name: "Biological",
    description: "Naturally evolved species.",
  },
  synthetic: {
    id: "synthetic",
    baseTypeId: "species",
    name: "Synthetic",
    description: "Artificially created species.",
  },
  uplifted: {
    id: "uplifted",
    baseTypeId: "species",
    name: "Uplifted",
    description: "Species elevated beyond baseline capacities.",
  },
  hybrid_lineage: {
    id: "hybrid_lineage",
    baseTypeId: "species",
    name: "Hybrid Lineage",
    description: "Species with mixed origins.",
  },
};

const CANONICAL_NAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isBaseTypeId = (value: string): value is BaseTypeId => {
  return BASE_TYPE_SET.has(value);
};

export const canonicalizeName = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "untitled";
};

export const normalizeTag = (tag: string): string => canonicalizeName(tag);

export const normalizeTags = (tags: string[]): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const rawTag of tags) {
    const normalized = normalizeTag(rawTag);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
};

export const getTemplateById = (
  templateId?: string,
): TemplateDefinition | undefined => {
  if (!templateId) return undefined;
  return TEMPLATE_DEFINITIONS[templateId];
};

export const resolveBaseTypeAndTemplate = (
  value?: string,
): {
  baseTypeId: BaseTypeId;
  templateId?: string;
} => {
  if (!value) {
    return { baseTypeId: "general" };
  }

  if (isBaseTypeId(value)) {
    return { baseTypeId: value };
  }

  const template = getTemplateById(value);
  if (template) {
    return {
      baseTypeId: template.baseTypeId,
      templateId: template.id,
    };
  }

  return { baseTypeId: "general" };
};

export const ensureTemplateMatchesBaseType = (
  baseTypeId: BaseTypeId,
  templateId?: string,
): string | undefined => {
  if (!templateId) return undefined;
  const template = getTemplateById(templateId);
  if (!template || template.baseTypeId !== baseTypeId) {
    return undefined;
  }
  return templateId;
};

export const isInternalCanonicalLinkTarget = (href: string): boolean => {
  if (!href) return false;
  const trimmed = href.trim();
  if (!trimmed) return false;

  // Ignore absolute/scheme links and anchors
  if (
    trimmed.startsWith("#") ||
    trimmed.includes("://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return false;
  }

  return CANONICAL_NAME_REGEX.test(trimmed);
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const INTERNAL_LINK_REGEX = /\[[^\]]*\]\(([^)\s]+)\)/g;

export const extractInternalCanonicalLinks = (markdown: string): string[] => {
  const matches = markdown.matchAll(INTERNAL_LINK_REGEX);
  const result: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const target = match[1];
    if (!isInternalCanonicalLinkTarget(target) || seen.has(target)) {
      continue;
    }

    seen.add(target);
    result.push(target);
  }

  return result;
};

export const rewriteInternalCanonicalLinks = (
  markdown: string,
  previousCanonicalName: string,
  nextCanonicalName: string,
): string => {
  if (!markdown || previousCanonicalName === nextCanonicalName) {
    return markdown;
  }

  const oldTarget = escapeRegex(previousCanonicalName);
  const linkPattern = new RegExp(`\\[([^\\]]*)\\]\\(${oldTarget}\\)`, "g");
  return markdown.replace(linkPattern, (_match, label: string) => {
    return `[${label}](${nextCanonicalName})`;
  });
};
