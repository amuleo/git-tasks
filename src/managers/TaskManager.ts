/* ════════════════════════════════════════════════════════════
   📋 Task Manager — منطق تسک‌ها، آمار و پین
   ✅ رفع باگ‌های زمانی (DST، end-of-month، Jalali year/month)
   ✅ رفع باگ پین (بازگشت مقدار درست)
   ✅ به‌روزرسانی داینامیک آمار بعد از تغییر تنظیمات
   ✅ i18n کامل برای پیام‌های همگام‌سازی
   ════════════════════════════════════════════════════════════ */

import type {
    Task,
    Category,
    GitTasksSettings,
    Language,
    CompletedStats,
} from '../types';
import { GitManager } from './GitManager';
import { CacheManager } from './CacheManager';
import { t } from '../i18n';
import {
    startOfDay,
    startOfYesterday,
    startOfDaysAgo,
    getJalaliYearStart,
    getJalaliPrevMonthStart,
    getGregorianYearStart,
    getGregorianPrevMonthStart,
} from '../utils/jalaliDate';

/* حد تحمل برای انحراف ساعت کاربر (۵ دقیقه) */
const CLOCK_DRIFT_TOLERANCE = 5 * 60 * 1000;

export class TaskManager {
    private tasks: Task[] = [];
    private categories: Category[] = [];
    private stats: CompletedStats = {
        today: 0,
        yesterday: 0,
        this_week: 0,
        last_month: 0,
        this_year: 0,
        total: 0,
    };
    private lastSyncTs = 0;

    constructor(
        private git: GitManager,
        private cache: CacheManager,
        private getSettings: () => GitTasksSettings
    ) {}

    /* ───── Getter های کمکی ───── */
    private get s(): GitTasksSettings {
        return this.getSettings();
    }

    private get lang(): Language {
        return this.s.language;
    }

    /* ═══════════════════════════════════════════════════════════
       📥 لود اولیه از کش
       ═══════════════════════════════════════════════════════════ */
    async loadFromCache(): Promise<void> {
        const cached = await this.cache.load();
        if (cached) {
            this.tasks = cached.tasks;
            this.categories = cached.categories;
            /* مرتب‌سازی برای نمایش صحیح پین‌شده‌ها */
            this.git.sortTasksArray(this.tasks);
            /* بازمحاسبه‌ی آمار با تنظیمات فعلی */
            this.recomputeStats();
        }
    }

    /* ═══════════════════════════════════════════════════════════
       🛠️ اطمینان از وجود فایل‌های مخزن
       ═══════════════════════════════════════════════════════════ */
    async ensureRepo(): Promise<string[]> {
        const res = await this.git.ensureRepoFiles();
        return res.created;
    }

    /* ═══════════════════════════════════════════════════════════
       🔄 همگام‌سازی با گیت‌هاب
       ✅ پیام‌ها با زبان کاربر (i18n)
       ═══════════════════════════════════════════════════════════ */
    async sync(
        showToast = false,
        toast?: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void
    ): Promise<boolean> {
        if (!this.s.token || !this.s.username || !this.s.repo) return false;

        try {
            /* اطمینان از وجود _categories.json و _index.json */
            await this.git.ensureRepoFiles();

            /* گرفتن تسک‌ها و دسته‌بندی‌ها به صورت موازی */
            const [tasks, categories] = await Promise.all([
                this.git.loadTasks(),
                this.git.loadCategories(),
            ]);

            this.tasks = tasks;
            this.categories = categories;
            this.lastSyncTs = Date.now();

            /* بازمحاسبه‌ی آمار و ذخیره در index.json */
            this.recomputeStats();
            await this.git.saveIndex(this.stats);

            /* ذخیره در کش محلی */
            await this.cache.save(tasks, categories);

            /* 🔥 پیام ترجمه‌شده */
            if (showToast && toast) {
                toast(t(this.lang, 'notice_sync_ok'), 'success');
            }
            return true;
        } catch (e: any) {
            /* 🔥 پیام خطای ترجمه‌شده */
            if (showToast && toast) {
                toast(
                    t(this.lang, 'notice_sync_fail', { error: e?.message || 'unknown' }),
                    'error'
                );
            }
            return false;
        }
    }

