# Backend Interview Challenge - Task Sync API

🚀 **Live Demo**: [https://backend-interview-challenge-gnk1.onrender.com](https://backend-interview-challenge-gnk1.onrender.com)

This is a backend developer interview challenge focused on building a sync-enabled task management API. The challenge evaluates understanding of REST APIs, data synchronization, offline-first architecture, and conflict resolution.

## 📚 Documentation

Please read these documents in order:

1. **[📋 Submission Instructions](./docs/SUBMISSION_INSTRUCTIONS.md)** - How to submit your solution (MUST READ)
2. **[📝 Requirements](./docs/REQUIREMENTS.md)** - Detailed challenge requirements and implementation tasks
3. **[🔌 API Specification](./docs/API_SPEC.md)** - Complete API documentation with examples
4. **[🤖 AI Usage Guidelines](./docs/AI_GUIDELINES.md)** - Guidelines for using AI tools during the challenge


**⚠️ Important**: DO NOT create pull requests against this repository. All submissions must be through private forks.

## Challenge Overview

The API is fully implemented and deployed! You can:
- 🌐 **Test it live**: Visit the [interactive web interface](https://backend-interview-challenge-gnk1.onrender.com)
- 📮 **Use Postman**: Import `Task-Sync-API.postman_collection.json` for API testing
- 🔗 **API Base URL**: `https://backend-interview-challenge-gnk1.onrender.com/api`



## Project Structure

```
backend-interview-challenge/
├── src/
│   ├── db/             # Database setup and configuration
│   ├── models/         # Data models (if needed)
│   ├── services/       # Business logic (TO BE IMPLEMENTED)
│   ├── routes/         # API endpoints (TO BE IMPLEMENTED)
│   ├── middleware/     # Express middleware
│   ├── types/          # TypeScript interfaces
│   └── server.ts       # Express server setup
├── tests/              # Test files
├── docs/               # Documentation
└── package.json        # Dependencies and scripts
```

## Getting Started

### Quick Test (No Setup Required!)

Visit the **live deployment** to test all endpoints instantly:
👉 [https://backend-interview-challenge-gnk1.onrender.com](https://backend-interview-challenge-gnk1.onrender.com)

**Note**: The free instance may take ~50 seconds to wake up on first request.

### Local Development

##### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

#### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types

## Testing the API

### Option 1: Interactive Web Interface (Recommended)
Visit [https://backend-interview-challenge-gnk1.onrender.com](https://backend-interview-challenge-gnk1.onrender.com) for a user-friendly interface to test all endpoints.

### Option 2: Postman Collection
Import `Task-Sync-API.postman_collection.json` into Postman to test all API endpoints with pre-configured requests.

### Option 3: cURL Examples
```bash
# Create a task
curl -X POST https://backend-interview-challenge-gnk1.onrender.com/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Task","description":"Testing the API"}'

# Get all tasks
curl https://backend-interview-challenge-gnk1.onrender.com/api/tasks

# Trigger sync
curl -X POST https://backend-interview-challenge-gnk1.onrender.com/api/sync/sync
```

## Implementation Details

### Key Implementation Files

You'll need to implement the following services and routes:

- `src/services/taskService.ts` - Task CRUD operations
- `src/services/syncService.ts` - Sync logic and conflict resolution  
- `src/routes/tasks.ts` - REST API endpoints
- `src/routes/sync.ts` - Sync-related endpoints

### Before Submission

Ensure all of these pass:
```bash
npm test          # All tests must pass
npm run lint      # No linting errors
npm run typecheck # No TypeScript errors
```

### Time Expectation

This challenge is designed to take 2-3 hours to complete.

## License

This project is for interview purposes only.