/* ════════════════════════════════════════════════════════════
   📋 پنل اصلی تسک‌ها (ItemView)
   ════════════════════════════════════════════════════════════ */

import { ItemView, WorkspaceLeaf, Notice, setIcon } from 'obsidian';
import type GitTasksPlugin from '../main';
import type { Task } from '../types';
import { t, applyDirection, isRTL } from '../i18n';
import { formatDate } from '../utils/jalaliDate';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetailsModal } from './TaskDetailsModal';

export const VIEW_TYPE_GIT_TASKS = 'git-tasks-panel';

export class TaskPanelView extends ItemView {
    plugin: GitTasksPlugin;
    private currentCategory: string | null = null; // null = همه
    private visibleCount: number = 0;
    private syncing: boolean = false;

    constructor(leaf: WorkspaceLeaf, plugin: GitTasksPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string { return VIEW_TYPE_GIT_TASKS; }
    getDisplayText(): string { return t(this.plugin.settings.language, 'plugin_name'); }
    getIcon(): string { return 'check-square'; }

    async onOpen(): Promise<void> {
        this.visibleCount = this.plugin.settings.tasksPerPage;

        /* سینک خودکار هنگام باز شدن */
        if (this.plugin.settings.autoSyncOnOpen && this.plugin.settings.token && this.plugin.settings.repo) {
            this.syncing = true;
            this.render();
            await this.plugin.taskManager.sync(false);
            this.syncing = false;
        }

        this.render();
    }

    async onClose(): Promise<void> {
        /* هیچ منبعی برای پاک کردن نیست */
    }

    /* ───── رفرش از بیرون ───── */
    refresh(): void {
        this.render();
    }

    /* ───── رندر کامل ───── */
    private render(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('git-tasks-panel');
        applyDirection(contentEl, this.plugin.settings.language);

        this.renderHeader(contentEl);
        this.renderBody(contentEl);
        this.renderFooter(contentEl);
    }

    /* ───── هدر پنل ───── */
    private renderHeader(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const header = parent.createDiv({ cls: 'git-tasks-header' });

        /* عنوان + دکمه‌ها */
        const topRow = header.createDiv({ cls: 'git-tasks-header-top' });

        topRow.createEl('h4', { text: t(lang, 'panel_title'), cls: 'git-tasks-title' });

        const actions = topRow.createDiv({ cls: 'git-tasks-header-actions' });

        /* دکمه سینک */
        const syncBtn = actions.createEl('button', { cls: 'clickable-icon' });
        setIcon(syncBtn, 'refresh-cw');
        syncBtn.setAttribute('aria-label', t(lang, 'panel_reload'));
        syncBtn.onclick = () => this.handleSync();

        /* دکمه تسک جدید */
        const addBtn = actions.createEl('button', { cls: 'clickable-icon' });
        setIcon(addBtn, 'plus');
        addBtn.setAttribute('aria-label', t(lang, 'panel_new_task'));
        addBtn.onclick = () => this.handleNewTask();

        /* نوار دسته‌بندی */
        const catRow = header.createDiv({ cls: 'git-tasks-category-row' });
        this.renderCategorySelect(catRow);
    }

    /* ───── dropdown دسته‌بندی ───── */
    private renderCategorySelect(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const cats = this.plugin.taskManager.getCategories();

        /* اگه فقط یه گزینه هست (همه) و دسته‌ای نداریم، نوار رو نشون نده */
        if (cats.length === 0) return;

        const select = parent.createEl('select', { cls: 'dropdown git-tasks-category-select' });

        select.createEl('option', {
            value: '',
            text: t(lang, 'panel_all_categories'),
        });

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

    /* ───── بدنه: لیست تسک‌ها ───── */
    private renderBody(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const body = parent.createDiv({ cls: 'git-tasks-body' });

        if (this.syncing) {
            const loading = body.createDiv({ cls: 'git-tasks-loading' });
            loading.createEl('p', { text: t(lang, 'panel_syncing') });
            return;
        }

        const tasks = this.plugin.taskManager.getPendingByCategory(this.currentCategory);

        /* حالت خالی */
        if (tasks.length === 0) {
            const empty = body.createDiv({ cls: 'git-tasks-empty' });
            empty.createEl('p', { text: t(lang, 'panel_empty'), cls: 'git-tasks-empty-title' });
            empty.createEl('p', { text: t(lang, 'panel_empty_hint'), cls: 'git-tasks-empty-hint' });
            return;
        }

        /* لیست تسک‌ها (به تعداد visibleCount) */
        const visible = tasks.slice(0, this.visibleCount);
        for (const task of visible) {
            this.renderTaskCard(body, task);
        }

        /* دکمه نمایش بیشتر */
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

    /* ───── کارت تسک ───── */
    private renderTaskCard(parent: HTMLElement, task: Task): void {
        const lang = this.plugin.settings.language;
        const card = parent.createDiv({ cls: 'git-tasks-card' });

        /* چک‌باکس */
        const cbWrap = card.createDiv({ cls: 'git-tasks-card-checkbox' });
        const cb = cbWrap.createEl('input', { type: 'checkbox' });
        cb.onclick = async (e) => {
            e.stopPropagation();
            cb.disabled = true;
            const ok = await this.plugin.taskManager.completeTask(task);

            if (ok) {
                new Notice(t(lang, 'notice_task_completed'));
                /* اگه سینک خودکار بعد از تغییرات روشنه، دوباره سینک کن */
                if (this.plugin.settings.autoSyncAfterEdit) {
                    await this.plugin.taskManager.sync(false);
                }
                this.render();
            } else {
                cb.disabled = false;
                cb.checked = false;
                new Notice(t(lang, 'notice_sync_fail', { error: 'update failed' }));
            }
        };

        /* بدنه کارت */
        const bodyCard = card.createDiv({ cls: 'git-tasks-card-body' });

        bodyCard.createDiv({ cls: 'git-tasks-card-title', text: task.title });

        /* متادیتا: تاریخ + دسته */
        const meta = bodyCard.createDiv({ cls: 'git-tasks-card-meta' });

        const dateEl = meta.createSpan({ cls: 'git-tasks-card-date' });
        setIcon(dateEl.createSpan({ cls: 'git-tasks-icon' }), 'calendar');
        dateEl.createSpan({
            text: ' ' + formatDate(task, this.plugin.settings.useJalaliDate),
        });

        /* اگه دسته داشت، نشون بده */
        if (task.category) {
            const catEl = meta.createSpan({ cls: 'git-tasks-card-cat' });
            setIcon(catEl.createSpan({ cls: 'git-tasks-icon' }), 'tag');
            catEl.createSpan({ text: ' ' + this.plugin.taskManager.getCategoryName(task.category) });
        }

        /* کلیک روی کارت → باز شدن مودال جزئیات */
        bodyCard.onclick = () => {
            new TaskDetailsModal(this.app, this.plugin, task, () => this.render()).open();
        };
    }

    /* ───── فوتر ───── */
    private renderFooter(parent: HTMLElement): void {
        /* فعلاً خالی — به دلیل حذف شمارنده‌ها */
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
        if (ok) {
            this.visibleCount = this.plugin.settings.tasksPerPage;
        }
        this.render();
    }

    private handleNewTask(): void {
        new CreateTaskModal(this.app, this.plugin, () => this.render()).open();
    }
}
