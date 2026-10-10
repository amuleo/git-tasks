/* ════════════════════════════════════════════════════════════
   ➕ مودال ساخت تسک جدید
   ✅ عنوان مودال حذف شد (به جای CSS override)
   ✅ خوندن مستقیم از inputEl.value در لحظه submit
   ════════════════════════════════════════════════════════════ */

import { App, Modal, Setting, TextComponent, TextAreaComponent } from 'obsidian';
import type GitTasksPlugin from '../main';
import { t, applyDirection } from '../i18n';

export class CreateTaskModal extends Modal {
    plugin: GitTasksPlugin;
    onDone: () => void;
    private category: string | null = null;
    private submitting = false;

    /* رفرنس به کامپوننت‌ها */
    private titleComponent: TextComponent | null = null;
    private descriptionComponent: TextAreaComponent | null = null;

    constructor(app: App, plugin: GitTasksPlugin, onDone: () => void) {
        super(app);
        this.plugin = plugin;
        this.onDone = onDone;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('git-tasks-modal-content');

        const lang = this.plugin.settings.language;
        applyDirection(contentEl, lang);

        /* 🆕 عنوان حذف شد — مستقیم می‌ریم سراغ فیلدها */

        /* عنوان تسک */
        new Setting(contentEl)
            .setName(t(lang, 'field_title'))
            .addText(text => {
                this.titleComponent = text;
                text.setPlaceholder(t(lang, 'field_title_placeholder'));
                setTimeout(() => text.inputEl.focus(), 50);
            });

        /* توضیحات */
        new Setting(contentEl)
            .setName(t(lang, 'field_description'))
            .addTextArea(ta => {
                this.descriptionComponent = ta;
                ta.setPlaceholder(t(lang, 'field_description_placeholder'));
                ta.inputEl.rows = 4;
                ta.inputEl.style.width = '100%';
            });

        /* دسته‌بندی */
        const cats = this.plugin.taskManager.getCategories();
        new Setting(contentEl)
            .setName(t(lang, 'field_category'))
            .addDropdown(dd => {
                dd.addOption('', t(lang, 'panel_no_category'));
                for (const c of cats) {
                    const label = lang === 'fa' && c.name_fa ? c.name_fa : c.name;
                    dd.addOption(c.id, label);
                }
                dd.setValue('');
                dd.onChange(v => { this.category = v || null; });
            });

        /* دکمه‌ها */
        const btnRow = contentEl.createDiv({ cls: 'git-tasks-modal-buttons-stack' });

        const cancel = btnRow.createEl('button', { text: t(lang, 'btn_cancel') });
        cancel.onclick = () => this.close();

        const save = btnRow.createEl('button', {
            text: t(lang, 'btn_create'),
            cls: 'mod-cta',
        });
        save.onclick = () => this.submit();
    }

    private async submit(): Promise<void> {
        if (this.submitting) return;
        const lang = this.plugin.settings.language;

        const title = (this.titleComponent?.inputEl.value ?? '').trim();
        const description = (this.descriptionComponent?.inputEl.value ?? '').trim();

        if (!title) {
            this.plugin.toastManager.show(t(lang, 'notice_no_title'), 'warning');
            return;
        }

        this.submitting = true;

        const ok = await this.plugin.taskManager.createTask(
            title,
            description,
            this.category
        );

        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_task_created'), 'success');
            this.onDone();
            this.close();
            if (this.plugin.settings.autoSyncAfterEdit) {
                this.plugin.taskManager.sync(false).catch(() => {});
            }
        } else {
            this.submitting = false;
            this.plugin.toastManager.show(t(lang, 'notice_create_failed'), 'error');
        }
    }

    onClose(): void { this.contentEl.empty(); }
}
