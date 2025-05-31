# Bitespeed Identity Reconciliation Service

A backend service for tracking and reconciling customer identities across multiple purchases by linking contact information (email and phone numbers).

##  Live API end point

The API is live at:
```bash
https://bitespeed-identity-reconciliation-megha.onrender.com/
```

## 🚀 Features

- **Identity Reconciliation**: Links customer contacts when same email/phone appears
- **Contact Consolidation**: Maintains primary-secondary relationship structure
- **PostgreSQL Database**: Robust data storage with Prisma ORM
- **TypeScript**: Type-safe development
- **REST API**: Simple `/identify` endpoint
- **Validation**: Input validation for email and phone formats
- **Error Handling**: Comprehensive error handling and logging

## 📋 Requirements

- Node.js 18+
- PostgreSQL database
- npm or yarn

## 🛠️ Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/beriamegha8/bitespeed-identity-reconciliation
cd bitespeed-identity-reconciliation
npm install
```

### 2. Database Setup

#### Option A: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a database:
```sql
CREATE DATABASE bitespeed_identity;
CREATE USER bitespeed_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE bitespeed_identity TO bitespeed_user;
```

#### Option B: Cloud PostgreSQL (Recommended)
- Use services like:
  - **Supabase** (Free tier available)
  - **Railway** (Free tier available) 
  - **Neon** (Free tier available)
  - **Render PostgreSQL** (Free tier available)

### 3. Environment Variables

Create `.env` file:
```bash
cp .env.example .env
```

Update `.env` with your database URL:
```bash
DATABASE_URL="postgresql://username:password@hostname:port/database_name"
PORT=3000
NODE_ENV=development
```

### 4. Database Migration

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate
```

### 5. Run Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

## 🔧 API Usage

### POST `/identify` 

Identifies and reconciles customer contact information.

**Request Body:**
```json
{
  "email": "customer@example.com",
  "phoneNumber": "1234567890"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["customer@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": []
  }
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "Bitespeed Identity Reconciliation"
}
```

## 🧪 Testing the API

### Using curl:
```bash
# Test the identify endpoint
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "phoneNumber": "1234567890"}'

# Test health endpoint
curl http://localhost:3000/health
```

### Using Postman or Thunder Client:
1. **POST** `http://localhost:3000/identify`
2. **Headers**: `Content-Type: application/json`
3. **Body**:
```json
{
  "email": "test@example.com",
  "phoneNumber": "1234567890"
}
```

## 🚀 Deployment to Render

### Step 1: Create Render Account
1. Go to [render.com](https://render.com) and create account
2. Connect your GitHub repository

### Step 2: Create PostgreSQL Database
1. In Render dashboard, click "New +"
2. Select "PostgreSQL"
3. Choose a name: `bitespeed-db`
4. Select "Free" plan
5. Click "Create Database"
6. **Save the connection string** - you'll need it

### Step 3: Deploy Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `bitespeed-identity-reconciliation`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build && npm run db:generate`
   - **Start Command**: `npm run db:migrate && npm start`
4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: `[your-postgres-connection-string]`
5. Click "Create Web Service"

### Step 4: Verify Deployment
- Your API will be available at: `https://your-app-name.onrender.com`
- Test: `https://your-app-name.onrender.com/health`

## 📦 Database Schema

The `Contact` table structure:
```sql
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR,
  email VARCHAR,
  linked_id INTEGER REFERENCES contacts(id),
  link_precedence VARCHAR NOT NULL CHECK (link_precedence IN ('primary', 'secondary')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

## 🧠 Identity Reconciliation Logic

### Scenarios:

1. **New Contact**: Creates primary contact
2. **Existing Contact**: Returns existing contact data
3. **New Information**: Creates secondary contact linked to primary
4. **Multiple Primaries**: Consolidates into single primary-secondary structure

### Example Flow:
```
1. POST {"email": "a@example.com"} 
   → Creates primary contact (ID: 1)

2. POST {"phoneNumber": "123456"} 
   → Creates primary contact (ID: 2)

3. POST {"email": "a@example.com", "phoneNumber": "123456"}
   → Links contacts: ID 1 remains primary, ID 2 becomes secondary
```

## 🛠️ Development Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Run tests
npm test
```

## 📁 Project Structure

```
src/
├── controllers/       # HTTP request handlers
├── services/         # Business logic
├── types/           # TypeScript definitions
├── utils/           # Database utilities
└── app.ts           # Express app setup

prisma/
├── schema.prisma    # Database schema
└── migrations/      # Database migrations
```

## 🔍 Troubleshooting

### Common Issues:

1. **Database Connection Error**
   - Verify DATABASE_URL is correct
   - Check database is running and accessible
   - Ensure user has proper permissions

2. **Migration Fails**
   ```bash
   # Reset database (careful - deletes data!)
   npx prisma migrate reset
   
   # Generate fresh migration
   npx prisma migrate dev --name init
   ```

3. **Port Already in Use**
   - Change PORT in .env file
   - Or kill process: `lsof -ti:3000 | xargs kill -9`

4. **TypeScript Errors**
   ```bash
   # Regenerate types
   npm run db:generate
   
   # Check types
   npx tsc --noEmit
   ```

## 🔐 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` or `production` |

## 📚 Technologies Used

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Render
- **Validation**: Custom validators
- **Security**: Helmet, CORS

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit Pull Request

## 📄 License

This project is licensed under the MIT License.

---

## 🚀 Quick Start Summary

```bash
# 1. Clone and install
git clone <repo-url> && cd bitespeed-identity-reconciliation && npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# 3. Setup database
npm run db:generate && npm run db:migrate

# 4. Start development
npm run dev

# 5. Test
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "phoneNumber": "123456"}'
```

🎉 **You're ready to go!**
