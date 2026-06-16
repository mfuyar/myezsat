# vocab-email

Supabase Edge Function for daily vocabulary emails.

Deploy:

```bash
supabase functions deploy vocab-email --no-verify-jwt
```

Set secrets in Supabase:

```bash
supabase secrets set \
  RESEND_API_KEY=your_resend_api_key \
  VOCAB_EMAIL_FROM="myezsat <vocab@your_verified_domain.com>" \
  CRON_SECRET=random_cron_secret
```

The Next app invokes this function with `SUPABASE_SERVICE_ROLE_KEY`. Direct calls can use
`x-cron-secret` with the Supabase `CRON_SECRET`.
