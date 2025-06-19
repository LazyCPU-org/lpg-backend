import { ICustomerRepository } from "../repositories/customers/ICustomerRepository";
import { Customer } from "../dtos/response/customerInterface";
import {
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from "../dtos/request/customerDTO";
import { 
  ConflictError, 
  NotFoundError,
  BadRequestError 
} from "../utils/custom-errors";

// Service interfaces for dependency injection
export interface CustomerService {
  // Basic CRUD operations
  getCustomers(filters?: CustomerListRequest): Promise<{ data: Customer[], total: number }>;
  getCustomerById(id: number): Promise<Customer>;
  createCustomer(data: QuickCustomerCreationRequest): Promise<Customer>;
  updateCustomer(id: number, data: CustomerUpdateRequest): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;
  restoreCustomer(id: number): Promise<Customer>;
  
  // Search operations
  searchCustomers(query: string, limit?: number): Promise<{ data: Customer[], total_results: number }>;
}

// DTO interfaces following the PRD specifications
export interface CustomerListRequest {
  search?: string;
  include_inactive?: boolean;
  limit?: number;
  offset?: number;
}

export interface QuickCustomerCreationRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  alternativePhone?: string;
  locationReference?: string;
}

export interface CustomerUpdateRequest {
  address?: string;
  alternativePhone?: string;
  locationReference?: string;
}

export interface CustomerSearchRequest {
  q: string;
  limit?: number;
}

export class CustomerServiceImpl implements CustomerService {
  constructor(
    private customerRepository: ICustomerRepository
  ) {}

  async getCustomers(filters: CustomerListRequest = {}): Promise<{ data: Customer[], total: number }> {
    const {
      search,
      include_inactive = false,
      limit = 50,
      offset = 0
    } = filters;

    // For search functionality, we need to implement a different approach
    // since searchByName returns SearchResults, not full Customer objects
    if (search) {
      if (search.length < 2) {
        throw new BadRequestError("El término de búsqueda debe tener al menos 2 caracteres");
      }
      
      // Get all customers first, then filter by name
      let allCustomers: Customer[];
      if (include_inactive) {
        const activeCustomers = await this.customerRepository.findActiveCustomers(10000);
        const inactiveCustomers = await this.customerRepository.findInactiveCustomers(10000);
        allCustomers = [...activeCustomers, ...inactiveCustomers];
      } else {
        allCustomers = await this.customerRepository.findActiveCustomers(10000);
      }

      // Filter by name search (case insensitive)
      const searchTerm = search.toLowerCase();
      const filteredCustomers = allCustomers.filter(customer => {
        const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
        return fullName.includes(searchTerm);
      });

      // Apply pagination
      const total = filteredCustomers.length;
      const startIndex = offset;
      const endIndex = startIndex + limit;
      const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

      return {
        data: paginatedCustomers,
        total
      };
    }

    // For listing without search, we need active/inactive filtering
    let customers: Customer[];
    if (include_inactive) {
      // Get both active and inactive customers
      const activeCustomers = await this.customerRepository.findActiveCustomers(10000); // Large limit
      const inactiveCustomers = await this.customerRepository.findInactiveCustomers(10000);
      customers = [...activeCustomers, ...inactiveCustomers];
    } else {
      // Get only active customers
      customers = await this.customerRepository.findActiveCustomers(10000);
    }

    // Apply pagination
    const total = customers.length;
    const startIndex = offset;
    const endIndex = startIndex + limit;
    const paginatedCustomers = customers.slice(startIndex, endIndex);

    return {
      data: paginatedCustomers,
      total
    };
  }

  async getCustomerById(id: number): Promise<Customer> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundError("Cliente no encontrado");
    }
    return customer;
  }

  async createCustomer(data: QuickCustomerCreationRequest): Promise<Customer> {
    // Check for duplicate phone number
    const existingCustomer = await this.customerRepository.findByPhone(data.phoneNumber);
    if (existingCustomer) {
      throw new ConflictError("Ya existe un cliente con este número de teléfono");
    }

    // Create customer using repository's create method
    return await this.customerRepository.create(
      data.firstName,
      data.lastName,
      data.phoneNumber,
      data.address,
      data.alternativePhone,
      data.locationReference,
      'regular', // Default customer type
      undefined // No initial rating
    );
  }

  async updateCustomer(id: number, data: CustomerUpdateRequest): Promise<Customer> {
    // Check if customer exists
    const existingCustomer = await this.customerRepository.findById(id);
    if (!existingCustomer) {
      throw new NotFoundError("Cliente no encontrado");
    }

    if (!existingCustomer.isActive) {
      throw new BadRequestError("No se puede actualizar un cliente inactivo");
    }

    // Use repository's update method with only the allowed fields
    const updatePayload: any = {};
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.alternativePhone !== undefined) updatePayload.alternativePhone = data.alternativePhone;
    if (data.locationReference !== undefined) updatePayload.locationReference = data.locationReference;

    return await this.customerRepository.update(id, updatePayload);
  }

  async deleteCustomer(id: number): Promise<void> {
    // Check if customer exists
    const existingCustomer = await this.customerRepository.findById(id);
    if (!existingCustomer) {
      throw new NotFoundError("Cliente no encontrado");
    }

    // Check if referenced in orders - we'll need to implement this check
    // For now, we'll assume no orders reference since orders module might not be complete
    // TODO: Implement order reference check when orders are fully integrated
    
    // Perform soft delete by setting isActive to false
    await this.customerRepository.update(id, { isActive: false });
  }

  async restoreCustomer(id: number): Promise<Customer> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundError("Cliente no encontrado");
    }

    if (customer.isActive) {
      throw new BadRequestError("El cliente no está eliminado");
    }

    // Check if phone conflicts with active customers
    const duplicateCustomer = await this.customerRepository.findByPhone(customer.phoneNumber);
    if (duplicateCustomer) {
      // Get the full customer details to check if it's active
      const fullDuplicateCustomer = await this.customerRepository.findById(duplicateCustomer.customerId);
      if (fullDuplicateCustomer && fullDuplicateCustomer.isActive) {
        throw new ConflictError("Ya existe un cliente activo con este número de teléfono");
      }
    }

    // Restore customer by setting isActive to true
    return await this.customerRepository.update(id, { isActive: true });
  }

  async searchCustomers(
    query: string, 
    limit = 20
  ): Promise<{ data: Customer[], total_results: number }> {
    if (query.length < 2) {
      throw new BadRequestError("El término de búsqueda debe tener al menos 2 caracteres");
    }

    // Get all active customers and filter by name (more straightforward approach)
    const allCustomers = await this.customerRepository.findActiveCustomers(10000);
    
    // Filter by name search (case insensitive)
    const searchTerm = query.toLowerCase();
    const filteredCustomers = allCustomers.filter(customer => {
      const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
      return fullName.includes(searchTerm);
    });
    
    // Apply limit
    const limitedResults = filteredCustomers.slice(0, limit);

    return {
      data: limitedResults,
      total_results: filteredCustomers.length
    };
  }
}