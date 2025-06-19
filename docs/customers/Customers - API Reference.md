# Customers Module - API Reference

## Overview

This document provides comprehensive API reference for the Customers module endpoints. The module focuses on essential CRUD operations and name-based search functionality optimized for operator workflows in the LPG delivery business.

## Base URL

```
{API_BASE_URL}/v1/customers
```

## Authentication

All endpoints require a valid Bearer token in the Authorization header:

```http
Authorization: Bearer {your_jwt_token}
```

## Permissions Required

- **Read Operations**: Any authenticated user
- **Create Operations**: `CUSTOMERS:CREATE` permission (admin, operator)
- **Update Operations**: `CUSTOMERS:UPDATE` permission (admin, operator)  
- **Delete Operations**: `CUSTOMERS:DELETE` permission (admin, operator)

## Customer Endpoints

### List Customers

**GET** `/`

Retrieves a paginated list of customers with optional name search functionality.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `search` | string | No | - | Search in customer names (firstName + lastName) |
| `include_inactive` | boolean | No | false | Include soft-deleted customers |
| `limit` | integer | No | 50 | Number of results per page (1-100) |
| `offset` | integer | No | 0 | Number of results to skip |

#### Example Request

```http
GET /v1/customers?search=Juan&limit=20&offset=0
Authorization: Bearer {token}
```

#### Example Response

```json
{
  "data": [
    {
      "customerId": 1,
      "firstName": "Juan",
      "lastName": "Pérez",
      "phoneNumber": "+51987654321",
      "alternativePhone": "+51123456789",
      "address": "Av. Lima 123, San Miguel",
      "locationReference": "Cerca del mercado central",
      "customerType": "regular",
      "rating": 5,
      "isActive": true,
      "lastOrderDate": "2024-06-15T14:30:00Z",
      "preferredPaymentMethod": "efectivo",
      "totalOrders": 15,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-06-15T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 234,
    "limit": 20,
    "offset": 0
  }
}
```

#### Error Responses

- **400 Bad Request**: Invalid query parameters or search term too short
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions

### Get Customer by ID

**GET** `/{id}`

Retrieves a specific customer by their ID.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Customer ID |

#### Example Request

```http
GET /v1/customers/1
Authorization: Bearer {token}
```

#### Example Response

```json
{
  "customerId": 1,
  "firstName": "Juan",
  "lastName": "Pérez",
  "phoneNumber": "+51987654321",
  "alternativePhone": "+51123456789",
  "address": "Av. Lima 123, San Miguel",
  "locationReference": "Cerca del mercado central",
  "customerType": "regular",
  "rating": 5,
  "isActive": true,
  "lastOrderDate": "2024-06-15T14:30:00Z",
  "preferredPaymentMethod": "efectivo",
  "totalOrders": 15,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-06-15T14:30:00Z"
}
```

#### Error Responses

- **400 Bad Request**: Invalid customer ID
- **404 Not Found**: Customer not found
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions

### Create Customer

**POST** `/`

Creates a new customer using the quick customer creation schema optimized for order flow.

#### Request Body

```json
{
  "firstName": "María",
  "lastName": "González",
  "phoneNumber": "+51987654322",
  "address": "Jr. Huancayo 456, Breña",
  "alternativePhone": "+51123456788",
  "locationReference": "Al frente de la farmacia"
}
```

#### Request Body Schema

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `firstName` | string | Yes | 1-50 chars | Customer's first name |
| `lastName` | string | Yes | 1-50 chars | Customer's last name |
| `phoneNumber` | string | Yes | Peruvian format (+51xxxxxxxxx) | Primary phone number (unique) |
| `address` | string | Yes | Min 1 char | Customer's address |
| `alternativePhone` | string | No | Peruvian format | Alternative phone number |
| `locationReference` | string | No | - | Additional address reference |

#### Example Response

```json
{
  "customerId": 235,
  "firstName": "María",
  "lastName": "González",
  "phoneNumber": "+51987654322",
  "alternativePhone": "+51123456788",
  "address": "Jr. Huancayo 456, Breña",
  "locationReference": "Al frente de la farmacia",
  "customerType": "regular",
  "rating": null,
  "isActive": true,
  "lastOrderDate": null,
  "preferredPaymentMethod": null,
  "totalOrders": 0,
  "createdAt": "2024-06-18T16:30:00Z",
  "updatedAt": "2024-06-18T16:30:00Z"
}
```

#### Error Responses

- **400 Bad Request**: Invalid request data, validation errors
- **409 Conflict**: Phone number already exists
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions

### Update Customer

**PUT** `/{id}`

Updates specific fields of an existing customer. Only address, alternative phone, and location reference can be updated.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Customer ID |

