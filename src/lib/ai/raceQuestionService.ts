import type { RaceFixtureCollection } from "@/lib/f1/domain/types";
import { canonicalRaceFixtures } from "@/lib/f1/fixtures/canonical-races";
import type { HistoricalRaceProvider } from "@/lib/f1/providers/contracts";

import { F1ContextRetriever, type F1MediaReference } from "./f1ContextRetriever";
import { classifyF1ScopeDeterministically, planF1Query, resolveF1Entities } from "./f1QueryPlanner";
import type { F1ScopeClassifier, F1WebRetriever, RaceQuestionGenerator } from "./ports";
import { limitRaceQuestionAnswer } from "./raceQuestionLimits";
import {
  generatedRaceQuestionAnswerSchema,
  raceQuestionContextSchema,
  raceQuestionInputSchema,
  type F1EntityReference,
  type RaceQuestionSource,
} from "./raceQuestionSchemas";

export type RaceQuestionResponse =
  | {
      status: "answered";
      answer: string;
      sources: readonly RaceQuestionSource[];
      media: readonly F1MediaReference[];
      resolvedEntities: readonly F1EntityReference[];
      raceHref?: string;
      generated: boolean;
    }
  | { status: "blocked" | "needsContext" | "unavailable"; message: string };

const EXPLANATION_PATTERN = /\b(why|how did|what happened|matter|strategy|concept|explain|tyre|tire|pit|rain|safety car|red flag)\b/i;
const NARRATIVE_INTENTS = new Set(["DRIVER_TRANSFER", "TEAM_HISTORY", "FIA_DECISION", "BUSINESS", "HISTORY", "RIVALRY", "CONTROVERSY", "CURRENT_NEWS"]);

export class RaceQuestionService {
  private readonly retriever: F1ContextRetriever;

  constructor(
    provider: HistoricalRaceProvider,
    private readonly generator?: RaceQuestionGenerator,
    private readonly fixtures: RaceFixtureCollection = canonicalRaceFixtures,
    private readonly webRetriever?: F1WebRetriever,
    private readonly scopeClassifier?: F1ScopeClassifier,
  ) {
    this.retriever = new F1ContextRetriever(provider, fixtures);
  }

  async ask(input: unknown): Promise<RaceQuestionResponse> {
    const parsed = raceQuestionInputSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        status: "needsContext",
        message: issue?.path[0] === "conversation"
          ? "The recent chat context could not be read. Clear the conversation and try that F1 question again."
          : issue?.message ?? "Ask a specific Formula 1 question.",
      };
    }

    const { question, conversation } = parsed.data;
    const entities = resolveF1Entities(question, this.fixtures, conversation);
    let scope = classifyF1ScopeDeterministically(question, entities, conversation);
    if (!scope && this.scopeClassifier) {
      try {
        scope = await this.scopeClassifier.classifyF1Scope(question, conversation);
      } catch {
        scope = null;
      }
    }
    if (!scope || scope === "OUT_OF_SCOPE") {
      return {
        status: "blocked",
        message: "I stick to Formula 1. Ask me about drivers, teams, races, history, strategy, engineering, regulations, or F1 business.",
      };
    }

    const plan = planF1Query(question, scope, entities);
    const context = await this.retriever.retrieve(question, plan);

    if (context.requiresWebSearch) {
      if (this.webRetriever) {
        try {
          const web = await this.webRetriever.retrieveF1Web({ question, plan, structuredFacts: context.structuredFacts });
          return {
            status: "answered",
            answer: limitRaceQuestionAnswer(web.answer),
            sources: web.sources,
            media: context.media,
            resolvedEntities: context.entities,
            raceHref: context.raceHref,
            generated: true,
          };
        } catch {
          // Continue to an explicit evidence state; narrative/current questions never fall back to model memory.
        }
      }

      const requiresNarrativeEvidence = plan.intents.some((intent) => NARRATIVE_INTENTS.has(intent));
      const requiresFreshEvidence = plan.currentness === "CURRENT" || plan.currentness === "CURRENT_AND_HISTORICAL";
      if (requiresNarrativeEvidence || requiresFreshEvidence || !context.deterministicAnswer) {
        return {
          status: context.providerFailed ? "unavailable" : "needsContext",
          message: context.providerFailed
            ? "The connected F1 sources are temporarily unavailable, so I can’t answer that without guessing."
            : "I recognize that as an F1 question, but the connected evidence is not sufficient to answer it without guessing.",
        };
      }
    }

    if (context.raceContext && this.generator && EXPLANATION_PATTERN.test(question)) {
      try {
        const raceContext = raceQuestionContextSchema.parse({ ...context.raceContext, question });
        const generated = generatedRaceQuestionAnswerSchema.parse(await this.generator.answerRaceQuestion(raceContext));
        const allowedSources = new Map(raceContext.sources.map((source) => [source.id, source]));
        const resolvedSources = [...new Set(generated.sourceIds)].flatMap((id) => {
          const source = allowedSources.get(id);
          return source ? [source] : [];
        });
        if (resolvedSources.length !== generated.sourceIds.length) throw new Error("Generated answer referenced an unknown source");
        return {
          status: "answered",
          answer: limitRaceQuestionAnswer(generated.answer),
          sources: resolvedSources,
          media: context.media,
          resolvedEntities: context.entities,
          raceHref: context.raceHref,
          generated: true,
        };
      } catch {
        // Grounded deterministic output remains available if generation or validation fails.
      }
    }

    if (context.deterministicAnswer) {
      const allowedSourceIds = new Set(context.deterministicSourceIds);
      const sources = context.sources.filter((source) => allowedSourceIds.has(source.id));
      return {
        status: "answered",
        answer: limitRaceQuestionAnswer(context.deterministicAnswer),
        sources: sources.length > 0 ? sources : context.sources.slice(0, 1),
        media: context.media,
        resolvedEntities: context.entities,
        raceHref: context.raceHref,
        generated: false,
      };
    }

    return {
      status: context.providerFailed ? "unavailable" : "needsContext",
      message: context.providerFailed
        ? "The connected F1 sources are temporarily unavailable. Try that F1 question again shortly."
        : "I recognize that as an F1 question, but I need a more specific driver, team, race, season, or concept to retrieve evidence.",
    };
  }
}
