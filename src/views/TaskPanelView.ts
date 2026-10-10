/* ════════════════════════════════════════════════════════════
   📋 پنل اصلی تسک‌ها (با تب‌ها، آمار، پین)
   ════════════════════════════════════════════════════════════ */

import { ItemView, WorkspaceLeaf, Notice, setIcon } from 'obsidian';
import type GitTasksPlugin from '../main';
import type { Task } from '../types';
import { t, applyDirection } from '../i18n';
import { formatDate } from '../utils/jalaliDate';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetailsModal } from './TaskDetailsModal';

export const VIEW_TYPE_GIT_TASKS = 'git-tasks-panel';

type TabType = 'pending' | 'completed';

export class TaskPanelView extends ItemView {
    plugin: GitTasksPlugin;
    private currentTab: TabType = 'pending';
    private currentCategory: string | null = null;
    private visibleCount: number = 0;
    private syncing: boolean = false;

    constructor(leaf: WorkspaceLeaf, plugin: GitTasksPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string { return VIEW_TYPE_GIT_TASKS; }
    getDisplayText(): string { return t(this.plugin.settings.language, 'panel_title'); }
    getIcon(): string { return 'check-square'; }

    async onOpen(): Promise<void> {
        this.visibleCount = this.plugin.settings.tasksPerPage;

        if (this.plugin.settings.autoSyncOnOpen && this.plugin.settings.token && this.plugin.settings.repo) {
            this.syncing = true;
            this.render();
            await this.plugin.taskManager.sync(false);
            this.syncing = false;
        }
        this.render();
    }

    async onClose(): Promise<void> {}

    refresh(): void { this.render(); }

    /* ───── رندر کامل ───── */
    private render(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('git-tasks-panel');
        applyDirection(contentEl, this.plugin.settings.language);

        this.renderHeader(contentEl);
        this.renderTabs(contentEl);

        if (this.syncing) {
            const loading = contentEl.createDiv({ cls: 'git-tasks-loading' });
            loading.createEl('p', { text: t(this.plugin.settings.language, 'panel_syncing') });
            return;
        }

        if (this.currentTab === 'pending') {
            this.renderPending(contentEl);
        } else {
            this.renderCompleted(contentEl);
        }
    }

    /* ───── هدر ───── */
    private renderHeader(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const header = parent.createDiv({ cls: 'git-tasks-header' });

        const topRow = header.createDiv({ cls: 'git-tasks-header-top' });
        topRow.createEl('h4', {
            text: this.currentTab === 'pending'
                ? t(lang, 'panel_title')
                : t(lang, 'panel_title_completed'),
            cls: 'git-tasks-title',
        });

        const actions = topRow.createDiv({ cls: 'git-tasks-header-actions' });

        const syncBtn = actions.createEl('button', { cls: 'clickable-icon' });
        setIcon(syncBtn, 'refresh-cw');
        syncBtn.setAttribute('aria-label', t(lang, 'panel_reload'));
        syncBtn.onclick = () => this.handleSync();

        if (this.currentTab === 'pending') {
            const addBtn = actions.createEl('button', { cls: 'clickable-icon' });
            setIcon(addBtn, 'plus');
            addBtn.setAttribute('aria-label', t(lang, 'panel_new_task'));
            addBtn.onclick = () => this.handleNewTask();
        }
    }

    /* ───── تب‌ها ───── */
    private renderTabs(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const tabs = parent.createDiv({ cls: 'git-tasks-tabs' });

        const mkTab = (id: TabType, icon: string, label: string) => {
            const btn = tabs.createEl('button', {
                cls: 'git-tasks-tab' + (this.currentTab === id ? ' is-active' : ''),
            });
            setIcon(btn.createSpan({ cls: 'git-tasks-tab-icon' }), icon);
            btn.createSpan({ text: ' ' + label });
            btn.onclick = () => {
                if (this.currentTab === id) return;
                this.currentTab = id;
                this.visibleCount = this.plugin.settings.tasksPerPage;
                this.render();
            };
        };

        mkTab('pending', 'circle-dot', t(lang, 'tab_pending'));
        mkTab('completed', 'check-circle', t(lang, 'tab_completed'));
    }

    /* ═══════════════════════════════════════════════════
       تب تسک‌های در انتظار
       ═══════════════════════════════════════════════════ */
    private renderPending(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;

        /* dropdown دسته‌بندی */
        const cats = this.plugin.taskManager.getCategories();
        if (cats.length > 0) {
            const catRow = parent.createDiv({ cls: 'git-tasks-category-row' });
            const select = catRow.createEl('select', { cls: 'dropdown git-tasks-category-select' });
            select.createEl('option', { value: '', text: t(lang, 'panel_all_categories') });
            for (const c of cats) {
                const label = lang === 'fa' && c.name_fa ? c.name_fa : c.name;
                select.createEl('option', { value: c.id, text: label });
            }
            select.value = this.currentCategory ?? '';
            select.onchange = () => {
                this.currentCategory = select.value || null;
                this.visibleCount = this.plugin.settings.tasksPerPage;
                this.render();
            };
        }

        const body = parent.createDiv({ cls: 'git-tasks-body' });
        const tasks = this.plugin.taskManager.getPendingByCategory(this.currentCategory);

        if (tasks.length === 0) {
            this.renderEmpty(body, t(lang, 'panel_empty'), t(lang, 'panel_empty_hint'));
            return;
        }

        const visible = tasks.slice(0, this.visibleCount);
        for (const task of visible) this.renderTaskCard(body, task, false);

        if (tasks.length > this.visibleCount) {
            const moreBtn = body.createEl('button', {
                cls: 'git-tasks-show-more',
                text: t(lang, 'panel_show_more'),
            });
            moreBtn.onclick = () => {
                this.visibleCount += this.plugin.settings.tasksPerPage;
                this.render();
            };
        }
    }

    /* ═══════════════════════════════════════════════════
       تب تسک‌های انجام‌شده (با کارت‌های آماری)
       ═══════════════════════════════════════════════════ */
    private renderCompleted(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const stats = this.plugin.taskManager.getStats();

        /* کارت‌های آماری */
        const statsGrid = parent.createDiv({ cls: 'git-tasks-stats-grid' });
        const mkCard = (label: string, value: number) => {
            const card = statsGrid.createDiv({ cls: 'git-tasks-stat-card' });
            card.createDiv({ cls: 'git-tasks-stat-value', text: String(value) });
            card.createDiv({ cls: 'git-tasks-stat-label', text: label });
        };
        mkCard(t(lang, 'stats_today'), stats.today);
        mkCard(t(lang, 'stats_yesterday'), stats.yesterday);
        mkCard(t(lang, 'stats_this_week'), stats.this_week);
        mkCard(t(lang, 'stats_last_month'), stats.last_month);
        mkCard(t(lang, 'stats_this_year'), stats.this_year);
        mkCard(t(lang, 'stats_total'), stats.total);

        /* لیست تسک‌های انجام‌شده */
        const body = parent.createDiv({ cls: 'git-tasks-body' });
        const tasks = this.plugin.taskManager.getCompletedTasks();

        if (tasks.length === 0) {
            this.renderEmpty(body, t(lang, 'panel_empty_completed'), '');
            return;
        }

        const visible = tasks.slice(0, this.visibleCount);
        for (const task of visible) this.renderTaskCard(body, task, true);

        if (tasks.length > this.visibleCount) {
            const moreBtn = body.createEl('button', {
                cls: 'git-tasks-show-more',
                text: t(lang, 'panel_show_more'),
            });
            moreBtn.onclick = () => {
                this.visibleCount += this.plugin.settings.tasksPerPage;
                this.render();
            };
        }
    }

    private renderEmpty(parent: HTMLElement, title: string, hint: string): void {
        const empty = parent.createDiv({ cls: 'git-tasks-empty' });
        empty.createEl('p', { text: title, cls: 'git-tasks-empty-title' });
        if (hint) empty.createEl('p', { text: hint, cls: 'git-tasks-empty-hint' });
    }

    /* ───── کارت تسک ───── */
    private renderTaskCard(parent: HTMLElement, task: Task, isCompleted: boolean): void {
        const lang = this.plugin.settings.language;
        const card = parent.createDiv({ cls: 'git-tasks-card' + (task.pinned ? ' is-pinned' : '') });

        /* چک‌باکس */
        const cbWrap = card.createDiv({ cls: 'git-tasks-card-checkbox' });
        const cb = cbWrap.createEl('input', { type: 'checkbox' });
        cb.checked = isCompleted;
        cb.onclick = async (e) => {
            e.stopPropagation();
            cb.disabled = true;
            if (isCompleted) {
                const ok = await this.plugin.taskManager.uncompleteTask(task);
                if (ok) {
                    new Notice(t(lang, 'notice_task_updated'));
                    if (this.plugin.settings.autoSyncAfterEdit) {
                        await this.plugin.taskManager.sync(false);
                    }
                    this.render();
                } else cb.disabled = false;
            } else {
                const ok = await this.plugin.taskManager.completeTask(task);
                if (ok) {
                    new Notice(t(lang, 'notice_task_completed'));
                    if (this.plugin.settings.autoSyncAfterEdit) {
                        await this.plugin.taskManager.sync(false);
                    }
                    this.render();
                } else {
                    cb.disabled = false;
                    cb.checked = false;
                }
            }
        };

        /* بدنه */
        const bodyCard = card.createDiv({ cls: 'git-tasks-card-body' });

        const titleRow = bodyCard.createDiv({ cls: 'git-tasks-card-title-row' });
        if (task.pinned) {
            const pinIcon = titleRow.createSpan({ cls: 'git-tasks-pin-icon' });
            setIcon(pinIcon, 'pin');
        }
        titleRow.createDiv({ cls: 'git-tasks-card-title', text: task.title });

        /* متادیتا */
        const meta = bodyCard.createDiv({ cls: 'git-tasks-card-meta' });

        const dateEl = meta.createSpan({ cls: 'git-tasks-card-date' });
        setIcon(dateEl.createSpan({ cls: 'git-tasks-icon' }), 'calendar');
        dateEl.createSpan({
            text: ' ' + (isCompleted
                ? formatDate(
                    { created_jalali: this.tsToJalali(task.completed_ts), created_gregorian: this.tsToGregorian(task.completed_ts) },
                    this.plugin.settings.useJalaliDate
                )
                : formatDate(task, this.plugin.settings.useJalaliDate)),
        });

        if (task.category) {
            const catEl = meta.createSpan({ cls: 'git-tasks-card-cat' });
            setIcon(catEl.createSpan({ cls: 'git-tasks-icon' }), 'tag');
            catEl.createSpan({ text: ' ' + this.plugin.taskManager.getCategoryName(task.category) });
        }

        /* کلیک → مودال جزئیات */
        bodyCard.onclick = () => {
            new TaskDetailsModal(this.app, this.plugin, task, () => this.render()).open();
        };
    }

    /* ابزار تبدیل ts به رشته‌های تاریخ */
    private tsToJalali(ts: number): string {
        if (!ts) return '—';
        const d = new Date(ts);
        /* استفاده از تابع مشترک */
        const { getJalaliString } = require('../utils/jalaliDate');
        return getJalaliString(d);
    }
    private tsToGregorian(ts: number): string {
        if (!ts) return '—';
        const d = new Date(ts);
        const { getGregorianString } = require('../utils/jalaliDate');
        return getGregorianString(d);
    }

    /* ───── اکشن‌ها ───── */
    private async handleSync(): Promise<void> {
        const lang = this.plugin.settings.language;
        if (!this.plugin.settings.token || !this.plugin.settings.repo) {
            new Notice(t(lang, 'notice_fill_repo'));
            return;
        }
        this.syncing = true;
        this.render();
        const ok = await this.plugin.taskManager.sync(true);
        this.syncing = false;
        if (ok) this.visibleCount = this.plugin.settings.tasksPerPage;
        this.render();
    }

    private handleNewTask(): void {
        new CreateTaskModal(this.app, this.plugin, () => this.render()).open();
    }
}
