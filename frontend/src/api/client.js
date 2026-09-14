const ACCESS_KEY = 'lms_access_token';

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
export const setAccessToken = (token) => {
  if (token) localStorage.setItem(ACCESS_KEY, token);
  else localStorage.removeItem(ACCESS_KEY);
};

let refreshing = null;

async function parseJson(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    if (/proxy error|econnrefused/i.test(text)) {
      throw new Error(
        'API is not running. Start the backend with npm run dev in the backend folder.'
      );
    }
    if (/FUNCTION_INVOCATION_FAILED|INTERNAL_SERVER_ERROR/i.test(text)) {
      throw new Error('The API is starting or crashed on the host. Wait a few seconds and try again.');
    }
    throw new Error('The server returned an invalid response. Is the backend running?');
  }
}

async function refreshAccessToken() {
  if (!refreshing) {
    refreshing = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
      .then(async (res) => {
        const body = await parseJson(res);
        if (!res.ok) throw new Error(body.message || 'Session expired');
        setAccessToken(body.data.accessToken);
        return body.data.accessToken;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function api(path, options = {}, retry = true) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers || {}),
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(path, {
      ...options,
      headers,
      credentials: 'include',
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error(
      'Cannot reach the API. Start the backend on port 5000.'
    );
  }

  if (res.status === 401 && retry && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
    try {
      await refreshAccessToken();
      return api(path, options, false);
    } catch {
      setAccessToken(null);
    }
  }

  const body = await parseJson(res);
  if (!res.ok) {
    const err = new Error(body.message || 'Request failed');
    err.status = res.status;
    err.errors = body.errors;
    throw err;
  }
  return body;
}
