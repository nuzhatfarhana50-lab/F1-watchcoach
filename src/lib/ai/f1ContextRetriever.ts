import type { RaceFixtureCollection } from "@/lib/f1/domain/types";
import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";
import type {
  HistoricalRaceProvider,
  ProviderDriverCareer,
  ProviderDriverStanding,
  ProviderRaceResult,
  ProviderRaceSummary,
} from "@/lib/f1/providers/contracts";

import type { F1EntityReference, F1QueryPlan, RaceQuestionContext, RaceQuestionSource } from "./raceQuestionSchemas";
import { raceQuestionContextSchema } from "./raceQuestionSchemas";

export type F1MediaReference = {
  id: string;
  kind: string;
  title: string;
  url: string;
  attribution: string;
};

export type F1RetrievedContext = {
  plan: F1QueryPlan;
  entities: readonly F1EntityReference[];
  structuredFacts: readonly string[];
  sources: readonly RaceQuestionSource[];
  media: readonly F1MediaReference[];
  raceContext?: RaceQuestionContext;
  raceHref?: string;
  deterministicAnswer?: string;
  deterministicSourceIds: readonly string[];
  requiresWebSearch: boolean;
  providerFailed: boolean;
};

type LocalRace = { context: RaceQuestionContext; searchable: string; href: string };

export class F1ContextRetriever {
  private readonly localRaces: readonly LocalRace[];
  private readonly localConcepts: readonly { name: string; definition: string; sourceIds: readonly string[] }[];

  constructor(
    private readonly provider: HistoricalRaceProvider,
    private readonly fixtures: RaceFixtureCollection = canonicalRaceFixtures,
  ) {
    this.localRaces = buildLocalRaces(fixtures);
    this.localConcepts = dedupeConcepts(fixtures);
  }

