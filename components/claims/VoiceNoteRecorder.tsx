"use client";

import { useState, useRef } from "react";
import { Mic, Square, Play, Pause, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceNoteRecorderProps {
  onTranscript: (transcript: string) => void;
  onStorageId?: (storageId: string) => void;
}

export function VoiceNoteRecorder({ onTranscript, onStorageId }: VoiceNoteRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "recorded" | "transcribing">("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("recorded");
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      alert("Microphone access denied. Please allow microphone access to record a voice note.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const discard = () => {
    setState("idle");
    setAudioUrl(null);
    setTranscript(null);
    setSeconds(0);
  };

  const transcribe = async () => {
    setState("transcribing");
    // Stub: simulate transcription
    await new Promise((r) => setTimeout(r, 1500));
    const stubTranscript =
      "I was involved in a collision on the 14th of February 2025 at around 3PM near the Westlands roundabout. The other vehicle ran a red light and hit my front-left door. I have photos of the damage and a copy of the police abstract. The estimated damage to my vehicle is approximately KES 280,000.";
    setTranscript(stubTranscript);
    onTranscript(stubTranscript);
    setState("recorded");
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
      <div className="flex items-center gap-2">
        <Mic size={16} className="text-blue-600" />
        <span className="text-sm font-medium text-gray-700">Voice Note</span>
        <span className="text-xs text-gray-400">(optional — AI will transcribe)</span>
      </div>

      {state === "idle" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startRecording}
          className="flex items-center gap-2"
        >
          <Mic size={14} className="text-red-500" />
          Start Recording
        </Button>
      )}

      {state === "recording" && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-mono text-red-600">{formatTime(seconds)}</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={stopRecording}
            className="flex items-center gap-2"
          >
            <Square size={14} className="text-red-500" />
            Stop
          </Button>
        </div>
      )}

      {(state === "recorded" || state === "transcribing") && audioUrl && (
        <div className="space-y-3">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </Button>
            <span className="text-xs text-gray-500">{formatTime(seconds)} recorded</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={discard}
              className="text-red-500 hover:text-red-600 ml-auto"
            >
              <Trash2 size={14} />
            </Button>
          </div>

          {!transcript && state !== "transcribing" && (
            <Button
              type="button"
              size="sm"
              onClick={transcribe}
              className="w-full text-xs"
            >
              Transcribe with AI
            </Button>
          )}

          {state === "transcribing" && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 size={12} className="animate-spin" />
              Transcribing voice note...
            </div>
          )}

          {transcript && (
            <div className="bg-white rounded-lg p-3 border text-xs text-gray-700 leading-relaxed">
              <p className="text-gray-400 text-[11px] mb-1 font-medium">TRANSCRIPT</p>
              {transcript}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
