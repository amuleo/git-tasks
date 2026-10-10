/* ════════════════════════════════════════════════════════════
   🍞 Toast Manager — نمایش سریالی (یکی یکی)
   ✅ بالای صفحه (شبیه اعلان‌های پیش‌فرض آبسیدین)
   ✅ یکی یکی نمایش داده می‌شن (نه پشت سر هم)
   ✅ صف داخلی برای مدیریت
   ════════════════════════════════════════════════════════════ */

export type ToastType = 'info' | 'success' | 'error' | 'warning';

interface ToastItem {
    id: number;
    text: string;
    type: ToastType;
    duration: number;
}

export class ToastManager {
    private container: HTMLElement;
    private queue: ToastItem[] = [];
    private current: ToastItem | null = null;
    private currentEl: HTMLElement | null = null;
    private currentTimeout: number | null = null;
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
        if (!this.current) {
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
            return;
        }

        const item = this.queue.shift()!;
        this.current = item;

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

        /* کلیک = حذف فوری */
        el.onclick = () => {
            if (this.currentTimeout) {
                window.clearTimeout(this.currentTimeout);
                this.currentTimeout = null;
            }
            this.current = null;
            this.currentEl = null;
            this.showNext();
        };

        /* زمان‌بندی برای آیتم بعدی */
        this.currentTimeout = window.setTimeout(() => {
            this.currentTimeout = null;
            /* انیمیشن خروج */
            if (this.currentEl) {
                this.currentEl.removeClass('is-visible');
            }
            /* بعد از انیمیشن، بعدی رو نشون بده */
            window.setTimeout(() => {
                this.current = null;
                this.currentEl = null;
                this.showNext();
            }, 200);
        }, item.duration);
    }
}
