'use client'

import { useState } from 'react'
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Loader2, Upload } from "lucide-react"

// Mock function to simulate RAG process
const mockRAGProcess = async (youtubeUrl: string) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000))
  return "This is a mock transcript generated from the YouTube video."
}

// Mock function to simulate Flux AI clip generation
const mockFluxGeneration = async (transcript: string, imageFile: File) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 3000))
  return "https://example.com/generated-ai-clip.mp4"
}

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [generatedClipUrl, setGeneratedClipUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setGeneratedClipUrl('')

    try {
      if (!youtubeUrl || !imageFile) {
        throw new Error("Please provide both a YouTube URL and an image.")
      }

      // Step 1: RAG Process
      const transcript = await mockRAGProcess(youtubeUrl)

      // Step 2: Flux AI Clip Generation
      const clipUrl = await mockFluxGeneration(transcript, imageFile)

      setGeneratedClipUrl(clipUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Flux AI Clip Generator</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="youtube-url">YouTube Video URL</Label>
          <Input
            id="youtube-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="image-upload">Upload Your Face</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              required
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              <Upload className="mr-2 h-4 w-4" /> Choose Image
            </Button>
            <span className="text-sm text-gray-500">
              {imageFile ? imageFile.name : 'No file chosen'}
            </span>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate AI Clip'
          )}
        </Button>
      </form>
      {error && (
        <div className="mt-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {generatedClipUrl && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Generated AI Clip:</h2>
          <video src={generatedClipUrl} controls className="w-full rounded" />
        </div>
      )}
    </div>
  )
}