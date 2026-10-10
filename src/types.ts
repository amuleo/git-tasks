/* ════════════════════════════════════════════════════════════
   📦 تایپ‌های اصلی پروژه
   ════════════════════════════════════════════════════════════ */

/* ───── دسته‌بندی ───── */
export interface Category {
    id: string;
    name: string;
    name_fa?: string;
    color?: string;
}

export interface CategoryFile {
    version: number;
    categories: Category[];
}

/* ───── تسک ───── */
export interface Task {
    id: string;
    title: string;
    description: string;
    category: string | null;
    completed: boolean;
    deleted: boolean;
    pinned: boolean;               // 🆕 پین شده؟
    created_jalali: string;
    created_gregorian: string;
    created_ts: number;
    updated_ts: number;
    completed_ts: number;          // 🆕 زمان تکمیل (برای آمار)
    sha?: string;
}

/* ───── فایل index.json (ذخیره‌ی آمار) ───── */
export interface CompletedStats {
    today: number;
    yesterday: number;
    this_week: number;
    last_month: number;
    this_year: number;
    total: number;
}

export interface IndexFile {
    version: number;
    last_updated: number;
    stats: CompletedStats;
}

/* ───── تنظیمات پلاگین ───── */
export type Language = 'en' | 'fa';

export interface GitTasksSettings {
    language: Language;
    token: string;
    username: string;
    repo: string;
    branch: string;
    useJalaliDate: boolean;
    tasksPerPage: number;
    autoSyncOnOpen: boolean;
    autoSyncInterval: number;
    autoSyncAfterEdit: boolean;
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

/* ───── اطلاعات مخزن ───── */
export interface RepoInfo {
    name: string;
    full_name: string;
    private: boolean;
    default_branch: string;
}
