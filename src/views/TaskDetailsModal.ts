/* ════════════════════════════════════════════════════════════
   🔎 مودال جزئیات تسک
   ترتیب دکمه‌ها: ویرایش / حذف / پین / انجام شد
   ════════════════════════════════════════════════════════════ */

import { App, Modal } from 'obsidian';
import type GitTasksPlugin from '../main';
import type { Task } from '../types';
import { t, applyDirection } from '../i18n';
import { formatDate, getJalaliString, getGregorianString } from '../utils/jalaliDate';

export class TaskDetailsModal extends Modal {
    plugin: GitTasksPlugin;
    task: Task;
    onDone: () => void;

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

    onOpen(): void { this.render(); }

    private render(): void {
        const { contentEl } = this;
        contentEl.empty();
        const lang = this.plugin.settings.language;
        applyDirection(contentEl, lang);

        if (this.editing) this.renderEditMode(contentEl);
        else this.renderViewMode(contentEl);
    }

    /* ═══════════════════════════════════════════════════
       حالت نمایش
       ═══════════════════════════════════════════════════ */
    private renderViewMode(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;

        const header = parent.createDiv({ cls: 'git-tasks-details-header' });
        header.createEl('h3', { text: t(lang, 'details_title') });
        if (this.task.pinned) {
            header.createSpan({
                cls: 'git-tasks-pinned-badge',
                text: '📌 ' + t(lang, 'pinned_badge'),
            });
        }

        parent.createEl('h4', { text: this.task.title, cls: 'git-tasks-details-title' });

        /* متادیتا */
        const meta = parent.createDiv({ cls: 'git-tasks-details-meta' });
        meta.createEl('div', {
            text: `${t(lang, 'details_created')}: ${formatDate(this.task, this.plugin.settings.useJalaliDate)}`,
        });
        if (this.task.completed && this.task.completed_ts) {
            const d = new Date(this.task.completed_ts);
            const str = this.plugin.settings.useJalaliDate
                ? getJalaliString(d)
                : getGregorianString(d);
            meta.createEl('div', { text: `${t(lang, 'details_completed')}: ${str}` });
        }
        meta.createEl('div', {
            text: `${t(lang, 'details_status')}: ${this.task.completed ? t(lang, 'task_done') : t(lang, 'task_pending')}`,
        });
        meta.createEl('div', {
            text: `${t(lang, 'details_category')}: ${this.plugin.taskManager.getCategoryName(
                this.task.category, t(lang, 'panel_no_category')
            )}`,
        });

        parent.createEl('h5', { text: t(lang, 'details_description') });
        const descBox = parent.createDiv({ cls: 'git-tasks-details-desc' });
        descBox.setText(this.task.description || t(lang, 'details_no_description'));

        /* ═══════════════════════════════════════════════
           🔥 دکمه‌ها (همه در یه ردیف)
           ترتیب DOM: Edit, Delete, Pin, MarkDone
           در LTR: از چپ به راست ← Edit, Delete, Pin, MarkDone
           در RTL: از راست به چپ ← Edit, Delete, Pin, MarkDone
           ═══════════════════════════════════════════════ */
        const actions = parent.createDiv({ cls: 'git-tasks-modal-buttons' });

        /* ۱. ویرایش */
        const editBtn = actions.createEl('button', { text: t(lang, 'btn_edit') });
        editBtn.onclick = () => {
            this.editing = true;
            this.editTitle = this.task.title;
            this.editDescription = this.task.description;
            this.editCategory = this.task.category;
            this.render();
        };

        /* ۲. حذف */
        const delBtn = actions.createEl('button', {
            text: t(lang, 'btn_delete'),
            cls: 'mod-warning',
        });
        delBtn.onclick = () => this.handleDelete();

        /* ۳. پین / آنپین */
        const pinBtn = actions.createEl('button', {
            text: this.task.pinned ? t(lang, 'btn_unpin') : t(lang, 'btn_pin'),
        });
        pinBtn.onclick = () => this.handleTogglePin();

        /* ۴. انجام شد / برگردون به در انتظار */
        if (this.task.completed) {
            const pendingBtn = actions.createEl('button', {
                text: t(lang, 'btn_mark_pending'),
                cls: 'mod-cta',
            });
            pendingBtn.onclick = () => this.handleUncomplete();
        } else {
            const doneBtn = actions.createEl('button', {
                text: t(lang, 'btn_mark_done'),
                cls: 'mod-cta',
            });
            doneBtn.onclick = () => this.handleComplete();
        }
    }

