# Project Task Tracker API Documentation

This application uses a full-stack architecture with an Express backend and a React frontend powered by Firebase.

## Authentication
The application uses Firebase Authentication (Google Login). For REST API access, you would typically pass the Firebase ID Token in the `Authorization` header.

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

## Endpoints

### 1. Health Check
`GET /api/health`
- **Response:**
  ```json
  {
    "status": "ok",
    "message": "Project Task Tracker API is running"
  }
  ```

### 2. Create Project
`POST /api/projects`
- **Request Body:**
  ```json
  {
    "title": "New Website",
    "description": "Redesigning the corporate website"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "Project created (mock response)",
    "project": {
      "title": "New Website",
      "description": "Redesigning the corporate website"
    }
  }
  ```

### 3. Real-time Data
For real-time updates and secure data access, the frontend interacts directly with Firestore using the following collections:
- `/users/{uid}`: User profiles
- `/projects/{projectId}`: Projects owned by the user
- `/tasks/{taskId}`: Tasks associated with projects

## Database Schema (Firestore)

### Project Document
```json
{
  "title": "string",
  "description": "string",
  "ownerId": "string (uid)",
  "createdAt": "timestamp"
}
```

### Task Document
```json
{
  "projectId": "string (docId)",
  "title": "string",
  "description": "string",
  "deadline": "timestamp",
  "priority": "low | medium | high",
  "status": "To Do | In Progress | Done",
  "ownerId": "string (uid)",
  "createdAt": "timestamp"
}
```
