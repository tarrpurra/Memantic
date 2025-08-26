# Mementic Troubleshooting Guide

## Common Issues and Solutions

### 1. Build Error: Candid file not found

**Error:**

```
Error: Failed while trying to generate type declarations for 'Mementic_frontend'.
Caused by: Candid file: /path/to/assetstorage.did doesn't exist.
```

**Solution:**

- The frontend is an assets canister, not a backend canister
- Only generate declarations for the backend: `dfx generate Mementic_backend`
- The prebuild script has been updated to only generate backend declarations
- Use the new build script: `npm run build` (from root directory)

**Fixed in:**

- `src/Mementic_frontend/package.json`: `"prebuild": "dfx generate Mementic_backend"`
- `build-frontend.js`: Custom build script that handles the process correctly

### 2. Environment Variables Not Loading

**Issue:** Environment variables from `.env` file not being read

**Solutions:**

- Ensure `.env` file is in the root directory (`Mementic/.env`)
- Check that environment variables start with `VITE_` prefix
- Verify vite.config.js has correct `envDir` path: `path.resolve(__dirname, "../../")`

**Example .env file:**

```env
VITE_MEMENTIC_BACKEND_CANISTER_ID=your_canister_id_here
VITE_DEV_MODE=true
VITE_AGENT_HOST=https://icp-api.io
```

### 3. Canister ID Not Configured

**Error:** "Canister ID not configured" or similar errors

**Solutions:**

- Canister IDs are now automatically loaded from declaration files
- Ensure declarations are generated: `dfx generate Mementic_backend`
- Deploy backend: `dfx deploy Mementic_backend`
- Check that declaration files exist in `src/declarations/Mementic_backend/`

### 4. Import Path Issues

**Error:** Module not found or import errors

**Solutions:**

- Check case sensitivity: `Pages/` vs `pages/`
- Verify file paths match actual directory structure
- Ensure all imports use correct relative paths

### 5. DFX Network Issues

**Error:** Network connection or replica issues

**Solutions:**

- Start local replica: `dfx start --background`
- Check if dfx is running: `dfx ping`
- Verify network configuration in `dfx.json`

### 6. Frontend Build Issues

**Error:** Build fails during `npm run build`

**Solutions:**

- Use the new build script: `npm run build` (from root directory)
- Clear build cache: `rm -rf src/Mementic_frontend/dist`
- Reinstall dependencies: `cd src/Mementic_frontend && npm install`
- Check for syntax errors in React components
- Verify all imports are correct

### 7. Authentication Issues

**Error:** Internet Identity or authentication problems

**Solutions:**

- Check `VITE_INTERNET_IDENTITY_HOST` in `.env`
- Verify Internet Identity configuration
- Ensure backend canister is deployed and accessible

## Development Workflow

### 1. Initial Setup

```bash
# Clone and setup
cd Mementic
npm run setup

# Deploy backend
dfx deploy Mementic_backend

# Update .env with canister ID
# Start frontend
npm run dev
```

### 2. Development

```bash
# Start local replica (if not running)
dfx start --background

# Start frontend development server
npm run dev

# In another terminal, deploy backend changes
dfx deploy Mementic_backend
```

### 3. Building for Production

```bash
# Build frontend (recommended)
npm run build

# Or build frontend only
npm run build:frontend

# Deploy to IC
dfx deploy --network ic
```

## Build Process

### New Build Script

The project now includes a custom build script (`build-frontend.js`) that:

1. Generates only backend declarations: `dfx generate Mementic_backend`
2. Builds the frontend with Vite: `npm run build`
3. Provides clear error messages and progress indicators

### Build Commands

- `npm run build` - Full build process (recommended)
- `npm run build:frontend` - Frontend only build
- `cd src/Mementic_frontend && npm run build` - Direct frontend build

## Debug Mode

Enable debug logging by setting in `.env`:

```env
VITE_DEV_MODE=true
```

This will show:

- Configuration values
- Canister ID and agent host
- Feature flags status
- API configuration

## Environment Configuration

### Required Variables

- `VITE_MEMENTIC_BACKEND_CANISTER_ID`: Your deployed backend canister ID
- `VITE_DEV_MODE`: Set to "true" for local development
- `VITE_AGENT_HOST`: Agent host URL (auto-configured based on dev mode)

### Optional Variables

- `VITE_INTERNET_IDENTITY_HOST`: Internet Identity URL
- `VITE_ENABLE_MEME_GENERATION`: Enable meme generation feature
- `VITE_ENABLE_VOTING`: Enable voting feature
- `VITE_ENABLE_NFT_MINTING`: Enable NFT minting feature

## Getting Help

If you encounter issues not covered here:

1. Check the browser console for detailed error messages
2. Use the `BackendConnectionTest` component to diagnose backend issues
3. Verify all environment variables are set correctly
4. Ensure dfx and all dependencies are up to date
5. Try the new build script: `npm run build`
