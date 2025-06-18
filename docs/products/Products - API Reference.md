# Products Module - API Reference

## Overview

This document provides comprehensive API reference for the Products module endpoints. All endpoints require authentication and appropriate permissions.

## Base URL

```
{API_BASE_URL}/v1/products
```

## Authentication

All endpoints require a valid Bearer token in the Authorization header:

```http
Authorization: Bearer {your_jwt_token}
```

## Permissions Required

- **Read Operations**: `STORES:READ` permission
- **Create Operations**: `STORES:CREATE` permission  
- **Update Operations**: `STORES:UPDATE` permission
- **Delete Operations**: `STORES:DELETE` permission

## Tank Types Endpoints

### List Tank Types

**GET** `/tanks`

Retrieves a paginated list of tank types with optional filtering.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `include_deleted` | boolean | No | false | Include soft-deleted tank types |
| `search` | string | No | - | Search in name and description |
| `weight` | string | No | - | Filter by specific weight (e.g., "10kg") |
| `price_min` | number | No | - | Minimum sell price filter |
| `price_max` | number | No | - | Maximum sell price filter |
| `limit` | integer | No | 50 | Number of results per page (1-100) |
| `offset` | integer | No | 0 | Number of results to skip |

#### Example Request

```http
GET /v1/products/tanks?search=premium&weight=10kg&limit=20&offset=0
Authorization: Bearer {token}
```

#### Example Response

```json
{
  "data": [
    {
      "typeId": 1,
      "name": "GLP Premium 10kg",
      "weight": "10kg",
      "description": "Tanque de gas premium de 10kg",
      "purchase_price": "45000.00",
      "sell_price": "55000.00",
      "scale": "unidad",
      "is_active": true,
      "deleted_at": null,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 8,
    "limit": 20,
    "offset": 0
  }
}
```

#### Error Responses

- **400 Bad Request**: Invalid query parameters
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions

### Get Tank Type by ID

**GET** `/tanks/{id}`

Retrieves a specific tank type by its ID.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Tank type ID |

#### Example Request

```http
GET /v1/products/tanks/1
Authorization: Bearer {token}
```

#### Example Response

