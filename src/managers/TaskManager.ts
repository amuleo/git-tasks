/* ════════════════════════════════════════════════════════════
   📋 منطق تسک‌ها + آمار + پین
   ════════════════════════════════════════════════════════════ */

import { Notice } from 'obsidian';
import type { Task, Category, GitTasksSettings, Language, CompletedStats } from '../types';
import { GitManager } from './GitManager';
import { CacheManager } from './CacheManager';
import { t } from '../i18n';

export class TaskManager {
    private tasks: Task[] = [];
    private categories: Category[] = [];
    private stats: CompletedStats = {
        today: 0, yesterday: 0, this_week: 0,
        last_month: 0, this_year: 0, total: 0,
    };
    private lastSyncTs = 0;

    constructor(
        private git: GitManager,
        private cache: CacheManager,
        private getSettings: () => GitTasksSettings
    ) {}

    private get s(): GitTasksSettings { return this.getSettings(); }
    private get lang(): Language { return this.s.language; }

    /* ───── لود از کش ───── */
    async loadFromCache(): Promise<void> {
        const cached = await this.cache.load();
        if (cached) {
            this.tasks = cached.tasks;
            this.categories = cached.categories;
            this.recomputeStats();
        }
    }

    /* ───── اطمینان از فایل‌های مخزن ───── */
    async ensureRepo(): Promise<string[]> {
        const res = await this.git.ensureRepoFiles();
        return res.created;
    }

    /* ───── سینک با گیت‌هاب ───── */
    async sync(showNotice = false): Promise<boolean> {
        if (!this.s.token || !this.s.username || !this.s.repo) return false;
        try {
            /* اول مطمئن شو فایل‌های ضروری هستن */
            await this.git.ensureRepoFiles();

            const [tasks, categories] = await Promise.all([
                this.git.loadTasks(),
                this.git.loadCategories(),
            ]);
            this.tasks = tasks;
            this.categories = categories;
            this.lastSyncTs = Date.now();

            /* محاسبه و ذخیره آمار در index.json */
            this.recomputeStats();
            await this.git.saveIndex(this.stats);

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

    /* ═══════════════════════════════════════════════════
       📊 محاسبه‌ی آمار (برای index.json)
       ═══════════════════════════════════════════════════ */
    private recomputeStats(): void {
        const now = Date.now();
        const todayStart = this.getDayStart(now);
        const yesterdayStart = todayStart - 86400000;
        const weekStart = todayStart - 6 * 86400000;
        const yearStart = this.getYearStart(now);

        /* شروع ماه گذشته */
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1, 1);
        d.setHours(0, 0, 0, 0);
        const lastMonthStart = d.getTime();

        const completed = this.tasks.filter(t => t.completed && !t.deleted && t.completed_ts > 0);

        this.stats = {
            today: completed.filter(t => t.completed_ts >= todayStart).length,
            yesterday: completed.filter(t =>
                t.completed_ts >= yesterdayStart && t.completed_ts < todayStart
            ).length,
            this_week: completed.filter(t => t.completed_ts >= weekStart).length,
            last_month: completed.filter(t => t.completed_ts >= lastMonthStart).length,
            this_year: completed.filter(t => t.completed_ts >= yearStart).length,
            total: completed.length,
        };
    }

    private getDayStart(ts: number): number {
        const d = new Date(ts);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }

    private getYearStart(ts: number): number {
        const d = new Date(ts);
        d.setMonth(0, 1);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }

    /* ───── فیلترها ───── */
    getPendingTasks(): Task[] {
        return this.tasks.filter(t => !t.completed && !t.deleted);
    }

    getCompletedTasks(): Task[] {
        return this.tasks
            .filter(t => t.completed && !t.deleted)
            .sort((a, b) => b.completed_ts - a.completed_ts);
    }

    getPendingByCategory(categoryId: string | null): Task[] {
        const pending = this.getPendingTasks();
        if (!categoryId) return pending;
        return pending.filter(t => t.category === categoryId);
    }

    getCategories(): Category[] { return this.categories; }
    getStats(): CompletedStats { return this.stats; }

    getCategoryName(id: string | null): string {
        if (!id) return t(this.lang, 'panel_no_category');
        const cat = this.categories.find(c => c.id === id);
        if (!cat) return id;
        return this.lang === 'fa' && cat.name_fa ? cat.name_fa : cat.name;
    }

    /* ───── عملیات ───── */
    async createTask(title: string, description: string, category: string | null): Promise<boolean> {
        const task = await this.git.createTask(title, description, category);
        if (!task) return false;
        this.tasks.unshift(task);
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    async completeTask(task: Task): Promise<boolean> {
        const ok = await this.git.updateTask(task, { completed: true });
        if (!ok) return false;
        const idx = this.tasks.findIndex(t => t.id === task.id);
        if (idx >= 0) {
            this.tasks[idx].completed = true;
            this.tasks[idx].completed_ts = Date.now();
        }
        /* آپدیت آمار */
        this.recomputeStats();
        await this.git.saveIndex(this.stats);
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    async uncompleteTask(task: Task): Promise<boolean> {
        const ok = await this.git.updateTask(task, { completed: false });
        if (!ok) return false;
        const idx = this.tasks.findIndex(t => t.id === task.id);
        if (idx >= 0) {
            this.tasks[idx].completed = false;
            this.tasks[idx].completed_ts = 0;
        }
        this.recomputeStats();
        await this.git.saveIndex(this.stats);
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    async updateTask(task: Task, patch: Partial<Task>): Promise<boolean> {
        const ok = await this.git.updateTask(task, patch);
        if (!ok) return false;
        const idx = this.tasks.findIndex(t => t.id === task.id);
        if (idx >= 0) this.tasks[idx] = { ...this.tasks[idx], ...patch };
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    async softDelete(task: Task): Promise<boolean> {
        const ok = await this.git.updateTask(task, { deleted: true });
        if (!ok) return false;
        const idx = this.tasks.findIndex(t => t.id === task.id);
        if (idx >= 0) this.tasks[idx].deleted = true;
        this.recomputeStats();
        await this.git.saveIndex(this.stats);
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    /* 🆕 پین / آنپین */
    async togglePin(task: Task): Promise<boolean> {
        const newVal = !task.pinned;
        const ok = await this.git.updateTask(task, { pinned: newVal });
        if (!ok) return false;
        const idx = this.tasks.findIndex(t => t.id === task.id);
        if (idx >= 0) this.tasks[idx].pinned = newVal;
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    getLastSyncTs(): number { return this.lastSyncTs; }
}
