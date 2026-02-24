import type { BaseTypeId } from "./document-model";

export interface RelationMetadata {
  status?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  strength?: number;
  provenance?: string;
  confidence?: number;
}

export interface RelationTypeDefinition {
  id: string;
  from: (BaseTypeId | "*")[];
  to: (BaseTypeId | "*")[];
  symmetric: boolean;
}

export interface RelationRecord {
  id: string;
  typeId: string;
  sourceId: string;
  targetId: string;
  metadata: RelationMetadata;
  createdAt: string;
  updatedAt: string;
}

export const RELATION_TYPE_DEFINITIONS: Record<string, RelationTypeDefinition> =
  {
    belongs_to: {
      id: "belongs_to",
      from: ["person"],
      to: ["organization"],
      symmetric: false,
    },
    member_of: {
      id: "member_of",
      from: ["person", "species"],
      to: ["organization"],
      symmetric: false,
    },
    affiliated_with: {
      id: "affiliated_with",
      from: ["organization"],
      to: ["organization"],
      symmetric: true,
    },
    governs: {
      id: "governs",
      from: ["organization", "person"],
      to: ["place"],
      symmetric: false,
    },
    located_in: {
      id: "located_in",
      from: ["place", "organization"],
      to: ["place"],
      symmetric: false,
    },
    part_of: {
      id: "part_of",
      from: ["place", "organization", "species"],
      to: ["place", "organization", "species"],
      symmetric: false,
    },
    originated_in: {
      id: "originated_in",
      from: ["culture", "species", "technology"],
      to: ["place", "culture"],
      symmetric: false,
    },
    practices: {
      id: "practices",
      from: ["person", "organization", "culture"],
      to: ["magic_system"],
      symmetric: false,
    },
    uses: {
      id: "uses",
      from: ["person", "organization", "species"],
      to: ["technology", "magic_system"],
      symmetric: false,
    },
    follows_law: {
      id: "follows_law",
      from: ["*"],
      to: ["natural_law"],
      symmetric: false,
    },
    constrained_by: {
      id: "constrained_by",
      from: ["*"],
      to: ["natural_law"],
      symmetric: false,
    },
    conflicts_with: {
      id: "conflicts_with",
      from: ["person", "organization", "species", "culture"],
      to: ["person", "organization", "species", "culture"],
      symmetric: true,
    },
    allied_with: {
      id: "allied_with",
      from: ["organization", "species", "culture"],
      to: ["organization", "species", "culture"],
      symmetric: true,
    },
  };

const isTypeAllowed = (
  allowed: (BaseTypeId | "*")[],
  actual: BaseTypeId,
): boolean => {
  return allowed.includes("*") || allowed.includes(actual);
};

export const validateRelationEndpointTypes = (
  typeId: string,
  sourceBaseTypeId: BaseTypeId,
  targetBaseTypeId: BaseTypeId,
): { valid: true } | { valid: false; reason: string } => {
  const relationType = RELATION_TYPE_DEFINITIONS[typeId];
  if (!relationType) {
    return {
      valid: false,
      reason: `Unknown relation type: ${typeId}`,
    };
  }

  const sourceAllowed = isTypeAllowed(relationType.from, sourceBaseTypeId);
  const targetAllowed = isTypeAllowed(relationType.to, targetBaseTypeId);

  if (sourceAllowed && targetAllowed) {
    return { valid: true };
  }

  if (!sourceAllowed) {
    return {
      valid: false,
      reason: `Relation ${typeId} does not allow source base type ${sourceBaseTypeId}`,
    };
  }

  return {
    valid: false,
    reason: `Relation ${typeId} does not allow target base type ${targetBaseTypeId}`,
  };
};
