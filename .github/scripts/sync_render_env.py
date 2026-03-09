import json
import os

keys = [
    # ── Required ──────────────────────────────────────────────────────────────
    'MONGODB_URI', 'JWT_KEY', 'BACKEND_API_URL',
    'ALLOWED_ORIGINS', 'FRONTEND_URL',
    # ── Admin account (used by scripts/create-admin.js on first deploy) ───────
    'ADMIN_EMAIL', 'ADMIN_PASSWORD',
    # ── Email / SMTP ──────────────────────────────────────────────────────────
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS',
    'EMAIL_FROM',
    # ── Redis caching (app works without it) ─────────────────────────────────
    'REDIS_URL', 'REDIS_HOST',
    # ── Google OAuth ─────────────────────────────────────────────────────────
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL',
    # ── Microsoft OAuth ──────────────────────────────────────────────────────
    'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'MICROSOFT_CALLBACK_URL',
    # ── Stripe payments ───────────────────────────────────────────────────────
    'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET',
    # ── PayPal payments ───────────────────────────────────────────────────────
    'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_ENVIRONMENT',
    # ── M-Pesa payments ───────────────────────────────────────────────────────
    'MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_CALLBACK_URL',
    'MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_ENVIRONMENT', 'MPESA_ALLOWED_IPS',
    # ── Cloudinary file storage ───────────────────────────────────────────────
    'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
    # ── SRE Monitoring ────────────────────────────────────────────────────────
    'METRICS_TOKEN',
]
env_vars = [{'key': k, 'value': os.environ[k]} for k in keys if k in os.environ and os.environ[k]]
env_vars += [{'key': 'NODE_ENV', 'value': 'production'}, {'key': 'PORT', 'value': '3001'}]
print(json.dumps(env_vars))
