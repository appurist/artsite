/**
 * Simple router utility for Workers
 */

export function createRouter() {
  const routes = new Map();

  function get(path, handler) {
    routes.set(`GET:${path}`, handler);
  }

  function post(path, handler) {
    routes.set(`POST:${path}`, handler);
  }

  function put(path, handler) {
    routes.set(`PUT:${path}`, handler);
  }

  function delete_(path, handler) {
    routes.set(`DELETE:${path}`, handler);
  }

  function handle(request) {
    const url = new URL(request.url);
    const key = `${request.method}:${url.pathname}`;
    
    const handler = routes.get(key);
    if (handler) {
      return handler(request);
    }

    // Try pattern matching for dynamic routes
    for (const [routeKey, routeHandler] of routes.entries()) {
      const [method, pattern] = routeKey.split(':');
      if (method === request.method && matchPattern(pattern, url.pathname)) {
        return routeHandler(request);
      }
    }

    return new Response('Not Found', { status: 404 });
  }

  return { get, post, put, delete: delete_, handle };
}

function matchPattern(pattern, path) {
  // Simple pattern matching - could be enhanced for more complex routes
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  if (patternParts.length !== pathParts.length) {
    return false;
  }

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      // This is a parameter, skip validation
      continue;
    }

    if (patternPart !== pathPart) {
      return false;
    }
  }

  return true;
}

export const router = createRouter();