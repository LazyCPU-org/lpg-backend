export interface IDateService {
  getDaysDifference(date1: string, date2: string): number;
  getCurrentDateInTimezone(timezoneOffset?: number): string;
  addDays(date: string, days: number): string;
  parseDate(dateString: string): Date;
  formatDate(date: Date): string;
  isWeekend(date: string): boolean;
  getNextBusinessDay(date: string): string;
  addBusinessDays(date: string, businessDays: number): string;
}

export class DateService implements IDateService {
  getDaysDifference(date1: string, date2: string): number {
    const [year1, month1, day1] = date1.split("-").map(Number);
    const [year2, month2, day2] = date2.split("-").map(Number);

    const d1 = new Date(year1, month1 - 1, day1);
    const d2 = new Date(year2, month2 - 1, day2);

    const timeDifference = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
  }

  getCurrentDateInTimezone(timezoneOffset: number = -5): string {
    const now = new Date();
    const offsetTime = new Date(now.getTime() + timezoneOffset * 60 * 60 * 1000);

    const year = offsetTime.getUTCFullYear();
    const month = String(offsetTime.getUTCMonth() + 1).padStart(2, "0");
    const day = String(offsetTime.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  addDays(date: string, days: number): string {
    const [year, month, day] = date.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    dateObj.setDate(dateObj.getDate() + days);
    
    return this.formatDate(dateObj);
  }

  parseDate(dateString: string): Date {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    
    return `${year}-${month}-${day}`;
  }

  isWeekend(date: string): boolean {
    const dateObj = this.parseDate(date);
    const dayOfWeek = dateObj.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  }

  getNextBusinessDay(date: string): string {
    let nextDay = this.addDays(date, 1);
    
    while (this.isWeekend(nextDay)) {
      nextDay = this.addDays(nextDay, 1);
    }
    
    return nextDay;
  }

  addBusinessDays(date: string, businessDays: number): string {
    let currentDate = date;
    let daysAdded = 0;
    
    while (daysAdded < businessDays) {
      currentDate = this.addDays(currentDate, 1);
      if (!this.isWeekend(currentDate)) {
        daysAdded++;
      }
    }
    
    return currentDate;
  }
}