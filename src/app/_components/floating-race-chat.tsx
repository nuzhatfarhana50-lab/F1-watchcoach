"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { RaceQuestionChatPanel } from "./race-question-chat";

const panelId = "floating-race-chat-panel";

export function FloatingRaceChat() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closePanel = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closePanel, open]);

  function openPanel() {
    setOpen(true);
    requestAnimationFrame(() => {
      containerRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    });
  }

  return (
    <div className={`floating-race-chat${open ? " floating-race-chat-open" : ""}`} ref={containerRef}>
      <aside
        className="floating-race-chat-window"
        data-testid="floating-race-chat-panel"
        id={panelId}
        aria-labelledby="floating-race-chat-title"
        hidden={!open}
      >
        <header className="floating-race-chat-heading">
          <div>
            <p>Watchcoach</p>
            <h2 id="floating-race-chat-title">Ask about Formula 1</h2>
          </div>
          <button type="button" onClick={closePanel} aria-label="Close Watchcoach chat">×</button>
        </header>
        <p className="floating-race-chat-scope">Grounded in connected F1 sources. Non-F1 questions are blocked.</p>
        <RaceQuestionChatPanel idPrefix="floating-race-chat" compact />
      </aside>

      <button
        className="floating-race-chat-trigger"
        type="button"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close Watchcoach F1 assistant" : "Open Watchcoach F1 assistant"}
        onClick={open ? closePanel : openPanel}
      >
        <span className="floating-race-chat-callout" aria-hidden="true">Ask Watchcoach</span>
        <Image
          src="/images/watchcoach-racer.png"
          alt=""
          width={112}
          height={112}
          sizes="112px"
          loading="eager"
        />
        <span className="floating-race-chat-status" aria-hidden="true">F1</span>
      </button>
    </div>
  );
}
