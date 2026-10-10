/* ════════════════════════════════════════════════════════════
   🔎 مودال جزئیات تسک (نمایش + ویرایش + انجام + حذف)
   ════════════════════════════════════════════════════════════ */

import { App, Modal, Notice } from 'obsidian';
import type GitTasksPlugin from '../main';
import type { Task } from '../types';
import { t, applyDirection } from '../i18n';
import { formatDate } from '../utils/jalaliDate';

export class TaskDetailsModal extends Modal {
    plugin: GitTasksPlugin;
    task: Task;
    onDone: () => void;

    /* حالت ویرایش */
    private editing = false;
    private editTitle = '';
    private editDescription = '';
    private editCategory: string | null = null;

    constructor(app: App, plugin: GitTasksPlugin, task: Task, onDone: () => void) {
        super(app);
        this.plugin = plugin;
        this.task = task;
        this.onDone = onDone;
    }

    onOpen(): void {
        this.render();
    }

    private render(): void {
        const { contentEl } = this;
        contentEl.empty();
        const lang = this.plugin.settings.language;
        applyDirection(contentEl, lang);

        if (this.editing) {
            this.renderEditMode(contentEl);
        } else {
            this.renderViewMode(contentEl);
        }
    }

    /* ───── حالت نمایش ───── */
    private renderViewMode(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;

        parent.createEl('h3', { text: t(lang, 'details_title') });

        /* عنوان */
        parent.createEl('h4', { text: this.task.title, cls: 'git-tasks-details-title' });

        /* متادیتا */
        const meta = parent.createDiv({ cls: 'git-tasks-details-meta' });
        meta.createEl('div', {
            text: `${t(lang, 'details_created')}: ${formatDate(this.task, this.plugin.settings.useJalaliDate)}`,
        });
        meta.createEl('div', {
            text: `${t(lang, 'details_status')}: ${t(lang, 'task_pending')}`,
        });
        meta.createEl('div', {
            text: `${t(lang, 'details_category')}: ${this.plugin.taskManager.getCategoryName(this.task.category)}`,
        });

        /* توضیحات */
        parent.createEl('h5', { text: t(lang, 'details_description') });
        const descBox = parent.createDiv({ cls: 'git-tasks-details-desc' });
        descBox.setText(this.task.description || t(lang, 'details_no_description'));

        /* دکمه‌ها */
        const actions = parent.createDiv({ cls: 'git-tasks-modal-buttons' });

        const doneBtn = actions.createEl('button', {
            text: t(lang, 'btn_mark_done'),
            cls: 'mod-cta',
        });
        doneBtn.onclick = () => this.handleComplete();

        const editBtn = actions.createEl('button', { text: t(lang, 'btn_edit') });
        editBtn.onclick = () => {
            this.editing = true;
            this.editTitle = this.task.title;
            this.editDescription = this.task.description;
            this.editCategory = this.task.category;
            this.render();
        };

        const delBtn = actions.createEl('button', {
            text: t(lang, 'btn_delete'),
            cls: 'mod-warning',
        });
        delBtn.onclick = () => this.handleDelete();
    }

    /* ───── حالت ویرایش ───── */
    private renderEditMode(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;

        parent.createEl('h3', { text: t(lang, 'edit_title') });

        /* عنوان */
        parent.createEl('label', { text: t(lang, 'field_title') });
        const titleInput = parent.createEl('input', {
            type: 'text',
            cls: 'git-tasks-input',
        });
        titleInput.value = this.editTitle;
        titleInput.oninput = () => { this.editTitle = titleInput.value; };

        /* توضیحات */
        parent.createEl('label', { text: t(lang, 'field_description') });
        const descInput = parent.createEl('textarea', {
            cls: 'git-tasks-textarea',
        });
        descInput.rows = 5;
        descInput.value = this.editDescription;
        descInput.oninput = () => { this.editDescription = descInput.value; };

        /* دسته‌بندی */
        parent.createEl('label', { text: t(lang, 'field_category') });
        const select = parent.createEl('select', { cls: 'dropdown' });
        select.createEl('option', { value: '', text: t(lang, 'panel_no_category') });
        for (const c of this.plugin.taskManager.getCategories()) {
            const label = lang === 'fa' && c.name_fa ? c.name_fa : c.name;
            select.createEl('option', { value: c.id, text: label });
        }
        select.value = this.editCategory ?? '';
        select.onchange = () => { this.editCategory = select.value || null; };

        /* دکمه‌ها */
        const actions = parent.createDiv({ cls: 'git-tasks-modal-buttons' });

        const cancelBtn = actions.createEl('button', { text: t(lang, 'btn_cancel') });
        cancelBtn.onclick = () => {
            this.editing = false;
            this.render();
        };

        const saveBtn = actions.createEl('button', {
            text: t(lang, 'btn_save'),
            cls: 'mod-cta',
        });
        saveBtn.onclick = () => this.handleSave();
    }

    /* ───── انجام تسک ───── */
    private async handleComplete(): Promise<void> {
        const lang = this.plugin.settings.language;
        const ok = await this.plugin.taskManager.completeTask(this.task);
        if (ok) {
            new Notice(t(lang, 'notice_task_completed'));
            if (this.plugin.settings.autoSyncAfterEdit) {
                await this.plugin.taskManager.sync(false);
            }
            this.onDone();
            this.close();
        } else {
            new Notice(t(lang, 'notice_sync_fail', { error: 'update failed' }));
        }
    }

    /* ───── ذخیره ویرایش ───── */
    private async handleSave(): Promise<void> {
        const lang = this.plugin.settings.language;

        if (!this.editTitle.trim()) {
            new Notice(t(lang, 'notice_no_title'));
            return;
        }

        const ok = await this.plugin.taskManager.updateTask(this.task, {
            title: this.editTitle.trim(),
            description: this.editDescription.trim(),
            category: this.editCategory,
        });

        if (ok) {
            new Notice(t(lang, 'notice_task_updated'));
            this.task.title = this.editTitle.trim();
            this.task.description = this.editDescription.trim();
            this.task.category = this.editCategory;
            this.editing = false;
            if (this.plugin.settings.autoSyncAfterEdit) {
                await this.plugin.taskManager.sync(false);
            }
            this.onDone();
            this.render();
        } else {
            new Notice(t(lang, 'notice_sync_fail', { error: 'update failed' }));
        }
    }

    /* ───── حذف نرم ───── */
    private async handleDelete(): Promise<void> {
        const lang = this.plugin.settings.language;
        /* تأیید ساده با confirm مرورگر (سبک و ساده) */
        const ok = window.confirm(t(lang, 'confirm_delete_body'));
        if (!ok) return;

        const success = await this.plugin.taskManager.softDelete(this.task);
        if (success) {
            new Notice(t(lang, 'notice_task_deleted'));
            this.onDone();
            this.close();
        } else {
            new Notice(t(lang, 'notice_sync_fail', { error: 'delete failed' }));
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
