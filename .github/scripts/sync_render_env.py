import json
import os

keys = [
    # ── Required ──────────────────────────────────────────────────────────────
    'MONGODB_URI', 'JWT_KEY', 'BACKEND_API_URL',
    'ALLOWED_ORIGINS', 'FRONTEND_URL',
    # ── Admin account (used by scripts/create-admin.js on first deploy) ───────
    'ADMIN_EMAIL', 'ADMIN_PASSWORD',
    # ── MongoDB (alternative Atlas connection) ────────────────────────────────
    'MONGO_ATLAS_URI', 'MONGO_ATLAS_PW',
    # ── JWT ───────────────────────────────────────────────────────────────────
    # NOTE: the codebase reads JWT_EXPIRATION in controllers/user.js and JWT_EXPIRY
    # in config/config.js. Both are synced until the source is consolidated.
    'JWT_EXPIRATION', 'JWT_EXPIRY',
    # ── API URLs ──────────────────────────────────────────────────────────────
    'API_BASE_URL',
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
    # ── Server / security configuration ──────────────────────────────────────
    'TRUST_PROXY', 'MAX_FILE_SIZE',
    'LOGIN_WINDOW_MS', 'MAX_LOGIN_ATTEMPTS',
    # ── Logging ───────────────────────────────────────────────────────────────
    'LOG_LEVEL', 'APP_LOG_DIR', 'AUDIT_LOG_DIR',
    # ── SRE Monitoring ────────────────────────────────────────────────────────
    'METRICS_TOKEN',
]
env_vars = [{'key': k, 'value': os.environ[k]} for k in keys if k in os.environ and os.environ[k]]
env_vars += [{'key': 'NODE_ENV', 'value': 'production'}, {'key': 'PORT', 'value': '3001'}]
print(json.dumps(env_vars))
