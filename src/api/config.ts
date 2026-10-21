const configured = import.meta.env.VITE_API_URL?.trim();

export const usingMock = !configured;

export const apiBase = configured || `${window.location.origin}/api`;
