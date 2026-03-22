const TOKEN_KEY = "harbor_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    // Decode payload (no signature check — server validates)
    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload));
    const exp = decoded.exp as number | undefined;
    if (exp && Date.now() / 1000 > exp) {
      clearToken();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
