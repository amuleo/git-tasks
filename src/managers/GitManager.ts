/* ════════════════════════════════════════════════════════════
   🐙 مدیریت عملیات گیت‌هاب (تسک‌ها + دسته‌بندی‌ها)
   ════════════════════════════════════════════════════════════ */

import type { GitTasksSettings, Task, Category, CategoryFile } from '../types';
import { getFile, putFile, getTree } from '../utils/github';
import { getJalaliString, getGregorianString } from '../utils/jalaliDate';

const CATEGORIES_PATH = '_categories.json';
const TASKS_DIR = 'tasks';

export class GitManager {
    constructor(private getSettings: () => GitTasksSettings) {}

    private get s(): GitTasksSettings {
        return this.getSettings();
    }

    /* ───── خواندن فایل دسته‌بندی‌ها ───── */
    async loadCategories(): Promise<Category[]> {
        const file = await getFile(
            this.s.token,
            this.s.username,
            this.s.repo,
            CATEGORIES_PATH,
            this.s.branch
        );
        if (!file) return [];
        try {
            const parsed: CategoryFile = JSON.parse(file.content);
            return parsed.categories || [];
        } catch {
            return [];
        }
    }

    /* ───── خواندن لیست تسک‌ها ───── */
    async loadTasks(): Promise<Task[]> {
        /* گرفتن کل درخت مخزن */
        const tree = await getTree(
            this.s.token,
            this.s.username,
            this.s.repo,
            this.s.branch
        );

        /* فیلتر فولدرهای تسک: tasks/xxx */
        const taskFolders = tree
            .filter((t: any) => t.type === 'tree' && t.path.startsWith(`${TASKS_DIR}/`))
            .filter((t: any) => {
                const parts = t.path.split('/');
                return parts.length === 2 && parts[1];
            });

        const tasks: Task[] = [];

        /* خوندن README هر تسک به صورت موازی (محدود به ۱۰ درخواست همزمان) */
        const chunks = this.chunk(taskFolders, 10);
        for (const chunk of chunks) {
            const results = await Promise.all(chunk.map((f: any) => this.readTask(f.path)));
            for (const t of results) {
                if (t) tasks.push(t);
            }
        }

        /* مرتب‌سازی بر اساس تاریخ ایجاد (جدیدترین اول) */
        tasks.sort((a, b) => b.created_ts - a.created_ts);
        return tasks;
    }

    /* ───── خواندن یه تسک از README ───── */
    private async readTask(folderPath: string): Promise<Task | null> {
        const readmePath = `${folderPath}/README.md`;
        const file = await getFile(
            this.s.token,
            this.s.username,
            this.s.repo,
            readmePath,
            this.s.branch
        );
        if (!file) return null;

        const meta = this.parseFrontmatter(file.content);
        const id = folderPath.split('/').pop() || '';

        return {
            id,
            title: meta.title || id,
            description: meta.description || '',
            category: meta.category || null,
            completed: meta.completed === 'true' || meta.completed === true,
            deleted: meta.deleted === 'true' || meta.deleted === true,
            created_jalali: meta.created_jalali || '',
            created_gregorian: meta.created_gregorian || '',
            created_ts: parseInt(meta.created_ts) || 0,
            updated_ts: parseInt(meta.updated_ts) || 0,
            sha: file.sha,
        };
    }

    /* ───── ساخت تسک جدید در گیت‌هاب ───── */
    async createTask(
        title: string,
        description: string,
        category: string | null
    ): Promise<Task | null> {
        const now = new Date();
        const id = `${TASKS_DIR}/task-${Date.now()}`;
        const readmePath = `${id}/README.md`;
        const titlePath = `${id}/title.md`;

        const task: Task = {
            id: id.split('/').pop()!,
            title,
            description,
            category,
            completed: false,
            deleted: false,
            created_jalali: getJalaliString(now),
            created_gregorian: getGregorianString(now),
            created_ts: now.getTime(),
            updated_ts: now.getTime(),
        };

        const readmeContent = this.buildReadme(task);
        const titleContent = `# ${title}\n`;

        /* ساخت README */
        const ok1 = await putFile(
            this.s.token, this.s.username, this.s.repo,
            readmePath, readmeContent,
            `create task: ${title}`,
            this.s.branch
        );
        if (!ok1) return null;

        /* ساخت فایل عنوان */
        await putFile(
            this.s.token, this.s.username, this.s.repo,
            titlePath, titleContent,
            `create title: ${title}`,
            this.s.branch
        );

        return task;
    }

    /* ───── ویرایش تسک ───── */
    async updateTask(task: Task, patch: Partial<Task>): Promise<boolean> {
        const merged: Task = { ...task, ...patch, updated_ts: Date.now() };
        const readmePath = `${TASKS_DIR}/${task.id}/README.md`;

        /* برای ویرایش، اول باید SHA جدید بگیریم */
        const current = await getFile(
            this.s.token, this.s.username, this.s.repo,
            readmePath, this.s.branch
        );
        if (!current) return false;

        const content = this.buildReadme(merged);
        const ok = await putFile(
            this.s.token, this.s.username, this.s.repo,
            readmePath, content,
            `update task: ${merged.title}`,
            this.s.branch,
            current.sha
        );

        /* آپدیت فایل عنوان در صورت تغییر */
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
                this.s.branch,
                curTitle?.sha
            );
        }

        return ok;
    }

    /* ───── ساخت متن README با Frontmatter ───── */
    private buildReadme(t: Task): string {
        const fm = [
            '---',
            `title: "${this.escapeYaml(t.title)}"`,
            `category: ${t.category ? `"${t.category}"` : 'null'}`,
            `completed: ${t.completed}`,
            `deleted: ${t.deleted}`,
            `created_jalali: "${t.created_jalali}"`,
            `created_gregorian: "${t.created_gregorian}"`,
            `created_ts: ${t.created_ts}`,
            `updated_ts: ${t.updated_ts}`,
            '---',
            '',
            t.description || '',
        ].join('\n');
        return fm;
    }

    /* ───── پارس کردن Frontmatter ساده (بدون پکیج) ───── */
    private parseFrontmatter(content: string): Record<string, any> {
        const out: Record<string, any> = {};
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return out;
        const lines = match[1].split('\n');
        for (const line of lines) {
            const idx = line.indexOf(':');
            if (idx === -1) continue;
            const key = line.slice(0, idx).trim();
            let val: any = line.slice(idx + 1).trim();
            /* حذف کوتیشن‌ها */
            if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            out[key] = val;
        }
        return out;
    }

    /* ───── فرار دادن کاراکترهای خاص در YAML ───── */
    private escapeYaml(s: string): string {
        return s.replace(/"/g, '\\"');
    }

    /* ───── تبدیل آرایه به تکه‌های کوچک ───── */
    private chunk<T>(arr: T[], size: number): T[][] {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
            out.push(arr.slice(i, i + size));
        }
        return out;
    }
}
