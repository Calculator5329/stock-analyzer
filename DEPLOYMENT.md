# Deployment Guide for Financial Suite

## GitHub Pages Deployment

This application is configured for deployment to GitHub Pages.

### Prerequisites

1. Node.js and npm installed
2. GitHub repository set up
3. gh-pages package installed (included in devDependencies)

### Deployment Steps

1. **Update package.json homepage**
   ```json
   "homepage": "https://yourusername.github.io/your-repo-name"
   ```
   Replace `yourusername` and `your-repo-name` with your actual GitHub username and repository name.

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build and deploy**
   ```bash
   npm run deploy
   ```

   This command will:
   - Build the production version of your app
   - Deploy it to the `gh-pages` branch
   - Make it available at your GitHub Pages URL

### Configuration Changes Made for GitHub Pages

1. **Router**: Changed from `BrowserRouter` to `HashRouter` for better GitHub Pages compatibility
2. **Public URL**: All asset references use `process.env.PUBLIC_URL` for proper path resolution
3. **Manifest**: Updated with correct app information and theme colors
4. **Jekyll**: Added `.nojekyll` file to prevent Jekyll processing

### File Structure for GitHub Pages

- All images and assets should be in the `public/` folder
- Stock data files should be in `public/stock-data/`
- The build process will automatically handle asset paths

### Important Notes

- The app uses HashRouter (`#` in URLs) for GitHub Pages compatibility
- All API calls and file fetches use `process.env.PUBLIC_URL` for proper base path handling
- The deployment creates a separate `gh-pages` branch - don't modify this branch manually

### Troubleshooting

If deployment fails:
1. Check that your repository has GitHub Pages enabled
2. Verify the homepage URL in package.json matches your repository
3. Ensure all assets are in the public folder
4. Check that the gh-pages branch was created successfully

### Local Development

For local development, continue using:
```bash
npm start
```

The HashRouter will work in both development and production environments. 