  async retrieve(question: string, plan: F1QueryPlan): Promise<F1RetrievedContext> {
    let providerFailed = false;
    let raceContext: RaceQuestionContext | undefined;
    let raceHref: string | undefined;
    const careers: ProviderDriverCareer[] = [];
    let standings: readonly ProviderDriverStanding[] = [];

    const season = extractSeason(question, plan.entities);
    const hasRaceLocator = plan.entities.some((entity) => entity.type === "RACE" || entity.type === "CIRCUIT")
      || /\b(grand prix|\bgp\b|round \d+)\b/i.test(question);
    const isRaceQuery = plan.intents.some((intent) => ["RACE_MOMENT", "CIRCUIT", "MEDIA"].includes(intent))
      || plan.intents.includes("RACE_RESULT") && hasRaceLocator;
    if (season && isRaceQuery) {
      const local = this.matchLocalRace(question, season, plan.entities);
      raceContext = local?.context;
      raceHref = local?.href;
      try {
        if (!raceContext) {
          const race = await this.matchProviderRace(question, season, plan.entities);
          if (race) raceContext = buildProviderContext(question, race, await this.provider.getRaceResult(season, race.round));
        } else if (needsProviderResults(question, raceContext)) {
          const result = await this.provider.getRaceResult(season, raceContext.race.round);
          if (result) raceContext = mergeProviderResult(raceContext, result);
        }
      } catch {
        providerFailed = true;
      }
    }

    const driverEntities = plan.entities.filter((entity) => entity.type === "DRIVER" && entity.externalId).slice(0, 2);
    if (this.provider.getDriverCareer && driverEntities.length > 0 && plan.intents.some((intent) => [
      "DRIVER_PROFILE", "DRIVER_CAREER", "DRIVER_TRANSFER", "STATISTICS", "COMPARISON",
    ].includes(intent))) {
      const results = await Promise.all(driverEntities.map(async (entity) => {
        try {
          return await this.provider.getDriverCareer?.(entity.externalId!);
        } catch {
          providerFailed = true;
          return null;
        }
      }));
      careers.push(...results.filter((career): career is ProviderDriverCareer => Boolean(career)));
    }

    if (season && plan.intents.includes("CHAMPIONSHIP") && this.provider.getDriverStandings) {
      try {
        standings = await this.provider.getDriverStandings(season);
      } catch {
        providerFailed = true;
      }
    }

    const concept = bestMatch(question, this.localConcepts, (item) => `${item.name} ${item.definition}`);
    const raceAnswer = raceContext ? deterministicRaceAnswer(question, raceContext) : undefined;
    const careerAnswer = deterministicCareerAnswer(question, careers, plan.entities);
    const standingsAnswer = deterministicStandingsAnswer(question, standings);
    const conceptAnswer = concept && normalize(question).includes(normalize(concept.name))
      ? { answer: `${concept.name}: ${concept.definition}`, sourceIds: concept.sourceIds }
      : undefined;
    const selected = careerAnswer ?? raceAnswer ?? standingsAnswer ?? conceptAnswer;

    const mediaQuery = `${question} ${plan.entities.map((entity) => entity.name).join(" ")}`;
    const media = plan.needsMedia && raceContext
      ? bestMatch(mediaQuery, raceContext.moments, (moment) => `${moment.type ?? ""} ${moment.title} ${moment.summary}`)?.media ?? []
      : [];
    const mediaAnswer = plan.needsMedia && media[0]
      ? { answer: `Here is the sourced ${media[0].kind} for that F1 moment: ${media[0].title}.`, sourceIds: raceContext?.sources.map((source) => source.id) ?? [] }
      : undefined;
    const finalAnswer = mediaAnswer ?? selected;

    const sources = dedupeSources([
      ...(raceContext?.sources ?? []),
      ...careers.map(careerSource),
      ...(standings[0] ? [standingsSource(standings[0])] : []),
      ...this.fixtures.sources.filter((source) => concept?.sourceIds.includes(source.id)).map((source) => ({
        id: source.id,
        provider: source.provider,
        title: source.title,
        url: source.url,
      })),
    ]);
    const structuredFacts = [
      ...(raceContext ? [raceFact(raceContext)] : []),
      ...careers.map(careerFact),
      ...(standings[0] ? [`${standings[0].season} drivers' champion: ${standings[0].driver.givenName} ${standings[0].driver.familyName}, ${standings[0].points} points and ${standings[0].wins} wins.`] : []),
      ...(concept ? [`${concept.name}: ${concept.definition}`] : []),
    ];

    const alwaysNarrative = plan.intents.some((intent) => [
      "DRIVER_TRANSFER", "TEAM_HISTORY", "FIA_DECISION", "BUSINESS", "HISTORY", "RIVALRY", "CONTROVERSY", "CURRENT_NEWS",
    ].includes(intent));
    const current = plan.currentness === "CURRENT" || plan.currentness === "CURRENT_AND_HISTORICAL";
    const technicalGap = plan.intents.includes("TECHNICAL") && !conceptAnswer;
    const regulationQuestion = plan.intents.includes("REGULATIONS");
    const requiresWebSearch = plan.needsWebSearch || current || alwaysNarrative || technicalGap || regulationQuestion || !finalAnswer;

    return {
      plan,
      entities: plan.entities,
      structuredFacts,
      sources,
      media,
      raceContext,
      raceHref,
      deterministicAnswer: finalAnswer?.answer,
      deterministicSourceIds: finalAnswer?.sourceIds ?? [],
      requiresWebSearch,
      providerFailed,
    };
  }

  private matchLocalRace(question: string, season: number, entities: readonly F1EntityReference[]): LocalRace | undefined {
    const candidates = this.localRaces.filter((race) => race.context.race.season === season);
    const round = extractRound(question);
    if (round) return candidates.find((race) => race.context.race.round === round);
    const raceEntity = entities.find((entity) => entity.type === "RACE");
    return bestMatch(raceEntity?.name ?? question, candidates, (candidate) => candidate.searchable);
  }

  private async matchProviderRace(question: string, season: number, entities: readonly F1EntityReference[]): Promise<ProviderRaceSummary | null> {
    const races = await this.provider.listRaces(season);
    const round = extractRound(question);
    if (round) return races.find((race) => race.round === round) ?? null;
    const raceEntity = entities.find((entity) => entity.type === "RACE");
    return bestMatch(raceEntity?.name ?? question, races, (race) => [race.name, race.circuit.name, race.circuit.locality, race.circuit.country].join(" ")) ?? null;
  }
}

function deterministicStandingsAnswer(
  question: string,
  standings: readonly ProviderDriverStanding[],
): { answer: string; sourceIds: readonly string[] } | undefined {
  const leader = standings.find((standing) => standing.position === 1) ?? standings[0];
  if (!leader || !/\b(champion|championship|title|standings|leads?)\b/i.test(question)) return undefined;
  const team = leader.teams.map((item) => item.name).join(" / ");
  return {
    answer: `${leader.driver.givenName} ${leader.driver.familyName} finished first in the ${leader.season} Formula 1 Drivers' Championship with ${leader.points} points and ${leader.wins} wins${team ? `, driving for ${team}` : ""}.`,
    sourceIds: [standingsSource(leader).id],
  };
}

