import { ICustomerRepository } from "../../repositories/customers/ICustomerRepository";
import { PgCustomerRepository } from "../../repositories/customers/PgCustomerRepository";
import { CustomerService, CustomerServiceImpl } from "../../services/customerService";
import { DIModule, CoreDependencies } from "../types/moduleTypes";
import { OrdersDependencies } from "./orders.module";

export interface CustomersDependencies {
  // Services (repository is shared from orders module)
  customerService: CustomerService;
}

export class CustomersModule implements DIModule<CustomersDependencies> {
  private dependencies: CustomersDependencies | null = null;

  createDependencies(coreDeps: CoreDependencies, ordersDeps: OrdersDependencies): CustomersDependencies {
    // Reuse customer repository from orders module to avoid duplication
    const customerRepository = ordersDeps.customerRepository;

    // Create services
    const customerService = new CustomerServiceImpl(customerRepository);

    this.dependencies = {
      customerService,
    };

    return this.dependencies;
  }

  getDependencies(): CustomersDependencies {
    if (!this.dependencies) {
      throw new Error("Customers dependencies not initialized. Call createDependencies() first.");
    }
    return this.dependencies;
  }
}