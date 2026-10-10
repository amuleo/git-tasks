/* ════════════════════════════════════════════════════════════
   🍞 مدیریت Toast — نمایش هوشمند با صف
   قوانین:
   - اگه ۴ تا یا کمتر: همه نشون داده می‌شن
   - اگه بیشتر از ۴: ۴ تای اول + آخرین
   ════════════════════════════════════════════════════════════ */

export type ToastType = 'info' | 'success' | 'error' | 'warning';

interface ToastItem {
    id: number;
    text: string;
    type: ToastType;
    duration: number;
    timeoutId?: number;
}

export class ToastManager {
    private container: HTMLElement;
    private queue: ToastItem[] = [];
    private maxVisible = 4;
    private nextId = 1;

    constructor() {
        /* کانتینر اصلی */
        this.container = document.body.createDiv({ cls: 'git-tasks-toast-container' });
    }

    /* ───── تنظیم RTL ───── */
    setRTL(rtl: boolean): void {
        this.container.toggleClass('git-tasks-toast-rtl', rtl);
    }

    /* ───── نمایش یه Toast جدید ───── */
    show(text: string, type: ToastType = 'info', duration = 3000): void {
        const item: ToastItem = {
            id: this.nextId++,
            text,
            type,
            duration,
        };
        this.queue.push(item);
        this.flush();

        /* زمان‌بندی حذف */
        item.timeoutId = window.setTimeout(() => this.remove(item.id), duration);
    }

    /* ───── پاک کردن همه ───── */
    clear(): void {
        for (const item of this.queue) {
            if (item.timeoutId) window.clearTimeout(item.timeoutId);
        }
        this.queue = [];
        this.container.empty();
    }

    /* ───── نابودی کامل (هنگام unload پلاگین) ───── */
    destroy(): void {
        this.clear();
        this.container.remove();
    }

    /* ═══════════════════════════════════════════════════
       الگوریتم نمایش:
       - total <= 4 → همه
       - total > 4 → اولی ۴ تا + آخری
       ═══════════════════════════════════════════════════ */
    private flush(): void {
        this.container.empty();

        const total = this.queue.length;
        const toRender: ToastItem[] = [];

        if (total <= this.maxVisible) {
            toRender.push(...this.queue);
        } else {
            /* ۴ تای اول */
            toRender.push(...this.queue.slice(0, this.maxVisible));
            /* آخری */
            const last = this.queue[total - 1];
            if (!toRender.find(t => t.id === last.id)) {
                toRender.push(last);
            }
        }

        for (const item of toRender) {
            this.renderToast(item);
        }
    }

    private renderToast(item: ToastItem): void {
        const el = this.container.createDiv({
            cls: `git-tasks-toast git-tasks-toast-${item.type}`,
        });
        el.dataset.id = String(item.id);
        el.createSpan({ text: item.text });

        /* کلیک = حذف فوری */
        el.onclick = () => this.remove(item.id);

        /* انیمیشن ورود */
        requestAnimationFrame(() => el.addClass('is-visible'));
    }

    private remove(id: number): void {
        const item = this.queue.find(t => t.id === id);
        if (item?.timeoutId) window.clearTimeout(item.timeoutId);
        this.queue = this.queue.filter(t => t.id !== id);
        this.flush();
    }
}
