/* ════════════════════════════════════════════════════════════
   📅 تبدیل تاریخ میلادی به شمسی (بدون نیاز به پکیج خارجی)
   ════════════════════════════════════════════════════════════ */

/* تبدیل تاریخ میلادی به شمسی */
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

/* پد کردن عدد با صفر (مثلاً 5 → "05") */
function pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

/* گرفتن تاریخ شمسی به فرمت "1405/07/18 - 14:30" */
export function getJalaliString(date: Date): string {
    const [jy, jm, jd] = toJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return `${jy}/${pad(jm)}/${pad(jd)} - ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/* گرفتن تاریخ میلادی به فرمت "2026-10-10 14:30" */
export function getGregorianString(date: Date): string {
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}

/* نمایش تاریخ مناسب بر اساس زبان کاربر */
export function formatDate(task: { created_jalali: string; created_gregorian: string }, useJalali: boolean): string {
    return useJalali ? task.created_jalali : task.created_gregorian;
}
