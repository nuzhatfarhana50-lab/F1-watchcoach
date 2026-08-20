import type { RaceFixtureCollection } from "@/lib/f1/domain/types";
import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";
import type { HistoricalRaceProvider, ProviderRaceResult, ProviderRaceSummary } from "@/lib/f1/providers/contracts";

import type { RaceQuestionGenerator } from "./ports";
import {
  generatedRaceQuestionAnswerSchema,
  raceQuestionContextSchema,
  raceQuestionInputSchema,
  type RaceQuestionContext,
  type RaceQuestionSource,
} from "./raceQuestionSchemas";

export type RaceQuestionResponse =
  | { status: "answered"; answer: string; sources: readonly RaceQuestionSource[]; raceHref?: string; generated: boolean }
  | { status: "blocked" | "needsContext" | "unavailable"; message: string };

const F1_SCOPE_PATTERN = /\b(f1|formula\s*(?:one|1)|grand prix|gp|race|qualifying|sprint|driver|constructor|podium|winner|won|finish(?:ed)?|result|grid|lap|pit|tyre|tire|safety car|red flag|penalty|championship|circuit|stint|undercut|overcut)\b/i;
const RESULT_PATTERN = /\b(who won|winner|podium|result|classification|finish(?:ed)?|grid|started|points|status|how many laps|team)\b/i;
const EXPLANATION_PATTERN = /\b(why|how did|what happened|matter|strategy|concept|explain|tyre|tire|pit|rain|safety car|red flag)\b/i;
const YEAR_PATTERN = /\b(19[5-9]\d|20\d{2}|21\d{2})\b/;
const ROUND_PATTERN = /\bround\s+(\d{1,2})\b/i;
const IGNORED_TOKENS = new Set([
  "about", "after", "before", "could", "did", "does", "formula", "from", "grand", "happen", "happened",
  "have", "into", "just", "matter", "more", "prix", "race", "round", "that", "their", "there", "they", "this",
  "what", "when", "where", "which", "while", "with", "would", "year", "your",
]);

type LocalRace = {
  context: RaceQuestionContext;
  searchable: string;
};

export class RaceQuestionService {
  private readonly localRaces: readonly LocalRace[];

  constructor(
    private readonly provider: HistoricalRaceProvider,
    private readonly generator?: RaceQuestionGenerator,
    fixtures: RaceFixtureCollection = canonicalRaceFixtures,
  ) {
    this.localRaces = buildLocalRaces(fixtures);
  }

  async ask(input: unknown): Promise<RaceQuestionResponse> {
    const parsed = raceQuestionInputSchema.safeParse(input);
    if (!parsed.success) {
      return { status: "needsContext", message: parsed.error.issues[0]?.message ?? "Ask a specific Formula 1 race question." };
    }

    const question = parsed.data.question;
    if (!this.isF1RaceQuestion(question)) {
      return {
        status: "blocked",
        message: "I can only answer questions about Formula 1 races using the connected F1 data sources. Try naming a season and Grand Prix.",
      };
    }

    const season = extractSeason(question);
    if (!season) {
      return {
        status: "needsContext",
        message: "Include the season and race—for example, “Who won the 2024 British Grand Prix?”",
      };
    }

    const local = this.matchLocalRace(question, season);
    let context = local?.context;

    try {
      if (!context) {
        const race = await this.matchProviderRace(question, season);
        if (!race) {
          return {
            status: "needsContext",
            message: `I couldn’t match that to a ${season} Formula 1 race. Include the Grand Prix, circuit, country, or round.`,
          };
        }
        const result = await this.provider.getRaceResult(season, race.round);
        context = buildProviderContext(question, race, result);
      } else if (RESULT_PATTERN.test(question) && !hasEnoughResultEvidence(question, context)) {
        const result = await this.provider.getRaceResult(season, context.race.round);
        if (result) context = mergeProviderResult(context, result);
      }
    } catch {
      if (!context || !canAnswerDeterministically(question, context)) {
        return {
          status: "unavailable",
          message: "The F1 race provider is temporarily unavailable. Try the same race question again shortly.",
        };
      }
    }

    const validatedContext = raceQuestionContextSchema.parse({ ...context, question });
    const fallback = deterministicAnswer(question, validatedContext);

    if (this.generator && EXPLANATION_PATTERN.test(question)) {
      try {
        const generated = generatedRaceQuestionAnswerSchema.parse(await this.generator.answerRaceQuestion(validatedContext));
        const allowedSources = new Map(validatedContext.sources.map((source) => [source.id, source]));
        const resolvedSources = [...new Set(generated.sourceIds)].flatMap((id) => {
          const source = allowedSources.get(id);
          return source ? [source] : [];
        });
        if (resolvedSources.length !== generated.sourceIds.length) throw new Error("Generated answer referenced an unknown source");
        return {
          status: "answered",
          answer: generated.answer,
          sources: resolvedSources,
          raceHref: local ? `/races/${validatedContext.race.season}/${validatedContext.race.round}` : undefined,
          generated: true,
        };
      } catch {
        // Grounded deterministic output remains available if generation or validation fails.
      }
    }

    return {
      status: "answered",
      answer: fallback.answer,
      sources: fallback.sourceIds.flatMap((id) => validatedContext.sources.find((source) => source.id === id) ?? []),
      raceHref: local ? `/races/${validatedContext.race.season}/${validatedContext.race.round}` : undefined,
      generated: false,
    };
  }

