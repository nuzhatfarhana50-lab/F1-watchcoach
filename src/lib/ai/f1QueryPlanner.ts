import type { RaceFixtureCollection } from "@/lib/f1/domain/types";

import {
  f1QueryPlanSchema,
  type F1ConversationTurn,
  type F1EntityReference,
  type F1QueryIntent,
  type F1QueryPlan,
  type F1Scope,
} from "./raceQuestionSchemas";

const CURRENT_PATTERN = /\b(current|currently|today|tonight|this season|latest|right now|recent|next race|last race|yesterday|now)\b/i;
const HISTORICAL_PATTERN = /\b(history|historical|career|formerly|previously|first|last|leave|left|joined|moved|between|in (?:19|20)\d{2})\b/i;
const PRONOUN_PATTERN = /\b(he|him|his|she|her|they|them|their|that driver|that team|that race|that overtake|that strategy|this penalty|those wins|one of those)\b/i;
const EXPLICIT_OUT_OF_SCOPE_PATTERN = /\b(make (?:me )?(?:noodles|pasta|rice)|recipe|python|javascript|sorting an array|capital of|nba|nfl|cricket|investment advice|stock tips|road[- ]car automatic gearbox|favorite food|favourite food|entire oil business|other cars does pirelli)\b/i;
const DRIVER_CREDENTIAL_PATTERN = /\b(qualifications?|credentials?|achievements?|accomplishments?|honou?rs?)\b/i;
const QUALIFYING_RECORD_PATTERN = /\b(qualifying|qualification results?|pole positions?|poles?)\b/i;

const DRIVER_ALIASES = [
  ["Carlos Sainz", "sainz", ["carlos sainz", "carlos", "sainz"]],
  ["Charles Leclerc", "leclerc", ["charles leclerc", "leclerc"]],
  ["Lewis Hamilton", "hamilton", ["lewis hamilton", "hamilton"]],
  ["Max Verstappen", "max_verstappen", ["max verstappen", "verstappen"]],
  ["Fernando Alonso", "alonso", ["fernando alonso", "alonso"]],
  ["Sebastian Vettel", "vettel", ["sebastian vettel", "seb", "vettel"]],
  ["Michael Schumacher", "michael_schumacher", ["michael schumacher", "schumacher", "schumi"]],
  ["Ayrton Senna", "senna", ["ayrton senna", "senna"]],
  ["Alain Prost", "prost", ["alain prost", "prost"]],
  ["Sergio Pérez", "perez", ["sergio perez", "sergio pérez", "perez", "pérez", "checo"]],
  ["Lando Norris", "norris", ["lando norris", "norris"]],
  ["Daniel Ricciardo", "ricciardo", ["daniel ricciardo", "ricciardo"]],
  ["Nico Rosberg", "rosberg", ["nico rosberg", "rosberg"]],
  ["Kimi Räikkönen", "raikkonen", ["kimi raikkonen", "kimi räikkönen", "raikkonen", "räikkönen"]],
  ["Oscar Piastri", "piastri", ["oscar piastri", "piastri"]],
  ["George Russell", "russell", ["george russell", "russell"]],
] as const;

const TEAM_ALIASES = [
  ["Scuderia Ferrari", "ferrari", ["scuderia ferrari", "ferrari"]],
  ["Mercedes", "mercedes", ["mercedes", "merc"]],
  ["Red Bull Racing", "red_bull", ["red bull racing", "red bull"]],
  ["McLaren", "mclaren", ["mclaren"]],
  ["Williams", "williams", ["williams"]],
  ["Aston Martin", "aston_martin", ["aston martin"]],
  ["Alpine", "alpine", ["alpine"]],
  ["Renault", "renault", ["renault"]],
  ["Toro Rosso", "toro_rosso", ["toro rosso"]],
  ["AlphaTauri", "alphatauri", ["alphatauri", "alpha tauri"]],
  ["Racing Bulls", "rb", ["racing bulls", "visa cash app rb", "vcarb"]],
  ["Haas", "haas", ["haas"]],
  ["Sauber", "sauber", ["sauber"]],
  ["Audi", "audi", ["audi"]],
  ["Cadillac", "cadillac", ["cadillac"]],
  ["Brawn GP", "brawn", ["brawn gp", "brawn"]],
] as const;

