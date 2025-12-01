# Benchling-Seqera Connect App

A simple Benchling Connect app that integrates with Seqera Platform to display and launch Nextflow pipelines directly from Benchling.

## Features

- 📊 Display the number of available Nextflow pipelines in your workspace
- 📋 List all pipelines with their details (name, repository, revision)
- 🚀 Launch pipelines directly from Benchling with a single click
- ✅ Real-time feedback on pipeline launch status

## Prerequisites

- Node.js **v18 or higher** (required for native fetch support)
- npm or yarn
- A Seqera Platform account with API access
- A Benchling account with **Admin privileges** to register apps
- A hosting service (Vercel, Netlify, AWS S3, etc.) to deploy your app

**Check your Node version:**
```bash
node --version  # Should be v18.0.0 or higher
```

If you need to upgrade Node.js, visit [nodejs.org](https://nodejs.org/)

## Quick Start (Local Development)

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd benchling-seqera-app
npm install
```

**Note**: This will install React and all required dependencies defined in `package.json`.

If you get a "Could not read package.json" error, make sure you have all these files in your project:
- `package.json` (project dependencies)
- `src/index.js` (React entry point)
- `src/index.css` (base styles)
- `src/SeqeraApp.jsx` (main component)
- `public/index.html` (HTML template)

### 2. Enable the Mock Benchling Configuration

The project includes a `public/index.html` file with a commented-out mock configuration.

**For local development:**
1. Open `public/index.html`
2. Find the commented section at the bottom (between `<!-- LOCAL DEVELOPMENT MOCK -->`)
3. **Uncomment** the `<script>` block
4. Replace the placeholder values with your actual Seqera credentials:
   - **seqeraToken**: Get from Seqera Platform → Settings → Your tokens
   - **organizationName**: Your Seqera organization name
   - **workspaceName**: Your Seqera workspace name

**Example:**
```html
<!-- Uncomment this block -->
<script>
  window.benchling = {
    getAppConfig: () => Promise.resolve({
      seqeraToken: 'eyJhbG...actual-token',
      organizationName: 'my-company',
      workspaceName: 'production',
      seqeraApi: 'https://api.cloud.seqera.io'
    })
  };
</script>
```

### 3. Start the Development Server

**Important**: You need to run TWO servers - the proxy and the React app.

**Terminal 1 - Start the proxy server:**
```bash
npm install  # First time only - installs express and cors
npm run proxy
```
This starts the proxy server on `http://localhost:3001` to handle Seqera API requests and avoid CORS errors.

You should see:
```
Proxy server running on http://localhost:3001
Forwarding requests to https://api.cloud.seqera.io
Node version: v18.x.x (or higher)
```

**Note**: The proxy uses Node.js native `fetch` (available in Node 18+). If you see "fetch is not defined", upgrade Node.js.

**Terminal 2 - Start the React app:**
```bash
npm start
```

The app will open at `http://localhost:3000` and you should see your Seqera pipelines!

### 4. Remove the Mock Before Deploying

**CRITICAL**: Before deploying to production:
1. Open `public/index.html`
2. **Comment out** or remove the mock `window.benchling` script
3. The real Benchling environment will provide this automatically

The mock should be commented out like this:
```html
<!--
<script>
  window.benchling = { ... }
</script>
-->
```

---

## Production Setup Instructions

### 2. Get Your Seqera Credentials (for local testing and production)

#### Seqera API Token:
1. Log into Seqera Platform
2. Navigate to **Settings** → **Your tokens**
3. Create a new token or copy an existing one
4. Save this token for the manifest configuration

#### Organization and Workspace Names:
1. Open Seqera Platform
2. Note your **organization name** (shown in the organization selector or URL)
3. Note your **workspace name** (shown in the workspace UI)
4. Save both names for the manifest configuration
5. The app will automatically resolve these to the internal workspace ID

**Note**: The workDir (S3 work directory) is already configured in your Seqera Compute Environment, so you don't need to specify it in the app configuration.

### 3. Create the App Manifest (for reference)

Create a `manifest.yaml` file in your project root (this is for reference when setting up in Benchling UI):

```yaml
name: seqera-pipeline-launcher
version: 1.0.0
description: Launch Nextflow pipelines from Seqera Platform
icon: https://your-domain.com/icon.png

# App configuration - these are securely stored by Benchling
appConfig:
  seqeraToken:
    type: secret
    description: Your Seqera Platform API token
    required: true
  
  organizationName:
    type: string
    description: Your Seqera organization name
    required: true
  
  workspaceName:
    type: string
    description: Your Seqera workspace name
    required: true
  
  seqeraApi:
    type: string
    description: Seqera API endpoint
    default: https://api.cloud.seqera.io
    required: false
  
  workDir:
    type: string
    description: S3 work directory for pipeline execution
    default: s3://your-bucket/work
    required: false

# App canvas configuration
canvas:
  - type: iframe
    url: https://your-app-url.com
    height: 800px
```

### 4. Register and Configure the App in Benchling

1. **Build your app for production:**
   ```bash
   npm run build
   ```

2. **Deploy to a hosting service:**
   - Deploy the `build/` folder to your hosting platform (Vercel, Netlify, AWS S3, etc.)
   - Note the deployed URL (e.g., `https://your-app.vercel.app`)

3. **Register the app in Benchling:**
   - Log into your Benchling tenant as an admin
   - Navigate to **Settings** → **Feature Settings** → **Apps**
   - Click **Create App** or **Register New App**
   - Fill in the app details:
     - **Name**: Seqera Pipeline Launcher
     - **Description**: Launch Nextflow pipelines from Seqera Platform
     - **App URL**: Your deployed app URL
     - **Icon**: (Optional) Upload an icon

4. **Configure the app settings:**
   - In the app settings page, add the configuration fields:
     - **Seqera Token** (secret field) - Your API token
     - **Organization Name** (text field) - Your org name
     - **Workspace Name** (text field) - Your workspace name
     - **Seqera API** (text field, optional) - API endpoint (defaults to cloud)
   - Enter your actual values
   - Click **Save**

### 5. Install the App in Your Workspace

1. Navigate to your Benchling workspace
2. Go to **Apps** in the left sidebar
3. Find **Seqera Pipeline Launcher** in available apps
4. Click **Install** or **Add to Workspace**
5. The app will now appear in your workspace's app canvas

## How Configuration Works

### App Registration via Benchling UI
Benchling Connect apps are registered and configured through the Benchling Admin UI, not via CLI:

1. **Admin registers the app** in Benchling Settings
2. **Configuration fields** are defined in the app settings page
3. **Admins enter values** securely through the UI
4. **Benchling stores and encrypts** sensitive values like API tokens

### Runtime Access
```javascript
// Your app code accesses configuration via the Benchling API
window.benchling.getAppConfig().then(async (appConfig) => {
  const token = appConfig.seqeraToken;           // Securely retrieved from Benchling
  const orgName = appConfig.organizationName;    // From admin configuration
  const workspaceName = appConfig.workspaceName; // From admin configuration
  
  // App automatically resolves workspace ID from org and workspace names
  const workspaceId = await resolveWorkspaceId(token, orgName, workspaceName);
  
  // workDir is not needed - it's already configured in the Compute Environment
});
```

### Benefits of This Approach
- ✅ No credentials in source code or environment files
- ✅ Secure, encrypted storage by Benchling
- ✅ Easy to update configuration without redeploying
- ✅ Different configs per Benchling tenant/environment
- ✅ Access control managed by Benchling permissions
- ✅ Use human-readable org and workspace names instead of IDs
- ✅ Workspace ID automatically resolved at runtime

## Manifest Configuration Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `seqeraToken` | secret | Yes | Your Seqera Platform API token (encrypted) |
| `organizationName` | string | Yes | Your Seqera organization name |
| `workspaceName` | string | Yes | Your Seqera workspace name |
| `seqeraApi` | string | No | Seqera API endpoint (defaults to cloud) |

**Note**: The workDir is not included as it's already configured in your Seqera Compute Environment.

## CORS and Proxy Setup

### Why You Need a Proxy

The Seqera API doesn't allow direct browser requests due to CORS (Cross-Origin Resource Sharing) restrictions. In local development, we use a simple Node.js proxy server to forward requests.

### How It Works

1. **Local Development**: React app → Proxy server (localhost:3001) → Seqera API
2. **Production (Benchling)**: React app → Seqera API (CORS handled by Benchling's backend)

### Running the Proxy

```bash
# Terminal 1: Start the proxy
npm run proxy

# Terminal 2: Start the React app
npm start
```

The proxy server (`proxy-server.js`) forwards all `/api/*` requests to Seqera's API with proper authentication headers.

## Local Development

The project includes `public/index.html` with a pre-configured mock that's commented out by default.

**To enable local development:**

1. **Uncomment the mock in `public/index.html`** (add your credentials)

2. **Run BOTH servers in separate terminals:**
   ```bash
   # Terminal 1
   npm run proxy
   
   # Terminal 2  
   npm start
   ```

3. **Test your changes** at `http://localhost:3000`

4. **Before deploying, comment out the mock again!**

### Troubleshooting Local Development

- **CORS errors**: 
  - Make sure the proxy server is running (`npm run proxy`)
  - Check proxy terminal for error messages
  - Verify proxy is on port 3001: `http://localhost:3001`
- **"Missing required configuration"**: Check that the mock in `index.html` is uncommented
- **API errors**: Verify your Seqera token and credentials are correct in the mock
- **Connection refused**: Ensure proxy server is running on port 3001
- **Port already in use**: Stop other services on ports 3000 or 3001
- **Proxy errors**: Check the proxy terminal for detailed error logs
- Check the browser console and proxy terminal for error messages

## Updating Configuration

To update credentials or settings:

1. Log into Benchling as an admin
2. Navigate to **Settings** → **Feature Settings** → **Apps**
3. Find **Seqera Pipeline Launcher**
4. Click **Configure** or **Edit Settings**
5. Update the values (e.g., new API token)
6. Click **Save**

Changes take effect immediately - users just need to refresh the app.

## Security Best Practices

- ✅ **DO**: Register and configure apps through Benchling Admin UI
- ✅ **DO**: Use Benchling's built-in secret fields for API tokens
- ✅ **DO**: Restrict app configuration access to admins only
- ✅ **DO**: Rotate API tokens periodically via Benchling settings
- ✅ **DO**: Deploy your app to a secure HTTPS endpoint
- ❌ **DON'T**: Hard-code credentials in source code
- ❌ **DON'T**: Store credentials in environment files
- ❌ **DON'T**: Commit the mock Benchling object to version control
- ❌ **DON'T**: Share admin credentials with non-admin users

## Troubleshooting

### "Missing required configuration" error
- Verify app configuration is set in Benchling Admin UI (**Settings** → **Apps**)
- Check that all required fields are populated
- Ensure the app has been properly installed in your Benchling workspace

### "API error: 401" or authentication issues
- Verify your Seqera token is correct in Benchling app settings
- Check that the token hasn't expired
- Update the token in Benchling Admin UI if needed

### "Organization not found" or "Workspace not found"
- Verify the organization name and workspace name are correct (case-sensitive)
- Check for typos in Benchling app configuration
- Ensure your token has access to the specified organization and workspace
- Try accessing Seqera Platform directly to confirm the names

### "window.benchling is undefined"
- This is normal in local development - add the mock object (see below)
- In production, ensure the app is loaded within Benchling's iframe context
- Check that your app URL is correctly configured in Benchling

### Configuration not updating
- Configuration changes may be cached - refresh the Benchling page
- Verify changes were saved in Benchling Admin UI
- Check browser console for any errors
- Try logging out and back into Benchling

## Project Structure

```
benchling-seqera-app/
├── public/
│   └── index.html          # HTML template with commented mock
├── src/
│   ├── index.js            # React entry point
│   ├── index.css           # Base styles
│   └── SeqeraApp.jsx       # Main app component
├── proxy-server.js         # Local development proxy to avoid CORS
├── manifest.yaml           # Reference for Benchling app configuration
├── package.json            # Project dependencies and scripts
├── .env.example            # Deprecated - kept for reference only
├── .gitignore             # Git ignore file
└── README.md              # This file
```

**Note**: `.env` files are no longer used. All configuration is managed through Benchling's Admin UI.

## Benchling Resources

- [Benchling Apps Overview](https://docs.benchling.com/docs/apps-overview)
- [Building Apps for Benchling](https://docs.benchling.com/docs/building-apps)
- [App Configuration Guide](https://docs.benchling.com/docs/app-configuration)
- [Benchling JavaScript SDK](https://docs.benchling.com/docs/benchling-sdk)
- [App Canvas Documentation](https://docs.benchling.com/docs/app-canvas)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with mock Benchling object
5. Remove mock before committing
6. Submit a pull request

## License

MIT License - feel free to use and modify as needed.

## Support

For issues related to:
- **Seqera Platform**: Contact Seqera support or check their documentation
- **Benchling Connect**: Refer to Benchling's developer documentation
- **This app**: Open an issue in the GitHub repository