# Branch Strategy and Protection Guide

## Overview

This guide explains how to set up a proper Git workflow using `develop` and `main` branches with appropriate protection rules for a professional development environment.

## Branch Strategy

### Branch Structure

```
main (protected) ← develop ← feature branches
```

- **`main`**: Production-ready code, protected branch
- **`develop`**: Active development, integration branch  
- **`feature/*`**: Individual feature development branches

### Workflow Process

1. **Feature Development**: Create feature branches from `develop`
2. **Integration**: Merge features into `develop` via Pull Requests
3. **Release**: Merge `develop` into `main` when ready for production
4. **Hotfixes**: Create directly from `main`, merge to both `main` and `develop`

## Setting Up Branch Protection with GitHub Rulesets

### Step 1: Create and Setup Develop Branch

If you don't have a `develop` branch yet:

```bash
# Create develop branch from main
git checkout main
git pull origin main
git checkout -b develop
git push -u origin develop
```

### Step 2: Configure Repository Rulesets

GitHub now uses "Rulesets" instead of legacy branch protection rules. Here's how to set them up:

#### Creating Main Branch Ruleset:

1. **Go to Repository Settings** → **Rules** → **Rulesets** → **New ruleset**

2. **Ruleset Configuration**:
   - **Ruleset name**: `Main Branch Protection`
   - **Enforcement status**: `Active`
   - **Bypass list**: Leave empty (applies to everyone including admins)

3. **Target Branches**:
   - **Add target** → **Include by pattern**
   - **Branch pattern**: `main`

4. **Rules Configuration**:
   
   **Branch Rules:**
   - ✅ **Restrict deletions** (prevents accidental branch deletion)
   - ✅ **Restrict force pushes** (prevents rewriting history)
   - ✅ **Require linear history** (optional, keeps clean history)
   - ✅ **Require signed commits** (recommended for security)

   **Pull Request Rules:**
   - ✅ **Require a pull request before merging**
     - **Required approving reviews**: `1`
     - ✅ **Dismiss stale pull request approvals when new commits are pushed**
     - ✅ **Require review from code owners** (if you have CODEOWNERS file)
     - ✅ **Require approval of the most recent reviewable push**
   
   - ✅ **Require status checks to pass**
     - ✅ **Require branches to be up to date before merging**
     - **Required status checks** (add these):
       - `TypeScript Type Check`
       - `Build Application` 
       - `Quality Gate`
   
   - ✅ **Require conversation resolution before merging**
   - ✅ **Block force pushes** (additional protection)

#### Creating Develop Branch Ruleset:

1. **Go to Repository Settings** → **Rules** → **Rulesets** → **New ruleset**

2. **Ruleset Configuration**:
   - **Ruleset name**: `Develop Branch Protection`
   - **Enforcement status**: `Active`
   - **Bypass list**: Leave empty or add admin users if needed

3. **Target Branches**:
   - **Add target** → **Include by pattern**
   - **Branch pattern**: `develop`

4. **Rules Configuration** (less restrictive than main):
   
   **Branch Rules:**
   - ✅ **Restrict deletions**
   - ✅ **Restrict force pushes**

   **Pull Request Rules:**
   - ✅ **Require a pull request before merging**
     - **Required approving reviews**: `1`
     - ✅ **Dismiss stale pull request approvals when new commits are pushed**
   
   - ✅ **Require status checks to pass**
     - ✅ **Require branches to be up to date before merging**
     - **Required status checks**:
       - `TypeScript Type Check`
       - `Build Application`
   
   - ✅ **Require conversation resolution before merging**

#### Alternative: Single Comprehensive Ruleset

You can also create one ruleset that covers both branches:

1. **Ruleset name**: `Branch Protection Rules`
2. **Target Branches**: 
   - **Add target** → **Include by pattern** → `main`
   - **Add target** → **Include by pattern** → `develop`
3. **Apply the same rules as above** (GitHub will enforce them on both branches)

#### Finding Required Status Check Names:

To get the exact names for required status checks:

1. **Go to your repository** → **Actions** tab
2. **Click on a recent workflow run** 
3. **Look at the job names** in the left sidebar:
   - These are the exact names to use in "Required status checks"
   - For example: `TypeScript Type Check`, `Build Application`, `Run Tests (Optional)`

4. **Alternative method**: 
   - Create the ruleset first without status checks
   - Make a test PR to trigger CI
   - Go back to **Rules** → **Rulesets** → **Edit your ruleset**
   - The status check names will now appear in a dropdown

**Important**: Status check names are case-sensitive and must match exactly.

### Step 3: Organization Settings (for LazyCPU-org)

#### GitHub Actions Permissions:

