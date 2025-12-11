# Deployment Guide - Vercel

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- Vercel CLI installed (already installed: v42.1.1)
- Git repository initialized

## Environment Variables
Before deploying, you need to set up the following environment variables in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://glbhzojyrahwzumnyoue.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## Deployment Steps

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Login to Vercel**
   ```bash
   vercel login
   ```

2. **Deploy to Production**
   ```bash
   vercel --prod
   ```
   
   The CLI will:
   - Ask you to link to an existing project or create a new one
   - Detect Next.js automatically
   - Build and deploy your application
   - Provide you with a production URL

3. **Set Environment Variables**
   After deployment, add environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   ```
   
   Or set them via the Vercel Dashboard:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add each variable for Production, Preview, and Development

4. **Redeploy with Environment Variables**
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. **Push to Git**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import Project**
   - Go to https://vercel.com/new
   - Import your Git repository
   - Vercel will auto-detect Next.js settings

3. **Configure Environment Variables**
   - Add the environment variables listed above
   - Deploy

## Build Configuration

The project is configured with:
- **Framework**: Next.js 15.3.5
- **Build Command**: `next build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)
- **Node Version**: 20.x (recommended)

## Post-Deployment

1. **Verify Deployment**
   - Check the deployment URL provided by Vercel
   - Test all pages and functionality
   - Verify Supabase connection

2. **Custom Domain (Optional)**
   - Go to Project Settings > Domains
   - Add your custom domain
   - Configure DNS records as instructed

3. **Monitor**
   - Check deployment logs in Vercel Dashboard
   - Monitor analytics and performance

## Troubleshooting

### Build Errors
- Check build logs in Vercel Dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set correctly

### Environment Variables Not Working
- Make sure variables are set for the correct environment (Production/Preview/Development)
- Redeploy after adding new environment variables
- Check variable names match exactly (case-sensitive)

### TypeScript/ESLint Errors
The project is configured to ignore build errors:
```typescript
typescript: {
  ignoreBuildErrors: true,
},
eslint: {
  ignoreDuringBuilds: true,
}
```

## Important Notes

1. **Environment Variables**: Never commit `.env.local` to Git (already in `.gitignore`)
2. **Dependencies**: All required dependencies are in `package.json`, including `magic-string`
3. **Turbopack**: The loader configuration is set up for development with Turbopack
4. **Images**: Remote image patterns are configured to allow all HTTPS/HTTP sources

## Support

- Vercel Documentation: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Vercel Support: https://vercel.com/support
