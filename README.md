# AI Video Clip Generator

This project is an AI-powered video clip generator that uses YouTube transcripts and Flux.1 AI to create engaging video content.

## Features

- Extract and process YouTube video transcripts
- Generate video clips using Flux.1 AI
- Implement RAG (Retrieval-Augmented Generation) process
- Error handling and rate limiting

## Getting Started

### Prerequisites

- Node.js (version 14 or later)
- npm or yarn
- Flux.1 API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-video-clip-generator.git
   cd ai-video-clip-generator
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your Flux.1 API key to the `.env` file:
     ```
     FLUX_API_KEY=your_flux_api_key_here
     ```

### Running the Development Server
