// Main Repository Exports - All Domains

// Customer Domain
export * from "./customers";

// Inventory Domain
export * from "./inventory";

// Order Domain
export * from "./orders";

// Individual Repositories (Legacy pattern - consider moving to domains)
export { PgAuthRepository, type AuthRepository } from "./authRepository";
// export { default as storeRepository } from "./storeRepository";
// export { default as userRepository } from "./userRepository";