  private isF1RaceQuestion(question: string): boolean {
    if (F1_SCOPE_PATTERN.test(question)) return true;
    const normalized = normalize(question);
    return this.localRaces.some((race) => searchableTokens(race.searchable).some((token) => token.length > 4 && normalized.includes(token)));
  }

  private matchLocalRace(question: string, season: number): LocalRace | undefined {
    const candidates = this.localRaces.filter((race) => race.context.race.season === season);
    const round = extractRound(question);
    if (round) return candidates.find((race) => race.context.race.round === round);
    return bestMatch(question, candidates, (candidate) => candidate.searchable);
  }

  private async matchProviderRace(question: string, season: number): Promise<ProviderRaceSummary | null> {
    const races = await this.provider.listRaces(season);
    const round = extractRound(question);
    if (round) return races.find((race) => race.round === round) ?? null;
    return bestMatch(question, races, (race) => [race.name, race.circuit.name, race.circuit.locality, race.circuit.country].join(" ")) ?? null;
  }
}

function buildLocalRaces(fixtures: RaceFixtureCollection): readonly LocalRace[] {
  return fixtures.races.map((race) => {
    const grandPrix = fixtures.grandsPrix.find((item) => item.id === race.grandPrixId)!;
    const season = fixtures.seasons.find((item) => item.id === grandPrix.seasonId)!;
    const circuit = fixtures.circuits.find((item) => item.id === grandPrix.circuitId)!;
    const session = fixtures.sessions.find((item) => item.id === race.sessionId)!;
    const moments = fixtures.moments.filter((item) => item.raceId === race.id);
    const resultRows = fixtures.results.filter((item) => item.sessionId === session.id);
    const sourceIds = new Set<string>([...race.sourceIds, ...grandPrix.sourceIds]);
    moments.forEach((moment) => {
      moment.sourceIds.forEach((id) => sourceIds.add(id));
      moment.explanation.sourceIds.forEach((id) => sourceIds.add(id));
      moment.concepts.forEach((concept) => concept.sourceIds.forEach((id) => sourceIds.add(id)));
    });
    resultRows.forEach((result) => sourceIds.add(result.sourceId));

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
      results: resultRows.map((result) => {
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
        title: moment.title,
        summary: moment.summary,
        lapNumber: moment.lapNumber,
        whatHappened: moment.explanation.whatHappened,
        whyItHappened: moment.explanation.whyItHappened,
        whyItMatters: moment.explanation.whyItMatters,
        watchNext: moment.explanation.watchNext,
        concepts: moment.concepts.map((concept) => ({ name: concept.name, definition: concept.definition })),
      })),
      sources: fixtures.sources.filter((source) => sourceIds.has(source.id)).map((source) => ({
        id: source.id,
        provider: source.provider,
        title: source.title,
        url: source.url,
      })),
    });

    const participants = moments.flatMap((moment) => moment.drivers).flatMap((participant) => {
      const driver = fixtures.drivers.find((item) => item.id === participant.entityId);
      return driver ? [`${driver.givenName} ${driver.familyName}`] : [];
    });
    return {
      context,
      searchable: [grandPrix.shortName, grandPrix.officialName, circuit.name, circuit.locality, circuit.country, ...participants, ...moments.flatMap((moment) => [moment.title, moment.summary])].filter(Boolean).join(" "),
    };
  });
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
    sources: [...context.sources, ...providerContext.sources.filter((source) => !context.sources.some((item) => item.id === source.id))],
  });
}

