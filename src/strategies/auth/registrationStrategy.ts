export interface RegistrationStrategy {
  register(userId: number): Promise<boolean>;
}
