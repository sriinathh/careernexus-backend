# Environment Variables Setup

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=5000
CLIENT_URL=http://localhost:5173

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/learnbridge-plus

# JWT Secret (use a strong random string in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (for OTP sending)
# For development, OTPs will be logged to console if not configured
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# AI/LLM Configuration
LLM_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
MISTRAL_API_KEY=your-mistral-api-key
```

## Quick Start

1. Copy this content to a `.env` file in the backend directory
2. Update `MONGO_URI` with your MongoDB connection string
3. Set `JWT_SECRET` to a random secure string
4. (Optional) Configure email settings for OTP functionality
5. (Optional) Add API keys for AI features

## Notes

- For development, OTPs will be logged to the console if email is not configured
- MongoDB must be running before starting the server
- JWT_SECRET is required for authentication to work

