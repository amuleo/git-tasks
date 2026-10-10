/* ════════════════════════════════════════════════════════════
   🌐 مدیریت چند زبانه (i18n)
   ════════════════════════════════════════════════════════════ */

import en from './en';
import fa from './fa';
import type { Language } from '../types';

const translations = { en, fa };

type TranslationKey = keyof typeof en;

/* تابع ترجمه: کلید رو می‌گیره، متن ترجمه‌شده رو برمی‌گردونه */
export function t(lang: Language, key: TranslationKey, params?: Record<string, string>): string {
    let text = translations[lang][key] ?? translations.en[key] ?? key;

    /* جایگزینی پارامترها مثل {username} */
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        }
    }
    return text;
}

/* آیا زبان راست‌چینه؟ */
export function isRTL(lang: Language): boolean {
    return lang === 'fa';
}

/* تنظیم جهت روی یه عنصر */
export function applyDirection(el: HTMLElement, lang: Language): void {
    el.setAttribute('dir', isRTL(lang) ? 'rtl' : 'ltr');
    el.classList.toggle('git-tasks-rtl', isRTL(lang));
}
