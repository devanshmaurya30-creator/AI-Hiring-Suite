'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Button from './Button';

interface FileUploadProps {
  onUploadComplete?: (data: any) => void;
  onUploadStart?: () => void;
  className?: string;
}

export default function FileUpload({ onUploadComplete, onUploadStart, className }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus('idle');
      setErrorMsg('');
      setProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    if (onUploadStart) onUploadStart();

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('auth_token');
      
      // We manually simulate progress since simple fetch/axios upload progress
      // is cleaner to simulate rather than configure complex xhr progress,
      // but let's do a realistic interval progress simulation
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 150);

      const res = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/resumes/upload`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  }
);
        
      clearInterval(interval);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to upload file');
      }

      const data = await res.json();
      setProgress(100);
      setStatus('success');
      if (onUploadComplete) onUploadComplete(data);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Upload failed. Please try again.');
    }
  };

  const removeFile = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 backdrop-blur-xl bg-white/[0.02]',
          isDragActive
            ? 'border-indigo-500 bg-indigo-500/[0.04] scale-[0.99] glow-indigo'
            : 'border-white/10 hover:border-white/20'
        )}
      >
        <input {...getInputProps()} />

        <div className="p-4 rounded-full bg-white/[0.04] border border-white/[0.08] mb-4 text-slate-400">
          <UploadCloud className={cn('w-8 h-8 transition-transform duration-300', isDragActive && 'scale-110 text-indigo-400')} />
        </div>

        <p className="text-sm font-semibold text-slate-200 text-center mb-1">
          {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume'}
        </p>
        <p className="text-xs text-slate-500 text-center">Supports PDF and DOCX (up to 10MB)</p>
      </div>

      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <File className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate max-w-[200px] sm:max-w-[300px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              {status !== 'uploading' && (
                <button
                  onClick={removeFile}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            {status === 'uploading' && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-400">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Upload completed successfully!</span>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-start gap-2 text-rose-400 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {status === 'idle' && (
              <Button onClick={handleUpload} variant="primary" className="w-full mt-1">
                Upload & Process Resume
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
