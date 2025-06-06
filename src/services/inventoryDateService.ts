import { IDateService } from "./dateService";

export interface IInventoryDateService {
  calculateNextInventoryDate(
    inventoryAssignmentDate: string,
    skipWeekends?: boolean
  ): string;
  getNextWorkingDay(currentDate: string, skipWeekends?: boolean): string;
  getCurrentDateInTimezone(): string;
  applyWeekendRules(date: string, skipWeekends?: boolean): string;
  getDaysDifference(date1: string, date2: string): number;
  isStaleInventory(inventoryDate: string, currentDate?: string): boolean;
}

export class InventoryDateService implements IInventoryDateService {
  private readonly GMT_5_OFFSET = -5;

  constructor(private readonly dateService: IDateService) {}

  calculateNextInventoryDate(
    inventoryAssignmentDate: string,
    skipWeekends = false
  ): string {
    const currentDate = this.getCurrentDateInTimezone();
    const daysDifference = this.getDaysDifference(
      inventoryAssignmentDate,
      currentDate
    );

    // Scenario 1: Normal workflow (same day)
    if (daysDifference === 0) {
      return this.getNextWorkingDay(inventoryAssignmentDate, skipWeekends);
    }

    // Scenario 2: Stale inventory recovery (any difference ≥ 1 day)
    // Create next inventory for TODAY so admin can start immediately
    return this.applyWeekendRules(currentDate, skipWeekends);
  }

  getNextWorkingDay(currentDate: string, skipWeekends = false): string {
    if (!skipWeekends) {
      return this.dateService.addDays(currentDate, 1);
    }

    return this.dateService.getNextBusinessDay(currentDate);
  }

  getCurrentDateInTimezone(): string {
    return this.dateService.getCurrentDateInTimezone(this.GMT_5_OFFSET);
  }

  applyWeekendRules(date: string, skipWeekends = false): string {
    if (!skipWeekends) {
      return date;
    }

    let adjustedDate = date;
    while (this.dateService.isWeekend(adjustedDate)) {
      adjustedDate = this.dateService.addDays(adjustedDate, 1);
    }

    return adjustedDate;
  }

  getDaysDifference(date1: string, date2: string): number {
    return this.dateService.getDaysDifference(date1, date2);
  }

  isStaleInventory(inventoryDate: string, currentDate?: string): boolean {
    const compareDate = currentDate || this.getCurrentDateInTimezone();
    return this.getDaysDifference(inventoryDate, compareDate) >= 1;
  }
}
