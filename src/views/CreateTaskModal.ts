/* ════════════════════════════════════════════════════════════
   ➕ مودال ساخت تسک جدید
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

        const btnRow = contentEl.createDiv({ cls: 'git-tasks-modal-buttons' });

        const cancel = btnRow.createEl('button', { text: t(lang, 'btn_cancel') });
        cancel.onclick = () => this.close();

        const save = btnRow.createEl('button', {
            text: t(lang, 'btn_create'),
            cls: 'mod-cta',
        });
        save.onclick = () => this.submit();
    }

    private async submit(): Promise<void> {
        const lang = this.plugin.settings.language;

        if (!this.title.trim()) {
            this.plugin.toastManager.show(t(lang, 'notice_no_title'), 'warning');
            return;
        }

        const ok = await this.plugin.taskManager.createTask(
            this.title.trim(),
            this.description.trim(),
            this.category
        );

        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_task_created'), 'success');
            if (this.plugin.settings.autoSyncAfterEdit) {
                await this.plugin.taskManager.sync(false);
            }
            this.onDone();
            this.close();
        } else {
            this.plugin.toastManager.show(
                t(lang, 'notice_sync_fail', { error: 'create failed' }),
                'error'
            );
        }
    }

    onClose(): void { this.contentEl.empty(); }
}