```json
{
  "typeId": 1,
  "name": "GLP Premium 10kg",
  "weight": "10kg",
  "description": "Tanque de gas premium de 10kg",
  "purchase_price": "45000.00",
  "sell_price": "55000.00",
  "scale": "unidad",
  "is_active": true,
  "deleted_at": null,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### Error Responses

- **400 Bad Request**: Invalid tank type ID
- **404 Not Found**: Tank type not found
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions

### Create Tank Type

**POST** `/tanks`

Creates a new tank type.

#### Request Body

```json
{
  "name": "GLP Premium 15kg",
  "weight": "15kg",
  "description": "Tanque de gas premium de 15kg",
  "purchase_price": 65000,
  "sell_price": 75000,
  "scale": "unidad"
}
```

#### Request Body Schema

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | string | Yes | 1-50 chars | Unique tank type name |
| `weight` | string | Yes | 1-5 chars | Weight specification |
| `description` | string | No | - | Optional description |
| `purchase_price` | number | Yes | > 0 | Purchase price |
| `sell_price` | number | Yes | > purchase_price | Selling price |
| `scale` | string | No | max 10 chars | Scale unit (default: "unidad") |

#### Example Response

```json
{
  "typeId": 9,
  "name": "GLP Premium 15kg",
  "weight": "15kg",
  "description": "Tanque de gas premium de 15kg",
  "purchase_price": "65000.00",
  "sell_price": "75000.00",
  "scale": "unidad",
  "is_active": true,
  "deleted_at": null,
  "createdAt": "2024-06-18T15:30:00Z",
  "updatedAt": "2024-06-18T15:30:00Z"
}
```

#### Error Responses

- **400 Bad Request**: Invalid request data, validation errors
- **409 Conflict**: Tank type name already exists
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions

### Update Tank Type

**PUT** `/tanks/{id}`

Updates an existing tank type.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Tank type ID |

#### Request Body

All fields are optional for updates:

```json
{
  "name": "GLP Premium 15kg Updated",
  "description": "Tanque de gas premium de 15kg actualizado",
  "sell_price": 78000
}
```

#### Example Response

```json
{
  "typeId": 9,
  "name": "GLP Premium 15kg Updated",
  "weight": "15kg",
  "description": "Tanque de gas premium de 15kg actualizado",
  "purchase_price": "65000.00",
  "sell_price": "78000.00",
  "scale": "unidad",
  "is_active": true,
  "deleted_at": null,
  "createdAt": "2024-06-18T15:30:00Z",
  "updatedAt": "2024-06-18T16:45:00Z"
}
```

#### Error Responses

- **400 Bad Request**: Invalid request data, validation errors
- **404 Not Found**: Tank type not found
- **409 Conflict**: Tank type name already exists
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions

### Delete Tank Type

**DELETE** `/tanks/{id}`

Soft deletes a tank type. The tank type will be marked as inactive but preserved for audit trails.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Tank type ID |

#### Example Response

```json
{
  "success": true,
  "message": "Tipo de tanque eliminado correctamente"
}
```

#### Error Responses

- **400 Bad Request**: Invalid tank type ID
- **404 Not Found**: Tank type not found
- **409 Conflict**: Tank type referenced in orders or inventory
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions

### Restore Tank Type

**PATCH** `/tanks/{id}/restore`

Restores a previously soft-deleted tank type.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Tank type ID |

#### Example Response

```json
{
  "typeId": 9,
  "name": "GLP Premium 15kg",
  "weight": "15kg",
  "description": "Tanque de gas premium de 15kg",
  "purchase_price": "65000.00",
  "sell_price": "75000.00",
  "scale": "unidad",
  "is_active": true,
  "deleted_at": null,
  "createdAt": "2024-06-18T15:30:00Z",
  "updatedAt": "2024-06-18T17:00:00Z"
}
```

#### Error Responses

- **400 Bad Request**: Invalid tank type ID or tank type not deleted
- **404 Not Found**: Tank type not found
- **409 Conflict**: Active tank type with same name already exists
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions

## Inventory Items Endpoints

### List Inventory Items

**GET** `/items`

Retrieves a paginated list of inventory items with optional filtering.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `include_deleted` | boolean | No | false | Include soft-deleted items |
| `search` | string | No | - | Search in name and description |
| `price_min` | number | No | - | Minimum sell price filter |
| `price_max` | number | No | - | Maximum sell price filter |
| `limit` | integer | No | 50 | Number of results per page (1-100) |
| `offset` | integer | No | 0 | Number of results to skip |

#### Example Request

```http
GET /v1/products/items?search=válvula&price_max=50000&limit=10
Authorization: Bearer {token}
```

#### Example Response

```json
{
  "data": [
    {
      "inventoryItemId": 1,
      "name": "Válvula Regular",
      "description": "Válvula estándar para tanques de gas",
      "purchase_price": "15000.00",
      "sell_price": "25000.00",
      "scale": "unidad",
      "is_active": true,
      "deleted_at": null,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 6,
    "limit": 10,
    "offset": 0
  }
}
```

### Get Inventory Item by ID

**GET** `/items/{id}`

Retrieves a specific inventory item by its ID.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Inventory item ID |

### Create Inventory Item

**POST** `/items`

Creates a new inventory item.

#### Request Body

```json
{
  "name": "Adaptador Especial",
  "description": "Adaptador para conexiones especiales",
  "purchase_price": 8000,
  "sell_price": 12000,
  "scale": "unidad"
}
```

#### Request Body Schema

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | string | Yes | 1-100 chars | Unique item name |
| `description` | string | No | - | Optional description |
| `purchase_price` | number | Yes | > 0 | Purchase price |
| `sell_price` | number | Yes | > purchase_price | Selling price |
| `scale` | string | Yes | 1-10 chars | Scale unit |

### Update Inventory Item

**PUT** `/items/{id}`

Updates an existing inventory item. Same request body as create, but all fields optional.

### Delete Inventory Item

**DELETE** `/items/{id}`

Soft deletes an inventory item.

### Restore Inventory Item

**PATCH** `/items/{id}/restore`

Restores a previously soft-deleted inventory item.

## Search Endpoint

### Search Products

**GET** `/search`

Searches across both tank types and inventory items.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search query term |
| `type` | string | No | "all" | Product type: "tanks", "items", or "all" |
| `limit` | integer | No | 20 | Maximum results (1-50) |

#### Example Request

```http
GET /v1/products/search?q=premium&type=all&limit=10
Authorization: Bearer {token}
```

#### Example Response

```json
{
  "tanks": [
    {
      "typeId": 1,
      "name": "GLP Premium 10kg",
      "weight": "10kg",
      "description": "Tanque de gas premium de 10kg",
      "purchase_price": "45000.00",
      "sell_price": "55000.00",
      "scale": "unidad",
      "is_active": true,
      "deleted_at": null,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "items": [
    {
      "inventoryItemId": 2,
      "name": "Válvula Premium PB",
      "description": "Válvula premium para presión baja",
      "purchase_price": "25000.00",
      "sell_price": "35000.00",
      "scale": "unidad",
      "is_active": true,
      "deleted_at": null,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total_results": 2
}
```

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
| `INVALID_ID` | Invalid or malformed ID parameter |
| `VALIDATION_ERROR` | Request validation failed |
| `TANK_TYPE_NOT_FOUND` | Tank type not found |
| `ITEM_NOT_FOUND` | Inventory item not found |
| `NAME_ALREADY_EXISTS` | Duplicate name conflict |
| `DELETION_BLOCKED` | Cannot delete due to references |
| `INTERNAL_ERROR` | Server-side error |

## Rate Limiting

API endpoints are subject to rate limiting. Current limits:

- **Authenticated requests**: 1000 requests per hour per user
- **Search endpoints**: 100 requests per hour per user

## Pagination

List endpoints support pagination with the following parameters:

- `limit`: Number of results per page (default: 50, max: 100)
- `offset`: Number of results to skip (default: 0)

Response includes pagination metadata:

```json
{
  "pagination": {
    "total": 156,
    "limit": 50,
    "offset": 0
  }
}
```

## Best Practices

### Filtering and Search

1. **Use specific filters**: Combine multiple filters for precise results
2. **Implement client-side caching**: Cache frequently accessed product data
3. **Use pagination**: Always implement pagination for list endpoints
4. **Handle empty results**: Gracefully handle empty result sets

### Error Handling

1. **Check HTTP status codes**: Always verify response status before processing
2. **Handle specific error codes**: Implement specific handling for common errors
3. **Display user-friendly messages**: Transform technical errors to user-friendly text
4. **Implement retry logic**: For 5xx errors, implement exponential backoff

### Performance Optimization

1. **Use appropriate page sizes**: Balance between response time and data needs
2. **Implement search debouncing**: Avoid excessive search requests
3. **Cache product data**: Cache stable product information locally
4. **Use specific field filtering**: Request only needed data when possible

## Examples

### Complete CRUD Workflow

```javascript
// 1. Create a new tank type
const newTank = await fetch('/v1/products/tanks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'GLP Premium 20kg',
    weight: '20kg',
    description: 'Tanque grande premium',
    purchase_price: 85000,
    sell_price: 95000
  })
});

// 2. Update the tank type
const updatedTank = await fetch(`/v1/products/tanks/${newTank.typeId}`, {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sell_price: 98000
  })
});

// 3. Search for tanks
const searchResults = await fetch('/v1/products/search?q=premium&type=tanks', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

// 4. Soft delete the tank type
await fetch(`/v1/products/tanks/${newTank.typeId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

// 5. Restore the tank type
const restoredTank = await fetch(`/v1/products/tanks/${newTank.typeId}/restore`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
```

This API reference provides complete documentation for integrating with the Products module endpoints.