function deterministicAnswer(question: string, context: RaceQuestionContext): { answer: string; sourceIds: readonly string[] } {
  const normalized = normalize(question);
  const resultSource = context.sources.find((source) => source.provider === "jolpica") ?? context.sources[0];
  const explanationSources = context.sources.filter((source) => source.provider !== "jolpica");
  const sourceIds = explanationSources.length > 0 ? explanationSources.map((source) => source.id) : [resultSource.id];
  const matchedResult = context.results.find((row) => normalized.includes(normalize(row.driver)));
  const matchedMoment = bestMatch(question, context.moments, (moment) => [moment.title, moment.summary, moment.whatHappened, moment.whyItHappened, moment.whyItMatters, ...moment.concepts.map((concept) => concept.name)].join(" "));

  if (matchedResult) {
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

  if (matchedMoment && EXPLANATION_PATTERN.test(question)) {
    if (/\bconcept\b/i.test(question) && matchedMoment.concepts[0]) {
      const concept = matchedMoment.concepts[0];
      return { answer: `${matchedMoment.title} demonstrates ${concept.name}: ${concept.definition} In this race, ${matchedMoment.whyItMatters}`, sourceIds };
    }
    if (/\bwhy|matter|strategy|how did\b/i.test(question)) {
      return { answer: `${matchedMoment.whatHappened} ${matchedMoment.whyItHappened} It mattered because ${lowercaseFirst(matchedMoment.whyItMatters)}`, sourceIds };
    }
    return { answer: `${matchedMoment.whatHappened} ${matchedMoment.whyItMatters} Next time, ${lowercaseFirst(matchedMoment.watchNext)}`, sourceIds };
  }

  if (/\b(where|circuit|track)\b/i.test(question)) {
    return { answer: `The ${context.race.season} ${context.race.name} was held at ${context.race.circuit} in ${context.race.locality}, ${context.race.country}.`, sourceIds: [resultSource.id] };
  }

  if (/\b(when|date)\b/i.test(question)) {
    return { answer: `The ${context.race.season} ${context.race.name} race date was ${context.race.date}.`, sourceIds: [resultSource.id] };
  }

  if (context.results.length > 0) {
    const topThree = context.results.filter((row) => row.position && row.position <= 3).map((row) => `P${row.position} ${row.driver}`).join(", ");
    return { answer: `The ${context.race.season} ${context.race.name} took place at ${context.race.circuit}. ${topThree ? `The leading classified finishers were ${topThree}.` : "The classification is available in the linked source."}`, sourceIds: [resultSource.id] };
  }

  return {
    answer: `The connected F1 source identifies the ${context.race.season} ${context.race.name} at ${context.race.circuit}, but it does not contain enough evidence to answer that specific question without guessing.`,
    sourceIds: [resultSource.id],
  };
}

function hasEnoughResultEvidence(question: string, context: RaceQuestionContext): boolean {
  if (context.results.length === 0) return false;
  const normalized = normalize(question);
  const namedDriver = context.results.some((row) => normalized.includes(normalize(row.driver)));
  if (namedDriver) return true;
  if (/\b(full|complete|all)\b/i.test(question)) return context.results.length >= 15;
  return /\b(who won|winner|won|podium|top three|top 3)\b/i.test(question);
}

function canAnswerDeterministically(question: string, context: RaceQuestionContext): boolean {
  return context.moments.length > 0 && EXPLANATION_PATTERN.test(question) || hasEnoughResultEvidence(question, context);
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
  return [...new Set(normalize(value).split(" ").filter((token) => token.length > 2 && !IGNORED_TOKENS.has(token) && !/^\d+$/.test(token)))];
}

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function extractSeason(question: string): number | undefined {
  const match = question.match(YEAR_PATTERN);
  return match ? Number(match[1]) : undefined;
}

function extractRound(question: string): number | undefined {
  const match = question.match(ROUND_PATTERN);
  return match ? Number(match[1]) : undefined;
}

function lowercaseFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}
