/**
 * kv caching utilities with ttl and graceful degradation
 */

import type { Env } from '../types';

export interface CacheOptions {
  ttl?: number; // time to live in seconds
  expirationTtl?: number; // cloudflare kv expiration time
}

/**
 * get value from kv cache with optional json parsing
 */
export async function kvGet<T>(
  env: Env,
  key: string,
  parseJson: boolean = false
): Promise<T | null> {
  try {
    const value = await env.CONTENT_KV.get(key);
    if (!value) return null;

    if (parseJson) {
      return JSON.parse(value) as T;
    }
    return value as T;
  } catch (error) {
    console.error(`kv cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * set value in kv cache with optional json serialisation and ttl
 */
export async function kvSet(
  env: Env,
  key: string,
  value: any,
  options: CacheOptions = {}
): Promise<void> {
  try {
    const serialised = typeof value === 'string' ? value : JSON.stringify(value);

    const putOptions: any = {};
    if (options.expirationTtl) {
      putOptions.expirationTtl = options.expirationTtl;
    }

    await env.CONTENT_KV.put(key, serialised, putOptions);
  } catch (error) {
    console.error(`kv cache set error for key ${key}:`, error);
    // fail silently - caching is not critical
  }
}

/**
 * get with graceful fallback - tries cache first, then executes fallback function
 */
export async function kvGetWithFallback<T>(
  env: Env,
  key: string,
  fallbackFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // try cache first
  const cached = await kvGet<T>(env, key, true);
  if (cached) {
    return cached;
  }

  // execute fallback and cache result
  const result = await fallbackFn();

  // cache for future requests
  if (options.ttl) {
    await kvSet(env, key, result, { expirationTtl: options.ttl });
  }

  return result;
}

/**
 * load markdown content from kv storage
 */
export async function loadContentFromKV(
  env: Env,
  platform: string,
  filename: string
): Promise<string | null> {
  const key = `content:${platform}:${filename}`;
  return kvGet<string>(env, key, false);
}

/**
 * cache api response in kv
 */
export async function cacheAPIResponse<T>(
  env: Env,
  cacheKey: string,
  apiFn: () => Promise<T>,
  ttl: number = 600 // 10 minutes default
): Promise<T> {
  return kvGetWithFallback(env, cacheKey, apiFn, { ttl });
}
