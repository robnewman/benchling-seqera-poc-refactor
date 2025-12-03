# Benchling-Seqera Platform Integration

A Benchling Connect app that integrates with Seqera Platform to display and launch Nextflow pipelines directly from Benchling.

## Features

- 📊 Display available Nextflow pipelines from your Seqera workspace
- 📋 View pipeline details (name, repository, last updated)
- 🚀 Launch pipelines directly in Seqera Platform with one click
- 📈 View recent workflow runs with status, labels, and user information
- 🔄 Relaunch workflows from the runs list
- ✅ Status indicators with visual badges (succeeded, failed, cancelled)
- ⭐ See starred runs at a glance

## Prerequisites

- Node.js **v18 or higher** (required for native fetch support)
- npm
- A Seqera Platform account with API access
- A Benchling account with **Admin privileges** to register apps
- A hosting platform for deployment (AWS App Runner, Vercel, etc.)

Check your Node version:
```bash
node --version  # Should be v18.0.0 or higher
```

## Quick Start (Local Development)

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd benchling-seqera-poc-refactor
npm install
```

### 2. Configure Environment Variables

1. **Copy the example environment file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` and fill in your Seqera credentials**:
   ```bash
   REACT_APP_SEQERA_TOKEN=your-seqera-token-here
   REACT_APP_WORKSPACE_ID=your-workspace-id-here
   REACT_APP_ORGANIZATION_NAME=your-org-name
   REACT_APP_WORKSPACE_NAME=your-workspace-name
   ```

   To get these values:
   - **seqeraToken**: Seqera Platform → Settings → Your tokens
   - **workspaceId**: From Seqera Platform UI URL or API
   - **organizationName**: Your Seqera organization name
   - **workspaceName**: Your Seqera workspace name

3. **For local development mock** (optional), uncomment the script in [public/index.html](public/index.html):
   - Open [public/index.html](public/index.html)
   - Uncomment the `window.benchling` mock object
   - Update with your credentials from `.env.local`

   ```html
   <script>
     window.benchling = {
       getAppConfig: () => Promise.resolve({
         seqeraToken: 'your-actual-token',
         organizationName: 'your-org-name',
         workspaceName: 'your-workspace-name',
         seqeraApi: 'https://api.cloud.seqera.io'
       })
     };
   </script>
   ```

**IMPORTANT**: Never commit `.env.local` or any file with real credentials to version control!

### 3. Start the Development Server

The app uses a single proxy server that handles both API proxying and serves the React app:

```bash
# Start the integrated proxy and React dev server
npm start
```

The app will open at `http://localhost:3000` and you should see your Seqera pipelines and recent runs.

**Note**: For local development with `npm start`, the React app runs on port 3000 and proxies API calls to port 3001 automatically.

### 4. Before Deploying to Production

**CRITICAL Security Checklist**:

1. **Comment out the mock** in [public/index.html](public/index.html) (it should already be commented):
   ```html
   <!--
   <script>
     window.benchling = { ... }
   </script>
   -->
   ```

2. **Verify `.env.local` is NOT committed** to version control:
   ```bash
   git status  # .env.local should not appear here
   ```

3. **Update [apprunner.yaml](apprunner.yaml)** with your production credentials if using AWS App Runner

The real Benchling environment will provide the configuration automatically via `window.benchling.getAppConfig()`.

---

## Production Deployment

### Architecture

The app consists of:
- A React frontend that displays pipelines and runs
- A Node.js Express proxy server that forwards requests to Seqera API (handles CORS)
- Benchling lifecycle endpoints for app installation/validation

### Deployment Options

#### Option 1: AWS App Runner (Recommended)

AWS App Runner configuration is included in [apprunner.yaml](apprunner.yaml).

1. **Update [apprunner.yaml](apprunner.yaml) with your credentials**:
   ```yaml
   env:
     - name: REACT_APP_SEQERA_TOKEN
       value: "your-seqera-token"
     - name: REACT_APP_WORKSPACE_ID
       value: "your-workspace-id"
   ```

   **IMPORTANT**: For production deployments, consider using AWS Secrets Manager or Parameter Store instead of hard-coding values in [apprunner.yaml](apprunner.yaml).

2. **Build and deploy**:
   ```bash
   npm run build
   ```

3. **Deploy to AWS App Runner** using the AWS Console or CLI

4. **Note your App Runner URL** (e.g., `https://xyz.us-east-1.awsapprunner.com`)

#### Option 2: Other Platforms (Vercel, Netlify, etc.)

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Deploy the build folder** to your hosting platform

3. **Set environment variables** (if not using Benchling config):
   - `REACT_APP_SEQERA_TOKEN`
   - `REACT_APP_WORKSPACE_ID`

### Register the App in Benchling

1. **Create [manifest.yml](manifest.yml)** (already included) with your app details

2. **Upload manifest to Benchling**:
   - Log into Benchling as an admin
   - Navigate to **Settings** → **Feature Settings** → **Developer Console** → **Apps**
   - Create a new app and upload the manifest
   - Or use the Benchling CLI if available

3. **Configure app settings** in Benchling:
   - **seqeraToken**: Your Seqera Platform API token
   - **organizationName**: Your Seqera organization name
   - **workspaceName**: Your Seqera workspace name
   - **seqeraApi**: API endpoint (default: `https://api.cloud.seqera.io`)

4. **Add Canvas URL** to your Benchling app configuration:
   - Set the iframe URL to your deployed app URL

5. **Install the app** in your Benchling workspace

## How It Works

### Configuration Resolution

The app supports two configuration methods:

1. **Benchling Environment** (Production):
   - Configuration is provided by Benchling via `window.benchling.getAppConfig()`
   - Workspace ID is automatically resolved from organization and workspace names
   - Uses Benchling's secure configuration storage