const PERSON_ALIASES = [
  ["Adrian Newey", "adrian-newey", ["adrian newey", "newey"]],
  ["Fred Vasseur", "fred-vasseur", ["fred vasseur", "vasseur"]],
] as const;

const CONCEPT_ALIASES = [
  "undercut", "overcut", "pit window", "track position", "tyre offset", "tire offset", "dirty air",
  "slipstream", "downforce", "drag", "diffuser", "ground effect", "brake bias", "brake migration",
  "energy recovery", "ers", "drs", "parc ferme", "parc fermé", "cost cap", "safety car", "red flag",
  "cfd", "carbon fibre", "carbon fiber", "tyre degradation", "tire degradation", "graining", "blistering",
] as const;

const RACE_ALIASES = [
  "Abu Dhabi", "Monaco", "Singapore", "Imola", "Monza", "Silverstone", "British", "Dutch", "Australian",
  "Bahrain", "Saudi Arabian", "Japanese", "Chinese", "Miami", "Emilia Romagna", "Canadian", "Spanish",
  "Austrian", "Belgian", "Hungarian", "Azerbaijan", "United States", "Mexico City", "Sao Paulo", "Qatar", "Las Vegas",
] as const;

const F1_DOMAIN_PATTERN = /\b(f1|formula\s*(?:one|1)|grand prix|constructor|qualifying|sprint|podium|championship|paddock|pit stop|pit lane|race control|steward|fia|formula one management|fom|concorde agreement|power unit|engine regulations?|team principal|aerodynamics?|telemetry|pirelli|aramco|crashgate|spygate)\b/i;

export function resolveF1Entities(
  question: string,
  fixtures: RaceFixtureCollection,
  conversation: readonly F1ConversationTurn[] = [],
): readonly F1EntityReference[] {
  const normalized = normalize(question);
  const entities: F1EntityReference[] = [];

  addAliasEntities(entities, normalized, "DRIVER", DRIVER_ALIASES);
  addAliasEntities(entities, normalized, "TEAM", TEAM_ALIASES);
  addAliasEntities(entities, normalized, "PERSON", PERSON_ALIASES);

  for (const concept of CONCEPT_ALIASES) {
    if (containsAlias(normalized, normalize(concept))) {
      entities.push({ type: "CONCEPT", query: concept, name: titleCase(concept) });
    }
  }
  for (const race of RACE_ALIASES) {
    if (containsAlias(normalized, normalize(race))) {
      const year = question.match(/\b(19[5-9]\d|20\d{2}|21\d{2})\b/)?.[1];
      entities.push({
        type: "RACE",
        query: race,
        name: `${year ? `${year} ` : ""}${race} Grand Prix`,
        externalId: normalize(race).replaceAll(" ", "_"),
      });
    }
  }

  for (const driver of fixtures.drivers) {
    const name = `${driver.givenName} ${driver.familyName}`;
    if (containsAlias(normalized, normalize(name)) || containsAlias(normalized, normalize(driver.familyName))) {
      entities.push({ type: "DRIVER", query: name, name, id: driver.id, externalId: driver.slug.replaceAll("-", "_") });
    }
  }
  for (const team of fixtures.teams) {
    if (containsAlias(normalized, normalize(team.canonicalName))) {
      entities.push({ type: "TEAM", query: team.canonicalName, name: team.canonicalName, id: team.id, externalId: team.slug.replaceAll("-", "_") });
    }
  }
  for (const circuit of fixtures.circuits) {
    if ([circuit.name, circuit.locality, circuit.slug].filter(Boolean).some((value) => containsAlias(normalized, normalize(value ?? "")))) {
      entities.push({ type: "CIRCUIT", query: circuit.name, name: circuit.name, id: circuit.id, externalId: circuit.slug });
    }
  }
  for (const grandPrix of fixtures.grandsPrix) {
    const season = fixtures.seasons.find((item) => item.id === grandPrix.seasonId);
    if ([grandPrix.shortName, grandPrix.officialName].some((value) => containsAlias(normalized, normalize(value)))) {
      entities.push({ type: "RACE", query: grandPrix.shortName, name: `${season?.year ?? ""} ${grandPrix.shortName}`.trim(), id: grandPrix.id });
    }
  }

  const year = question.match(/\b(19[5-9]\d|20\d{2}|21\d{2})\b/)?.[1];
  if (year) entities.push({ type: "SEASON", query: year, name: year, externalId: year });

  if (PRONOUN_PATTERN.test(question)) {
    const priorEntities = conversation.toReversed().flatMap((turn) => turn.entities);
    const personPronoun = /\b(he|him|his|she|her)\b/i.test(question);
    const preferredTypes = personPronoun
      ? ["DRIVER", "PERSON"]
      : /\b(that team|their)\b/i.test(question)
        ? ["TEAM"]
        : /\b(that race|that overtake|that strategy|this penalty|those wins|one of those)\b/i.test(question)
          ? ["RACE", "SEASON", "DRIVER", "TEAM", "CONCEPT"]
          : ["DRIVER", "TEAM", "RACE", "SEASON", "PERSON"];
    const priors = priorEntities.filter((entity) => preferredTypes.includes(entity.type));
    entities.push(...(personPronoun ? priors.slice(0, 1) : priors.slice(0, 5)));
  }

  return dedupeEntities(entities);
}

