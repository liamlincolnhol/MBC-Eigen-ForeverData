import React, { useState } from 'react';
import { CheckCircle, Upload, BarChart3, Sparkles } from 'lucide-react';
import UploadForm from '../components/UploadForm';
import Dashboard from '../components/Dashboard';
import { UploadResponse } from '../lib/types';

export default function HomePage() {
  const [uploadResult, setUploadResult] = useState<{response: UploadResponse, file: File} | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const handleUploadSuccess = (response: UploadResponse, file: File) => {
    setUploadResult({response, file});
  };

  const handleUploadAnother = () => {
    setUploadResult(null);
  };

  const uploadSuccessContent = uploadResult ? (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-300" />
            </div>
          </div>
          <h1 className="text-4xl font-semibold text-white tracking-tight">
            Upload successful
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Your file now lives on EigenDA. Keep this link handy to retrieve or share it later.
          </p>
        </div>

        <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur space-y-5">
          <div className="space-y-2 text-slate-200">
            <h3 className="text-base font-semibold uppercase tracking-widest text-white/70">
              File details
            </h3>
            <p className="text-sm">Name: {uploadResult.file.name}</p>
            <p className="text-sm">Size: {(uploadResult.file.size / 1024 / 1024).toFixed(2)} MB</p>
            <p className="text-sm">
              Expires: {new Date(uploadResult.response.expiryDate).toLocaleDateString()}
              &nbsp;({uploadResult.response.daysRemaining} days remaining)
            </p>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-semibold uppercase tracking-widest text-white/70">
              Permanent link
            </h3>
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={uploadResult.response.permanentLink}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900/70 border border-white/10 text-sm text-white"
              />
              <button
                onClick={() => navigator.clipboard.writeText(uploadResult.response.permanentLink)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleUploadAnother}
            className="inline-flex items-center px-6 py-3 bg-white text-slate-900 font-medium rounded-full hover:bg-slate-100 transition-colors duration-200"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload another file
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const landingContent = !uploadResult ? (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-7">
          <div className="flex justify-center">
            <a
              href="https://www.eigenda.xyz/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.4em] text-white/60 transition-colors hover:border-white/40"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-200" />
              EigenDA powered
            </a>
          </div>
          <div className="space-y-5">
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-100 via-indigo-100 to-pink-100">
                ForeverData
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-200 max-w-3xl mx-auto">
              Store any file permanently on EigenDA with predictable blob pricing, automatic renewal targets,
              and a visual upload flow that mirrors the underlying blobs.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-200">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1">
              Permanent
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1">
              Decentralized
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1">
              Forever
            </span>
          </div>
        </div>

        <UploadForm onUploadSuccess={handleUploadSuccess} />

        <div className="text-center text-sm text-white/60">
          Powered by EigenDA • Decentralized • Permanent • Forever
        </div>
      </div>
    </div>
  ) : null;

  const mainContent = uploadResult ? uploadSuccessContent : landingContent;

  return (
    <>
      <div className="relative min-h-screen overflow-hidden bg-[#030512] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.25),rgba(15,23,42,0.65))]" />
          <div className="absolute inset-y-0 left-1/2 w-[70vw] -translate-x-1/2 bg-[radial-gradient(circle,rgba(147,197,253,0.4),transparent_65%)] blur-3xl opacity-40" />
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[radial-gradient(circle_at_bottom,rgba(236,72,153,0.2),transparent_70%)] blur-3xl opacity-60" />
        </div>

        <div className="relative z-10">{mainContent}</div>
      </div>

      <button
        onClick={() => setIsDashboardOpen(true)}
        className="fixed bottom-6 right-6 z-30 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full shadow-xl shadow-blue-900/40 transition-all duration-200 flex items-center space-x-2 hover:scale-105"
      >
        <BarChart3 className="w-5 h-5" />
        <span className="font-medium">View files</span>
      </button>

      <Dashboard 
        isOpen={isDashboardOpen} 
        onClose={() => setIsDashboardOpen(false)} 
      />
    </>
  );
}
