/* ════════════════════════════════════════════════════════════
   🇮🇷 ترجمه‌های فارسی
   ════════════════════════════════════════════════════════════ */

export default {
    plugin_name: 'تسک‌های گیت',

    /* ───── پنل ───── */
    panel_title: 'کارها',
    panel_empty: 'همه‌ی کارها انجام شد!',
    panel_empty_hint: 'برای شروع، یه کار جدید بساز',
    panel_new_task: 'کار جدید',
    panel_reload: 'بروزرسانی',
    panel_show_more: 'نمایش بیشتر',
    panel_loading: 'در حال لود...',
    panel_syncing: 'در حال همگام‌سازی...',
    panel_all_categories: 'همه‌ی دسته‌ها',
    panel_no_category: 'بدون دسته',

    /* ───── وضعیت تسک ───── */
    task_pending: 'در انتظار',
    task_done: 'انجام شده',
    task_completing: 'در حال ثبت...',

    /* ───── مودال ساخت/ویرایش ───── */
    create_title: 'کار جدید',
    edit_title: 'ویرایش کار',
    field_title: 'عنوان',
    field_title_placeholder: 'چی کار کنم؟',
    field_description: 'توضیحات (اختیاری)',
    field_description_placeholder: 'جزئیات رو بنویس...',
    field_category: 'دسته‌بندی',
    btn_cancel: 'لغو',
    btn_save: 'ذخیره',
    btn_create: 'ایجاد',

    /* ───── مودال جزئیات ───── */
    details_title: 'جزئیات کار',
    details_created: 'تاریخ ساخت',
    details_status: 'وضعیت',
    details_category: 'دسته‌بندی',
    details_description: 'توضیحات',
    details_no_description: 'بدون توضیحات',
    btn_mark_done: 'انجام شد',
    btn_edit: 'ویرایش',
    btn_delete: 'حذف',

    /* ───── تأیید حذف ───── */
    confirm_delete_title: 'کار حذف بشه؟',
    confirm_delete_body: 'کار از لیست مخفی می‌شه.',
    confirm_yes: 'بله، حذف کن',
    confirm_no: 'نه',

    /* ───── تنظیمات ───── */
    settings_title: 'تنظیمات تسک‌های گیت',

    settings_language: 'زبان',
    settings_language_desc: 'زبان رابط کاربری پلاگین',

    settings_github_section: 'اتصال به گیت‌هاب',
    settings_token: 'توکن دسترسی شخصی',
    settings_token_desc: 'از github.com/settings/tokens بساز (با اسکوپ repo)',
    settings_token_placeholder: 'ghp_...',
    settings_test_connection: 'تست اتصال',
    settings_testing: 'در حال تست...',
    settings_connection_ok: 'متصل به @{username}',
    settings_connection_fail: 'اتصال برقرار نشد: {error}',
    settings_username: 'نام کاربری گیت‌هاب',
    settings_repo: 'مخزن',
    settings_repo_desc: 'یه مخزن انتخاب کن',
    settings_repo_placeholder: 'انتخاب مخزن...',
    settings_branch: 'شاخه',
    settings_branch_desc: 'معمولاً main یا master',
    settings_test_first: 'اول اتصال رو تست کن تا مخزن‌ها لود بشن',

    settings_display_section: 'نمایش',
    settings_jalali: 'استفاده از تاریخ شمسی',
    settings_jalali_desc: 'نمایش تاریخ‌ها به شمسی',
    settings_per_page: 'تعداد کار در هر صفحه',
    settings_per_page_desc: 'هر بار چند کار لود بشه',

    settings_sync_section: 'همگام‌سازی خودکار',
    settings_sync_on_open: 'همگام‌سازی هنگام باز شدن پنل',
    settings_sync_on_open_desc: 'هر بار پنل رو باز می‌کنی، بروزرسانی کن',
    settings_sync_interval: 'همگام‌سازی هر چند دقیقه',
    settings_sync_interval_desc: '۰ = غیرفعال. مثلاً ۱۵',
    settings_sync_after_edit: 'همگام‌سازی بعد از تغییرات',
    settings_sync_after_edit_desc: 'تغییرات فوری به گیت‌هاب فرستاده بشن',

    /* ───── اعلان‌ها ───── */
    notice_task_created: 'کار ساخته شد',
    notice_task_updated: 'کار ویرایش شد',
    notice_task_completed: 'کار انجام شد',
    notice_task_deleted: 'کار حذف شد',
    notice_sync_ok: 'کارها بروزرسانی شدن',
    notice_sync_fail: 'همگام‌سازی ناموفق: {error}',
    notice_fill_token: 'اول توکن رو وارد کن',
    notice_fill_repo: 'اول یه مخزن انتخاب کن',
    notice_no_title: 'عنوان الزامیه',
    notice_repo_empty: 'مخزن خالیه یا پیدا نشد',
    notice_categories_fail: 'دسته‌بندی‌ها لود نشدن',
};