export function classifyF1ScopeDeterministically(
  question: string,
  entities: readonly F1EntityReference[],
  conversation: readonly F1ConversationTurn[] = [],
): F1Scope | null {
  if (EXPLICIT_OUT_OF_SCOPE_PATTERN.test(question)) return "OUT_OF_SCOPE";
  const relatedConcept = entities.some((entity) => entity.type === "CONCEPT" && ["cfd", "carbon fibre", "carbon fiber"].includes(normalize(entity.query)));
  if (relatedConcept && !F1_DOMAIN_PATTERN.test(question) && conversation.some((turn) => turn.entities.length > 0)) return "F1_RELATED_CONTEXT";
  if (entities.length > 0 || F1_DOMAIN_PATTERN.test(question)) return "F1_IN_SCOPE";
  if (CONCEPT_ALIASES.some((concept) => containsAlias(normalize(question), normalize(concept)))) {
    return conversation.some((turn) => turn.entities.length > 0) ? "F1_RELATED_CONTEXT" : "F1_IN_SCOPE";
  }
  if (PRONOUN_PATTERN.test(question) && conversation.some((turn) => turn.entities.length > 0)) return "F1_IN_SCOPE";
  if (/\b(?:who (?:is|was)|tell me about)\s+[\p{L}'’-]{2,}(?:\s+[\p{L}'’-]{2,}){0,3}/iu.test(question)) return null;
  if (/\b(what happened|why did|why was|what does)\b/i.test(question) && /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/.test(question)) return null;
  if (DRIVER_CREDENTIAL_PATTERN.test(question) && /\b[\p{L}'’-]{3,}\s+[\p{L}'’-]{3,}/iu.test(question)) return null;
  return "OUT_OF_SCOPE";
}

