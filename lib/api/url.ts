function configuredOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_URL;

  if (!raw) return null;
  return raw.startsWith("http") ? raw : `https://${raw}`;
}

export function getRequestOrigin(req: Request) {
  const fallback = new URL(req.url);
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? req.headers.get("host") ?? fallback.host;
  const protocol = forwardedProto ?? fallback.protocol.replace(":", "");
  const origin = `${protocol}://${host}`;
  const configured = configuredOrigin();

  if (configured && (host.startsWith("localhost") || host.startsWith("127.0.0.1"))) {
    return configured;
  }

  return origin;
}

export function getRequestUrl(req: Request, path: string) {
  return new URL(path, getRequestOrigin(req));
}
