export const raceQuestionLimits = {
  questionCharacters: 300,
  conversationTurns: 6,
  conversationTurnCharacters: 2_000,
  conversationContextCharacters: 800,
  answerCharacters: 1_600,
} as const;

export function limitRaceQuestionAnswer(value: string): string {
  const normalized = value
    .trim()
    .replace(/\s*\(\[[^\]]+]\(https?:\/\/[^)]+\)\)/g, "")
    .replace(/\[([^\]]+)]\(https?:\/\/[^)]+\)/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
  if (normalized.length <= raceQuestionLimits.answerCharacters) return normalized;

  const available = normalized.slice(0, raceQuestionLimits.answerCharacters - 1);
  const sentenceEnds = [available.lastIndexOf(". "), available.lastIndexOf("! "), available.lastIndexOf("? ")];
  const sentenceEnd = Math.max(...sentenceEnds);
  const preferredEnd = sentenceEnd >= Math.floor(raceQuestionLimits.answerCharacters * 0.6)
    ? sentenceEnd + 1
    : available.lastIndexOf(" ");
  const end = preferredEnd > 0 ? preferredEnd : available.length;
  return `${available.slice(0, end).trimEnd()}…`;
}
