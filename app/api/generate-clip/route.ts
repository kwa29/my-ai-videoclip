import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import OpenAI from 'openai';

const execAsync = promisify(exec);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl } = await req.json();

    // Step 1: Extract audio from YouTube video
    const audioPath = await downloadAudio(youtubeUrl);

    // Step 2: Transcribe the audio
    const transcription = await transcribeAudio(audioPath);

    // Step 3: Generate clip using RAG
    const generatedClip = await generateClip(transcription);

    // Clean up: Remove the temporary audio file
    fs.unlinkSync(audioPath);

    return NextResponse.json({ generatedClip });
  } catch (error) {
    console.error('Error generating clip:', error);
    return NextResponse.json({ error: 'Failed to generate clip' }, { status: 500 });
  }
}

async function downloadAudio(url: string): Promise<string> {
  const videoInfo = await ytdl.getInfo(url);
  const audioFormat = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio' });
  const outputPath = `/tmp/${videoInfo.videoDetails.videoId}.mp3`;

  return new Promise((resolve, reject) => {
    ytdl(url, { format: audioFormat })
      .pipe(fs.createWriteStream(outputPath))
      .on('finish', () => resolve(outputPath))
      .on('error', reject);
  });
}

async function transcribeAudio(audioPath: string): Promise<string> {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: "whisper-1",
  });

  return transcription.text;
}

async function generateClip(transcription: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant that generates concise video clips based on transcriptions." },
      { role: "user", content: `Generate a short, engaging clip based on this transcription: ${transcription}` }
    ],
    max_tokens: 150,
  });

  return response.choices[0].message.content || "Failed to generate clip.";
}