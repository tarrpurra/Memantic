# Frontend-Backend Integration Guide

This document describes how the frontend React application integrates with the Internet Computer backend canister.

## Architecture Overview

The integration follows a service-oriented architecture with the following components:

- **BackendService**: Core service class that handles all communication with the IC backend
- **AuthContext**: React context for managing authentication state
- **useMemeGeneration**: Custom hook for meme generation operations
- **Environment Configuration**: Centralized configuration management

## Key Components

### 1. BackendService (`src/services/backendService.js`)

The main service class that provides:

- Internet Identity authentication
- Canister communication via DFX agent
- Meme generation, voting, and retrieval operations
- Error handling and retry logic

**Key Methods:**

- `initialize()`: Setup authentication client
- `login()`: Authenticate with Internet Identity
- `generateMeme(prompt, style)`: Generate new meme
- `getUserMemes()`: Retrieve user's memes
- `voteMeme(memeId, voteType)`: Vote on memes

### 2. AuthContext (`src/contexts/AuthContext.jsx`)

React context that manages:

- Authentication state across the app
- User session management
- Remaining API calls tracking
- Automatic token refresh

**Usage:**

```jsx
import { useAuth } from "../contexts/AuthContext";

const { isAuthenticated, login, logout, remainingCalls } = useAuth();
```

### 3. useMemeGeneration Hook (`src/hooks/useMemeGeneration.js`)

Custom hook for meme generation that provides:

- Generation state management
- Error handling and user feedback
- Integration with authentication context
- Generation history tracking

**Usage:**

```jsx
import { useMemeGeneration } from "../hooks/useMemeGeneration";

const { generateMeme, isGenerating, canGenerate } = useMemeGeneration();
```

## Environment Configuration

The app uses environment variables for configuration:

```bash
# Internet Computer Configuration
VITE_INTERNET_IDENTITY_HOST=https://identity.ic0.app

# Backend Canister ID
VITE_MEMENTIC_BACKEND_CANISTER_ID=your_canister_id_here

# Development Mode
VITE_DEV_MODE=true
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd src/Mementic_frontend
npm install
```

### 2. Configure Environment

Create a `.env` file based on `.env.example` and set your canister ID.

### 3. Deploy Backend

```bash
cd ../..
dfx deploy Mementic_backend
```

### 4. Generate Frontend Bindings

```bash
dfx generate Mementic_backend
```

### 5. Start Development Server

```bash
npm run dev
```

## Authentication Flow

1. **Initialization**: App checks for existing authentication on load
2. **Login**: User clicks login → Internet Identity popup → Authentication success
3. **Session Management**: Auth state maintained across app navigation
4. **Logout**: User logs out → Session cleared → Redirect to landing

## Error Handling

The integration includes comprehensive error handling:

- Network errors with retry logic
- Authentication failures with user feedback
- Rate limiting and quota management
- Graceful degradation for offline scenarios

## Testing the Integration

### 1. Health Check

```jsx
const health = await backendService.healthCheck();
console.log("Backend health:", health);
```

### 2. Generate Meme

```jsx
const result = await generateMeme("Funny crypto meme", "cartoon");
if (result.success) {
  console.log("Meme generated:", result.meme_data);
}
```

### 3. Check Remaining Calls

```jsx
const calls = await backendService.getRemainingCalls();
console.log("Calls remaining:", calls);
```

## Troubleshooting

### Common Issues

1. **Canister Not Found**: Ensure backend is deployed and canister ID is correct
2. **Authentication Failed**: Check Internet Identity configuration
3. **CORS Errors**: Verify host configuration in development
4. **Network Timeouts**: Check IC network status and retry logic

### Debug Mode

Enable debug logging by setting:

```bash
VITE_DEBUG_MODE=true
```

## Security Considerations

- All API calls require authentication
- User data is isolated by principal ID
- Rate limiting prevents abuse
- HTTPS enforced in production

## Performance Optimization

- Lazy loading of components
- Caching of user data
- Optimistic updates for better UX
- Background refresh of authentication state
