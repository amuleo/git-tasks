/* ════════════════════════════════════════════════════════════
   🚀 نقطه ورود پلاگین Git Tasks
   ════════════════════════════════════════════════════════════ */

import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, GitTasksSettings } from './types';
import { GitTasksSettingsTab } from './settings/SettingsTab';
import { TaskPanelView, VIEW_TYPE_GIT_TASKS } from './views/TaskPanelView';
import { GitManager } from './managers/GitManager';
import { TaskManager } from './managers/TaskManager';
import { CacheManager } from './managers/CacheManager';

export default class GitTasksPlugin extends Plugin {
    settings: GitTasksSettings;
    taskManager: TaskManager;
    private gitManager: GitManager;
    private cacheManager: CacheManager;
    private syncIntervalId: number | null = null;

    /* ═══════════════════════════════════════════════════
       🚀 لود پلاگین
       ═══════════════════════════════════════════════════ */
    async onload(): Promise<void> {
        /* لود تنظیمات از data.json */
        await this.loadSettings();

        /* ساخت مدیرها */
        this.cacheManager = new CacheManager(this.app);
        this.gitManager = new GitManager(() => this.settings);
        this.taskManager = new TaskManager(
            this.gitManager,
            this.cacheManager,
            () => this.settings
        );

        /* لود اولیه از کش محلی (برای نمایش سریع) */
        await this.taskManager.loadFromCache();

        /* ثبت پنل تسک‌ها */
        this.registerView(
            VIEW_TYPE_GIT_TASKS,
            (leaf) => new TaskPanelView(leaf, this)
        );

        /* آیکون Ribbon (نوار کناری) */
        this.addRibbonIcon('check-square', 'Git Tasks', () => {
            this.activateView();
        });

        /* تب تنظیمات */
        this.addSettingTab(new GitTasksSettingsTab(this.app, this));

        /* ثبت کامندها */
        this.registerCommands();

        /* شروع سینک خودکار زمان‌دار (اگه فعال باشه) */
        this.restartAutoSync();
    }

    /* ═══════════════════════════════════════════════════
       🧹 پاک‌سازی موقع بسته شدن پلاگین
       ═══════════════════════════════════════════════════ */
    async onunload(): Promise<void> {
        this.stopAutoSync();
    }

    /* ═══════════════════════════════════════════════════
       📋 ثبت کامندها (فقط ۳ تا، ساده و کاربردی)
       ═══════════════════════════════════════════════════ */
    private registerCommands(): void {
        /* کامند ۱: باز کردن پنل */
        this.addCommand({
            id: 'open-panel',
            name: 'Open task panel',
            callback: () => this.activateView(),
        });

        /* کامند ۲: ساخت تسک جدید */
        this.addCommand({
            id: 'new-task',
            name: 'Create new task',
            callback: async () => {
                await this.activateView();
                /* بعد از باز شدن پنل، مودال ساخت رو باز کن */
                const { CreateTaskModal } = await import('./views/CreateTaskModal');
                const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_GIT_TASKS)[0];
                if (leaf) {
                    const view = leaf.view as TaskPanelView;
                    new CreateTaskModal(this.app, this, () => view.refresh()).open();
                }
            },
        });

        /* کامند ۳: سینک دستی */
        this.addCommand({
            id: 'sync-tasks',
            name: 'Sync tasks with GitHub',
            callback: async () => {
                await this.taskManager.sync(true);
                this.refreshPanel();
            },
        });
    }

    /* ═══════════════════════════════════════════════════
       📂 باز کردن / ساخت پنل
       ═══════════════════════════════════════════════════ */
    async activateView(): Promise<void> {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_GIT_TASKS);

        if (leaves.length > 0) {
            /* اگه پنل بازه، همون رو فعال کن */
            leaf = leaves[0];
        } else {
            /* وگرنه یه پنل جدید بساز */
            leaf = workspace.getRightLeaf(false);
            await leaf?.setViewState({
                type: VIEW_TYPE_GIT_TASKS,
                active: true,
            });
        }

        if (leaf) workspace.revealLeaf(leaf);
    }

    /* ═══════════════════════════════════════════════════
       🔄 رفرش پنل (اگه باز باشه)
       ═══════════════════════════════════════════════════ */
    refreshPanel(): void {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GIT_TASKS);
        for (const leaf of leaves) {
            const view = leaf.view as TaskPanelView;
            view.refresh();
        }
    }

    /* ═══════════════════════════════════════════════════
       💾 ذخیره و لود تنظیمات
       ═══════════════════════════════════════════════════ */
    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    /* ═══════════════════════════════════════════════════
       ⏱️ مدیریت سینک خودکار زمان‌دار
       پشتیبانی از اعشار: 0.5 = ۳۰ ثانیه
       ═══════════════════════════════════════════════════ */
    restartAutoSync(): void {
        /* پاک کردن اینتروال قبلی */
        this.stopAutoSync();

        /* اگه مقدار بازه بیشتر از ۰ بود، یه اینتروال جدید بساز */
        const minutes = this.settings.autoSyncInterval;

        /* اعتبارسنجی: باید عدد باشه، بیشتر از ۰، و توکن/مخزن موجود باشه */
        if (
            typeof minutes === 'number' &&
            !isNaN(minutes) &&
            minutes > 0 &&
            this.settings.token &&
            this.settings.repo
        ) {
            /* تبدیل دقیقه به میلی‌ثانیه - پشتیبانی از اعشار */
            /* مثال: 0.5 دقیقه × 60 × 1000 = 30000ms = ۳۰ ثانیه */
            const intervalMs = Math.round(minutes * 60 * 1000);

            /* حداقل بازه: ۵ ثانیه (برای جلوگیری از Rate Limit گیت‌هاب) */
            const safeInterval = Math.max(5000, intervalMs);

            this.syncIntervalId = window.setInterval(async () => {
                await this.taskManager.sync(false);
                this.refreshPanel();
            }, safeInterval);
        }
    }

    /* ───── توقف اینتروال (بدون حذف از حافظه) ───── */
    private stopAutoSync(): void {
        if (this.syncIntervalId !== null) {
            window.clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
    }
}
