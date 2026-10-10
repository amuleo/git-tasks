/* ════════════════════════════════════════════════════════════
   ⚙️ تب تنظیمات (رفع RTL، بخش‌بندی بهتر، دکمه راه‌اندازی مخزن)
   ════════════════════════════════════════════════════════════ */

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type GitTasksPlugin from '../main';
import type { Language, RepoInfo } from '../types';
import { t, applyDirection } from '../i18n';
import { getAuthenticatedUser, listRepos } from '../utils/github';

export class GitTasksSettingsTab extends PluginSettingTab {
    plugin: GitTasksPlugin;
    private repos: RepoInfo[] = [];
    private connectionOk = false;
    private testing = false;
    private initializing = false;

    constructor(app: App, plugin: GitTasksPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('git-tasks-settings');

        const lang = this.plugin.settings.language;
        applyDirection(containerEl, lang);

        new Setting(containerEl).setName(t(lang, 'settings_title')).setHeading();

        /* ═══════ زبان ═══════ */
        new Setting(containerEl)
            .setName(t(lang, 'settings_language'))
            .setDesc(t(lang, 'settings_language_desc'))
            .addDropdown(dd => {
                dd.addOption('en', 'English');
                dd.addOption('fa', 'فارسی');
                dd.setValue(lang);
                dd.onChange(async (v) => {
                    this.plugin.settings.language = v as Language;
                    await this.plugin.saveSettings();
                    this.display();
                });
            });

        /* ═══════ گیت‌هاب ═══════ */
        new Setting(containerEl).setName(t(lang, 'settings_github_section')).setHeading();

        new Setting(containerEl)
            .setName(t(lang, 'settings_token'))
            .setDesc(t(lang, 'settings_token_desc'))
            .addText(text => {
                text.inputEl.type = 'password';
                text.inputEl.dir = 'ltr';
                text.setPlaceholder(t(lang, 'settings_token_placeholder'))
                    .setValue(this.plugin.settings.token)
                    .onChange(async (v) => {
                        this.plugin.settings.token = v.trim();
                        this.connectionOk = false;
                        await this.plugin.saveSettings();
                    });
            });

        const testSetting = new Setting(containerEl).setName(t(lang, 'settings_test_connection'));
        testSetting.addButton(btn => {
            btn.setButtonText(this.testing ? t(lang, 'settings_testing') : t(lang, 'settings_test_connection'))
                .setCta()
                .setDisabled(this.testing)
                .onClick(() => this.testConnection());
        });
        if (this.connectionOk) {
            testSetting.setDesc(t(lang, 'settings_connection_ok', { username: this.plugin.settings.username }));
        }

        new Setting(containerEl)
            .setName(t(lang, 'settings_username'))
            .addText(text => {
                text.inputEl.dir = 'ltr';
                text.setValue(this.plugin.settings.username).onChange(async (v) => {
                    this.plugin.settings.username = v.trim();
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName(t(lang, 'settings_repo'))
            .setDesc(this.repos.length > 0 ? t(lang, 'settings_repo_desc') : t(lang, 'settings_test_first'))
            .addDropdown(dd => {
                dd.addOption('', t(lang, 'settings_repo_placeholder'));
                for (const r of this.repos) {
                    dd.addOption(r.name, r.full_name + (r.private ? ' 🔒' : ''));
                }
                dd.setValue(this.plugin.settings.repo);
                dd.onChange(async (v) => {
                    this.plugin.settings.repo = v;
                    const found = this.repos.find(r => r.name === v);
                    if (found && !this.plugin.settings.branch) {
                        this.plugin.settings.branch = found.default_branch || 'main';
                    }
                    await this.plugin.saveSettings();
                    this.display();
                });
            });

        new Setting(containerEl)
            .setName(t(lang, 'settings_branch'))
            .setDesc(t(lang, 'settings_branch_desc'))
            .addText(text => {
                text.inputEl.dir = 'ltr';
                text.setValue(this.plugin.settings.branch).onChange(async (v) => {
                    this.plugin.settings.branch = v.trim() || 'main';
                    await this.plugin.saveSettings();
                });
            });

        /* 🆕 دکمه راه‌اندازی مخزن */
        new Setting(containerEl)
            .setName(t(lang, 'settings_repo_init'))
            .setDesc(t(lang, 'settings_repo_init_desc'))
            .addButton(btn => {
                btn.setButtonText(this.initializing ? '...' : t(lang, 'settings_repo_init_btn'))
                    .setDisabled(this.initializing || !this.plugin.settings.token || !this.plugin.settings.repo)
                    .onClick(async () => {
                        this.initializing = true;
                        this.display();
                        try {
                            const created = await this.plugin.taskManager.ensureRepo();
                            new Notice(t(lang, 'settings_repo_init_ok') + (created.length ? ` (${created.join(', ')})` : ''));
                        } catch (e: any) {
                            new Notice(t(lang, 'settings_repo_init_fail', { error: e?.message || 'unknown' }));
                        }
                        this.initializing = false;
                        this.display();
                    });
            });

        /* ═══════ نمایش ═══════ */
        new Setting(containerEl).setName(t(lang, 'settings_display_section')).setHeading();

        new Setting(containerEl)
            .setName(t(lang, 'settings_jalali'))
            .setDesc(t(lang, 'settings_jalali_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.useJalaliDate)
                .onChange(async (v) => {
                    this.plugin.settings.useJalaliDate = v;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(t(lang, 'settings_per_page'))
            .setDesc(t(lang, 'settings_per_page_desc'))
            .addText(text => {
                text.inputEl.type = 'number';
                text.inputEl.dir = 'ltr';
                text.inputEl.min = '5';
                text.inputEl.max = '100';
                text.setValue(String(this.plugin.settings.tasksPerPage)).onChange(async (v) => {
                    const n = parseInt(v) || 20;
                    this.plugin.settings.tasksPerPage = Math.max(5, Math.min(100, n));
                    await this.plugin.saveSettings();
                });
            });

        /* ═══════ همگام‌سازی ═══════ */
        new Setting(containerEl).setName(t(lang, 'settings_sync_section')).setHeading();

        new Setting(containerEl)
            .setName(t(lang, 'settings_sync_on_open'))
            .setDesc(t(lang, 'settings_sync_on_open_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.autoSyncOnOpen)
                .onChange(async (v) => {
                    this.plugin.settings.autoSyncOnOpen = v;
                    await this.plugin.saveSettings();
                }));

        /* 🆕 پشتیبانی از اعشار (0.5 برای ۳۰ ثانیه) */
        new Setting(containerEl)
            .setName(t(lang, 'settings_sync_interval'))
            .setDesc(t(lang, 'settings_sync_interval_desc'))
            .addText(text => {
                text.inputEl.type = 'number';
                text.inputEl.dir = 'ltr';
                text.inputEl.min = '0';
                text.inputEl.step = '0.5';
                text.setValue(String(this.plugin.settings.autoSyncInterval)).onChange(async (v) => {
                    const n = parseFloat(v) || 0;
                    this.plugin.settings.autoSyncInterval = Math.max(0, n);
                    await this.plugin.saveSettings();
                    this.plugin.restartAutoSync();
                });
            });

        new Setting(containerEl)
            .setName(t(lang, 'settings_sync_after_edit'))
            .setDesc(t(lang, 'settings_sync_after_edit_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.autoSyncAfterEdit)
                .onChange(async (v) => {
                    this.plugin.settings.autoSyncAfterEdit = v;
                    await this.plugin.saveSettings();
                }));
    }

    private async testConnection(): Promise<void> {
        const lang = this.plugin.settings.language;
        if (!this.plugin.settings.token) {
            new Notice(t(lang, 'notice_fill_token'));
            return;
        }
        this.testing = true;
        this.display();
        try {
            const user = await getAuthenticatedUser(this.plugin.settings.token);
            if (!user) {
                this.connectionOk = false;
                new Notice(t(lang, 'settings_connection_fail', { error: 'Invalid token' }));
                this.testing = false;
                this.display();
                return;
            }
            this.plugin.settings.username = user.login;

            const repos = await listRepos(this.plugin.settings.token);
            this.repos = repos.map((r: any) => ({
                name: r.name,
                full_name: r.full_name,
                private: r.private,
                default_branch: r.default_branch || 'main',
            }));
            await this.plugin.saveSettings();
            this.connectionOk = true;
            new Notice(t(lang, 'settings_connection_ok', { username: user.login }));
        } catch (e: any) {
            this.connectionOk = false;
            new Notice(t(lang, 'settings_connection_fail', { error: e?.message || 'unknown' }));
        }
        this.testing = false;
        this.display();
    }
}
