/* ════════════════════════════════════════════════════════════
   🚀 نقطه ورود پلاگین Git Tasks
   ✅ رفع خطای ENOENT (data.json و cache.json)
   ✅ رفع خطای view.refresh
   ════════════════════════════════════════════════════════════ */

import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, GitTasksSettings } from './types';
import { GitTasksSettingsTab } from './settings/SettingsTab';
import { TaskPanelView, VIEW_TYPE_GIT_TASKS } from './views/TaskPanelView';
import { GitManager } from './managers/GitManager';
import { TaskManager } from './managers/TaskManager';
import { CacheManager } from './managers/CacheManager';
import { ToastManager } from './managers/ToastManager';

export default class GitTasksPlugin extends Plugin {
    settings: GitTasksSettings;
    taskManager: TaskManager;
    toastManager: ToastManager;
    private gitManager: GitManager;
    private cacheManager: CacheManager;
    private syncIntervalId: number | null = null;

    async onload(): Promise<void> {
        await this.loadSettings();

        this.toastManager = new ToastManager();
        this.toastManager.setRTL(this.settings.language === 'fa');

        this.cacheManager = new CacheManager(this.app);
        this.gitManager = new GitManager(() => this.settings);
        this.taskManager = new TaskManager(
            this.gitManager,
            this.cacheManager,
            () => this.settings
        );

        /* 🆕 لود از کش با محافظت از خطا */
        try {
            await this.taskManager.loadFromCache();
        } catch (e) {
            /* اگه cache.json وجود نداشت یا خراب بود، بی‌صدا رد شو */
            console.debug('[Git Tasks] No cache yet, skipping');
        }

        this.registerView(
            VIEW_TYPE_GIT_TASKS,
            (leaf) => new TaskPanelView(leaf, this)
        );

        this.addRibbonIcon('check-square', 'Git Tasks', () => this.activateView());

        this.addSettingTab(new GitTasksSettingsTab(this.app, this));

        this.registerCommands();
        this.restartAutoSync();
    }

    async onunload(): Promise<void> {
        this.stopAutoSync();
        if (this.toastManager) this.toastManager.destroy();
    }

    private registerCommands(): void {
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
                await this.taskManager.sync(true, (msg, type) =>
                    this.toastManager.show(msg, type)
                );
                this.refreshPanel();
            },
        });
    }

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

    /* ═══════════════════════════════════════════════════════
       refreshPanel امن (بدون خطای view.refresh)
       ═══════════════════════════════════════════════════════ */
    refreshPanel(): void {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GIT_TASKS);
        for (const leaf of leaves) {
            const view = leaf.view;
            if (
                view &&
                typeof (view as any).refresh === 'function' &&
                view.getViewType?.() === VIEW_TYPE_GIT_TASKS
            ) {
                try {
                    (view as TaskPanelView).refresh();
                } catch (e) {
                    console.warn('[Git Tasks] Panel refresh failed:', e);
                }
            }
        }
    }

    /* ═══════════════════════════════════════════════════════
       🆕 loadSettings با محافظت از ENOENT
       data.json توی اولین اجرا وجود نداره، این طبیعیه
       ═══════════════════════════════════════════════════════ */
    async loadSettings(): Promise<void> {
        try {
            const data = await this.loadData();
            this.settings = Object.assign({}, DEFAULT_SETTINGS, data || {});
        } catch (e) {
            /* 🆕 اگه data.json وجود نداشت یا خراب بود، از پیش‌فرض استفاده کن */
            console.debug('[Git Tasks] No settings file, using defaults');
            this.settings = Object.assign({}, DEFAULT_SETTINGS);
        }
    }

    async saveSettings(): Promise<void> {
        try {
            await this.saveData(this.settings);
        } catch (e) {
            console.warn('[Git Tasks] Failed to save settings:', e);
        }
    }

    restartAutoSync(): void {
        this.stopAutoSync();
        const minutes = this.settings.autoSyncInterval;

        if (
            typeof minutes === 'number' &&
            !isNaN(minutes) &&
            minutes > 0 &&
            this.settings.token &&
            this.settings.repo
        ) {
            const intervalMs = Math.round(minutes * 60 * 1000);
            const safeInterval = Math.max(5000, intervalMs);

            this.syncIntervalId = window.setInterval(async () => {
                await this.taskManager.sync(false);
                this.refreshPanel();
            }, safeInterval);
        }
    }

    private stopAutoSync(): void {
        if (this.syncIntervalId !== null) {
            window.clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
    }
}
