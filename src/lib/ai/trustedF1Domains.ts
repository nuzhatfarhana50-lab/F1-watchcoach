export const trustedF1PrimaryDomains = [
  "formula1.com",
  "fia.com",
  "ferrari.com",
  "mercedesamgf1.com",
  "redbullracing.com",
  "mclaren.com",
  "astonmartinf1.com",
  "alpinef1.com",
  "williamsf1.com",
  "haasf1team.com",
  "sauber-group.com",
  "racingbulls.com",
] as const;

export const trustedF1SecondaryDomains = [
  "autosport.com",
  "motorsport.com",
  "racefans.net",
  "the-race.com",
  "wikidata.org",
  "wikipedia.org",
] as const;

export const trustedF1WebDomains = [...trustedF1PrimaryDomains, ...trustedF1SecondaryDomains] as const;

export function isTrustedF1WebUrl(value: string): boolean {
  return isAllowedF1WebUrl(value, trustedF1WebDomains);
}

export function isAllowedF1WebUrl(value: string, domains: readonly string[]): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