#### Request Body

All fields are optional for updates:

```json
{
  "address": "Nueva dirección actualizada",
  "alternativePhone": "+51123456787",
  "locationReference": "Nueva referencia de ubicación"
}
```

#### Request Body Schema

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `address` | string | No | Min 1 char | Updated customer address |
| `alternativePhone` | string | No | Peruvian format | Updated alternative phone |
| `locationReference` | string | No | - | Updated location reference |

#### Example Response

```json
{
  "customerId": 1,
  "firstName": "Juan",
  "lastName": "Pérez",
  "phoneNumber": "+51987654321",
  "alternativePhone": "+51123456787",
  "address": "Nueva dirección actualizada",
  "locationReference": "Nueva referencia de ubicación",
  "customerType": "regular",
  "rating": 5,
  "isActive": true,
  "lastOrderDate": "2024-06-15T14:30:00Z",
  "preferredPaymentMethod": "efectivo",
  "totalOrders": 15,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-06-18T16:45:00Z"
}
```

#### Error Responses

- **400 Bad Request**: Invalid request data, customer inactive, or validation errors
- **404 Not Found**: Customer not found
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions

### Delete Customer

**DELETE** `/{id}`

Soft deletes a customer. The customer will be marked as inactive but preserved for audit trails.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Customer ID |

#### Example Response

```json
{
  "success": true,
  "message": "Cliente eliminado correctamente"
}
```

#### Error Responses

- **400 Bad Request**: Invalid customer ID
- **404 Not Found**: Customer not found
- **409 Conflict**: Customer referenced in orders (deletion blocked)
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions

### Restore Customer

**PATCH** `/{id}/restore`

Restores a previously soft-deleted customer.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Customer ID |

#### Example Response

```json
{
  "customerId": 1,
  "firstName": "Juan",
  "lastName": "Pérez",
  "phoneNumber": "+51987654321",
  "alternativePhone": "+51123456789",
  "address": "Av. Lima 123, San Miguel",
  "locationReference": "Cerca del mercado central",
  "customerType": "regular",
  "rating": 5,
  "isActive": true,
  "lastOrderDate": "2024-06-15T14:30:00Z",
  "preferredPaymentMethod": "efectivo",
  "totalOrders": 15,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-06-18T17:00:00Z"
}
```

#### Error Responses

- **400 Bad Request**: Invalid customer ID or customer not deleted
- **404 Not Found**: Customer not found
- **409 Conflict**: Active customer with same phone number already exists
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions

## Search Endpoint

### Search Customers by Name

**GET** `/search`

Searches for customers by name using firstName + lastName combination. Optimized for operator workflows to quickly find customers during order processing.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search query term for customer names |
| `limit` | integer | No | 20 | Maximum number of results (1-50) |

#### Example Request

```http
GET /v1/customers/search?q=Juan Perez&limit=10
Authorization: Bearer {token}
```

#### Example Response

```json
{
  "data": [
    {
      "customerId": 1,
      "firstName": "Juan",
      "lastName": "Pérez",
      "phoneNumber": "+51987654321",
      "alternativePhone": "+51123456789",
      "address": "Av. Lima 123, San Miguel",
      "locationReference": "Cerca del mercado central",
      "customerType": "regular",
      "rating": 5,
      "isActive": true,
      "lastOrderDate": "2024-06-15T14:30:00Z",
      "preferredPaymentMethod": "efectivo",
      "totalOrders": 15,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-06-15T14:30:00Z"
    },
    {
      "customerId": 45,
      "firstName": "Juan Carlos",
      "lastName": "Pérez López",
      "phoneNumber": "+51987654399",
      "alternativePhone": null,
      "address": "Calle Los Olivos 789",
      "locationReference": null,
      "customerType": "recurrent",
      "rating": 4,
      "isActive": true,
      "lastOrderDate": "2024-06-10T09:15:00Z",
      "preferredPaymentMethod": "transferencia",
      "totalOrders": 8,
      "createdAt": "2024-03-20T11:45:00Z",
      "updatedAt": "2024-06-10T09:15:00Z"
    }
  ],
  "total_results": 2
}
```

#### Search Behavior

- **Case Insensitive**: Search is case-insensitive
- **Partial Matching**: Supports partial name matching
- **Full Name Search**: Searches in `firstName + " " + lastName` combination
- **Active Only**: Only searches active customers by default
- **Minimum Length**: Requires at least 2 characters for search term

#### Error Responses

- **400 Bad Request**: Invalid search parameters or search term too short
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions

## Data Types

### Customer Object

