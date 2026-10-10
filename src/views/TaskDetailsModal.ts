/* ════════════════════════════════════════════════════════════
   🔎 مودال جزئیات تسک
   🔥 رفع باگ: خوندن مستقیم از inputEl.value هنگام ذخیره
   ✅ پین فقط برای تسک‌های در انتظار
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
    private editCategory: string | null = null;
    private busy = false;

    /* 🆕 رفرنس به input های ویرایش */
    private titleInputEl: HTMLInputElement | null = null;
    private descInputEl: HTMLTextAreaElement | null = null;

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
        contentEl.addClass('git-tasks-modal-content');

        const lang = this.plugin.settings.language;
        applyDirection(contentEl, lang);

        if (this.editing) this.renderEditMode(contentEl);
        else this.renderViewMode(contentEl);
    }

    private renderViewMode(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;

        const header = parent.createDiv({ cls: 'git-tasks-details-header' });
        header.createEl('h3', { text: t(lang, 'details_title') });
        if (this.task.pinned && !this.task.completed) {
            header.createSpan({
                cls: 'git-tasks-pinned-badge',
                text: '📌 ' + t(lang, 'pinned_badge'),
            });
        }

        parent.createEl('h4', { text: this.task.title, cls: 'git-tasks-details-title' });

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

        const actions = parent.createDiv({ cls: 'git-tasks-modal-buttons' });

        const editBtn = actions.createEl('button', { text: t(lang, 'btn_edit') });
        editBtn.onclick = () => {
            this.editing = true;
            this.editCategory = this.task.category;
            this.render();
        };

        const delBtn = actions.createEl('button', {
            text: t(lang, 'btn_delete'),
            cls: 'mod-warning',
        });
        delBtn.onclick = () => this.handleDelete();

        if (!this.task.completed) {
            const pinBtn = actions.createEl('button', {
                text: this.task.pinned ? t(lang, 'btn_unpin') : t(lang, 'btn_pin'),
            });
            pinBtn.onclick = () => this.handleTogglePin();
        }

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

    private renderEditMode(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        parent.createEl('h3', { text: t(lang, 'edit_title') });

        /* عنوان */
        parent.createEl('label', { text: t(lang, 'field_title') });
        const titleInput = parent.createEl('input', { type: 'text', cls: 'git-tasks-input' });
        titleInput.value = this.task.title;
        this.titleInputEl = titleInput;  /* 🆕 رفرنس */

        /* توضیحات */
        parent.createEl('label', { text: t(lang, 'field_description') });
        const descInput = parent.createEl('textarea', { cls: 'git-tasks-textarea' });
        descInput.rows = 5;
        descInput.value = this.task.description || '';
        this.descInputEl = descInput;  /* 🆕 رفرنس */

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

        const actions = parent.createDiv({ cls: 'git-tasks-modal-buttons' });
        const cancelBtn = actions.createEl('button', { text: t(lang, 'btn_cancel') });
        cancelBtn.onclick = () => { this.editing = false; this.render(); };
        const saveBtn = actions.createEl('button', { text: t(lang, 'btn_save'), cls: 'mod-cta' });
        saveBtn.onclick = () => this.handleSave();
    }

    private async handleTogglePin(): Promise<void> {
        if (this.busy) return;
        this.busy = true;
        const lang = this.plugin.settings.language;
        const res = await this.plugin.taskManager.togglePin(this.task);
        if (res.ok) {
            const msgKey = res.pinned ? 'notice_task_pinned' : 'notice_task_unpinned';
            this.plugin.toastManager.show(t(lang, msgKey), 'success');
            this.onDone();
            this.close();
            if (this.plugin.settings.autoSyncAfterEdit) {
                this.plugin.taskManager.sync(false).catch(() => {});
            }
        } else {
            this.busy = false;
            this.plugin.toastManager.show(t(lang, 'notice_pin_failed'), 'error');
        }
    }

    private async handleComplete(): Promise<void> {
        if (this.busy) return;
        this.busy = true;
        const lang = this.plugin.settings.language;
        const ok = await this.plugin.taskManager.completeTask(this.task);
        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_task_completed'), 'success');
            this.onDone();
            this.close();
            if (this.plugin.settings.autoSyncAfterEdit) {
                this.plugin.taskManager.sync(false).catch(() => {});
            }
        } else {
            this.busy = false;
            this.plugin.toastManager.show(t(lang, 'notice_update_failed'), 'error');
        }
    }

    private async handleUncomplete(): Promise<void> {
        if (this.busy) return;
        this.busy = true;
        const lang = this.plugin.settings.language;
        const ok = await this.plugin.taskManager.uncompleteTask(this.task);
        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_task_updated'), 'success');
            this.onDone();
            this.close();
            if (this.plugin.settings.autoSyncAfterEdit) {
                this.plugin.taskManager.sync(false).catch(() => {});
            }
        } else {
            this.busy = false;
            this.plugin.toastManager.show(t(lang, 'notice_update_failed'), 'error');
        }
    }

    /* ═══════════════════════════════════════════════════════
       🔥 ذخیره ویرایش: خوندن مستقیم از inputEl.value
       ═══════════════════════════════════════════════════════ */
    private async handleSave(): Promise<void> {
        if (this.busy) return;
        const lang = this.plugin.settings.language;

        /* 🆕 خوندن مستقیم از DOM */
        const title = (this.titleInputEl?.value ?? '').trim();
        const description = (this.descInputEl?.value ?? '').trim();

        if (!title) {
            this.plugin.toastManager.show(t(lang, 'notice_no_title'), 'warning');
            return;
        }

        this.busy = true;

        const ok = await this.plugin.taskManager.updateTask(this.task, {
            title,
            description,
            category: this.editCategory,
        });

        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_task_updated'), 'success');
            this.onDone();
            this.close();
            if (this.plugin.settings.autoSyncAfterEdit) {
                this.plugin.taskManager.sync(false).catch(() => {});
            }
        } else {
            this.busy = false;
            this.plugin.toastManager.show(t(lang, 'notice_update_failed'), 'error');
        }
    }

    private async handleDelete(): Promise<void> {
        if (this.busy) return;
        const lang = this.plugin.settings.language;
        if (!window.confirm(t(lang, 'confirm_delete_body'))) return;
        this.busy = true;
        const ok = await this.plugin.taskManager.softDelete(this.task);
        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_task_deleted'), 'success');
            this.onDone();
            this.close();
            if (this.plugin.settings.autoSyncAfterEdit) {
                this.plugin.taskManager.sync(false).catch(() => {});
            }
        } else {
            this.busy = false;
            this.plugin.toastManager.show(t(lang, 'notice_delete_failed'), 'error');
        }
    }

    onClose(): void { this.contentEl.empty(); }
}
