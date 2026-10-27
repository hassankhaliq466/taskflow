This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Workspace email invitations

Configure these environment variables in `.env.local` and in your deployment environment:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=taskflow
NEXTAUTH_SECRET=generate_a_long_random_secret
NEXTAUTH_URL=http://localhost:3000
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password
EMAIL_FROM="TaskFlow <invitations@your-domain.com>"
NEXT_APP_URL=http://localhost:3000
```

`MONGODB_URI` and `NEXTAUTH_SECRET` are required. `MONGODB_DB` defaults to `taskflow` if omitted. Set `NEXTAUTH_URL` and `NEXT_APP_URL` to the deployed app's public URL in Vercel; the `localhost` values above are for local development only. SMTP settings are required to send invitations: use port `587` with `SMTP_SECURE=false` for STARTTLS, or port `465` with `SMTP_SECURE=true` for implicit TLS. `SMTP_USER` and `SMTP_PASSWORD` must either both be set or both be omitted for a relay that does not require authentication. Never commit secrets or SMTP credentials. Invited people must sign in or create an account with the email address the invitation was sent to, then accept the invitation from the emailed link.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
