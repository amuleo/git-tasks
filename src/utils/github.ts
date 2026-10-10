/* ════════════════════════════════════════════════════════════
   🐙 لایه ارتباط با GitHub API
   ⚡ بهینه‌سازی برای اینترنت کند:
   ✅ Timeout 15s (به جای انتظار بی‌نهایت)
   ✅ Retry با exponential backoff
   ✅ ETag caching (۳۰۴ = ۱۰× سریع‌تر)
   ✅ User-Agent مخصوص
   ════════════════════════════════════════════════════════════ */

import { requestUrl, RequestUrlResponse } from 'obsidian';

const API_BASE = 'https://api.github.com';

/* ───── تنظیمات بهینه‌سازی ───── */
const TIMEOUT_MS = 15000;          /* ۱۵ ثانیه timeout */
const MAX_RETRIES = 3;             /* ۳ بار تلاش */
const RETRY_DELAYS = [1000, 2500, 5000]; /* تأخیر تدریجی (ms) */

/* ───── کش ETag برای کاهش درخواست‌های GET ───── */
interface ETagEntry {
    etag: string;
    content: string;
    sha: string;
    ts: number;
}
const etagCache = new Map<string, ETagEntry>();

/* ═══════════════════════════════════════════════════════════
   🔥 درخواست پایه با Timeout + Retry
   ═══════════════════════════════════════════════════════════ */
async function ghRequest(
    method: string,
    path: string,
    token: string,
    body?: object,
    extraHeaders?: Record<string, string>
): Promise<RequestUrlResponse> {
    let lastError: any = null;

    /* ─── تلاش‌های متوالی با backoff ─── */
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            /* Timeout با Promise.race */
            const result = await Promise.race([
                requestUrl({
                    url: `${API_BASE}${path}`,
                    method,
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/vnd.github+json',
                        'X-GitHub-Api-Version': '2022-11-28',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Git-Tasks-Obsidian-Plugin',
                        ...(extraHeaders || {}),
                    },
                    body: body ? JSON.stringify(body) : undefined,
                    throw: false,
                }),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
                ),
            ]);

            /* اگه rate limit خوردیم، ادامه ندیم */
            if (result.status === 429) {
                console.warn('[Git Tasks] Rate limit hit');
                return result;
            }

            /* اگه خطای سروری بود (5xx)، retry کن */
            if (result.status >= 500 && attempt < MAX_RETRIES - 1) {
                await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
                continue;
            }

            /* موفق یا خطای کلاینت (4xx) → برگردون */
            return result;
        } catch (e: any) {
            lastError = e;

            /* اگه timeout یا شبکه بود، retry کن */
            if (attempt < MAX_RETRIES - 1) {
                console.warn(`[Git Tasks] Request failed (attempt ${attempt + 1}), retrying...`);
                await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
                continue;
            }
        }
    }

    /* همه تلاش‌ها fail شدن */
    throw lastError || new Error('All retries failed');
}

/* ═══════════════════════════════════════════════════════════
   🔐 تست اتصال
   ═══════════════════════════════════════════════════════════ */
export async function getAuthenticatedUser(token: string): Promise<{ login: string } | null> {
    const res = await ghRequest('GET', '/user', token);
    if (res.status !== 200) return null;
    return res.json;
}

/* ═══════════════════════════════════════════════════════════
   📚 لیست مخزن‌ها
   ═══════════════════════════════════════════════════════════ */
export async function listRepos(token: string): Promise<any[]> {
    const res = await ghRequest('GET', '/user/repos?per_page=100&sort=updated', token);
    if (res.status !== 200) return [];
    return res.json;
}

/* ═══════════════════════════════════════════════════════════
   📄 خواندن فایل با ETag caching
   ✅ اگه فایل تغییر نکرده باشه، 304 سریع میاد
   ═══════════════════════════════════════════════════════════ */
export async function getFile(
    token: string,
    owner: string,
    repo: string,
    path: string,
    branch: string
): Promise<{ content: string; sha: string } | null> {
    const cacheKey = `${owner}/${repo}/${branch}/${path}`;
    const cached = etagCache.get(cacheKey);

    const headers: Record<string, string> = {};
    if (cached?.etag) {
        headers['If-None-Match'] = cached.etag;
    }

    const res = await ghRequest(
        'GET',
        `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        token,
        undefined,
        headers
    );

    /* 304 = فایل تغییر نکرده → از کش استفاده کن */
    if (res.status === 304 && cached) {
        return { content: cached.content, sha: cached.sha };
    }

    if (res.status !== 200) return null;

    const data = res.json;
    const content = decodeBase64UTF8(data.content.replace(/\n/g, ''));

    /* ذخیره ETag برای دفعه بعد */
    const etag = res.headers['etag'] || res.headers['ETag'];
    if (etag) {
        etagCache.set(cacheKey, {
            etag,
            content,
            sha: data.sha,
            ts: Date.now(),
        });
    }

    return { content, sha: data.sha };
}

/* ═══════════════════════════════════════════════════════════
   ✍️ نوشتن فایل
   ═══════════════════════════════════════════════════════════ */
export async function putFile(
    token: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string
): Promise<boolean> {
    const body: any = {
        message,
        content: encodeBase64UTF8(content),
        branch,
    };
    if (sha) body.sha = sha;

    const res = await ghRequest('PUT', `/repos/${owner}/${repo}/contents/${path}`, token, body);

    /* اگه موفق بود، کش رو invalidate کن */
    if (res.status === 200 || res.status === 201) {
        const cacheKey = `${owner}/${repo}/${branch}/${path}`;
        etagCache.delete(cacheKey);
        return true;
    }
    return false;
}

/* ═══════════════════════════════════════════════════════════
   🌲 گرفتن درخت مخزن
   ═══════════════════════════════════════════════════════════ */
export async function getTree(
    token: string,
    owner: string,
    repo: string,
    branch: string
): Promise<any[]> {
    const refRes = await ghRequest('GET', `/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
    if (refRes.status !== 200) return [];

    const treeSha = refRes.json.object.sha;
    const treeRes = await ghRequest(
        'GET',
        `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
        token
    );
    if (treeRes.status !== 200) return [];
    return treeRes.json.tree || [];
}

/* ═══════════════════════════════════════════════════════════
   🧹 پاک کردن کش ETag (موقع logout یا تغییر مخزن)
   ═══════════════════════════════════════════════════════════ */
export function clearETagCache(): void {
    etagCache.clear();
}

/* ═══════════════════════════════════════════════════════════
   🔤 انکود/دیکود Base64 با UTF-8
   ═══════════════════════════════════════════════════════════ */
function encodeBase64UTF8(str: string): string {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decodeBase64UTF8(b64: string): string {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}
