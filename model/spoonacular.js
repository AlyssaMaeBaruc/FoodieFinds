require('dotenv').config();

// Server-side Spoonacular calls with a timeout and friendly error messages.

const BASE_URL = 'https://api.spoonacular.com';

// errors with a status code and a message that is safe to show in the app
class SpoonacularError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// path: "/recipes/extract"; query: URL params; form: x-www-form-urlencoded body, or json: JSON body
// (either makes it a POST)
async function spoonacular(path, { query = {}, form = null, json = null, timeoutMs = 20000 } = {}) {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) throw new SpoonacularError(500, 'The server is missing SPOONACULAR_API_KEY in its .env file.');

  const params = new URLSearchParams({ ...query, apiKey });
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}?${params}`, {
      method: form || json ? 'POST' : 'GET',
      headers: form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : json ? { 'Content-Type': 'application/json' } : undefined,
      body: form ? new URLSearchParams(form) : json ? JSON.stringify(json) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') throw new SpoonacularError(504, 'The recipe service took too long to answer.');
    throw new SpoonacularError(502, "Couldn't reach the recipe service.");
  }
  if (response.status === 402) throw new SpoonacularError(503, 'Daily recipe limit reached. Please try again tomorrow.');
  if (!response.ok) throw new SpoonacularError(502, 'The recipe service returned an error.');
  return response.json();
}

module.exports = { spoonacular, SpoonacularError };
