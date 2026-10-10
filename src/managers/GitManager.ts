/* ════════════════════════════════════════════════════════════
   🐙 Git Manager — با Action Queue برای جلوگیری از race condition
   ✅ رفع باگ: خواندن description از body
   ════════════════════════════════════════════════════════════ */

import type { GitTasksSettings, Task, Category, CategoryFile, IndexFile, CompletedStats } from '../types';
import { getFile, putFile, getTree } from '../utils/github';
import { getJalaliString, getGregorianString } from '../utils/jalaliDate';

const CATEGORIES_PATH = '_categories.json';
const INDEX_PATH = '_index.json';
const TASKS_DIR = 'tasks';

const DEFAULT_CATEGORIES: CategoryFile = {
    version: 1,
    categories: [
        { id: 'work',     name: 'Work',     name_fa: 'کاری' },
        { id: 'study',    name: 'Study',    name_fa: 'درسی' },
        { id: 'daily',    name: 'Daily',    name_fa: 'روزمره' },
        { id: 'personal', name: 'Personal', name_fa: 'شخصی' },
        { id: 'shopping', name: 'Shopping', name_fa: 'خرید' },
        { id: 'finance',  name: 'Finance',  name_fa: 'مالی' },
        { id: 'health',   name: 'Health',   name_fa: 'سلامتی' },
    ],
};

export class GitManager {
    /* ═══════════════════════════════════════════════════
       🔒 صف نوشتن (Action Queue)
       ═══════════════════════════════════════════════════ */
    private writeChain: Promise<unknown> = Promise.resolve();

    constructor(private getSettings: () => GitTasksSettings) {}

    private get s(): GitTasksSettings {
        return this.getSettings();
    }

    /* ───── صف‌گذار برای عملیات نوشتن ───── */
    private serialize<T>(fn: () => Promise<T>): Promise<T> {
        const next = this.writeChain.then(fn, fn);
        this.writeChain = next.catch(() => undefined);
        return next;
    }

    /* ═══════════════════════════════════════════════════
       🆕 اطمینان از وجود فایل‌های ضروری
       ═══════════════════════════════════════════════════ */
    async ensureRepoFiles(): Promise<{ created: string[] }> {
        return this.serialize(async () => {
            const created: string[] = [];

            /* _categories.json */
            const catFile = await getFile(
                this.s.token, this.s.username, this.s.repo,
                CATEGORIES_PATH, this.s.branch
            );
            if (!catFile) {
                const ok = await putFile(
                    this.s.token, this.s.username, this.s.repo,
                    CATEGORIES_PATH,
                    JSON.stringify(DEFAULT_CATEGORIES, null, 2),
                    'init: create _categories.json',
                    this.s.branch
                );
                if (ok) created.push(CATEGORIES_PATH);
            }

            /* _index.json */
            const idxFile = await getFile(
                this.s.token, this.s.username, this.s.repo,
                INDEX_PATH, this.s.branch
            );
            if (!idxFile) {
                const emptyStats: CompletedStats = {
                    today: 0, yesterday: 0, this_week: 0,
                    last_month: 0, this_year: 0, total: 0,
                };
                const defaultIndex: IndexFile = {
                    version: 1,
                    last_updated: Date.now(),
                    stats: emptyStats,
                };
                const ok = await putFile(
                    this.s.token, this.s.username, this.s.repo,
                    INDEX_PATH,
                    JSON.stringify(defaultIndex, null, 2),
                    'init: create _index.json',
                    this.s.branch
                );
                if (ok) created.push(INDEX_PATH);
            }

            return { created };
        });
    }

    /* ───── خواندن‌ها (بدون صف) ───── */
    async loadCategories(): Promise<Category[]> {
        const file = await getFile(
            this.s.token, this.s.username, this.s.repo,
            CATEGORIES_PATH, this.s.branch
        );
        if (!file) return DEFAULT_CATEGORIES.categories;
        try {
            const parsed: CategoryFile = JSON.parse(file.content);
            return parsed.categories || [];
        } catch { return []; }
    }

    async loadIndex(): Promise<IndexFile | null> {
        const file = await getFile(
            this.s.token, this.s.username, this.s.repo,
            INDEX_PATH, this.s.branch
        );
        if (!file) return null;
        try { return JSON.parse(file.content); } catch { return null; }
    }

    async loadTasks(): Promise<Task[]> {
        const tree = await getTree(
            this.s.token, this.s.username, this.s.repo, this.s.branch
        );

        const taskFolders = tree
            .filter((t: any) => t.type === 'tree' && t.path.startsWith(`${TASKS_DIR}/`))
            .filter((t: any) => {
                const parts = t.path.split('/');
                return parts.length === 2 && parts[1];
            });

        const tasks: Task[] = [];
        const chunks = this.chunk(taskFolders, 10);
        for (const chunk of chunks) {
            const results = await Promise.all(chunk.map((f: any) => this.readTask(f.path)));
            for (const t of results) if (t) tasks.push(t);
        }

        this.sortTasksArray(tasks);
        return tasks;
    }

