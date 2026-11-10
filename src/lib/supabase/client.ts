"use client";

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    credentials: "same-origin",
    cache: init.cache ?? "no-store",
  });
}