function buildLocalRaces(fixtures: RaceFixtureCollection): readonly LocalRace[] {
  return fixtures.races.map((race) => {
    const grandPrix = fixtures.grandsPrix.find((item) => item.id === race.grandPrixId)!;
    const season = fixtures.seasons.find((item) => item.id === grandPrix.seasonId)!;
    const circuit = fixtures.circuits.find((item) => item.id === grandPrix.circuitId)!;
    const session = fixtures.sessions.find((item) => item.id === race.sessionId)!;
    const moments = fixtures.moments.filter((item) => item.raceId === race.id);
    const results = fixtures.results.filter((item) => item.sessionId === session.id);
    const sourceIds = new Set<string>([...race.sourceIds, ...grandPrix.sourceIds]);
    moments.forEach((moment) => {
      moment.sourceIds.forEach((id) => sourceIds.add(id));
      moment.explanation.sourceIds.forEach((id) => sourceIds.add(id));
      moment.concepts.forEach((item) => item.sourceIds.forEach((id) => sourceIds.add(id)));
      moment.media.forEach((item) => item.sourceIds.forEach((id) => sourceIds.add(id)));
    });
    results.forEach((result) => sourceIds.add(result.sourceId));
    const context = raceQuestionContextSchema.parse({
      question: "local fixture",
      race: {
        season: season.year,
        round: grandPrix.round,
        name: grandPrix.shortName,
        date: grandPrix.endDate,
        circuit: circuit.name,
        locality: circuit.locality ?? circuit.name,
        country: circuit.country,
      },
      results: results.map((result) => {
        const driver = fixtures.drivers.find((item) => item.id === result.driverId)!;
        const team = fixtures.teams.find((item) => item.id === result.teamId)!;
        return {
          position: result.classification,
          gridPosition: result.gridPosition,
          lapsCompleted: result.lapsCompleted,
          points: result.points,
          status: result.status,
          driver: `${driver.givenName} ${driver.familyName}`,
          team: team.canonicalName,
        };
      }),
      moments: moments.map((moment) => ({
        type: moment.type,
        title: moment.title,
        summary: moment.summary,
        lapNumber: moment.lapNumber,
        whatHappened: moment.explanation.whatHappened,
        whyItHappened: moment.explanation.whyItHappened,
        whyItMatters: moment.explanation.whyItMatters,
        watchNext: moment.explanation.watchNext,
        concepts: moment.concepts.map((item) => ({ name: item.name, definition: item.definition })),
        media: moment.media.map((item) => ({ id: item.id, kind: item.kind, title: item.title, url: item.url, attribution: item.attribution })),
      })),
      sources: fixtures.sources.filter((source) => sourceIds.has(source.id)).map((source) => ({
        id: source.id,
        provider: source.provider,
        title: source.title,
        url: source.url,
      })),
    });
    return {
      context,
      href: `/races/${season.year}/${grandPrix.round}`,
      searchable: [grandPrix.shortName, grandPrix.officialName, circuit.name, circuit.locality, circuit.country, ...moments.flatMap((moment) => [moment.title, moment.summary])].filter(Boolean).join(" "),
    };
  });
}

function dedupeConcepts(fixtures: RaceFixtureCollection) {
  const concepts = new Map<string, { name: string; definition: string; sourceIds: readonly string[] }>();
  for (const moment of fixtures.moments) {
    for (const concept of moment.concepts) concepts.set(concept.id, concept);
  }
  return [...concepts.values()];
}

function buildProviderContext(question: string, race: ProviderRaceSummary, result: ProviderRaceResult | null): RaceQuestionContext {
  const provenance = result?.race.provenance ?? race.provenance;
  return raceQuestionContextSchema.parse({
    question,
    race: {
      season: race.season,
      round: race.round,
      name: race.name,
      date: race.date,
      circuit: race.circuit.name,
      locality: race.circuit.locality,
      country: race.circuit.country,
    },
    results: (result?.results ?? []).map((row) => ({
      position: row.position,
      gridPosition: row.gridPosition,
      lapsCompleted: row.lapsCompleted,
      points: row.points,
      status: row.status,
      driver: `${row.driver.givenName} ${row.driver.familyName}`,
      team: row.team.name,
    })),
    moments: [],
    sources: [{
      id: `jolpica:${race.season}:${race.round}`,
      provider: "jolpica",
      title: `Jolpica record — ${race.season} ${race.name}`,
      url: provenance.sourceUrl,
    }],
  });
}

