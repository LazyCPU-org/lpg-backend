# Project Setup Guide

## Initial Setup

After cloning the repository, follow these steps to set up your development environment:

### 1. Create Environment Files

```bash
# Create local development environment file
cp src/docker/env/.env.example src/docker/env/.env.local

# Edit the file with your local development settings
nano src/docker/env/.env.local
```

If you need to set up QA or production environments:

```bash
# Create QA environment file
cp src/docker/env/.env.example src/docker/env/.env.qa

# Create production environment file
cp src/docker/env/.env.example src/docker/env/.env.prod
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Application

#### Using Docker (recommended):

```bash
# Start with local environment
make up-local
# or
npm run docker:local

# For first-time setup with superadmin creation:
# First, edit src/docker/env/.env.local and set ENABLE_DATA_SEED=true
make seed-local
```

#### Without Docker:

```bash
# Start development server with local environment
npm run dev:local
```

## Important Notes

### Environment Files

- **Never commit** the actual environment files (`.env.local`, `.env.qa`, `.env.prod`) to the repository
- These files contain sensitive information like database credentials and secret keys
- Only the example files are tracked in git
- If you add new environment variables, update the example files so others know about them

### Superadmin Creation

For security reasons, superadmin seeding is disabled by default.

To create a superadmin account:

1. Edit your environment file (e.g., `src/docker/env/.env.local`)
2. Set `ENABLE_DATA_SEED=true`
3. Configure `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD`
4. Run the appropriate command:
   - With Docker: `make seed-local` (or `seed-qa`, `seed-prod`)
   - Without Docker: `ENV=local npm run db:seed`
5. After successful creation, set `ENABLE_DATA_SEED=false` again

### Common Issues

1. **Database connection errors**: Make sure your database settings match what's in your environment file
2. **Docker environment not selected**: Ensure you're using the correct ENV variable (e.g., `ENV=local`)
3. **Entrypoint permission denied**: If you get permission errors on the entrypoint script, run `chmod +x src/docker/docker-entrypoint.sh`