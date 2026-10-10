/* ════════════════════════════════════════════════════════════
   ⚙️ تب تنظیمات پلاگین
   ════════════════════════════════════════════════════════════ */

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type GitTasksPlugin from '../main';
import type { Language, RepoInfo } from '../types';
import { t, applyDirection, isRTL } from '../i18n';
import { getAuthenticatedUser, listRepos } from '../utils/github';

export class GitTasksSettingsTab extends PluginSettingTab {
    plugin: GitTasksPlugin;
    private repos: RepoInfo[] = [];
    private connectionOk = false;
    private testing = false;

    constructor(app: App, plugin: GitTasksPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    /* رفرش کامل تب */
    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        const lang = this.plugin.settings.language;
        applyDirection(containerEl, lang);

        /* عنوان */
        new Setting(containerEl)
            .setName(t(lang, 'settings_title'))
            .setHeading();

        /* ───── زبان ───── */
        new Setting(containerEl)
            .setName(t(lang, 'settings_language'))
            .setDesc(t(lang, 'settings_language_desc'))
            .addDropdown(dd => {
                dd.addOption('en', 'English');
                dd.addOption('fa', 'فارسی');
                dd.setValue(lang);
                dd.onChange(async (value) => {
                    this.plugin.settings.language = value as Language;
                    await this.plugin.saveSettings();
                    this.display(); // رفرش کامل تب برای اعمال جهت
                });
            });

        /* ───── بخش گیت‌هاب ───── */
        new Setting(containerEl).setName(t(lang, 'settings_github_section')).setHeading();

        /* توکن */
        new Setting(containerEl)
            .setName(t(lang, 'settings_token'))
            .setDesc(t(lang, 'settings_token_desc'))
            .addText(text => {
                text.inputEl.type = 'password';
                text.inputEl.dir = 'ltr';
                text
                    .setPlaceholder(t(lang, 'settings_token_placeholder'))
                    .setValue(this.plugin.settings.token)
                    .onChange(async (v) => {
                        this.plugin.settings.token = v.trim();
                        this.connectionOk = false;
                        await this.plugin.saveSettings();
                    });
            });

        /* دکمه تست اتصال */
        const testSetting = new Setting(containerEl).setName(t(lang, 'settings_test_connection'));
        testSetting.addButton(btn => {
            btn.setButtonText(this.testing ? t(lang, 'settings_testing') : t(lang, 'settings_test_connection'))
                .setCta()
                .setDisabled(this.testing)
                .onClick(async () => {
                    await this.testConnection();
                });
        });

        /* اگه اتصال برقرار شد، پیام موفقیت نشون بده */
        if (this.connectionOk) {
            testSetting.setDesc(
                t(lang, 'settings_connection_ok', { username: this.plugin.settings.username })
            );
        }

        /* نام کاربری (خودکار پر می‌شه، ولی قابل ویرایشه) */
        new Setting(containerEl)
            .setName(t(lang, 'settings_username'))
            .addText(text => {
                text.inputEl.dir = 'ltr';
                text.setValue(this.plugin.settings.username).onChange(async (v) => {
                    this.plugin.settings.username = v.trim();
                    await this.plugin.saveSettings();
                });
            });

        /* مخزن (dropdown داینامیک) */
        const repoSetting = new Setting(containerEl)
            .setName(t(lang, 'settings_repo'))
            .setDesc(this.repos.length > 0 ? t(lang, 'settings_repo_desc') : t(lang, 'settings_test_first'));

        repoSetting.addDropdown(dd => {
            dd.addOption('', t(lang, 'settings_repo_placeholder'));
            for (const r of this.repos) {
                dd.addOption(r.name, r.full_name + (r.private ? ' 🔒' : ''));
            }
            dd.setValue(this.plugin.settings.repo);
            dd.onChange(async (v) => {
                this.plugin.settings.repo = v;
                /* اگه branch پیش‌فرض مخزن رو داشتیم، خودکار پرش کن */
                const found = this.repos.find(r => r.name === v);
                if (found && !this.plugin.settings.branch) {
                    this.plugin.settings.branch = found.default_branch || 'main';
                }
                await this.plugin.saveSettings();
                this.display();
            });
        });

        /* شاخه */
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

        /* ───── بخش نمایش ───── */
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

        /* ───── بخش سینک خودکار ───── */
        new Setting(containerEl).setName(t(lang, 'settings_sync_section')).setHeading();

        /* فیچر ۱: سینک هنگام باز شدن پنل */
        new Setting(containerEl)
            .setName(t(lang, 'settings_sync_on_open'))
            .setDesc(t(lang, 'settings_sync_on_open_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.autoSyncOnOpen)
                .onChange(async (v) => {
                    this.plugin.settings.autoSyncOnOpen = v;
                    await this.plugin.saveSettings();
                }));

        /* فیچر ۲: سینک هر X دقیقه */
        new Setting(containerEl)
            .setName(t(lang, 'settings_sync_interval'))
            .setDesc(t(lang, 'settings_sync_interval_desc'))
            .addText(text => {
                text.inputEl.type = 'number';
                text.inputEl.dir = 'ltr';
                text.inputEl.min = '0';
                text.setValue(String(this.plugin.settings.autoSyncInterval)).onChange(async (v) => {
                    const n = parseInt(v) || 0;
                    this.plugin.settings.autoSyncInterval = Math.max(0, n);
                    await this.plugin.saveSettings();
                    this.plugin.restartAutoSync();
                });
            });

        /* فیچر ۳: سینک بعد از تغییرات */
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

    /* ───── تست اتصال به گیت‌هاب ───── */
    private async testConnection(): Promise<void> {
        const lang = this.plugin.settings.language;

        if (!this.plugin.settings.token) {
            new Notice(t(lang, 'notice_fill_token'));
            return;
        }

        this.testing = true;
        this.display();

        try {
            /* مرحله ۱: گرفتن اطلاعات کاربر */
            const user = await getAuthenticatedUser(this.plugin.settings.token);
            if (!user) {
                this.connectionOk = false;
                new Notice(t(lang, 'settings_connection_fail', { error: 'Invalid token' }));
                this.testing = false;
                this.display();
                return;
            }

            this.plugin.settings.username = user.login;

            /* مرحله ۲: گرفتن لیست مخزن‌ها */
            const repos = await listRepos(this.plugin.settings.token);
            this.repos = repos.map((r: any) => ({
                name: r.name,
                full_name: r.full_name,
                private: r.private,
                default_branch: r.default_branch || 'main',
            }));

            /* اگه مخزن فعلی توی لیست نبود، ولی خالیه، اولین رو انتخاب نکن */
            /* ولی اگه بود، دست نمی‌زنیم */

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