function mergeProviderResult(context: RaceQuestionContext, result: ProviderRaceResult): RaceQuestionContext {
  const providerContext = buildProviderContext(context.question, result.race, result);
  return raceQuestionContextSchema.parse({
    ...context,
    results: providerContext.results,
    sources: dedupeSources([...context.sources, ...providerContext.sources]),
  });
}

function deterministicRaceAnswer(question: string, context: RaceQuestionContext): { answer: string; sourceIds: readonly string[] } {
  const normalized = normalize(question);
  const resultSource = context.sources.find((source) => source.provider === "jolpica") ?? context.sources[0];
  const explanationSources = context.sources.filter((source) => source.provider !== "jolpica");
  const explanationIds = explanationSources.length > 0 ? explanationSources.map((source) => source.id) : [resultSource.id];
  const matchedResult = context.results.find((row) => normalized.includes(normalize(row.driver)) || normalized.includes(normalize(row.driver.split(" ").at(-1) ?? "")));
  const matchedMoment = bestMatch(question, context.moments, (moment) => [moment.type, moment.title, moment.summary, moment.whatHappened, moment.whyItHappened, moment.whyItMatters, ...moment.concepts.map((concept) => concept.name)].filter(Boolean).join(" "));

  if (matchedResult && /\b(finish|result|grid|points|team|happen(?:ed)? to)\b/i.test(question)) {
    const position = matchedResult.position ? `P${matchedResult.position}` : matchedResult.status;
    return {
      answer: `${matchedResult.driver} finished ${position} for ${matchedResult.team} in the ${context.race.season} ${context.race.name}, after starting P${matchedResult.gridPosition}. ${matchedResult.status}; ${matchedResult.lapsCompleted} laps completed and ${matchedResult.points} points scored.`,
      sourceIds: [resultSource.id],
    };
  }
  if (/\b(who won|winner|won)\b/i.test(question) && context.results[0]) {
    const winner = context.results.find((row) => row.position === 1) ?? context.results[0];
    return { answer: `${winner.driver} won the ${context.race.season} ${context.race.name} for ${winner.team}, completing ${winner.lapsCompleted} laps.`, sourceIds: [resultSource.id] };
  }
  if (/\b(podium|top three|top 3)\b/i.test(question) && context.results.length > 0) {
    const podium = context.results.filter((row) => row.position && row.position <= 3).map((row) => `P${row.position} ${row.driver}`).join(", ");
    return { answer: `The ${context.race.season} ${context.race.name} podium was ${podium}.`, sourceIds: [resultSource.id] };
  }
  if (matchedMoment && /\b(why|how|what happened|matter|strategy|concept|tyre|tire|pit|rain|overtake|show me|video)\b/i.test(question)) {
    if (/\bconcept|strategy\b/i.test(question) && matchedMoment.concepts[0]) {
      const concept = matchedMoment.concepts[0];
      return { answer: `${matchedMoment.title} demonstrates ${concept.name}: ${concept.definition} In this race, ${matchedMoment.whyItMatters}`, sourceIds: explanationIds };
    }
    if (/\bwhy|matter|strategy|how did\b/i.test(question)) {
      return { answer: `${matchedMoment.whatHappened} ${matchedMoment.whyItHappened} It mattered because ${lowercaseFirst(matchedMoment.whyItMatters)}`, sourceIds: explanationIds };
    }
    return { answer: `${matchedMoment.whatHappened} ${matchedMoment.whyItMatters} Next time, ${lowercaseFirst(matchedMoment.watchNext)}`, sourceIds: explanationIds };
  }
  if (/\b(where|circuit|track)\b/i.test(question)) {
    return { answer: `The ${context.race.season} ${context.race.name} was held at ${context.race.circuit} in ${context.race.locality}, ${context.race.country}.`, sourceIds: [resultSource.id] };
  }
  if (/\b(when|date)\b/i.test(question)) {
    return { answer: `The ${context.race.season} ${context.race.name} race date was ${context.race.date}.`, sourceIds: [resultSource.id] };
  }
  if (/\bwhat happened\b/i.test(question) && context.results.length > 0) {
    const topThree = context.results.filter((row) => row.position && row.position <= 3).map((row) => `P${row.position} ${row.driver}`).join(", ");
    return { answer: `The ${context.race.season} ${context.race.name} took place at ${context.race.circuit}. ${topThree ? `The podium was ${topThree}.` : "The linked classification establishes the race record."}`, sourceIds: [resultSource.id] };
  }
  return {
    answer: `The connected F1 source identifies the ${context.race.season} ${context.race.name} at ${context.race.circuit}, but it does not establish the requested detail.`,
    sourceIds: [resultSource.id],
  };
}