    /* ═══════════════════════════════════════════════════
       حالت ویرایش
       ═══════════════════════════════════════════════════ */
    private renderEditMode(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        parent.createEl('h3', { text: t(lang, 'edit_title') });

        parent.createEl('label', { text: t(lang, 'field_title') });
        const titleInput = parent.createEl('input', { type: 'text', cls: 'git-tasks-input' });
        titleInput.value = this.editTitle;
        titleInput.oninput = () => { this.editTitle = titleInput.value; };

        parent.createEl('label', { text: t(lang, 'field_description') });
        const descInput = parent.createEl('textarea', { cls: 'git-tasks-textarea' });
        descInput.rows = 5;
        descInput.value = this.editDescription;
        descInput.oninput = () => { this.editDescription = descInput.value; };

        parent.createEl('label', { text: t(lang, 'field_category') });
        const select = parent.createEl('select', { cls: 'dropdown' });
        select.createEl('option', { value: '', text: t(lang, 'panel_no_category') });
        for (const c of this.plugin.taskManager.getCategories()) {
            const label = lang === 'fa' && c.name_fa ? c.name_fa : c.name;
            select.createEl('option', { value: c.id, text: label });
        }
        select.value = this.editCategory ?? '';
        select.onchange = () => { this.editCategory = select.value || null; };

        const actions = parent.createDiv({ cls: 'git-tasks-modal-buttons' });
        const cancelBtn = actions.createEl('button', { text: t(lang, 'btn_cancel') });
        cancelBtn.onclick = () => { this.editing = false; this.render(); };
        const saveBtn = actions.createEl('button', { text: t(lang, 'btn_save'), cls: 'mod-cta' });
        saveBtn.onclick = () => this.handleSave();
    }

    /* ═══════════════════════════════════════════════════
       🔥 پین / آنپین (رفع باگ: پیام درست + بروزرسانی سریع)
       ═══════════════════════════════════════════════════ */
    private async handleTogglePin(): Promise<void> {
        const lang = this.plugin.settings.language;
        const res = await this.plugin.taskManager.togglePin(this.task);

        if (res.ok) {
            /* پیام درست بر اساس مقدار جدید */
            const msgKey = res.pinned ? 'notice_task_pinned' : 'notice_task_unpinned';
            this.plugin.toastManager.show(t(lang, msgKey), 'success');

            /* بروزرسانی سریع مودال + پنل */
            this.onDone();
            this.render();
        } else {
            this.plugin.toastManager.show(
                t(lang, 'notice_sync_fail', { error: 'pin failed' }),
                'error'
            );
        }
    }

    private async handleComplete(): Promise<void> {
        const lang = this.plugin.settings.language;
        const ok = await this.plugin.taskManager.completeTask(this.task);
        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_task_completed'), 'success');
            if (this.plugin.settings.autoSyncAfterEdit) await this.plugin.taskManager.sync(false);
            this.onDone();
            this.close();
        }
    }

    private async handleUncomplete(): Promise<void> {
        const lang = this.plugin.settings.language;
        const ok = await this.plugin.taskManager.uncompleteTask(this.task);
        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_task_updated'), 'success');
            if (this.plugin.settings.autoSyncAfterEdit) await this.plugin.taskManager.sync(false);
            this.onDone();
            this.close();
        }
    }

    private async handleSave(): Promise<void> {
        const lang = this.plugin.settings.language;
        if (!this.editTitle.trim()) {
            this.plugin.toastManager.show(t(lang, 'notice_no_title'), 'warning');
            return;
        }
        const ok = await this.plugin.taskManager.updateTask(this.task, {
            title: this.editTitle.trim(),
            description: this.editDescription.trim(),
            category: this.editCategory,
        });
        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_task_updated'), 'success');
            this.editing = false;
            if (this.plugin.settings.autoSyncAfterEdit) await this.plugin.taskManager.sync(false);
            this.onDone();
            this.render();
        }
    }

    private async handleDelete(): Promise<void> {
        const lang = this.plugin.settings.language;
        if (!window.confirm(t(lang, 'confirm_delete_body'))) return;
        const ok = await this.plugin.taskManager.softDelete(this.task);
        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_task_deleted'), 'success');
            this.onDone();
            this.close();
        }
    }

    onClose(): void { this.contentEl.empty(); }
}