```typescript
interface Customer {
  customerId: number;              // Unique customer identifier
  firstName: string;               // Customer's first name (1-50 chars)
  lastName: string;                // Customer's last name (1-50 chars)
  phoneNumber: string;             // Primary phone (+51xxxxxxxxx format)
  alternativePhone: string | null; // Alternative phone (same format)
  address: string;                 // Customer's address
  locationReference: string | null; // Additional address reference
  customerType: 'regular' | 'wholesale' | 'recurrent'; // Customer type
  rating: number | null;           // Customer rating (1-5)
  isActive: boolean;               // Soft delete flag
  lastOrderDate: string | null;    // Last order timestamp (ISO 8601)
  preferredPaymentMethod: string | null; // Payment preference
  totalOrders: number;             // Total number of orders placed
  createdAt: string;               // Creation timestamp (ISO 8601)
  updatedAt: string;               // Last update timestamp (ISO 8601)
}
```

### Customer Types

| Type | Description |
|------|-------------|
| `regular` | Standard customers (default) |
| `wholesale` | Bulk purchase customers |
| `recurrent` | Frequent/subscription customers |

### Phone Number Format

All phone numbers must follow Peruvian format:
- **Format**: `+51xxxxxxxxx`
- **Example**: `+51987654321`
- **Validation**: Must start with `+51` followed by exactly 9 digits

## Error Response Format

All endpoints use a consistent error response format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific error details"
    }
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_ID` | Invalid or malformed customer ID |
| `VALIDATION_ERROR` | Request validation failed |
| `CUSTOMER_NOT_FOUND` | Customer not found |
| `PHONE_ALREADY_EXISTS` | Duplicate phone number conflict |
| `INVALID_PHONE_FORMAT` | Invalid Peruvian phone format |
| `DELETION_BLOCKED` | Cannot delete due to order references |
| `SEARCH_TERM_TOO_SHORT` | Search term less than 2 characters |
| `INTERNAL_ERROR` | Server-side error |

## Best Practices

### Search Optimization

1. **Use appropriate search terms**: Combine first and last names for better results
2. **Implement search debouncing**: Avoid excessive search requests in UI
3. **Cache search results**: Cache frequently searched customers
4. **Handle empty results**: Gracefully handle no results scenarios

### Customer Management

1. **Validate phone formats**: Always validate Peruvian phone format before submission
2. **Check for duplicates**: Verify phone uniqueness before creating customers
3. **Use quick creation**: Prefer quick customer creation during order flow
4. **Update selectively**: Only update address, alternative phone, and location reference

### Error Handling

1. **Handle specific errors**: Implement specific handling for common error codes
2. **Display user-friendly messages**: Transform technical errors to operator-friendly text
3. **Implement retry logic**: For 5xx errors, implement exponential backoff
4. **Validate before submission**: Client-side validation to reduce server errors

### Performance

1. **Use pagination**: Always implement pagination for customer lists
2. **Limit search scope**: Use appropriate limits for search operations
3. **Cache customer data**: Cache frequently accessed customer information
4. **Optimize network requests**: Batch operations when possible

## Examples

### Complete Customer Management Workflow

```javascript
// 1. Search for existing customer
const searchResults = await fetch('/v1/customers/search?q=Juan', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

// 2. Create new customer if not found
const newCustomer = await fetch('/v1/customers', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    firstName: 'María',
    lastName: 'González',
    phoneNumber: '+51987654322',
    address: 'Jr. Huancayo 456, Breña',
    alternativePhone: '+51123456788',
    locationReference: 'Al frente de la farmacia'
  })
});

// 3. Update customer address
const updatedCustomer = await fetch(`/v1/customers/${newCustomer.customerId}`, {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    address: 'Nueva dirección actualizada',
    locationReference: 'Nueva referencia'
  })
});

// 4. Get customer details
const customerDetails = await fetch(`/v1/customers/${newCustomer.customerId}`, {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
```

## Implementation Status

**✅ FULLY IMPLEMENTED AND DEPLOYED**

All endpoints documented in this API reference have been successfully implemented and are available at:
- **Base URL**: `{API_BASE_URL}/v1/customers`
- **Status**: Production-ready
- **Authentication**: Bearer token required for all endpoints
- **Permissions**: Role-based access control implemented

### Quick Start

1. **List Customers**: `GET /v1/customers`
2. **Search by Name**: `GET /v1/customers/search?q=Juan`
3. **Create Customer**: `POST /v1/customers` (requires CUSTOMERS:CREATE permission)
4. **Update Customer**: `PUT /v1/customers/:id` (requires CUSTOMERS:UPDATE permission)

This API reference provides complete documentation for integrating with the fully implemented Customers module, optimized for operator workflows in the LPG delivery business.