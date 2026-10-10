/* ════════════════════════════════════════════════════════════
   ➕ مودال ساخت تسک جدید
   ✅ دکمه‌ها ستونی، تمام عرض
   ✅ مودال قبل از sync بسته می‌شه
   ════════════════════════════════════════════════════════════ */

import { App, Modal, Setting } from 'obsidian';
import type GitTasksPlugin from '../main';
import { t, applyDirection } from '../i18n';

export class CreateTaskModal extends Modal {
    plugin: GitTasksPlugin;
    onDone: () => void;
    private title = '';
    private description = '';
    private category: string | null = null;
    private submitting = false;

    constructor(app: App, plugin: GitTasksPlugin, onDone: () => void) {
        super(app);
        this.plugin = plugin;
        this.onDone = onDone;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        const lang = this.plugin.settings.language;
        applyDirection(contentEl, lang);

        contentEl.createEl('h3', { text: t(lang, 'create_title') });

        new Setting(contentEl)
            .setName(t(lang, 'field_title'))
            .addText(text => {
                text.setPlaceholder(t(lang, 'field_title_placeholder'))
                    .onChange(v => { this.title = v; });
                setTimeout(() => text.inputEl.focus(), 50);
            });

        new Setting(contentEl)
            .setName(t(lang, 'field_description'))
            .addTextArea(ta => {
                ta.setPlaceholder(t(lang, 'field_description_placeholder'))
                    .onChange(v => { this.description = v; });
                ta.inputEl.rows = 4;
                ta.inputEl.style.width = '100%';
            });

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

        /* 🆕 دکمه‌ها به صورت ستونی (تمام عرض) */
        const btnRow = contentEl.createDiv({ cls: 'git-tasks-modal-buttons-stack' });

        /* ۱. لغو (بالا) */
        const cancel = btnRow.createEl('button', { text: t(lang, 'btn_cancel') });
        cancel.onclick = () => this.close();

        /* ۲. ایجاد (پایین، primary) */
        const save = btnRow.createEl('button', {
            text: t(lang, 'btn_create'),
            cls: 'mod-cta',
        });
        save.onclick = () => this.submit();
    }

    /* ═══════════════════════════════════════════════════════
       ارسال تسک — بستن فوری، sync پس‌زمینه
       ═══════════════════════════════════════════════════════ */
    private async submit(): Promise<void> {
        if (this.submitting) return;
        const lang = this.plugin.settings.language;

        if (!this.title.trim()) {
            this.plugin.toastManager.show(t(lang, 'notice_no_title'), 'warning');
            return;
        }

        this.submitting = true;

        const ok = await this.plugin.taskManager.createTask(
            this.title.trim(),
            this.description.trim(),
            this.category
        );

        if (ok) {
            /* ۱. Toast */
            this.plugin.toastManager.show(t(lang, 'notice_task_created'), 'success');
            /* ۲. بستن مودال + رفرش پنل */
            this.onDone();
            this.close();
            /* ۳. sync پس‌زمینه */
            if (this.plugin.settings.autoSyncAfterEdit) {
                this.plugin.taskManager.sync(false).catch(() => {});
            }
        } else {
            this.submitting = false;
            this.plugin.toastManager.show(
                t(lang, 'notice_sync_fail', { error: 'create failed' }),
                'error'
            );
        }
    }

    onClose(): void { this.contentEl.empty(); }
}
