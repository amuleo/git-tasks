/* ════════════════════════════════════════════════════════════
   📦 تایپ‌های اصلی پروژه
   ════════════════════════════════════════════════════════════ */

/* ───── دسته‌بندی ───── */
export interface Category {
    id: string;           // شناسه یکتا (مثلاً "work")
    name: string;         // نام انگلیسی
    name_fa?: string;     // نام فارسی (اختیاری)
    color?: string;       // رنگ اختیاری برای نمایش (hex)
}

/* ───── فایل تنظیمات دسته‌بندی در گیت‌هاب ───── */
export interface CategoryFile {
    version: number;
    categories: Category[];
}

/* ───── تسک ───── */
export interface Task {
    id: string;                    // شناسه (نام فولدر در گیت‌هاب)
    title: string;                 // عنوان تسک
    description: string;           // توضیحات
    category: string | null;       // شناسه دسته‌بندی یا null
    completed: boolean;            // انجام شده؟
    deleted: boolean;              // حذف نرم شده؟
    created_jalali: string;        // تاریخ شمسی به شکل "1405/07/18 - 14:30"
    created_gregorian: string;     // تاریخ میلادی به شکل "2026-10-10 14:30"
    created_ts: number;            // timestamp برای مرتب‌سازی
    updated_ts: number;            // آخرین آپدیت
    sha?: string;                  // SHA فایل README (برای ویرایش)
}

/* ───── تنظیمات پلاگین ───── */
export type Language = 'en' | 'fa';

export interface GitTasksSettings {
    language: Language;
    token: string;                 // توکن دسترسی گیت‌هاب
    username: string;              // نام کاربری گیت‌هاب (خودکار پر می‌شه)
    repo: string;                  // نام مخزن
    branch: string;                // شاخه (پیش‌فرض: main)
    useJalaliDate: boolean;        // نمایش تاریخ شمسی
    tasksPerPage: number;          // تعداد تسک در هر بار
    autoSyncOnOpen: boolean;       // سینک هنگام باز شدن پنل
    autoSyncInterval: number;      // سینک هر X دقیقه (0 = غیرفعال)
    autoSyncAfterEdit: boolean;    // سینک بعد از ساخت/ویرایش
}

export const DEFAULT_SETTINGS: GitTasksSettings = {
    language: 'en',
    token: '',
    username: '',
    repo: '',
    branch: 'main',
    useJalaliDate: false,
    tasksPerPage: 20,
    autoSyncOnOpen: true,
    autoSyncInterval: 0,
    autoSyncAfterEdit: false,
};

/* ───── نتیجه تست اتصال ───── */
export interface ConnectionTestResult {
    success: boolean;
    username?: string;
    error?: string;
}

/* ───── اطلاعات مخزن برای dropdown ───── */
export interface RepoInfo {
    name: string;
    full_name: string;
    private: boolean;
    default_branch: string;
}
