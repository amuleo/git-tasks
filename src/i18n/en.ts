/* ════════════════════════════════════════════════════════════
   🇬🇧 English translations
   ════════════════════════════════════════════════════════════ */

export default {
    plugin_name: 'Git Tasks',

    /* ───── Tabs ───── */
    tab_pending: 'Tasks',
    tab_completed: 'Completed',

    /* ───── Panel ───── */
    panel_title: 'Tasks',
    panel_title_completed: 'Completed tasks',
    panel_empty: 'All tasks are done!',
    panel_empty_hint: 'Create a new task to start',
    panel_empty_completed: 'No completed tasks yet',
    panel_new_task: 'New task',
    panel_reload: 'Sync',
    panel_show_more: 'Show more',
    panel_loading: 'Loading...',
    panel_syncing: 'Syncing...',
    panel_all_categories: 'All categories',
    panel_no_category: 'No category',

    /* ───── Stats cards ───── */
    stats_today: 'Today',
    stats_yesterday: 'Yesterday',
    stats_this_week: 'This week',
    stats_last_month: 'Last month',
    stats_this_year: 'This year',
    stats_total: 'Total',

    /* ───── Task ───── */
    task_pending: 'Pending',
    task_done: 'Done',
    pinned_badge: 'Pinned',

    /* ───── Modals ───── */
    create_title: 'New task',
    edit_title: 'Edit task',
    details_title: 'Task details',
    field_title: 'Title',
    field_title_placeholder: 'What to do?',
    field_description: 'Description (optional)',
    field_description_placeholder: 'Add details...',
    field_category: 'Category',
    details_created: 'Created',
    details_completed: 'Completed',
    details_status: 'Status',
    details_category: 'Category',
    details_description: 'Description',
    details_no_description: 'No description',

    /* ───── Buttons ───── */
    btn_cancel: 'Cancel',
    btn_save: 'Save',
    btn_create: 'Create',
    btn_mark_done: 'Mark as done',
    btn_mark_pending: 'Mark as pending',
    btn_edit: 'Edit',
    btn_delete: 'Delete',
    btn_pin: 'Pin',
    btn_unpin: 'Unpin',

    /* ───── Confirm ───── */
    confirm_delete_body: 'The task will be hidden from the list.',

    /* ───── Settings ───── */
    settings_title: 'Git Tasks Settings',

    settings_language: 'Language',
    settings_language_desc: 'Plugin interface language',

    settings_github_section: 'GitHub Connection',
    settings_token: 'Personal Access Token',
    settings_token_desc: 'Create at github.com/settings/tokens (needs "repo" scope)',
    settings_token_placeholder: 'ghp_...',
    settings_test_connection: 'Test connection',
    settings_testing: 'Testing...',
    settings_connection_ok: 'Connected as @{username}',
    settings_connection_fail: 'Connection failed: {error}',
    settings_username: 'GitHub username',
    settings_repo: 'Repository',
    settings_repo_desc: 'Select a repository',
    settings_repo_placeholder: 'Select a repo...',
    settings_branch: 'Branch',
    settings_branch_desc: 'Usually "main" or "master"',
    settings_test_first: 'Test the connection first to load repositories',
    settings_repo_init: 'Initialize repository',
    settings_repo_init_desc: 'Create _categories.json and _index.json if missing',
    settings_repo_init_btn: 'Initialize now',
    settings_repo_init_ok: 'Repository initialized',
    settings_repo_init_fail: 'Init failed: {error}',

    settings_display_section: 'Display',
    settings_jalali: 'Jalali (Persian) date',
    settings_jalali_desc: 'Show dates in Persian calendar',
    settings_per_page: 'Tasks per page',
    settings_per_page_desc: 'How many tasks to load at once',

    settings_sync_section: 'Auto Sync',
    settings_sync_on_open: 'Sync on panel open',
    settings_sync_on_open_desc: 'Refresh tasks when you open the panel',
    settings_sync_interval: 'Sync interval (minutes)',
    settings_sync_interval_desc: 'Use 0.5 for 30 seconds. 0 = disabled',
    settings_sync_after_edit: 'Sync after changes',
    settings_sync_after_edit_desc: 'Push changes to GitHub right away',

    /* ───── Notices ───── */
    notice_task_created: 'Task created',
    notice_task_updated: 'Task updated',
    notice_task_completed: 'Task completed',
    notice_task_deleted: 'Task deleted',
    notice_task_pinned: 'Task pinned',
    notice_task_unpinned: 'Task unpinned',
    notice_sync_ok: 'Tasks synced',
    notice_sync_fail: 'Sync failed: {error}',
    notice_fill_token: 'Please enter a token first',
    notice_fill_repo: 'Please select a repository',
    notice_no_title: 'Title is required',
    notice_index_ok: 'Stats updated',
};
