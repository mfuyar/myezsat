export function getRequestOrigin(req: Request) {
  const fallback = new URL(req.url);
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? req.headers.get("host") ?? fallback.host;
  const protocol = forwardedProto ?? fallback.protocol.replace(":", "");

  return `${protocol}://${host}`;
}

export function getRequestUrl(req: Request, path: string) {
  return new URL(path, getRequestOrigin(req));
}
