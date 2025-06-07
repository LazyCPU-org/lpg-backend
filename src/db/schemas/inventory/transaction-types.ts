// Define the transaction type enum values
export const TransactionTypeEnum = {
  PURCHASE: "purchase", // The user makes a purchase from a provider to replenish their inventory in that moment
  SALE: "sale", // The transaction is created due to a new sale
  RETURN: "return", // The user made a sale and got an item in return (used for tanks)
  TRANSFER: "transfer", // The user made a transfer of items to another inventory
  ASSIGNMENT: "assignment", // When a superior requested a purchase for their own and then assigned that to a user. Happens when the user starts working and don't have any inventory at all (base state).
} as const;

// Clean type alias for easier usage
export type TransactionType = typeof TransactionTypeEnum[keyof typeof TransactionTypeEnum];