    /* ═══════════════════════════════════════════════════════════
       📊 محاسبه‌ی آمار (با تمام رفع‌های زمانی)

       ✅ DST-safe: از setDate استفاده می‌کنه نه ts - 86400000
       ✅ Jalali-aware: اگه useJalaliDate روشن باشه،
          مرزهای سال و ماه از تقویم شمسی میان
       ✅ end-of-month safe: setDate(1) قبل از setMonth
       ✅ فیلتر تاریخ‌های آینده: جلوگیری از ts معتبر نبودن
       ═══════════════════════════════════════════════════════════ */
    private recomputeStats(): void {
        const now = Date.now();
        const useJalali = this.s.useJalaliDate;

        /* ─── شروع بازه‌ها (DST-safe) ─── */
        const todayStart = startOfDay(now);
        const yesterdayStart = startOfYesterday(now);
        const weekStart = startOfDaysAgo(now, 6);

        /* ─── شروع سال و ماه (بسته به تقویم کاربر) ─── */
        let yearStart: number;
        let prevMonthStart: number;

        if (useJalali) {
            /* تقویم شمسی: از نوروز و اول ماه شمسی قبلی */
            yearStart = getJalaliYearStart(now);
            prevMonthStart = getJalaliPrevMonthStart(now);
        } else {
            /* تقویم میلادی: از ۱ ژانویه و اول ماه میلادی قبلی */
            yearStart = getGregorianYearStart(now);
            prevMonthStart = getGregorianPrevMonthStart(now);
        }

        /* ─── فیلتر تسک‌های انجام‌شده‌ی معتبر ───
           - انجام شده باشن
           - حذف نرم نباشن
           - completed_ts داشته باشن (> 0)
           - تاریخ آینده نداشته باشن (با تحمل ۵ دقیقه برای انحراف ساعت) */
        const upperBound = now + CLOCK_DRIFT_TOLERANCE;
        const completed = this.tasks.filter(
            (t) =>
                t.completed &&
                !t.deleted &&
                t.completed_ts > 0 &&
                t.completed_ts <= upperBound
        );

        /* ─── محاسبه‌ی هر کارت ─── */
        this.stats = {
            today: completed.filter((t) => t.completed_ts >= todayStart).length,

            yesterday: completed.filter(
                (t) =>
                    t.completed_ts >= yesterdayStart &&
                    t.completed_ts < todayStart
            ).length,

            this_week: completed.filter((t) => t.completed_ts >= weekStart).length,

            last_month: completed.filter((t) => t.completed_ts >= prevMonthStart)
                .length,

            this_year: completed.filter((t) => t.completed_ts >= yearStart).length,

            total: completed.length,
        };
    }

    /* ═══════════════════════════════════════════════════════════
       🆕 به‌روزرسانی آمار بعد از تغییر تنظیمات (مثلاً تاگل شمسی)

       وقتی کاربر تاگل تاریخ شمسی رو روشن/خاموش می‌کنه، مرزهای
       سال و ماه عوض می‌شن. این متد فوری آمار رو بازمحاسبه و
       در گیت‌هاب و کش ذخیره می‌کنه.
       ═══════════════════════════════════════════════════════════ */
    async refreshStatsAfterSettingsChange(): Promise<void> {
        this.recomputeStats();
        try {
            await this.git.saveIndex(this.stats);
            await this.cache.save(this.tasks, this.categories);
        } catch (e) {
            /* اگه گیت‌هاب در دسترس نبود، فقط کش محلی رو آپدیت کن */
            console.warn('[Git Tasks] Failed to sync index after settings change:', e);
            try {
                await this.cache.save(this.tasks, this.categories);
            } catch (cacheErr) {
                console.warn('[Git Tasks] Cache save also failed:', cacheErr);
            }
        }
    }

    /* ═══════════════════════════════════════════════════════════
       📋 فیلترها و دسترسی‌ها
       ═══════════════════════════════════════════════════════════ */

    /* تسک‌های در انتظار (انجام نشده + حذف نشده) */
    getPendingTasks(): Task[] {
        return this.tasks.filter((t) => !t.completed && !t.deleted);
    }

    /* تسک‌های انجام‌شده (جدیدترین اول) */
    getCompletedTasks(): Task[] {
        return this.tasks
            .filter((t) => t.completed && !t.deleted)
            .sort((a, b) => b.completed_ts - a.completed_ts);
    }

    /* فیلتر بر اساس دسته */
    getPendingByCategory(categoryId: string | null): Task[] {
        const pending = this.getPendingTasks();
        if (!categoryId) return pending;
        return pending.filter((t) => t.category === categoryId);
    }

    /* دسته‌بندی‌ها */
    getCategories(): Category[] {
        return this.categories;
    }

    /* آمار */
    getStats(): CompletedStats {
        return this.stats;
    }

    /* نام دسته با fallback */
    getCategoryName(id: string | null, noCategoryText: string): string {
        if (!id) return noCategoryText;
        const cat = this.categories.find((c) => c.id === id);
        if (!cat) return id; /* اگه دسته حذف شده بود، خود id رو نشون بده */
        return this.lang === 'fa' && cat.name_fa ? cat.name_fa : cat.name;
    }

