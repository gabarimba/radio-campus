export function getPublicSiteOrigin(currentOrigin: string, configuredSiteUrl?: string) {
  const configured = configuredSiteUrl?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Use the current app host if the optional value is malformed.
    }
  }

  try {
    const current = new URL(currentOrigin);
    if (current.hostname.endsWith(".vercel.app")) return "https://sistema-radio-campus.vercel.app";
    return current.origin;
  } catch {
    return currentOrigin.replace(/\/+$/, "");
  }
}

export function getVotingUrl(currentOrigin: string, roundId: string, configuredSiteUrl?: string) {
  const url = new URL("/votar", getPublicSiteOrigin(currentOrigin, configuredSiteUrl));
  url.searchParams.set("r", roundId);
  return url.toString();
}
