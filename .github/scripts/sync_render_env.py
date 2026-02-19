import json
import os

keys = [
    'MONGODB_URI', 'JWT_KEY', 'BACKEND_API_URL',
    'ALLOWED_ORIGINS', 'FRONTEND_URL',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
    'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET',
    'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET',
    'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET',
    'MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_CALLBACK_URL',
    'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
]
env_vars = [{'key': k, 'value': os.environ[k]} for k in keys if k in os.environ and os.environ[k]]
env_vars += [{'key': 'NODE_ENV', 'value': 'production'}, {'key': 'PORT', 'value': '3001'}]
print(json.dumps(env_vars))
