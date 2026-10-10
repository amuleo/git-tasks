/* ════════════════════════════════════════════════════════════
   📋 مدیریت منطق تسک‌ها (لایه بالای GitManager)
   ════════════════════════════════════════════════════════════ */

import { Notice } from 'obsidian';
import type { Task, Category, GitTasksSettings, Language } from '../types';
import { GitManager } from './GitManager';
import { CacheManager } from './CacheManager';
import { t } from '../i18n';

export class TaskManager {
    private tasks: Task[] = [];
    private categories: Category[] = [];
    private lastSyncTs = 0;

    constructor(
        private git: GitManager,
        private cache: CacheManager,
        private getSettings: () => GitTasksSettings
    ) {}

    private get s(): GitTasksSettings {
        return this.getSettings();
    }

    private get lang(): Language {
        return this.s.language;
    }

    /* ───── لود اولیه از کش ───── */
    async loadFromCache(): Promise<void> {
        const cached = await this.cache.load();
        if (cached) {
            this.tasks = cached.tasks;
            this.categories = cached.categories;
        }
    }

    /* ───── سینک با گیت‌هاب ───── */
    async sync(showNotice = false): Promise<boolean> {
        if (!this.s.token || !this.s.username || !this.s.repo) {
            return false;
        }
        try {
            /* گرفتن تسک‌ها و دسته‌بندی‌ها به صورت موازی */
            const [tasks, categories] = await Promise.all([
                this.git.loadTasks(),
                this.git.loadCategories(),
            ]);

            this.tasks = tasks;
            this.categories = categories;
            this.lastSyncTs = Date.now();

            /* ذخیره در کش */
            await this.cache.save(tasks, categories);

            if (showNotice) new Notice(t(this.lang, 'notice_sync_ok'));
            return true;
        } catch (e: any) {
            if (showNotice) {
                new Notice(t(this.lang, 'notice_sync_fail', { error: e?.message || 'unknown' }));
            }
            return false;
        }
    }

    /* ───── گرفتن تسک‌های فعال (انجام نشده + حذف نشده) ───── */
    getPendingTasks(): Task[] {
        return this.tasks.filter(t => !t.completed && !t.deleted);
    }

    /* ───── فیلتر بر اساس دسته ───── */
    getPendingByCategory(categoryId: string | null): Task[] {
        const pending = this.getPendingTasks();
        if (!categoryId) return pending;
        return pending.filter(t => t.category === categoryId);
    }

    /* ───── گرفتن دسته‌بندی‌ها ───── */
    getCategories(): Category[] {
        return this.categories;
    }

    /* ───── گرفتن نام دسته با fallback ───── */
    getCategoryName(id: string | null): string {
        if (!id) return t(this.lang, 'panel_no_category');
        const cat = this.categories.find(c => c.id === id);
        if (!cat) return id; // اگه دسته حذف شده بود، خود id رو نشون بده
        return this.lang === 'fa' && cat.name_fa ? cat.name_fa : cat.name;
    }

    /* ───── ساخت تسک ───── */
    async createTask(title: string, description: string, category: string | null): Promise<boolean> {
        const task = await this.git.createTask(title, description, category);
        if (!task) return false;
        this.tasks.unshift(task);
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    /* ───── علامت‌گذاری به عنوان انجام شده ───── */
    async completeTask(task: Task): Promise<boolean> {
        const ok = await this.git.updateTask(task, { completed: true });
        if (!ok) return false;
        const idx = this.tasks.findIndex(t => t.id === task.id);
        if (idx >= 0) this.tasks[idx].completed = true;
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    /* ───── ویرایش تسک ───── */
    async updateTask(task: Task, patch: Partial<Task>): Promise<boolean> {
        const ok = await this.git.updateTask(task, patch);
        if (!ok) return false;
        const idx = this.tasks.findIndex(t => t.id === task.id);
        if (idx >= 0) this.tasks[idx] = { ...this.tasks[idx], ...patch };
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    /* ───── حذف نرم ───── */
    async softDelete(task: Task): Promise<boolean> {
        const ok = await this.git.updateTask(task, { deleted: true });
        if (!ok) return false;
        const idx = this.tasks.findIndex(t => t.id === task.id);
        if (idx >= 0) this.tasks[idx].deleted = true;
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    /* ───── زمان آخرین سینک ───── */
    getLastSyncTs(): number {
        return this.lastSyncTs;
    }
}