function deterministicCareerAnswer(
  question: string,
  careers: readonly ProviderDriverCareer[],
  entities: readonly F1EntityReference[],
): { answer: string; sourceIds: readonly string[] } | undefined {
  if (careers.length === 0) return undefined;
  const sourceIds = careers.map((career) => careerSource(career).id);
  const teamEntity = entities.find((entity) => entity.type === "TEAM");
  const teamFilter = teamEntity ? normalize(teamEntity.name.replace("Scuderia ", "")) : undefined;
  const seasonFilter = Number(question.match(/\b(19[5-9]\d|20\d{2}|21\d{2})\b/)?.[1]) || undefined;

  if (/\b(compare|more wins|better than)\b/i.test(question) && careers.length >= 2) {
    return {
      answer: careers.map((career) => {
        const metrics = careerMetrics(career, teamFilter, seasonFilter);
        return `${driverName(career)}: ${countLabel(metrics.starts, "start")}, ${countLabel(metrics.wins, "win")} and ${countLabel(metrics.podiums, "podium")}${teamEntity ? ` for ${teamEntity.name}` : ""}${seasonFilter ? ` in ${seasonFilter}` : ""}`;
      }).join("; ") + ". These are structured race-result totals; qualitative comparison needs sourced context.",
      sourceIds,
    };
  }

  const career = careers[0];
  const teams = orderedTeams(career);
  if (/\b(first (?:f1 )?team|debut team)\b/i.test(question)) {
    return { answer: `${driverName(career)}'s first Formula 1 constructor in the connected results was ${teams[0]?.name ?? "not established"}, in ${career.firstSeason}.`, sourceIds };
  }
  if (/\b(which teams|what teams|teams? (?:has|did)|drive for|drove for)\b/i.test(question)) {
    return { answer: `${driverName(career)} raced for ${teams.map((team) => `${team.name} (${team.firstSeason}–${team.lastSeason})`).join(", ")} in the connected Formula 1 results.`, sourceIds };
  }
  if (/\b(how many|wins|podiums|starts|races)\b/i.test(question)) {
    const metrics = careerMetrics(career, teamFilter, seasonFilter);
    const qualifier = teamEntity ? ` for ${teamEntity.name}` : "";
    const seasonQualifier = seasonFilter ? ` in ${seasonFilter}` : "";
    return { answer: `${driverName(career)} recorded ${countLabel(metrics.starts, "start")}, ${countLabel(metrics.wins, "win")} and ${countLabel(metrics.podiums, "podium")}${qualifier}${seasonQualifier} in the connected Jolpica results.`, sourceIds };
  }
  if (/\b(who is|career|tell me about)\b/i.test(question)) {
    const nationality = career.driver.nationality ? `${career.driver.nationality} ` : "";
    return {
      answer: `${driverName(career)} is a ${nationality}Formula 1 driver whose connected results span ${career.firstSeason}–${career.lastSeason}. Across ${countLabel(career.starts, "start")}, the record shows ${countLabel(career.wins, "win")} and ${countLabel(career.podiums, "podium")}, with ${teams.map((team) => team.name).join(", ")}.`,
      sourceIds,
    };
  }
  return undefined;
}

function careerMetrics(career: ProviderDriverCareer, teamFilter?: string, seasonFilter?: number) {
  const rows = career.results.filter((result) => {
    const matchesTeam = !teamFilter
      || normalize(result.team.name).includes(teamFilter)
      || teamFilter.includes(normalize(result.team.name));
    return matchesTeam && (!seasonFilter || result.season === seasonFilter);
  });
  return {
    starts: rows.length,
    wins: rows.filter((result) => result.position === 1).length,
    podiums: rows.filter((result) => result.position !== undefined && result.position <= 3).length,
  };
}

