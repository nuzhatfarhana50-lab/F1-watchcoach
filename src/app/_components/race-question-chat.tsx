"use client";

import Link from "next/link";
import { FormEvent, useRef, useState, useTransition } from "react";

import { askRaceQuestionAction } from "@/app/actions/race-question";
import type { RaceQuestionResponse } from "@/lib/ai/raceQuestionService";

type ChatEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
  response?: RaceQuestionResponse;
};

const suggestions = [
  "Who is Carlos Sainz?",
  "What is an undercut?",
  "Why did Hamilton’s final stop matter at the 2024 British Grand Prix?",
] as const;

export function RaceQuestionChat() {
  return (
    <section className="race-chat-section" aria-labelledby="race-chat-title">
      <div className="race-chat-intro">
        <p className="section-label">F1 knowledge, on demand</p>
        <h2 id="race-chat-title">Ask Watchcoach about Formula 1.</h2>
        <p>
          Ask about drivers, teams, races, history, strategy, engineering, regulations, or the business of Formula 1.
        </p>
        <div className="race-chat-boundary" aria-label="Question scope">
          <span aria-hidden="true">✓</span>
          Drivers, teams, races, history, strategy, engineering, regulations, and F1 business
        </div>
        <div className="race-chat-boundary race-chat-boundary-blocked">
          <span aria-hidden="true">×</span>
          General-purpose or non-F1 questions are refused before generation
        </div>
      </div>

      <RaceQuestionChatPanel idPrefix="home-race-chat" />
    </section>
  );
}

export function RaceQuestionChatPanel({
  idPrefix,
  compact = false,
}: {
  idPrefix: string;
  compact?: boolean;
}) {
  const [messages, setMessages] = useState<readonly ChatEntry[]>([]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;
    const userEntry: ChatEntry = { id: crypto.randomUUID(), role: "user", text: trimmed };
    setMessages((current) => [...current.slice(-6), userEntry]);
    if (inputRef.current) inputRef.current.value = "";

    const conversation = messages.slice(-6).map((message) => ({
      role: message.role,
      text: message.text,
      entities: message.response?.status === "answered" ? message.response.resolvedEntities : [],
    }));

    startTransition(async () => {
      const response = await askRaceQuestionAction({ question: trimmed, conversation });
      const text = response.status === "answered" ? response.answer : response.message;
      const assistantEntry: ChatEntry = { id: crypto.randomUUID(), role: "assistant", text, response };
      setMessages((current) => [...current, assistantEntry].slice(-8));
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    submitQuestion(String(formData.get("question") ?? ""));
  }

  return (
    <div className={`race-chat-panel${compact ? " race-chat-panel-compact" : ""}`}>
      <div className="race-chat-toolbar">
        <span><i aria-hidden="true" /> F1 sources only</span>
        {messages.length > 0 ? (
          <button type="button" onClick={() => setMessages([])} disabled={pending}>Clear</button>
        ) : null}
      </div>

      <div className="race-chat-log" role="log" aria-live="polite" aria-label="F1 question conversation">
        {messages.length === 0 ? (
          <div className="race-chat-empty">
            <strong>Ask a Formula 1 question</strong>
            <p>I’ll route it to connected F1 evidence, then answer only from what the sources establish.</p>
          </div>
        ) : messages.map((message) => (
          <article className={`race-chat-message race-chat-message-${message.role}`} key={message.id}>
            <span>{message.role === "user" ? "You" : "Watchcoach"}</span>
            <p>{message.text}</p>
            {message.response?.status === "answered" ? (
              <div className="race-chat-evidence">
                <span>Evidence</span>
                <ul>
                  {message.response.sources.map((source) => (
                    <li key={source.id}>
                      <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
                    </li>
                  ))}
                </ul>
                {message.response.raceHref ? <Link href={message.response.raceHref}>Open the race moments →</Link> : null}
                {message.response.media.length > 0 ? (
                  <ul aria-label="Related F1 media">
                    {message.response.media.map((item) => (
                      <li key={item.id}>
                        <a href={item.url} target="_blank" rel="noreferrer">{item.title} ({item.attribution})</a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
        {pending ? (
          <div className="race-chat-thinking" role="status">
            <span aria-hidden="true" /> Retrieving F1 evidence…
          </div>
        ) : null}
      </div>

      <form className="race-chat-form" onSubmit={handleSubmit}>
        <label htmlFor={`${idPrefix}-question`}>Ask an F1 question</label>
        <div>
          <input
            id={`${idPrefix}-question`}
            name="question"
            ref={inputRef}
            type="text"
            minLength={3}
            maxLength={300}
            autoComplete="off"
            placeholder="Who is Carlos Sainz?"
            disabled={pending}
            required
          />
          <button type="submit" disabled={pending}>{pending ? "Checking…" : "Ask"}</button>
        </div>
      </form>

      <div className="race-chat-suggestions" aria-label="Suggested F1 questions">
        {suggestions.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => submitQuestion(suggestion)} disabled={pending}>
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
