# LPG Backend
# Backend Service for LPG Delivery Business

## Overview

LPG provides a comprehensive backend system for managing delivery operations across multiple physical locations. The system handles user authentication, authorization, data management, and analytics for delivery operations.

## Technical Stack

- Node.JS
- Standard library SSE implementation
- PostgreSQL for persistent storage

## System Requirements

- Node.JS v20
- Minimum 1GB RAM
- PostgreSQL 14+

# LPG Backend

Backend to control the functioning of a LPG store.

## Environment Configuration

This project supports multiple environment configurations:

- **Local** (`.env.local`): For local development
- **QA** (`.env.qa`): For testing/staging environment
- **Production** (`.env.prod`): For production deployment

All environment files are stored in `src/docker/env/` directory.

## Setup Guide

### Local Development (Without Docker)

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment file**

   ```bash
   # Copy example .env file for local development
   cp src/docker/env/.env.example src/docker/env/.env.local

   # Edit the file with your settings
   nano src/docker/env/.env.local
   ```

3. **Start the application**

   ```bash
   # This uses the local environment by default
   npm run dev
   ```

4. **Create a superadmin account (first time only)**

   ```bash
   # Set ENABLE_DATA_SEED=true in your .env.local file
   # Then run:
   npm run db:seed
   ```

### Development with Docker

1. **Set up environment file**

   ```bash
   # Copy example .env file for local development
   cp src/docker/env/.env.example src/docker/env/.env.local
   ```

2. **Start the containers**

   ```bash
   # Start with local environment (default)
   npm run docker:up

   # Or specify an environment:
   ENV=qa npm run docker:up
   ENV=prod npm run docker:up
   ```

3. **Create a superadmin (first time only)**

   ```bash
   # Start with superadmin seeding enabled
   npm run docker:seed

   # Or specify an environment:
   ENV=qa npm run docker:seed
   ```

4. **View logs**

   ```bash
   npm run docker:logs
   ```

5. **Stop containers**

   ```bash
   npm run docker:down
   ```

## Database Commands

- Generate migrations: `npm run db:generate`
- Apply migrations: `npm run db:migrate`
- Push schema changes: `npm run db:push`
- Seed the database: `npm run db:seed` or `ENV=qa npm run db:seed`

## Working with Different Environments

The project supports three environments that can be selected using the `ENV` variable:

```bash
# Development with specific environments
npm run dev           # Local (default)
npm run dev:qa        # QA
npm run dev:prod      # Production

# Start for production with specific environments
npm run start:local   # Local
npm run start:qa      # QA
npm run start:prod    # Production

# Docker with specific environments
ENV=local npm run docker:up
ENV=qa npm run docker:up
ENV=prod npm run docker:up
```

# LPG Backend

Backend to control the functioning of a LPG store.

## Environment Configuration

This project supports multiple environment configurations:

- **Local** (`.env.local`): For local development
- **QA** (`.env.qa`): For testing/staging environment
- **Production** (`.env.prod`): For production deployment

All environment files are stored in `src/docker/env/` directory.

## Setup Guide

### Local Development (Without Docker)

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment file**

   ```bash
   # Copy example .env file for local development
   cp src/docker/env/.env.example src/docker/env/.env.local

   # Edit the file with your settings
   nano src/docker/env/.env.local
   ```

3. **Start the application**

   ```bash
   # This uses the local environment by default
   npm run dev
   ```

4. **Create a superadmin account (first time only)**

   ```bash
   # Set ENABLE_DATA_SEED=true in your .env.local file
   # Then run:
   npm run db:seed
   ```

### Development with Docker

1. **Set up environment file**

   ```bash
   # Copy example .env file for local development
   cp src/docker/env/.env.example src/docker/env/.env.local
   ```

2. **Start the containers**

   ```bash
   # Start with local environment (default)
   npm run docker:up

   # Or specify an environment:
   ENV=qa npm run docker:up
   ENV=prod npm run docker:up
   ```

3. **Create a superadmin (first time only)**

   ```bash
   # Start with superadmin seeding enabled
   npm run docker:seed

   # Or specify an environment:
   ENV=qa npm run docker:seed
   ```

4. **View logs**

   ```bash
   npm run docker:logs
   ```

5. **Stop containers**

   ```bash
   npm run docker:down
   ```

## Database Commands

- Generate migrations: `npm run db:generate`
- Apply migrations: `npm run db:migrate`
- Push schema changes: `npm run db:push`
- Seed the database: `npm run db:seed` or `ENV=qa npm run db:seed`

## Working with Different Environments

The project supports three environments that can be selected using the `ENV` variable:

```bash
# Development with specific environments
npm run dev           # Local (default)
npm run dev:qa        # QA
npm run dev:prod      # Production

# Start for production with specific environments
npm run start:local   # Local
npm run start:qa      # QA
npm run start:prod    # Production

# Docker with specific environments
ENV=local npm run docker:up
ENV=qa npm run docker:up
ENV=prod npm run docker:up
```

## CI/CD Integration

This project is ready for CI/CD integration with GitHub Actions. The Docker setup is designed to be seamlessly integrated with automated workflows:

### Building for Deployment

```bash
# Build the Docker image
docker build -t lpg-backend:latest -f src/docker/Dockerfile .

# Push to container registry
docker tag lpg-backend:latest registry-url/lpg-backend:latest
docker push registry-url/lpg-backend:latest
```

### Environment Configuration

For GitHub Actions:

1. Store environment variables as GitHub Secrets
2. Generate environment files during the CI/CD process
3. Use different sets of secrets for different environments

Example of generating environment files in CI/CD:
```bash
# Create environment file from secrets
echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" > .env.prod
echo "JWT_SECRET=${{ secrets.JWT_SECRET }}" >> .env.prod
# ...other variables
```

### Deployment Considerations

- The Docker image is built using a multi-stage process for smaller image size
- Production dependencies are installed separately from development dependencies
- Environment selection is done at runtime via the ENV variable
- Data creation can be automated during first deployment by setting ENABLE_DATA_SEED=true