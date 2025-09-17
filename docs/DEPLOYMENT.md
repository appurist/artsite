# Deployment Guide

## JWT Secret Management

This project uses a secure approach to handle JWT secrets without committing them to the repository.

### Setup

1. **Create a `.env` file** in the project root:
   ```bash
   # Generate a secure JWT secret
   openssl rand -base64 32
   
   # Add to .env file
   echo "JWT_SECRET=your-generated-secret-here" > .env
   ```

2. **The `.env` file is automatically ignored** by Git (listed in `.gitignore`).

### Deployment

Use the secure deployment scripts that automatically read the JWT secret from `.env`:

```bash
# Deploy to development
pnpm deploy:dev

# Deploy to production  
pnpm deploy:prod
```

### How It Works

1. The deployment script (`scripts/deploy.js`) reads `JWT_SECRET` from the `.env` file
2. It passes the secret to Wrangler using the `--var` flag at deployment time
3. The secret is injected into the worker environment variables securely
4. Wrangler shows `JWT_SECRET: "(hidden)"` to confirm the secret was set without exposing it

### Alternative Methods

If you prefer manual deployment, you can also use:

```bash
# Windows
deploy-dev.bat
deploy-prod.bat

# Or manually with Wrangler
cd workers
wrangler deploy --env development --var JWT_SECRET:your-secret-here
```

### Benefits

- ✅ **Secrets never committed to Git**
- ✅ **Automatic deployment without manual secret entry**
- ✅ **Same secret used across team members** (via shared `.env` file)
- ✅ **Different secrets per environment** (if needed)
- ✅ **Secure handling** by Cloudflare Workers

### Security Notes

- Never commit the `.env` file to version control
- Share the JWT secret securely with team members (not via Slack/email)
- Consider using different secrets for development vs production
- Rotate secrets periodically for security

## Traditional Issues Solved

This approach solves the common DevOps problem where teams must choose between:
- ❌ Committing secrets to `wrangler.toml` (insecure)
- ❌ Manually adding secrets after each deployment (annoying)

Our solution provides both security and convenience.