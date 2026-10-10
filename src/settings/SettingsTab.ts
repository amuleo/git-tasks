/* ════════════════════════════════════════════════════════════
   ⚙️ تب تنظیمات پلاگین
   ✅ فاصله همگام‌سازی با dropdown
   ✅ تعداد تسک با dropdown (۵ تا ۳۰، پیش‌فرض ۱۰)
   ✅ دکمه Initialize
   ✅ رفع i18n
   ✅ بهینه‌سازی refresh (جلوگیری از رفرش‌های پشت سر هم)
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

    /* 🆕 جلوگیری از رفرش‌های پشت سر هم */
    private refreshTimer: number | null = null;

    constructor(app: App, plugin: GitTasksPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    /* 🆕 رفرش با تأخیر کوچیک (به جای display فوری) */
    private scheduleRefresh(): void {
        if (this.refreshTimer !== null) {
            window.clearTimeout(this.refreshTimer);
        }
        this.refreshTimer = window.setTimeout(() => {
            this.refreshTimer = null;
            this.display();
        }, 50);
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
                    /* 🆕 رفرش با تأخیر */
                    this.scheduleRefresh();
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
                    /* 🆕 رفرش با تأخیر */
                    this.scheduleRefresh();
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

        new Setting(containerEl)
            .setName(t(lang, 'settings_repo_init'))
            .setDesc(t(lang, 'settings_repo_init_desc'))
            .addButton(btn => {
                btn.setButtonText(this.initializing ? '...' : t(lang, 'settings_repo_init_btn'))
                    .setDisabled(this.initializing || !this.plugin.settings.token || !this.plugin.settings.repo)
                    .onClick(async () => {
                        this.initializing = true;
                        /* 🆕 رفرش با تأخیر */
                        this.scheduleRefresh();
                        try {
                            const created = await this.plugin.taskManager.ensureRepo();
                            new Notice(t(lang, 'settings_repo_init_ok') + (created.length ? ` (${created.join(', ')})` : ''));
                        } catch (e: any) {
                            new Notice(t(lang, 'settings_repo_init_fail', { error: e?.message || 'unknown' }));
                        }
                        this.initializing = false;
                        /* 🆕 رفرش با تأخیر */
                        this.scheduleRefresh();
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
                    try {
                        await this.plugin.taskManager.refreshStatsAfterSettingsChange();
                        this.plugin.refreshPanel();
                    } catch (e) {
                        console.warn('[Git Tasks] Stats refresh failed:', e);
                    }
                }));

        /* 🆕 تعداد تسک در هر صفحه — dropdown */
        new Setting(containerEl)
            .setName(t(lang, 'settings_per_page'))
            .setDesc(t(lang, 'settings_per_page_desc'))
            .addDropdown(dd => {
                const options = [5, 10, 15, 20, 25, 30];

                for (const n of options) {
                    dd.addOption(String(n), String(n));
                }

                let current = this.plugin.settings.tasksPerPage;
                if (!options.includes(current)) {
                    current = 10;
                }
                dd.setValue(String(current));

                dd.onChange(async (v) => {
                    const n = parseInt(v) || 10;
                    this.plugin.settings.tasksPerPage = n;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
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

        /* 🆕 فاصله همگام‌سازی — dropdown */
        new Setting(containerEl)
            .setName(t(lang, 'settings_sync_interval'))
            .setDesc(t(lang, 'settings_sync_interval_desc'))
            .addDropdown(dd => {
                const options: { value: number; label: string }[] = [
                    { value: 0,     label: lang === 'fa' ? 'غیرفعال' : 'Disabled' },
                    { value: 0.25,  label: lang === 'fa' ? '۱۵ ثانیه' : '15 seconds' },
                    { value: 0.5,   label: lang === 'fa' ? '۳۰ ثانیه' : '30 seconds' },
                    { value: 0.75,  label: lang === 'fa' ? '۴۵ ثانیه' : '45 seconds' },
                    { value: 1,     label: lang === 'fa' ? '۱ دقیقه' : '1 minute' },
                    { value: 2,     label: lang === 'fa' ? '۲ دقیقه' : '2 minutes' },
                    { value: 5,     label: lang === 'fa' ? '۵ دقیقه' : '5 minutes' },
                    { value: 10,    label: lang === 'fa' ? '۱۰ دقیقه' : '10 minutes' },
                    { value: 15,    label: lang === 'fa' ? '۱۵ دقیقه' : '15 minutes' },
                    { value: 30,    label: lang === 'fa' ? '۳۰ دقیقه' : '30 minutes' },
                    { value: 60,    label: lang === 'fa' ? '۱ ساعت' : '1 hour' },
                ];

                for (const opt of options) {
                    dd.addOption(String(opt.value), opt.label);
                }

                const current = String(this.plugin.settings.autoSyncInterval);
                const valid = options.some(o => String(o.value) === current);
                dd.setValue(valid ? current : '0');

                dd.onChange(async (v) => {
                    const n = parseFloat(v) || 0;
                    this.plugin.settings.autoSyncInterval = n;
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
        /* 🆕 رفرش با تأخیر */
        this.scheduleRefresh();
        try {
            const user = await getAuthenticatedUser(this.plugin.settings.token);
            if (!user) {
                this.connectionOk = false;
                new Notice(t(lang, 'settings_connection_fail', { error: 'Invalid token' }));
                this.testing = false;
                /* 🆕 رفرش با تأخیر */
                this.scheduleRefresh();
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
        /* 🆕 رفرش با تأخیر */
        this.scheduleRefresh();
    }
}
