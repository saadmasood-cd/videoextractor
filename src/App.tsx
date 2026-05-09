/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  Video, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Trash2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from "motion/react";

// Types
interface TranscriptionResult {
  text: string;
  timestamp: string;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('video/')) {
        setError('Please upload a valid video file.');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const transcribeVideo = async () => {
    if (!file) return;

    setIsTranscribing(true);
    setError(null);
    setProgress('Preparing video data...');

    try {
      const const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;;
      if (!apiKey || apiKey === "AQ.Ab8RN6ILIhgSn_LCDV3cRocDLRAT4-WFGZpNpkOtjGAWvY6t3A") {
        throw new Error("Gemini API key is not configured. Please ensure you have set the GEMINI_API_KEY in the Secrets panel of AI Studio.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const base64Data = await readFileAsBase64(file);

      setProgress('Analyzing video content with AI...');
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: file.type,
                data: base64Data
              }
            },
            {
              text: "Please perform the following tasks for this video:\n1. Transcribe the audio into clear, formatted text. Distinguish between multiple speakers if possible.\n2. Identify and extract any text visible within the video frames (OCR).\n\nPlease provide the output in two clearly labeled sections: 'AUDIO TRANSCRIPTION' and 'EXTRACTED VIDEO TEXT'."
            }
          ]
        }
      });

      const transcriptionText = response.text;
      
      if (!transcriptionText) {
        throw new Error("Could not extract transcription from the AI response.");
      }

      setResult({
        text: transcriptionText,
        timestamp: new Date().toLocaleString()
      });
      setProgress('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred during transcription.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const downloadTxt = () => {
    if (!result) return;
    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcription-${file?.name || 'video'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!result) return;
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(result.text, 180);
    doc.text(`Transcription for: ${file?.name || 'Video'}`, 10, 10);
    doc.text(`Date: ${result.timestamp}`, 10, 20);
    doc.line(10, 25, 200, 25);
    doc.text(splitText, 10, 35);
    doc.save(`transcription-${file?.name || 'video'}.pdf`);
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-[#1A1A1A] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm mb-4"
          >
            <Video className="w-8 h-8 text-blue-600" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-light tracking-tight mb-2"
          >
            Video Transcriber AI
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 font-normal"
          >
            Professional-grade video audio-to-text powered by Gemini
          </motion.p>
        </header>

        <main className="space-y-6">
          {/* Upload Section */}
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-12 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                  <Upload className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-medium mb-2">Drop your video here</h2>
                <p className="text-gray-400 mb-6 max-w-sm">
                  Support for MP4, MOV, AVI, and other standard formats. (Max size recommended: 20MB)
                </p>
                <button className="bg-[#1A1A1A] text-white px-8 py-3 rounded-full hover:bg-black transition-all shadow-md font-medium">
                  Browse Files
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="video/*" 
                  className="hidden" 
                />
              </motion.div>
            ) : (
              <motion.div
                key="file-ready"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg leading-tight truncate max-w-[250px]">
                        {file.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type.split('/')[1].toUpperCase()}
                      </p>
                    </div>
                  </div>
                  {!isTranscribing && !result && (
                    <button 
                      onClick={reset}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {!result && (
                  <button
                    onClick={transcribeVideo}
                    disabled={isTranscribing}
                    className="w-full bg-blue-600 text-white flex items-center justify-center gap-2 py-4 rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-blue-200"
                  >
                    {isTranscribing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {progress || 'Transcribing...'}
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
                        Start Transcription
                      </>
                    )}
                  </button>
                )}

                {error && (
                  <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3 border border-red-100">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result Section */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#151619] rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
              >
                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-emerald-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono text-xs tracking-widest uppercase">Process Complete</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={downloadTxt}
                      className="flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white transition-all hover:border-emerald-500/50"
                    >
                      <Download className="w-3 h-3" />
                      .TXT
                    </button>
                    <button 
                      onClick={downloadPdf}
                      className="flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white transition-all hover:border-emerald-500/50"
                    >
                      <Download className="w-3 h-3" />
                      .PDF
                    </button>
                  </div>
                </div>
                <div className="p-8 relative">
                  {/* Decorative hardware elements */}
                  <div className="absolute top-4 right-4 font-mono text-[8px] text-white/20 select-none">
                    ENGINE_V3 // TRNS_MODULE_B
                  </div>
                  
                  <div className="prose max-w-none">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="h-[1px] flex-1 bg-white/10" />
                      <h4 className="font-mono text-[10px] uppercase tracking-widest text-white/40 font-bold">Transcription Output</h4>
                      <div className="h-[1px] flex-1 bg-white/10" />
                    </div>
                    
                    <div className="whitespace-pre-wrap text-gray-300 leading-relaxed font-mono text-sm bg-black/30 p-6 rounded-2xl border border-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
                      {result.text}
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-white/5 border-t border-white/5 text-center">
                  <button 
                    onClick={reset}
                    className="text-white/40 hover:text-white transition-colors font-mono text-xs tracking-widest uppercase"
                  >
                    Load New Sequence
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="mt-16 text-center text-gray-400 text-sm">
          <p>© 2026 Video Transcriber AI • Powered by Carpediem Automation Dept</p>
        </footer>
      </div>
    </div>
  );
}
