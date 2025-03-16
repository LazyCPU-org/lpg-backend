# LPG Backend
# Backend Service for LPG Delivery Business

## Overview

LPG provides a comprehensive backend system for managing delivery operations across multiple physical locations. The system handles user authentication, authorization, data management, and analytics for delivery operations.

## Technical Stack

- Node.JS
- Standard library SSE implementation
- PostgreSQL for persistent storage

## Database Configuration

This project uses Drizzle ORM to interact with the PostgreSQL database. The database connection is configured using environment variables.

The database-related files are organized in the `src/db` directory:

- `src/db/drizzle.config.json`: Contains the Drizzle configuration.
- `src/db/schemas/schema.ts`: Defines the database schema.
- `src/db/migrate.ts`: Contains the migration script.
- `src/db/drizzle`: Contains the generated migration files.

To generate new migrations, run `npm run db:generate`.
To apply the migrations, run `npm run db:migrate`.

The migration files are automatically named based on the current timestamp. To use more descriptive names, you can manually rename the migration files after they are generated and update the `_journal.json` file in the `src/db/drizzle/meta` directory accordingly.

## System Requirements

- Node.JS v20
- Minimum 1GB RAM
- PostgreSQL 14+