function countLabel(value: number, singular: string): string {
  return `${value} ${singular}${value === 1 ? "" : "s"}`;
}

function careerSource(career: ProviderDriverCareer): RaceQuestionSource {
  return {
    id: `jolpica:driver:${career.driver.externalId}`,
    provider: "jolpica",
    title: `Jolpica career results — ${driverName(career)}`,
    url: career.provenance.sourceUrl,
  };
}

function standingsSource(standing: ProviderDriverStanding): RaceQuestionSource {
  return {
    id: `jolpica:standings:${standing.season}`,
    provider: "jolpica",
    title: `Jolpica driver standings — ${standing.season}`,
    url: standing.provenance.sourceUrl,
  };
}

function careerFact(career: ProviderDriverCareer): string {
  return `${driverName(career)}: ${career.starts} starts, ${career.wins} wins, ${career.podiums} podiums, ${career.firstSeason}–${career.lastSeason}; constructors: ${orderedTeams(career).map((team) => team.name).join(", ")}.`;
}

function raceFact(context: RaceQuestionContext): string {
  const podium = context.results.filter((result) => result.position && result.position <= 3).map((result) => `P${result.position} ${result.driver}`).join(", ");
  return `${context.race.season} ${context.race.name} at ${context.race.circuit}${podium ? `; podium: ${podium}` : ""}.`;
}

function orderedTeams(career: ProviderDriverCareer) {
  const teams = new Map<string, { name: string; firstSeason: number; lastSeason: number }>();
  for (const result of career.results) {
    const current = teams.get(result.team.externalId);
    teams.set(result.team.externalId, {
      name: result.team.name,
      firstSeason: Math.min(current?.firstSeason ?? result.season, result.season),
      lastSeason: Math.max(current?.lastSeason ?? result.season, result.season),
    });
  }
  return [...teams.values()].sort((a, b) => a.firstSeason - b.firstSeason);
}

function driverName(career: ProviderDriverCareer): string {
  return `${career.driver.givenName} ${career.driver.familyName}`;
}

function needsProviderResults(question: string, context: RaceQuestionContext): boolean {
  if (context.results.length === 0) return true;
  if (/\b(full|complete|all)\b/i.test(question)) return context.results.length < 15;
  if (/\b(who won|winner|won|podium|top three|top 3)\b/i.test(question)) return false;
  const normalized = normalize(question);
  const asksNamedDriver = /\b(result|finish|grid|points|happen(?:ed)? to)\b/i.test(question)
    && /\b[A-Z][a-z]+\b/.test(question);
  return asksNamedDriver && !context.results.some((row) => {
    const familyName = row.driver.split(" ").at(-1) ?? row.driver;
    return normalized.includes(normalize(row.driver)) || normalized.includes(normalize(familyName));
  });
}

function bestMatch<T>(question: string, candidates: readonly T[], searchable: (candidate: T) => string): T | undefined {
  const questionTokens = searchableTokens(question);
  const scored = candidates.map((candidate) => ({
    candidate,
    score: searchableTokens(searchable(candidate)).filter((token) => questionTokens.includes(token)).length,
  })).sort((a, b) => b.score - a.score);
  if (!scored[0] || scored[0].score === 0 || scored[0].score === scored[1]?.score) return undefined;
  return scored[0].candidate;
}

function searchableTokens(value: string): string[] {
  const ignored = new Set(["about", "formula", "grand", "prix", "race", "round", "that", "what", "when", "where", "which", "with", "year"]);
  return [...new Set(normalize(value).split(" ").filter((token) => token.length > 2 && !ignored.has(token) && !/^\d+$/.test(token)))];
}

function extractSeason(question: string, entities: readonly F1EntityReference[]): number | undefined {
  const direct = question.match(/\b(19[5-9]\d|20\d{2}|21\d{2})\b/)?.[1];
  const reference = entities.find((entity) => entity.type === "SEASON")?.name;
  return direct ? Number(direct) : reference ? Number(reference) : undefined;
}

function extractRound(question: string): number | undefined {
  const match = question.match(/\bround\s+(\d{1,2})\b/i);
  return match ? Number(match[1]) : undefined;
}

function dedupeSources(sources: readonly RaceQuestionSource[]): readonly RaceQuestionSource[] {
  return [...new Map(sources.map((source) => [source.id, source])).values()];
}

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function lowercaseFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}
