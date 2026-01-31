# Environment Variables for WORKTRACK Backend

Below are all required environment variables for local development and production. Copy this template to your `.env` file and fill in the values as needed.

```
# Admin registration token for privileged user creation
ADMIN_INVITE_TOKEN=

# Allowed CORS origins (comma-separated)
ALLOWED_ORIGINS=

# Cloudinary configuration for file uploads
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_CLOUD_NAME=

# Email service configuration
EMAIL_FROM_NAME=
EMAIL_HOST=
EMAIL_PASSWORD=
EMAIL_PORT=
EMAIL_SECURE=
EMAIL_USER=

# JWT secret for authentication
JWT_SECRET=

# MongoDB connection string
MONGO_URI=

# Node environment (development/production)
NODE_ENV=

# Server port
PORT=
```

**Instructions:**
- Never commit your actual `.env` file with secrets to version control.
- Share this template with new team members for onboarding.
- Document any new environment variables here as your project grows.
