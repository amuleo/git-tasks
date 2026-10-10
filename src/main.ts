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

    async onload(): Promise<void> {
        /* لود تنظیمات */
        await this.loadSettings();

        /* ساخت مدیرها */
        this.cacheManager = new CacheManager(this.app);
        this.gitManager = new GitManager(() => this.settings);
        this.taskManager = new TaskManager(
            this.gitManager,
            this.cacheManager,
            () => this.settings
        );

        /* لود اولیه از کش */
        await this.taskManager.loadFromCache();

        /* ثبت View */
        this.registerView(
            VIEW_TYPE_GIT_TASKS,
            (leaf) => new TaskPanelView(leaf, this)
        );

        /* آیکون Ribbon */
        this.addRibbonIcon('check-square', 'Git Tasks', () => {
            this.activateView();
        });

        /* تب تنظیمات */
        this.addSettingTab(new GitTasksSettingsTab(this.app, this));

        /* کامندها (فقط ۳ تا، بدون کامند پویا) */
        this.addCommand({
            id: 'open-panel',
            name: 'Open task panel',
            callback: () => this.activateView(),
        });

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

        this.addCommand({
            id: 'sync-tasks',
            name: 'Sync tasks with GitHub',
            callback: async () => {
                await this.taskManager.sync(true);
                this.refreshPanel();
            },
        });

        /* شروع سینک خودکار زمان‌دار (اگه فعال باشه) */
        this.restartAutoSync();
    }

    async onunload(): Promise<void> {
        /* پاک کردن اینتروال */
        if (this.syncIntervalId) {
            window.clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
    }

    /* ───── فعال‌سازی پنل ───── */
    async activateView(): Promise<void> {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_GIT_TASKS);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            await leaf?.setViewState({
                type: VIEW_TYPE_GIT_TASKS,
                active: true,
            });
        }

        if (leaf) workspace.revealLeaf(leaf);
    }

    /* ───── رفرش پنل ───── */
    refreshPanel(): void {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GIT_TASKS);
        for (const leaf of leaves) {
            const view = leaf.view as TaskPanelView;
            view.refresh();
        }
    }

    /* ───── ذخیره و لود تنظیمات ───── */
    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    /* ───── مدیریت اینتروال سینک خودکار ───── */
    restartAutoSync(): void {
        /* پاک کردن اینتروال قبلی */
        if (this.syncIntervalId !== null) {
            window.clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }

        /* اگه مقدار بازه بیشتر از ۰ بود، یه اینتروال جدید بساز */
        const minutes = this.settings.autoSyncInterval;
        if (minutes > 0 && this.settings.token && this.settings.repo) {
            this.syncIntervalId = window.setInterval(async () => {
                await this.taskManager.sync(false);
                this.refreshPanel();
            }, minutes * 60 * 1000);
        }
    }
}
