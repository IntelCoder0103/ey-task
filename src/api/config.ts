export const apiBase = import.meta.env.VITE_API_URL?.trim() || `${window.location.origin}/api`;

export const showDemoHint = import.meta.env.VITE_DEMO_HINT === 'true';
