// src/agent/speak.js
import { exec } from 'child_process';
import { ElevenLabsClient } from "elevenlabs"; // Import ElevenLabsClient
import fs from 'fs'; // Import fs to handle file operations if needed
import player from 'play-sound'



let speakingQueue = [];
let isSpeaking = false;

const client = new ElevenLabsClient({
  apiKey: "", // Replace with your actual API key
});
const audioPlayer = player(); // Create an audio player instance

export function say(textToSpeak) {
  speakingQueue.push(textToSpeak);
  if (!isSpeaking) {
    processQueue();
  }
}

async function processQueue() {
  if (speakingQueue.length === 0) {
    isSpeaking = false;
    return;
  }

  isSpeaking = true;
  const textToSpeak = speakingQueue.shift();
  const isWin = process.platform === "win32";
  const isMac = process.platform === "darwin";
  const useElevenLabs = true; // Set this based on your settings

  if (useElevenLabs) {
    try {
      const wrapper = await client.textToSpeech.convert(
  "TX3LPaxmHKxFdv7VOQHJ",
  {
    output_format: "mp3_44100_128",
    text: textToSpeak,
    model_id: "eleven_multilingual_v2",
  }
  );

        // Use the provided reader instead of getReader()
        const reader = wrapper.reader;
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const audioBuffer = Buffer.concat(chunks);
        fs.writeFileSync("output.mp3", audioBuffer);
        audioPlayer.play("output.mp3", { player: "powershell" }, err => {
          if (err) console.error("play failed:", err);
          processQueue();
        });
    } catch (error) {
      console.error(`Error during ElevenLabs API call: ${error.message}`);
      console.error(error.response ? error.response.data : error);
      processQueue(); // Continue with the next message in the queue

    }
  } else if (isWin) {
    const command = `powershell -Command "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 2; $s.Speak(\\"${textToSpeak}\\"); $s.Dispose()"`;
    exec(command, handleExecCallback);
  } else if (isMac) {
    const command = `say "${textToSpeak}"`;
    exec(command, handleExecCallback);
  } else {
    const command = `espeak "${textToSpeak}"`;
    exec(command, handleExecCallback);
  }
}

function handleExecCallback(error, stdout, stderr) {
  if (error) {
    console.error(`Error: ${error.message}`);
    console.error(`${error.stack}`);
  } else if (stderr) {
    console.error(`Error: ${stderr}`);
  }
  processQueue(); // Continue with the next message in the queue
}