2. **Non-Benchling Environment** (Testing):
   - Falls back to environment variables:
     - `REACT_APP_SEQERA_TOKEN`
     - `REACT_APP_WORKSPACE_ID`

### API Proxy

The app includes a proxy server ([proxy-server.js](proxy-server.js)) that:
- Forwards API requests to Seqera Platform
- Handles CORS restrictions
- Adds authentication headers
- Serves the built React app
- Provides Benchling lifecycle endpoints (`/lifecycle`, `/validate`, `/health`)

**Local Development**: React app on port 3000 → Proxy on port 3001 → Seqera API

**Production**: Single server on port 3000 handles both app and API requests

### Benchling Lifecycle Endpoints

The proxy server implements Benchling Connect app lifecycle endpoints:

- **POST /lifecycle**: Handles app installation/update/uninstall events
- **POST /validate**: Validates configuration when admins update settings
- **GET /health**: Health check endpoint for monitoring

### Features

#### Pipeline Management
- Lists all pipelines in the configured workspace
- Shows pipeline name, repository, and last updated date
- Launch pipelines directly in Seqera Platform (opens in new tab)
- Displays pipeline icons (when available)

#### Workflow Runs
- Displays recent workflow runs (last 25)
- Shows run name, project, labels, user, and submission time
- Visual status indicators (succeeded, failed, cancelled)
- Time since submission
- Starred runs indicator
- Relaunch workflows with one click

## Project Structure

```
benchling-seqera-poc-refactor/
├── public/
│   └── index.html              # HTML template with mock config for local dev
├── src/
│   ├── index.js                # React entry point
│   ├── index.css               # Styles for tables and status indicators
│   └── SeqeraApp.jsx           # Main React component (pipelines + runs)
├── proxy-server.js             # Express proxy server + Benchling endpoints
├── manifest.yml                # Benchling app manifest
├── apprunner.yaml              # AWS App Runner configuration
├── package.json                # Dependencies and scripts
└── README.md                   # This file
```

## Configuration Reference

### manifest.yml Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `seqeraToken` | text | Yes | Your Seqera Platform API token |
| `workspaceId` | text | No | Direct workspace ID (optional if using org/workspace names) |
| `organizationName` | text | No | Seqera organization name (alternative to workspaceId) |
| `workspaceName` | text | No | Seqera workspace name (alternative to workspaceId) |
| `seqeraApi` | text | No | API endpoint URL (defaults to cloud) |

**Note**: Either provide `workspaceId` directly OR provide both `organizationName` and `workspaceName`.

## Troubleshooting

### Local Development

- **CORS errors**: The proxy server handles CORS. Make sure `npm start` is running.
- **"Missing required configuration"**:
  - Check that `.env.local` exists with valid credentials
  - OR uncomment the mock in [public/index.html](public/index.html) with valid credentials
- **API errors**: Verify your Seqera token and credentials in `.env.local` are correct
- **Port conflicts**: Make sure ports 3000 and 3001 are available
- **Environment variables not loading**: Make sure you created `.env.local` (not just `.env`)

### Production Issues

- **"Missing required configuration"**: Verify app configuration in Benchling Admin UI
- **API error: 401**: Check that Seqera token is correct and not expired
- **"Organization not found" or "Workspace not found"**: Verify org/workspace names are correct (case-sensitive)
- **"window.benchling is undefined"**:
  - In local dev: Add the mock object in [public/index.html](public/index.html)
  - In production: Ensure app is loaded within Benchling's iframe context
- **Configuration not updating**: Clear cache and refresh Benchling

### Common Issues

1. **Icons not showing**: Icons use Seqera's authentication and may not work in localhost. They work in production when deployed.

2. **Workspace ID resolution fails**: Make sure your token has access to the specified organization and workspace.

3. **Build errors**: Ensure you're using Node.js v18 or higher.

## Security Best Practices

- ✅ Use `.env.local` for local development credentials (automatically gitignored)
- ✅ Use Benchling's secure configuration storage for tokens in production
- ✅ Rotate API tokens periodically
- ✅ Deploy to HTTPS endpoints only
- ✅ Comment out mock credentials in [public/index.html](public/index.html) before deploying
- ✅ Use AWS Secrets Manager or similar for production environment variables
- ✅ Always verify `.env.local` is not committed: `git status`
- ❌ Never hard-code credentials in source code
- ❌ Never commit `.env.local`, `.env`, or any file with real tokens to version control
- ❌ Never commit [apprunner.yaml](apprunner.yaml) with real production credentials

## Development

### Available Scripts

- `npm start`: Start development server (runs React + proxy)
- `npm run build`: Build for production
- `npm test`: Run tests
- `npm run proxy`: Run proxy server only (for debugging)

### Making Changes

1. Edit [src/SeqeraApp.jsx](src/SeqeraApp.jsx) for UI changes
2. Edit [proxy-server.js](proxy-server.js) for API or Benchling lifecycle changes
3. Edit [manifest.yml](manifest.yml) for Benchling app configuration changes
4. Test locally with `npm start`
5. Build with `npm run build` and deploy

## Resources

- [Benchling Apps Documentation](https://docs.benchling.com/docs/apps-overview)
- [Seqera Platform API Documentation](https://docs.seqera.io/platform/latest/api/overview)
- [Benchling Connect Developer Guide](https://docs.benchling.com/docs/building-apps)

## License

MIT License - feel free to use and modify as needed.

## Support

For issues or questions:
- **Seqera Platform**: Contact Seqera support
- **Benchling Connect**: Refer to Benchling developer documentation
- **This app**: Open an issue in the repository
