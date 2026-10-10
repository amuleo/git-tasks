/* ════════════════════════════════════════════════════════════
   🐙 لایه ارتباط با GitHub API
   ════════════════════════════════════════════════════════════ */

import { requestUrl, RequestUrlResponse } from 'obsidian';

const API_BASE = 'https://api.github.com';

/* درخواست پایه با هدرهای لازم */
async function ghRequest(
    method: string,
    path: string,
    token: string,
    body?: object
): Promise<RequestUrlResponse> {
    return requestUrl({
        url: `${API_BASE}${path}`,
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        throw: false,
    });
}

/* ───── تست اتصال: پروفایل کاربر رو برمی‌گردونه ───── */
export async function getAuthenticatedUser(token: string): Promise<{ login: string } | null> {
    const res = await ghRequest('GET', '/user', token);
    if (res.status !== 200) return null;
    return res.json;
}

/* ───── گرفتن لیست مخزن‌های کاربر ───── */
export async function listRepos(token: string): Promise<any[]> {
    const res = await ghRequest('GET', '/user/repos?per_page=100&sort=updated', token);
    if (res.status !== 200) return [];
    return res.json;
}

/* ───── گرفتن محتوای یه فایل از مخزن ───── */
export async function getFile(
    token: string,
    owner: string,
    repo: string,
    path: string,
    branch: string
): Promise<{ content: string; sha: string } | null> {
    const res = await ghRequest(
        'GET',
        `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        token
    );
    if (res.status !== 200) return null;
    const data = res.json;
    /* محتوای Base64 رو دیکد می‌کنیم */
    const content = decodeBase64UTF8(data.content.replace(/\n/g, ''));
    return { content, sha: data.sha };
}

/* ───── ساخت یا آپدیت یه فایل ───── */
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
    return res.status === 200 || res.status === 201;
}

/* ───── گرفتن کل درخت مخزن (برای پیدا کردن فولدر تسک‌ها) ───── */
export async function getTree(
    token: string,
    owner: string,
    repo: string,
    branch: string
): Promise<any[]> {
    /* اول باید SHA شاخه رو بگیریم */
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

/* ───── انکود/دیکود Base64 با پشتیبانی UTF-8 (برای فارسی) ───── */
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