1. **Organization Settings** → **Actions** → **General**:
   - **Actions permissions**: "Allow all actions and reusable workflows"
   - **Workflow permissions**: "Read and write permissions"
   - ✅ "Allow GitHub Actions to create and approve pull requests"

2. **Repository Settings** → **Actions** → **General**:
   - **Workflow permissions**: "Read and write permissions"  
   - ✅ "Allow GitHub Actions to create and approve pull requests"

#### Default Branch Settings:

1. **Repository Settings** → **General** → **Default branch**
2. **Change default branch** to `develop`
3. This ensures new PRs default to `develop` instead of `main`

## Development Workflow

### Daily Development Process

1. **Start New Feature**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Develop and Commit**:
   ```bash
   # Make your changes
   git add .
   git commit -m "feat: implement your feature"
   git push -u origin feature/your-feature-name
   ```

3. **Create Pull Request**:
   - **Target**: `develop` branch
   - **Title**: Clear, descriptive title
   - **Description**: What changes were made and why
   - **Reviewers**: Assign team members

4. **Code Review Process**:
   - CI pipeline must pass (type check + build)
   - At least 1 approval required
   - Address review comments
   - Resolve conversations

5. **Merge to Develop**:
   - Use "Squash and merge" or "Merge commit" based on preference
   - Delete feature branch after merge

### Release Process

1. **Prepare Release**:
   ```bash
   git checkout develop
   git pull origin develop
   # Verify everything is ready for release
   ```

2. **Create Release PR**:
   - **Source**: `develop`
   - **Target**: `main`
   - **Title**: "Release v1.x.x - [Brief description]"
   - **Description**: Changelog and release notes

3. **Release Review**:
   - Thorough testing on develop branch
   - All CI checks must pass
   - Required approvals from maintainers

4. **Merge and Release**:
   - Merge `develop` → `main`
   - Automatic release pipeline triggers
   - Tag and GitHub release created automatically

### Hotfix Process

For critical production fixes:

1. **Create Hotfix Branch**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-bug-fix
   ```

2. **Fix and Test**:
   ```bash
   # Make minimal fix
   git add .
   git commit -m "fix: resolve critical production issue"
   git push -u origin hotfix/critical-bug-fix
   ```

3. **Create Two PRs**:
   - **PR 1**: `hotfix/critical-bug-fix` → `main`
   - **PR 2**: `hotfix/critical-bug-fix` → `develop`

4. **Fast-track Review**:
   - Emergency approval process
   - Merge to `main` first (triggers release)
   - Then merge to `develop` to keep branches in sync

## CI/CD Pipeline Updates

The pipeline now supports both branches:

- **CI Pipeline**: Runs on `main` and `develop` branches
- **Release Pipeline**: Only runs on `main` branch
- **Feature Branches**: CI runs on PRs to any branch

## Best Practices

### Commit Messages

Use conventional commit format:
```
feat: add new inventory tracking feature
fix: resolve type error in order service  
docs: update API documentation
test: add unit tests for transaction service
refactor: simplify inventory assignment logic
```

### Pull Request Guidelines

1. **Keep PRs Small**: Focus on single feature/fix
2. **Clear Titles**: Descriptive and concise
3. **Good Descriptions**: Explain what and why
4. **Link Issues**: Reference related GitHub issues
5. **Update Tests**: Include test updates when needed

### Code Review Process

1. **Review Checklist**:
   - ✅ Code follows project conventions
   - ✅ Tests are included/updated
   - ✅ Documentation is updated if needed
   - ✅ No security vulnerabilities
   - ✅ Performance considerations addressed

2. **Review Timeline**:
   - Reviews should be completed within 24 hours
   - Critical fixes can be expedited
   - Use GitHub notifications for review requests

### Branch Naming Conventions

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `hotfix/critical-issue` - Production hotfixes
- `docs/documentation-update` - Documentation only
- `refactor/component-name` - Code refactoring

## Troubleshooting

### Common Issues

1. **PR Blocked by Status Checks**:
   - Check CI pipeline logs
   - Fix type errors: `npm run typecheck`
   - Fix build errors: `npm run build`

2. **Merge Conflicts**:
   ```bash
   git checkout your-branch
   git fetch origin
   git rebase origin/develop
   # Resolve conflicts
   git push --force-with-lease
   ```

3. **Branch Protection Bypass**:
   - Only organization owners can bypass
   - Should only be used in emergencies
   - Document reason in commit/PR

### Getting Help

1. **CI/CD Issues**: Check GitHub Actions logs
2. **Branch Protection**: Verify organization settings
3. **Merge Issues**: Use GitHub's conflict resolution tools
4. **Permission Problems**: Contact organization admin

This branch strategy ensures code quality, proper review processes, and safe production deployments while maintaining development velocity.