export function planF1Query(
  question: string,
  scope: Exclude<F1Scope, "OUT_OF_SCOPE">,
  entities: readonly F1EntityReference[],
): F1QueryPlan {
  const intents = new Set<F1QueryIntent>();
  const hasDriver = entities.some((entity) => entity.type === "DRIVER");
  const hasTeam = entities.some((entity) => entity.type === "TEAM");
  const asksDriverCredentials = hasDriver && DRIVER_CREDENTIAL_PATTERN.test(question);
  const asksQualifyingRecord = hasDriver && QUALIFYING_RECORD_PATTERN.test(question);

  if ((/\b(who is|who was|tell me about)\b/i.test(question) && hasDriver) || asksDriverCredentials) intents.add("DRIVER_PROFILE");
  if (/\b(career|teams? (?:has|did)|drive for|drove for|first (?:f1 )?team|teammate|joined)\b/i.test(question)) intents.add("DRIVER_CAREER");
  if (/\b(leave|left|move|moved|join|joined|transfer|contract|replace(?:d)?)\b/i.test(question) && hasDriver) {
    intents.add("DRIVER_TRANSFER");
    intents.add("DRIVER_CAREER");
  }
  if (/\b(who is|what is|tell me about)\b/i.test(question) && hasTeam) intents.add("TEAM_PROFILE");
  if (/\b(team history|constructor history|history of|\w+'s history)\b/i.test(question) && hasTeam) intents.add("TEAM_HISTORY");
  if (/\b(who won|winner|podium|result|classification|finished|finish|grid|points scored)\b/i.test(question)) intents.add("RACE_RESULT");
  if (/\b(what happened|lap \d+|overtake|crash|incident|pit(?:ted)?|penalty|race moment|during the race)\b/i.test(question)) intents.add("RACE_MOMENT");
  if (/\bseason\b/i.test(question)) intents.add("SEASON");
  if (/\b(championship|standings|title)\b/i.test(question)) intents.add("CHAMPIONSHIP");
  if (/\b(circuit|track|where (?:is|was|did)|grand prix)\b/i.test(question)) intents.add("CIRCUIT");
  if (/\b(how many|record|statistics?|stats|more wins|podiums?|better in qualifying)\b/i.test(question) || asksDriverCredentials || asksQualifyingRecord) intents.add("STATISTICS");
  if (/\b(strategy|undercut|overcut|pit window|track position|tyre|tire|stint|safety car)\b/i.test(question)) intents.add("STRATEGY");
  if (/\b(downforce|dirty air|diffuser|floor|aero|aerodynamic|drag|brake bias|brake migration|energy recovery|ers|power unit|wing level|cfd|carbon fib(?:re|er)|cockpit|chassis)\b/i.test(question)) intents.add("TECHNICAL");
  if (/\b(regulations?|rules?|parc ferm|cost cap|penali[sz]ed|penalty|allowed|fia)\b/i.test(question)) intents.add("REGULATIONS");
  if (/\b(fia|steward|penalty|race control|decision)\b/i.test(question)) intents.add("FIA_DECISION");
  if (/\b(money|financial|finances?|prize money|cost cap|concorde agreement|expensive|earn|salary|sponsor|business|revenue)\b/i.test(question)) intents.add("BUSINESS");
  if (/\b(history|historical|what happened between|imola 1994|singapore 2008|brawn gp|era)\b/i.test(question)) intents.add("HISTORY");
  if (/\b(rivalry| versus | vs\.? |what happened between)\b/i.test(` ${question} `)) intents.add("RIVALRY");
  if (/\b(controversy|controversial|crashgate|spygate|team orders?|joke|disputed|scandal)\b/i.test(question)) intents.add("CONTROVERSY");
  if (CURRENT_PATTERN.test(question)) intents.add("CURRENT_NEWS");
  if (/\b(video|clip|onboard|on-board|radio|photo|image|show me)\b/i.test(question)) intents.add("MEDIA");
  if (/\b(compare|comparison|more than|better than|difference between)\b/i.test(question)) intents.add("COMPARISON");
  if (intents.size === 0) intents.add("GENERAL_F1");

  const requestedYear = Number(question.match(/\b(19[5-9]\d|20\d{2}|21\d{2})\b/)?.[1]);
  const current = CURRENT_PATTERN.test(question)
    || intents.has("REGULATIONS") && Number.isInteger(requestedYear) && requestedYear >= new Date().getUTCFullYear();
  const historical = HISTORICAL_PATTERN.test(question) || /\b(19[5-9]\d|20[0-2]\d)\b/.test(question);
  const currentness = current && historical ? "CURRENT_AND_HISTORICAL" : current ? "CURRENT" : historical ? "HISTORICAL" : "NONE";
  const intentList = [...intents];
  const webIntents: readonly F1QueryIntent[] = [
    "DRIVER_TRANSFER", "TEAM_HISTORY", "TECHNICAL", "REGULATIONS", "FIA_DECISION", "BUSINESS",
    "HISTORY", "RIVALRY", "CONTROVERSY", "CURRENT_NEWS",
  ];

  return f1QueryPlanSchema.parse({
    scope,
    intents: intentList,
    entities,
    currentness,
    needsStructuredData: intentList.some((intent) => [
      "DRIVER_PROFILE", "DRIVER_CAREER", "DRIVER_TRANSFER", "TEAM_PROFILE", "RACE_RESULT", "RACE_MOMENT",
      "SEASON", "CHAMPIONSHIP", "CIRCUIT", "STATISTICS", "MEDIA", "COMPARISON",
    ].includes(intent)),
    needsRaceMoments: intentList.some((intent) => ["RACE_MOMENT", "MEDIA"].includes(intent)),
    needsSemanticRetrieval: intentList.some((intent) => ["STRATEGY", "TECHNICAL", "HISTORY", "RIVALRY", "CONTROVERSY"].includes(intent)),
    needsWebSearch: current || asksDriverCredentials || asksQualifyingRecord || intentList.some((intent) => webIntents.includes(intent)),
    needsMedia: intents.has("MEDIA"),
  });
}

function addAliasEntities(
  target: F1EntityReference[],
  normalizedQuestion: string,
  type: F1EntityReference["type"],
  aliases: readonly (readonly [string, string, readonly string[]])[],
): void {
  for (const [name, externalId, values] of aliases) {
    if (values.some((value) => {
      const normalizedAlias = normalize(value);
      return containsAlias(normalizedQuestion, normalizedAlias)
        || type === "DRIVER" && containsFuzzyAlias(normalizedQuestion, normalizedAlias);
    })) {
      target.push({ type, query: name, name, externalId });
    }
  }
}

function containsAlias(value: string, alias: string): boolean {
  return new RegExp(`(?:^| )${escapeRegExp(alias)}(?: |$)`).test(value);
}

function containsFuzzyAlias(value: string, alias: string): boolean {
  const aliasWords = alias.split(" ");
  const words = value.split(" ");
  if (alias.replaceAll(" ", "").length < 7 || words.length < aliasWords.length) return false;
  const maxDistance = alias.length >= 14 ? 2 : 1;
  for (let index = 0; index <= words.length - aliasWords.length; index += 1) {
    const candidate = words.slice(index, index + aliasWords.length).join(" ");
    if (editDistance(candidate, alias) <= maxDistance) return true;
  }
  return false;
}

function editDistance(left: string, right: string): number {
  const rows = Array.from({ length: left.length + 1 }, (_, row) => {
    const values = Array<number>(right.length + 1).fill(0);
    values[0] = row;
    return values;
  });
  for (let column = 0; column <= right.length; column += 1) rows[0]![column] = column;
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const substitution = left[row - 1] === right[column - 1] ? 0 : 1;
      rows[row]![column] = Math.min(
        rows[row - 1]![column]! + 1,
        rows[row]![column - 1]! + 1,
        rows[row - 1]![column - 1]! + substitution,
      );
      if (
        row > 1
        && column > 1
        && left[row - 1] === right[column - 2]
        && left[row - 2] === right[column - 1]
      ) {
        rows[row]![column] = Math.min(rows[row]![column]!, rows[row - 2]![column - 2]! + 1);
      }
    }
  }
  return rows[left.length]![right.length]!;
}

function dedupeEntities(entities: readonly F1EntityReference[]): readonly F1EntityReference[] {
  const byKey = new Map<string, F1EntityReference>();
  for (const entity of entities) {
    const key = `${entity.type}:${normalize(entity.name)}`;
    const previous = byKey.get(key);
    byKey.set(key, previous ? {
      ...entity,
      id: entity.id ?? previous.id,
      externalId: previous.externalId ?? entity.externalId,
    } : entity);
  }
  return [...byKey.values()];
}

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
