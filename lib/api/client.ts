interface RequestJsonOptions {
  method?: string;
  body?: unknown;
  authRequired?: boolean;
  headers?: HeadersInit;
}

async function parseJsonSafe<T>(response: Response): Promise<T | Record<string, never>> {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    return {};
  }
}

export async function requestJson<T>(path: string, options: RequestJsonOptions = {}): Promise<T> {
  const headers: HeadersInit = {
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body:
      options.body === undefined
        ? undefined
        : typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body),
  });

  const data = (await parseJsonSafe<T & { error?: string }>(response)) as T & { error?: string };

  if (!response.ok) {
    if (options.authRequired && (response.status === 401 || response.status === 403)) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    if (response.status === 413) {
      throw new Error('Arquivo muito grande para envio.');
    }

    throw new Error(`Erro na requisição (${response.status}).`);
  }

  return data;
}
