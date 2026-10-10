/* ════════════════════════════════════════════════════════════
   🍞 Toast Manager — نمایش سریالی (یکی یکی)
   ✅ بالای صفحه (شبیه اعلان‌های پیش‌فرض آبسیدین)
   ✅ یکی یکی نمایش داده می‌شن (نه پشت سر هم)
   ✅ انیمیشن خروج نرم هنگام کلیک (fade-out)
   ════════════════════════════════════════════════════════════ */

export type ToastType = 'info' | 'success' | 'error' | 'warning';

interface ToastItem {
    id: number;
    text: string;
    type: ToastType;
    duration: number;
}

/* مدت زمان انیمیشن خروج (باید با CSS هماهنگ باشه) */
const EXIT_ANIMATION_MS = 250;

export class ToastManager {
    private container: HTMLElement;
    private queue: ToastItem[] = [];
    private current: ToastItem | null = null;
    private currentEl: HTMLElement | null = null;
    private currentTimeout: number | null = null;
    private isExiting = false;
    private nextId = 1;

    constructor() {
        this.container = document.body.createDiv({ cls: 'git-tasks-toast-container' });
    }

    /* ───── RTL ───── */
    setRTL(rtl: boolean): void {
        this.container.toggleClass('git-tasks-toast-rtl', rtl);
    }

    /* ───── نمایش ───── */
    show(text: string, type: ToastType = 'info', duration = 3000): void {
        const item: ToastItem = {
            id: this.nextId++,
            text,
            type,
            duration,
        };
        this.queue.push(item);

        /* اگه هیچی نمایش داده نمی‌شه، فوری نشون بده */
        if (!this.current && !this.isExiting) {
            this.showNext();
        }
    }

    /* ───── پاکسازی ───── */
    clear(): void {
        if (this.currentTimeout) {
            window.clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }
        this.queue = [];
        this.current = null;
        this.currentEl = null;
        this.isExiting = false;
        this.container.empty();
    }

    destroy(): void {
        this.clear();
        this.container.remove();
    }

    /* ═══════════════════════════════════════════════════════
       نمایش آیتم بعدی از صف
       ═══════════════════════════════════════════════════════ */
    private showNext(): void {
        if (this.queue.length === 0) {
            this.current = null;
            this.currentEl = null;
            this.isExiting = false;
            return;
        }

        const item = this.queue.shift()!;
        this.current = item;
        this.isExiting = false;

        /* ساخت المان */
        this.container.empty();
        const el = this.container.createDiv({
            cls: `git-tasks-toast git-tasks-toast-${item.type}`,
        });
        el.dataset.id = String(item.id);
        el.createSpan({ text: item.text });
        this.currentEl = el;

        /* انیمیشن ورود */
        requestAnimationFrame(() => el.addClass('is-visible'));

        /* کلیک = خروج نرم + رفتن به بعدی */
        el.onclick = () => {
            this.exitCurrent();
        };

        /* زمان‌بندی خودکار */
        this.currentTimeout = window.setTimeout(() => {
            this.currentTimeout = null;
            this.exitCurrent();
        }, item.duration);
    }

    /* ═══════════════════════════════════════════════════════
       خروج نرم با انیمیشن (fade-out)
       ═══════════════════════════════════════════════════════ */
    private exitCurrent(): void {
        /* جلوگیری از دوبار اجرا */
        if (this.isExiting || !this.currentEl) return;
        this.isExiting = true;

        /* پاک کردن تایمر */
        if (this.currentTimeout) {
            window.clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        const el = this.currentEl;

        /* کلاس خروج (CSS انیمیشن fade-out رو اجرا می‌کنه) */
        el.removeClass('is-visible');
        el.addClass('is-exiting');

        /* بعد از انیمیشن خروج، بعدی رو نشون بده */
        window.setTimeout(() => {
            this.current = null;
            this.currentEl = null;
            this.isExiting = false;
            this.showNext();
        }, EXIT_ANIMATION_MS);
    }
}
