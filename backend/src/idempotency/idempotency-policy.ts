interface IdempotencyRouteRule {
  method: string;
  pattern: RegExp;
}

const ROUTES: IdempotencyRouteRule[] = [
  { method: 'POST', pattern: /^\/events$/ },
  { method: 'POST', pattern: /^\/workflows$/ },
  { method: 'PUT', pattern: /^\/workflows\/[^/]+$/ },
  { method: 'POST', pattern: /^\/automation\/create$/ },
  { method: 'POST', pattern: /^\/automation\/run$/ },
  { method: 'POST', pattern: /^\/communications\/send$/ },
  { method: 'POST', pattern: /^\/organizations\/[^/]+\/members$/ },
  { method: 'POST', pattern: /^\/workflow-dlq\/[^/]+\/replay$/ },
  { method: 'POST', pattern: /^\/workflow-dlq\/[^/]+\/resolve$/ },
  { method: 'POST', pattern: /^\/workflow-dlq\/[^/]+\/ignore$/ },
];

function normalizePath(path: string): string {
  const withoutQuery = path.split('?')[0] || '/';
  return withoutQuery.replace(/^\/api\/v1/, '') || '/';
}

export function resolveIdempotencyRoutePolicy(
  method: string,
  path: string,
): { enabled: true; normalizedPath: string } | { enabled: false } {
  const normalizedPath = normalizePath(path);
  const uppercaseMethod = method.toUpperCase();
  const isSupported = ROUTES.some(
    (route) => route.method === uppercaseMethod && route.pattern.test(normalizedPath),
  );

  if (!isSupported) {
    return { enabled: false };
  }

  return {
    enabled: true,
    normalizedPath,
  };
}
