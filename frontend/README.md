# ForeverData Frontend

Next.js frontend for ForeverData - a permanent file storage service using EigenDA.

## Overview

A modern web interface for uploading and retrieving permanently stored files. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 📤 File Upload
  - Drag-and-drop interface
  - Upload progress tracking
  - Automatic file hash generation
  - Permanent link generation

- 📥 File Retrieval
  - Permanent file links
  - File status monitoring
  - Download progress tracking
  - Expiry information display

- 💫 UI Components
  - StatusCard: Display file and system status
  - UploadForm: Handle file uploads
  - FileInfo: Show detailed file information

## Tech Stack

- **Framework:** Next.js
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React hooks
- **API Integration:** Built-in Next.js API routes

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

3. Run development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the app.

## Project Structure

```
frontend/
├── components/         # React components
│   ├── FileInfo.tsx
│   ├── StatusCard.tsx
│   └── UploadForm.tsx
├── lib/               # Utility functions
│   ├── api.ts        # API client
│   ├── types.ts      # TypeScript types
│   └── utils.ts      # Helper functions
├── pages/            # Next.js pages
│   ├── index.tsx     # Home page
│   └── file/[fileId].tsx  # File view page
└── styles/           # CSS styles
    └── globals.css
```

## API Integration

The frontend communicates with the backend through:
- File upload endpoint
- File retrieval endpoint
- Status checking endpoint

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run type checking
npm run type-check
```

## Styling

- Tailwind CSS for utility-first styling
- Custom components follow consistent design system
- Responsive design for all screen sizes

## Performance

- Optimized image loading
- Dynamic imports for code splitting
- Client-side caching
- Progressive loading states

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Progressive enhancement for older browsers
- Responsive design for mobile devices
