/* ════════════════════════════════════════════════════════════
   🚀 نقطه ورود پلاگین
   ✅ رفع خطای view.refresh
   ✅ بهینه‌سازی refreshPanel
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

        await this.taskManager.loadFromCache();

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
       🆕 refreshPanel امن (بدون خطای view.refresh)
       ═══════════════════════════════════════════════════════ */
    refreshPanel(): void {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GIT_TASKS);
        for (const leaf of leaves) {
            const view = leaf.view;
            /* 🔥 چک کن که view معتبر هست و متد refresh داره */
            if (
                view &&
                typeof (view as any).refresh === 'function' &&
                view.getViewType?.() === VIEW_TYPE_GIT_TASKS
            ) {
                try {
                    (view as TaskPanelView).refresh();
                } catch (e) {
                    /* بی‌صدا نادیده بگیر */
                    console.warn('[Git Tasks] Panel refresh failed:', e);
                }
            }
        }
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
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
