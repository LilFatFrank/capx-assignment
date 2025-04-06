# CapX Assignment - Admin Portal

## Project Overview

This project is a Next.js application that provides an Admin Portal for managing topics and entries. The application allows users to submit entries for specific topics, and administrators to manage these topics and view submitted entries.

### Technical Choices

- **Next.js**: Used for both frontend and API routes, providing a unified development experience
- **TypeScript**: For type safety and better developer experience
- **Firebase Firestore**: As the database for storing topics and entries
- **Tailwind CSS**: For styling the UI components
- **Zod**: For schema validation on both client and server
- **Viem**: For Ethereum wallet address validation
- **JWT**: For authentication

## Development Environment Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account (for Firestore database)

### Cloning the Repository

```bash
git clone git@github.com:LilFatFrank/capx-assignment.git
cd capx-assignment
```

### Installing Dependencies

```bash
npm install
# or
yarn add
```

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY=your-firebase-private-key

# Admin Credentials
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-admin-password

# JWT Secret
JWT_SECRET=your-jwt-secret-key
```

**Note**: The Firebase private key should be the entire key including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` parts. If you're having issues with the private key, you may need to replace newlines with `\n` characters.

## Running the Application

### Development Mode

```bash
npm run dev
# or
yarn dev
```

This will start the development server at [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
# or
yarn build
yarn start
```

## Admin Portal Access

The Admin Portal is accessible at `/admin` after logging in.

## Features

- **Topic Management**: Create, update, and delete topics
- **Entry Management**: View and delete entries submitted by users
- **Authentication**: Secure admin access with JWT-based authentication
- **Form Validation**: Comprehensive validation for all form inputs
- **Error Handling**: Graceful error handling with user-friendly messages

## Assumptions and Simplifications

- **Authentication**: Using a simple username/password authentication system for the admin portal
- **Database**: Using Firebase Firestore for data storage
- **Indexing**: We've created indexes on `topicId` and `topicName` fields in the entries collection in firebase console for better query performance
- **Validation**: Using Zod for schema validation on both client and server
- **UI**: Using Tailwind CSS for styling without additional UI libraries
- **Platform Username Validation**: Simulated external API validation for platform usernames
- **Session Management**: Using JWT tokens stored in cookies for session management

## API Endpoints

- `/api/login`: Authenticate admin users
- `/api/logout`: Logout admin users
- `/api/auth-status`: Check authentication status
- `/api/topics`: Manage topics (GET, POST, PATCH, DELETE)
- `/api/entries`: Manage entries (GET, POST, DELETE)
- `/api/validate-platform-username`: Validate platform usernames

## Project Structure

- `/src/app`: Next.js app router pages
- `/src/components`: React components
- `/src/contexts`: React contexts (e.g., AuthContext)
- `/src/pages/api`: API routes
- `/src/utils`: Utility functions
- `/public`: Static assets
