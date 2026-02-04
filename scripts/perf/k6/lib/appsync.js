/**
 * AppSync GraphQL request utilities
 */

import http from 'k6/http';

export function createAppSyncRequest(url, apiKey, query, variables) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  };

  const body = JSON.stringify({
    query,
    variables: variables || {},
  });

  return http.post(url, body, { headers });
}

export function parseGraphQLResponse(response) {
  try {
    return JSON.parse(response.body);
  } catch (error) {
    return null;
  }
}

export function hasGraphQLErrors(json) {
  return json && json.errors && json.errors.length > 0;
}

