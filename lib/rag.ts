import { YoutubeTranscript } from 'youtube-transcript'
import { decode, encode } from 'gpt-3-encoder'
import axios, { AxiosError } from 'axios'
import { z } from 'zod' // For input validation

// Define schemas for input validation
const videoIdSchema = z.string().min(1).max(20)
const imageUrlSchema = z.string().url()

export async function extractAndProcessTranscript(videoId: string): Promise<string> {
  try {
    // Validate input
    videoIdSchema.parse(videoId)

    // Fetch the transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)

    // Combine all text parts
    const fullText = transcript.map(part => part.text).join(' ')

    // Process the text (simple cleaning for now)
    const processedText = cleanText(fullText)

    // Truncate if necessary
    const truncatedText = truncateText(processedText, 4000)

    return truncatedText
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error('Invalid video ID format')
    }
    console.error('Error extracting transcript:', error)
    throw new Error('Failed to extract and process transcript')
  }
}

function cleanText(text: string): string {
  // Remove extra whitespace, newlines, and potential XSS vectors
  return text.replace(/\s+/g, ' ')
             .replace(/[<>&'"]/g, '') // Basic XSS protection
             .trim()
}

function truncateText(text: string, maxTokens: number): string {
  const encoded = encode(text)
  if (encoded.length <= maxTokens) {
    return text
  }
  
  const truncated = encoded.slice(0, maxTokens)
  return decode(truncated)
}

interface FluxApiResponse {
  generatedContent: string
  // Add other fields returned by Flux API
}

export async function fluxGeneration(transcript: string, imageUrl: string): Promise<string> {
  try {
    imageUrlSchema.parse(imageUrl)
    await rateLimiter('fluxGeneration', 10, 60000)

    const response = await retryAxiosRequest(() => 
      axios.post<FluxApiResponse>('https://api.flux.ai/generate', {
        transcript,
        imageUrl
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.FLUX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      })
    )

    return response.data.generatedContent
  } catch (error) {
    handleFluxError(error)
  }
}

function handleFluxError(error: unknown): never {
  if (error instanceof z.ZodError) {
    throw new Error('Invalid image URL format')
  }
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string }>
    if (axiosError.response) {
      const statusCode = axiosError.response.status
      const errorMessage = axiosError.response.data?.error || 'Unknown error'
      throw new Error(`Flux API error: ${statusCode} - ${errorMessage}`)
    } else if (axiosError.request) {
      throw new Error('No response received from Flux API')
    } else {
      throw new Error(`Error setting up request: ${axiosError.message}`)
    }
  }
  console.error('Unexpected error in Flux generation:', error)
  throw new Error('Failed to generate content with Flux')
}

async function retryAxiosRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      if (axios.isAxiosError(error) && error.response && error.response.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries reached')
}

export async function ragProcess(videoId: string, query: string, imageUrl: string): Promise<string> {
  try {
    // Validate inputs
    videoIdSchema.parse(videoId)
    imageUrlSchema.parse(imageUrl)

    const transcript = await extractAndProcessTranscript(videoId)
    const generatedContent = await fluxGeneration(transcript, imageUrl)
    
    // Here you can add additional processing if needed
    // For example, you might want to combine the generated content with the original query

    return generatedContent
  } catch (error) {
    console.error('Error in RAG process:', error)
    if (error instanceof Error) {
      throw error // Re-throw specific errors
    }
    throw new Error('Failed to complete RAG process')
  }
}

// Simple in-memory rate limiter (consider using a distributed solution for production)
const rateLimits = new Map<string, { count: number; resetTime: number }>()

async function rateLimiter(key: string, limit: number, windowMs: number): Promise<void> {
  const now = Date.now()
  const rateLimit = rateLimits.get(key) || { count: 0, resetTime: now + windowMs }

  if (now > rateLimit.resetTime) {
    rateLimit.count = 1
    rateLimit.resetTime = now + windowMs
  } else if (rateLimit.count >= limit) {
    throw new Error('Rate limit exceeded')
  } else {
    rateLimit.count++
  }

  rateLimits.set(key, rateLimit)
}

// Ensure environment variables are set
if (!process.env.FLUX_API_KEY) {
  throw new Error('FLUX_API_KEY environment variable is not set')
}