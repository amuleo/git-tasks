# Git-Tasks
<div align="center">

# Git Tasks

**Your tasks, your repo, your rules.**

[🇬🇧 English](#english) · [🇮🇷 فارسی](#فارسی)

</div>

---

<a id="english"></a>

## 🇬🇧 English

A task manager that lives in your GitHub repository.

No cloud servers. No subscription. No mystery database. Every task is a real folder in your repo — with a markdown file you can open, read, edit, and version like any other file. If GitHub is up, your tasks are up.

### Why?

I built this because I wanted a task manager that:

- Doesn't lock my data inside some proprietary app.
- Works from anywhere I have Obsidian — laptop, phone, tablet.
- Gives me real version history for free (it's git, after all).
- Doesn't need a sync service to survive.

Turns out, a GitHub repo is a pretty good task manager. So I made one.

### What it does

Every task you create becomes a folder in your repo:

```
your-repo/
├── _categories.json
└── tasks/
    ├── task-1728045600000/
    │   ├── title.md
    │   └── README.md
    └── task-1728059200000/
        ├── title.md
        └── README.md
```

The `README.md` inside each task folder holds the frontmatter — title, category, status, dates. The `title.md` is just the title, easy to grep or index later.

You open the plugin panel and everything just works:

- See your pending tasks, filtered by category.
- Create new tasks. Mark them done. Edit them. Delete them softly.
- Dates shown in Gregorian or Jalali (Persian) calendar.
- Categories come from a `_categories.json` file in your repo — you edit it however you want, whenever you want.

No sync. No config gymnastics. Just a token and a repo.

### Install

Not on the community store yet. To install manually:

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Drop them into `YOUR_VAULT/.obsidian/plugins/git-tasks/`.
3. Reload Obsidian, then enable **Git Tasks** in Settings → Community Plugins.

### Setup

1. Grab a personal access token from [github.com/settings/tokens](https://github.com/settings/tokens). Make sure the `repo` scope is checked.
2. Open **Git Tasks settings** and paste the token.
3. Hit **Test connection**. This authenticates you and pulls your repository list.
4. Pick a repo. Pick a branch (usually `main`).
5. Create `_categories.json` in your repo root:

```json
{
  "version": 1,
  "categories": [
    { "id": "work", "name": "Work", "name_fa": "کار" },
    { "id": "personal", "name": "Personal", "name_fa": "شخصی" },
    { "id": "urgent", "name": "Urgent", "name_fa": "فوری" }
  ]
}
```

That's it. Open the task panel from the ribbon icon and start writing tasks.

### Features

- **Two languages.** English and Persian. The UI flips to RTL when you switch to Persian.
- **Jalali or Gregorian dates.** Your choice.
- **Category filtering.** Whatever categories you define in the repo.
- **Show more.** Loads in pages — no lag, no freeze.
- **Auto sync.** On panel open, on a timer, or after every edit. Pick your combo.
- **Offline cache.** If GitHub is down, you still see your tasks.
- **Soft delete.** Deleted tasks disappear from the list but stay in the repo. Nothing is ever lost.

### Commands

Three commands, that's it:

| Command | What it does |
|---|---|
| `Git Tasks: Open task panel` | Opens the side panel |
| `Git Tasks: Create new task` | Jumps straight into the new task modal |
| `Git Tasks: Sync tasks with GitHub` | Manual sync |

No dynamic commands. No bloat.

### Requirements

- Obsidian 1.4.0 or later
- A GitHub account
- A personal access token with `repo` scope

Works on desktop and mobile.

### Contributing

Found a bug? Open an issue. Got a fix? Send a PR. I'm not precious about the code — if it makes the plugin better, I want to see it.

### License

MIT. Do whatever you want with it.

<br>
<br>

<div align="center">
  <a href="#git-tasks">⬆ Back to top</a>
</div>

---

<br>

<div dir="rtl">

<a id="فارسی"></a>

## 🇮🇷 فارسی

یه تسک‌منیجر که توی مخزن گیت‌هاب خودت زندگی می‌کنه.

بدون سرور ابری. بدون اشتراک. بدون دیتابیس مرموز. هر تسک یه فولدر واقعیه توی مخزنت — با فایل مارک‌داونی که می‌تونی بازش کنی، بخونی، ویرایش کنی و مثل هر فایل دیگه‌ای نسخه‌بندی کنی. اگه گیت‌هاب بالا باشه، تسک‌های تو هم بالا هستن.

### چرا ساختمش؟

می‌خواستم یه تسک‌منیجری داشته باشم که:

- داده‌هام رو توی یه اپ اختصاصی قفل نکنه.
- از هرجایی که ابسیدین دارم کار کنه — لپ‌تاپ، موبایل، تبلت.
- تاریخچه‌ی واقعی تغییرات رو مجانی بده (بالاخره گیت هست دیگه).
- برای زنده موندن به سرویس سینک نیاز نداشته باشه.

معلوم شد که یه مخزن گیت‌هاب، تسک‌منیجر خیلی خوبیه. پس ساختمش.

### چیکار می‌کنه؟

هر تسکی که می‌سازی، تبدیل به یه فولدر توی مخزنت می‌شه:

```
your-repo/
├── _categories.json
└── tasks/
    ├── task-1728045600000/
    │   ├── title.md
    │   └── README.md
    └── task-1728059200000/
        ├── title.md
        └── README.md
```

فایل `README.md` داخل هر فولدر تسک، فرانت‌متر رو نگه می‌داره — عنوان، دسته، وضعیت، تاریخ‌ها. فایل `title.md` هم فقط عنوانه، برای گرپ کردن و ایندکس کردن.

پنل پلاگین رو باز می‌کنی و همه چیز خودش کار می‌کنه:

- تسک‌های در انتظارت رو می‌بینی، فیلترشده بر اساس دسته.
- تسک جدید می‌سازی. انجام‌شده علامت می‌زنی. ویرایش می‌کنی. نرم حذف می‌کنی.
- تاریخ‌ها به میلادی یا شمسی نمایش داده می‌شن.
- دسته‌بندی‌ها از فایل `_categories.json` توی مخزنت میان — هرجور خواستی ویرایشش کن.

بدون سینک. بدون کلنجار با کانفیگ. فقط یه توکن و یه مخزن.

### نصب

هنوز روی فروشگاه رسمی نیست. برای نصب دستی:

۱. فایل‌های `main.js`، `manifest.json` و `styles.css` رو از آخرین ریلیز دانلود کن.
۲. بریز توی `YOUR_VAULT/.obsidian/plugins/git-tasks/`.
۳. ابسیدین رو ری‌لود کن، بعد **Git Tasks** رو از تنظیمات → پلاگین‌های کامیونیتی فعال کن.

### راه‌اندازی

۱. یه توکن دسترسی شخصی از [github.com/settings/tokens](https://github.com/settings/tokens) بگیر. حواست باشه اسکوپ `repo` تیک خورده باشه.
۲. تنظیمات **Git Tasks** رو باز کن و توکن رو پیست کن.
۳. روی **تست اتصال** بزن. این کار احراز هویتت می‌کنه و لیست مخزن‌هات رو می‌گیره.
۴. یه مخزن انتخاب کن. یه شاخه انتخاب کن (معمولاً `main`).
۵. فایل `_categories.json` رو توی ریشه‌ی مخزنت بساز:

```json
{
  "version": 1,
  "categories": [
    { "id": "work", "name": "Work", "name_fa": "کار" },
    { "id": "personal", "name": "Personal", "name_fa": "شخصی" },
    { "id": "urgent", "name": "Urgent", "name_fa": "فوری" }
  ]
}
```

همین. از آیکون ریبون پنل تسک‌ها رو باز کن و شروع کن به نوشتن.

### امکانات

- **دو زبانه.** انگلیسی و فارسی. وقتی به فارسی سوییچ می‌کنی، رابط کاربری می‌ره روی RTL.
- **تاریخ شمسی یا میلادی.** انتخاب با خودته.
- **فیلتر دسته‌بندی.** هر دسته‌ای که توی مخزن تعریف کنی.
- **نمایش بیشتر.** صفحه‌به‌صفحه لود می‌شه — بدون لگ، بدون فریز.
- **سینک خودکار.** هنگام باز شدن پنل، زمان‌دار، یا بعد از هر تغییر. ترکیبش رو خودت انتخاب کن.
- **کش آفلاین.** اگه گیت‌هاب قطع بود، باز هم تسک‌هات رو می‌بینی.
- **حذف نرم.** تسک‌های حذف‌شده از لیست غیب می‌شن ولی توی مخزن می‌مونن. هیچی گم نمی‌شه.

### کامندها

سه تا کامند، همین:

| کامند | کار |
|---|---|
| `Git Tasks: Open task panel` | پنل کناری رو باز می‌کنه |
| `Git Tasks: Create new task` | مستقیم می‌ره توی مودال تسک جدید |
| `Git Tasks: Sync tasks with GitHub` | سینک دستی |

بدون کامند پویا. بدون شلوغی.

### پیش‌نیازها

- ابسیدین ۱.۴.۰ یا بالاتر
- یه اکانت گیت‌هاب
- یه توکن دسترسی شخصی با اسکوپ `repo`

روی دسکتاپ و موبایل کار می‌کنه.

### مشارکت

باگ پیدا کردی؟ یه issue باز کن. فیکس داری؟ PR بفرست. به کد چسبیده نیستم — اگه پلاگین رو بهتر می‌کنه، می‌خوام ببینمش.

### لایسنس

MIT. هر غلطی خواستی باهاش بکن.

<br>
<br>

<div align="center">
  <a href="#git-tasks">⬆ برگشت به بالا</a>
</div>

</div>
