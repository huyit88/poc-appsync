/**
 * Environment variable utilities for k6
 */

export function getRequiredEnv(name) {
  const value = __ENV[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export function getEnv(name, defaultValue) {
  return __ENV[name] || defaultValue;
}

export function getIntEnv(name, defaultValue) {
  const value = __ENV[name];
  return value ? parseInt(value, 10) : defaultValue;
}

