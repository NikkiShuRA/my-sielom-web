/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
export class HttpError extends Error {
  override readonly name = "HttpError";
  readonly status: number;

  constructor(status: number, options?: ErrorOptions) {
    super(`HTTP ${status}`, options);
    this.status = status;
  }
}

export type FetchJsonOptions = {
  fetch?: typeof fetch;
  timeoutMs?: number;
  priority?: "high" | "low" | "auto";
};

/** Дольше 20 с ждать бессмысленно: сервер завис, а не медленно отвечает */
export const fetchJson = async (
  url: string,
  { fetch: doFetch = globalThis.fetch.bind(globalThis), timeoutMs = 20000, priority }: FetchJsonOptions = {},
): Promise<unknown> => {
  const init: RequestInit & { priority?: string } = { signal: AbortSignal.timeout(timeoutMs) };
  if (priority) init.priority = priority;
  const response = await doFetch(url, init);
  if (!response.ok) throw new HttpError(response.status);
  return response.json();
};