    /* مرتب‌سازی مشترک */
    sortTasksArray(tasks: Task[]): void {
        tasks.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return b.created_ts - a.created_ts;
        });
    }

    /* ───── خواندن یه تسک ───── */
    private async readTask(folderPath: string): Promise<Task | null> {
        const readmePath = `${folderPath}/README.md`;
        const file = await getFile(
            this.s.token, this.s.username, this.s.repo,
            readmePath, this.s.branch
        );
        if (!file) return null;

        const meta = this.parseFrontmatter(file.content);
        /* 🔥 NEW: محتوای body رو هم می‌خونیم (توضیحات) */
        const body = this.extractBody(file.content);
        const id = folderPath.split('/').pop() || '';

        return {
            id,
            title: meta.title || id,
            /* 🔥 توضیحات: اول از body، اگه خالی بود از meta (پشتیبانی از فایل‌های قدیمی) */
            description: body || meta.description || '',
            category: meta.category || null,
            completed: meta.completed === 'true' || meta.completed === true,
            deleted: meta.deleted === 'true' || meta.deleted === true,
            pinned: meta.pinned === 'true' || meta.pinned === true,
            created_jalali: meta.created_jalali || '',
            created_gregorian: meta.created_gregorian || '',
            created_ts: parseInt(meta.created_ts) || 0,
            updated_ts: parseInt(meta.updated_ts) || 0,
            completed_ts: parseInt(meta.completed_ts) || 0,
            sha: file.sha,
        };
    }

    /* ═══════════════════════════════════════════════════
       ✍️ عملیات نوشتن (همه از صف عبور می‌کنن)
       ═══════════════════════════════════════════════════ */

    async createTask(title: string, description: string, category: string | null): Promise<Task | null> {
        return this.serialize(async () => {
            const now = new Date();
            const id = `${TASKS_DIR}/task-${Date.now()}`;
            const readmePath = `${id}/README.md`;
            const titlePath = `${id}/title.md`;

            const task: Task = {
                id: id.split('/').pop()!,
                title, description, category,
                completed: false, deleted: false, pinned: false,
                created_jalali: getJalaliString(now),
                created_gregorian: getGregorianString(now),
                created_ts: now.getTime(),
                updated_ts: now.getTime(),
                completed_ts: 0,
            };

            const ok1 = await putFile(
                this.s.token, this.s.username, this.s.repo,
                readmePath, this.buildReadme(task),
                `create task: ${title}`, this.s.branch
            );
            if (!ok1) return null;

            await putFile(
                this.s.token, this.s.username, this.s.repo,
                titlePath, `# ${title}\n`,
                `create title: ${title}`, this.s.branch
            );

            return task;
        });
    }

    async updateTask(task: Task, patch: Partial<Task>): Promise<boolean> {
        return this.serialize(async () => {
            const merged: Task = { ...task, ...patch, updated_ts: Date.now() };

            if (patch.completed === true && !task.completed) {
                merged.completed_ts = Date.now();
            }
            if (patch.completed === false && task.completed) {
                merged.completed_ts = 0;
            }

            const readmePath = `${TASKS_DIR}/${task.id}/README.md`;
            const current = await getFile(
                this.s.token, this.s.username, this.s.repo,
                readmePath, this.s.branch
            );
            if (!current) return false;

            const ok = await putFile(
                this.s.token, this.s.username, this.s.repo,
                readmePath, this.buildReadme(merged),
                `update task: ${merged.title}`,
                this.s.branch, current.sha
            );

            /* آپدیت فایل عنوان اگه تغییر کرده */
            if (ok && patch.title && patch.title !== task.title) {
                const titlePath = `${TASKS_DIR}/${task.id}/title.md`;
                const curTitle = await getFile(
                    this.s.token, this.s.username, this.s.repo,
                    titlePath, this.s.branch
                );
                await putFile(
                    this.s.token, this.s.username, this.s.repo,
                    titlePath, `# ${patch.title}\n`,
                    `update title: ${patch.title}`,
                    this.s.branch, curTitle?.sha
                );
            }
            return ok;
        });
    }

    async saveIndex(stats: CompletedStats): Promise<boolean> {
        return this.serialize(async () => {
            const current = await getFile(
                this.s.token, this.s.username, this.s.repo,
                INDEX_PATH, this.s.branch
            );
            const idx: IndexFile = {
                version: 1,
                last_updated: Date.now(),
                stats,
            };
            return putFile(
                this.s.token, this.s.username, this.s.repo,
                INDEX_PATH,
                JSON.stringify(idx, null, 2),
                `update stats: total=${stats.total}`,
                this.s.branch,
                current?.sha
            );
        });
    }

    /* ───── ابزار ───── */
    private buildReadme(t: Task): string {
        return [
            '---',
            `title: "${this.escapeYaml(t.title)}"`,
            `category: ${t.category ? `"${t.category}"` : 'null'}`,
            `completed: ${t.completed}`,
            `deleted: ${t.deleted}`,
            `pinned: ${t.pinned}`,
            `created_jalali: "${t.created_jalali}"`,
            `created_gregorian: "${t.created_gregorian}"`,
            `created_ts: ${t.created_ts}`,
            `updated_ts: ${t.updated_ts}`,
            `completed_ts: ${t.completed_ts}`,
            '---',
            '',
            t.description || '',
        ].join('\n');
    }

    private parseFrontmatter(content: string): Record<string, any> {
        const out: Record<string, any> = {};
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return out;
        for (const line of match[1].split('\n')) {
            const idx = line.indexOf(':');
            if (idx === -1) continue;
            const key = line.slice(0, idx).trim();
            let val: any = line.slice(idx + 1).trim();
            if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            out[key] = val;
        }
        return out;
    }

    /* 🔥 NEW: استخراج محتوای body (بعد از frontmatter) */
    private extractBody(content: string): string {
        const match = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
        return match ? match[1].trim() : '';
    }

    private escapeYaml(s: string): string {
        return s.replace(/"/g, '\\"');
    }

    private chunk<T>(arr: T[], size: number): T[][] {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
    }
}
