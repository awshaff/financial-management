// Local storage utilities for user settings (fallback only)

const SETTINGS_KEY = 'finance_tracker_settings';

export interface UserSettings {
    billingCycleStartDay: number; // 1-31
    billingCycleEndDay: number;   // 1-31 (0 = end of month)
}

const DEFAULT_SETTINGS: UserSettings = {
    billingCycleStartDay: 1,
    billingCycleEndDay: 0, // 0 = end of month
};

export function getSettings(): UserSettings {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
    } catch {
        // Ignore parsing errors
    }
    return DEFAULT_SETTINGS;
}

export function updateSettings(updates: Partial<UserSettings>): UserSettings {
    const current = getSettings();
    const updated = { ...current, ...updates };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
}

// Get last day of a month
function getLastDayOfMonth(year: number, month: number): number {
    // month is 0-indexed, so we pass month+1 and day 0 to get last day of the given month
    return new Date(year, month + 1, 0).getDate();
}

// Billing cycle calculation helper
// Supports both same-month and cross-month cycles:
// - If startDay <= endDay: same-month cycle (e.g., 1 to 31)
// - If startDay > endDay: cross-month cycle (e.g., 27 to 26 spans prev month to current month)
export function getBillingCycleDates(
    selectedMonth: Date,
    startDay: number = 1,
    endDay: number = 0 // 0 = end of month
) {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth(); // 0-indexed

    // Handle endDay = 0 as "end of month"
    const actualEndDay = endDay === 0 ? getLastDayOfMonth(year, month) : endDay;

    // Determine if cross-month or same-month cycle
    if (startDay > actualEndDay) {
        // Cross-month: start from previous month, end in selected month
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const startDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
        const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(actualEndDay).padStart(2, '0')}`;
        return { startDate, endDate };
    } else {
        // Same-month: both start and end in selected month
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
        const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(actualEndDay).padStart(2, '0')}`;
        return { startDate, endDate };
    }
}