    /* ═══════════════════════════════════════════════════════════
       ✍️ عملیات روی تسک‌ها
       ═══════════════════════════════════════════════════════════ */

    /* ───── ساخت تسک جدید ───── */
    async createTask(
        title: string,
        description: string,
        category: string | null
    ): Promise<boolean> {
        const task = await this.git.createTask(title, description, category);
        if (!task) return false;

        this.tasks.unshift(task);
        this.git.sortTasksArray(this.tasks);
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    /* ───── علامت‌گذاری به عنوان انجام شده ───── */
    async completeTask(task: Task): Promise<boolean> {
        const ok = await this.git.updateTask(task, { completed: true });
        if (!ok) return false;

        const idx = this.tasks.findIndex((t) => t.id === task.id);
        if (idx >= 0) {
            this.tasks[idx].completed = true;
            this.tasks[idx].completed_ts = Date.now();
            /* همگام‌سازی با آبجکت ورودی (برای UI) */
            task.completed = true;
            task.completed_ts = this.tasks[idx].completed_ts;
        }

        this.recomputeStats();
        await this.git.saveIndex(this.stats);
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    /* ───── برگرداندن به در انتظار ───── */
    async uncompleteTask(task: Task): Promise<boolean> {
        const ok = await this.git.updateTask(task, { completed: false });
        if (!ok) return false;

        const idx = this.tasks.findIndex((t) => t.id === task.id);
        if (idx >= 0) {
            this.tasks[idx].completed = false;
            this.tasks[idx].completed_ts = 0;
            task.completed = false;
            task.completed_ts = 0;
        }

        this.recomputeStats();
        await this.git.saveIndex(this.stats);
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    /* ───── ویرایش تسک ───── */
    async updateTask(task: Task, patch: Partial<Task>): Promise<boolean> {
        const ok = await this.git.updateTask(task, patch);
        if (!ok) return false;

        const idx = this.tasks.findIndex((t) => t.id === task.id);
        if (idx >= 0) {
            this.tasks[idx] = { ...this.tasks[idx], ...patch };
            /* همگام‌سازی با آبجکت ورودی */
            Object.assign(task, patch);
        }
        this.git.sortTasksArray(this.tasks);
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    /* ───── حذف نرم ───── */
    async softDelete(task: Task): Promise<boolean> {
        const ok = await this.git.updateTask(task, { deleted: true });
        if (!ok) return false;

        const idx = this.tasks.findIndex((t) => t.id === task.id);
        if (idx >= 0) {
            this.tasks[idx].deleted = true;
            task.deleted = true;
        }

        this.recomputeStats();
        await this.git.saveIndex(this.stats);
        await this.cache.save(this.tasks, this.categories);
        return true;
    }

    /* ═══════════════════════════════════════════════════════════
       📌 پین / آنپین (رفع باگ بازگشت مقدار)
       ═══════════════════════════════════════════════════════════ */
    async togglePin(task: Task): Promise<{ ok: boolean; pinned: boolean }> {
        const newVal = !task.pinned;
        const ok = await this.git.updateTask(task, { pinned: newVal });

        if (!ok) {
            /* اگه خطا داشت، مقدار قبلی رو برگردون */
            return { ok: false, pinned: task.pinned };
        }

        /* آپدیت آبجکت توی آرایه */
        const idx = this.tasks.findIndex((t) => t.id === task.id);
        if (idx >= 0) {
            this.tasks[idx].pinned = newVal;
            /* همگام‌سازی با آبجکت ورودی (UI) */
            task.pinned = newVal;
        }

        /* مرتب‌سازی داینامیک: پین‌شده به بالا */
        this.git.sortTasksArray(this.tasks);
        await this.cache.save(this.tasks, this.categories);

        /* مقدار جدید رو برگردون (UI ازش استفاده می‌کنه) */
        return { ok: true, pinned: newVal };
    }

    /* ═══════════════════════════════════════════════════════════
       📊 اطلاعات کمکی
       ═══════════════════════════════════════════════════════════ */
    getLastSyncTs(): number {
        return this.lastSyncTs;
    }

    /* تعداد کل تسک‌ها (فعال + انجام‌شده، بدون حذف‌شده) */
    getTotalCount(): number {
        return this.tasks.filter((t) => !t.deleted).length;
    }

    /* تعداد تسک‌های در انتظار */
    getPendingCount(): number {
        return this.getPendingTasks().length;
    }

    /* تعداد تسک‌های انجام‌شده */
    getCompletedCount(): number {
        return this.getCompletedTasks().length;
    }
}
