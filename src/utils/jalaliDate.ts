/* ════════════════════════════════════════════════════════════
   📅 تبدیل تاریخ + محاسبات شروع روز/ماه/سال
   ✅ DST-safe
   ✅ پشتیبانی از ماه و سال شمسی
   ⚠️ نکته: همه‌ی محاسبات بر اساس timezone محلی کاربر انجام می‌شه
   ════════════════════════════════════════════════════════════ */

/* ───── تبدیل میلادی → شمسی (algorithm معروف jalaali-js) ───── */
export function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
    const gDM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = gy <= 1600 ? 0 : 979;
    gy -= gy <= 1600 ? 621 : 1600;
    const gy2 = gm > 2 ? gy + 1 : gy;
    let days =
        365 * gy +
        Math.floor((gy2 + 3) / 4) -
        Math.floor((gy2 + 99) / 100) +
        Math.floor((gy2 + 399) / 400) -
        80 +
        gd +
        gDM[gm - 1];
    jy += 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
        jy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
    return [jy, jm, jd];
}

/* ───── تبدیل شمسی → میلادی (algorithm معروف jalaali-js) ───── */
export function toGregorian(jy: number, jm: number, jd: number): [number, number, number] {
    jy += 1595;
    let days =
        -355668 +
        365 * jy +
        Math.floor(jy / 33) * 8 +
        Math.floor(((jy % 33) + 3) / 4) +
        jd +
        (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

    let gy = 400 * Math.floor(days / 146097);
    days %= 146097;
    if (days > 36524) {
        gy += 100 * Math.floor(--days / 36524);
        days %= 36524;
        if (days >= 365) days++;
    }
    gy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
        gy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    let gd = days + 1;
    const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
    const sal_a = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm: number;
    for (gm = 1; gm <= 12; gm++) {
        if (gd <= sal_a[gm]) break;
        gd -= sal_a[gm];
    }
    return [gy, gm, gd];
}

/* ───── پد کردن عدد با صفر ───── */
function pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

/* ───── گرفتن رشته‌ی تاریخ شمسی ───── */
export function getJalaliString(date: Date): string {
    const [jy, jm, jd] = toJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return `${jy}/${pad(jm)}/${pad(jd)} - ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/* ───── گرفتن رشته‌ی تاریخ میلادی ───── */
export function getGregorianString(date: Date): string {
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}

/* ───── نمایش تاریخ مناسب بر اساس تنظیمات ───── */
export function formatDate(
    task: { created_jalali: string; created_gregorian: string },
    useJalali: boolean
): string {
    return useJalali ? task.created_jalali : task.created_gregorian;
}

/* ════════════════════════════════════════════════════════════
   ⏱️ محاسبات بازه‌های زمانی (DST-safe)
   ════════════════════════════════════════════════════════════ */

/* ───── شروع روز (00:00:00 محلی) ───── */
export function startOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/* ───── شروع دیروز (DST-safe با setDate) ───── */
export function startOfYesterday(ts: number): number {
    const d = new Date(ts);
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/* ───── شروع N روز قبل ───── */
export function startOfDaysAgo(ts: number, days: number): number {
    const d = new Date(ts);
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/* ════════════════════════════════════════════════════════════
   🗓️ مرزهای شمسی (برای آمار)
   ════════════════════════════════════════════════════════════ */

/* ───── شروع سال شمسی فعلی (اول فروردین) ───── */
export function getJalaliYearStart(ts: number): number {
    const d = new Date(ts);
    const [jy] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const [gy, gm, gd] = toGregorian(jy, 1, 1);
    return new Date(gy, gm - 1, gd, 0, 0, 0, 0).getTime();
}

/* ───── شروع ماه شمسی قبلی ───── */
export function getJalaliPrevMonthStart(ts: number): number {
    const d = new Date(ts);
    let [jy, jm] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    jm -= 1;
    if (jm < 1) {
        jm = 12;
        jy -= 1;
    }
    const [gy, gm, gd] = toGregorian(jy, jm, 1);
    return new Date(gy, gm - 1, gd, 0, 0, 0, 0).getTime();
}

/* ════════════════════════════════════════════════════════════
   🗓️ مرزهای میلادی (برای آمار)
   ════════════════════════════════════════════════════════════ */

/* ───── شروع سال میلادی ───── */
export function getGregorianYearStart(ts: number): number {
    const d = new Date(ts);
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/* ───── شروع ماه میلادی قبلی (بدون باگ end-of-month) ───── */
export function getGregorianPrevMonthStart(ts: number): number {
    const d = new Date(ts);
    /* 🔥 ترتیب مهمه: اول روز رو 1 کن، بعد ماه رو کم کن */
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}
