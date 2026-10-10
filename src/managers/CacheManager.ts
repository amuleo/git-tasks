/* ════════════════════════════════════════════════════════════
   💾 مدیریت کش محلی (برای حالت آفلاین)
   ════════════════════════════════════════════════════════════ */

import { App } from 'obsidian';
import type { Task, Category } from '../types';

export class CacheManager {
    private app: App;
    private cachePath: string;

    constructor(app: App) {
        this.app = app;
        /* مسیر فایل کش داخل پوشه پلاگین */
        this.cachePath = `${app.vault.configDir}/plugins/git-tasks/cache.json`;
    }

    /* ذخیره تسک‌ها و دسته‌بندی‌ها روی دیسک */
    async save(tasks: Task[], categories: Category[]): Promise<void> {
        try {
            const data = JSON.stringify({ tasks, categories, ts: Date.now() });
            /* اگه فایل هست، آپدیت کن، وگرنه بساز */
            const exists = await this.app.vault.adapter.exists(this.cachePath);
            if (exists) {
                await this.app.vault.adapter.write(this.cachePath, data);
            } else {
                await this.app.vault.adapter.write(this.cachePath, data);
            }
        } catch (e) {
            console.warn('[Git Tasks] Cache save failed:', e);
        }
    }

    /* خوندن کش */
    async load(): Promise<{ tasks: Task[]; categories: Category[] } | null> {
        try {
            const exists = await this.app.vault.adapter.exists(this.cachePath);
            if (!exists) return null;
            const raw = await this.app.vault.adapter.read(this.cachePath);
            const data = JSON.parse(raw);
            return { tasks: data.tasks || [], categories: data.categories || [] };
        } catch (e) {
            console.warn('[Git Tasks] Cache load failed:', e);
            return null;
        }
    }

    /* پاک کردن کش */
    async clear(): Promise<void> {
        try {
            const exists = await this.app.vault.adapter.exists(this.cachePath);
            if (exists) await this.app.vault.adapter.remove(this.cachePath);
        } catch (e) {
            console.warn('[Git Tasks] Cache clear failed:', e);
        }
    }
}
