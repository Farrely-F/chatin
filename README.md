# Chatto

Chatto is a modern chat application built using [Next.js](https://nextjs.org), designed to provide seamless communication with a focus on user experience and performance. It integrates AI capabilities through various LLM providers and offers a developer-friendly API for customization.

![Chatto Logo](public/logo.png)

## Features

- **Responsive Design**: Optimized for both mobile and desktop experiences
- **AI-Powered Chat**: Intelligent conversations powered by multiple LLM providers
- **Multi-Provider Support**: Integration with OpenAI, Anthropic, and Google AI
- **Knowledge Base Management**: Upload and process documents to enhance AI responses
- **Vector Database**: PostgreSQL with pgvector for efficient similarity searches
- **PDF Processing**: Extract and analyze text from PDF documents
- **Embedding Generation**: Create and store vector embeddings for semantic search
- **Customizable Agents**: Configure AI agents with different capabilities and knowledge bases

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **UI Components**: Custom UI components with shadcn/ui
- **Database**: PostgreSQL with Drizzle ORM
- **Vector Storage**: pgvector extension for embedding storage and similarity search
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **AI Integration**: AI SDK for multiple LLM providers
- **PDF Processing**: pdf-parse for text extraction

## Getting Started

### Prerequisites

- Node.js 20+ and npm/yarn/pnpm/bun
- PostgreSQL database with pgvector extension
- Supabase account (for auth and storage)
- API keys for LLM providers (OpenAI, Anthropic, and/or Google)

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in the required environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chatto

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LLM Providers
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_API_KEY=your-google-key
```

To start the development server, use one of the following commands:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

You can begin editing the application by modifying `app/page.tsx`. The page will automatically update as you make changes.

This project utilizes [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to optimize and load the [Geist](https://vercel.com/font) font family, enhancing the visual appeal of the application.

## Features

- Responsive design for mobile and desktop
- AI-powered chat capabilities
- Integration with OpenAI and Google AI SDKs
- Database integration with PostgreSQL
- PDF processing and text analysis capabilities

## Learn More

To learn more about Next.js, explore the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - Comprehensive guide to Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - Interactive tutorial for learning Next.js.

### Installation

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### Database Setup

Run the database migrations:

```bash
npm run db:migrate
# or
```

### Development Server

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser to view the application.

## Project Structure

```plaintext
chatto/
├── drizzle/             # Database migrations and schema snapshots
├── public/              # Static assets
├── src/
│   ├── app/             # Next.js app router pages
│   ├── components/      # Reusable UI components
│   ├── db/              # Database schema and queries
│   │   └── schema/      # Drizzle ORM schema definitions
│   ├── features/        # Feature-specific components
│   │   └── knowledgebases/ # Knowledge base management
│   └── lib/             # Utility functions and services
│       ├── embedding-model.ts  # Vector embedding generation
│       ├── pdf-extractor.ts    # PDF text extraction
│       └── supabase/    # Supabase client configuration
└── ...
```

## Knowledge Base Management

Chatto allows you to upload various document types to create knowledge bases for your AI agents:

- PDF documents
- Text files (coming soon)
- URLs (web scraping) (coming soon)
- Manual text input (coming soon)
  The system processes these documents, extracts text, generates embeddings, and stores them for retrieval during chat sessions.

## Vector Search

The application uses pgvector to store and query embeddings, enabling semantic search capabilities:

1. Documents are chunked into manageable pieces
2. Each chunk is converted to a vector embedding
3. Embeddings are stored in the database with the original text
4. During chat, relevant information is retrieved using vector similarity search

## Deployment

### Deploy on Vercel

The easiest way to deploy Chatto is using the Vercel Platform :

1. Push your code to a Git repository (GitHub, GitLab, BitBucket)
2. Import the project in Vercel
3. Configure the environment variables
4. Deploy
   For detailed deployment instructions, refer to the Next.js deployment documentation .

### Database Requirements

Ensure your production database has the pgvector extension installed and initialized.

## Learn More

To learn more about the technologies used in this project:

- Next.js Documentation - Learn about Next.js features and API
- Drizzle ORM - Database ORM for TypeScript
- pgvector - Vector similarity search for PostgreSQL
- Supabase - Open source Firebase alternative
- AI SDK - AI SDK for working with LLM providers

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
