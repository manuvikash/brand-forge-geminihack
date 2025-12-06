import React, { useState } from 'react';
import { BrandDNA } from '../types';
import { generateBrandDNA, fetchLogoFromUrl } from '../services/geminiService';
import { Globe, Loader2, Save, Palette, Type, Fingerprint, Sparkles, CheckCircle, Upload, Image as ImageIcon, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

interface BrandManagerProps {
  dna: BrandDNA | null;
  onSave: (dna: BrandDNA) => void;
}

const LoadingView: React.FC<{ status: string }> = ({ status }) => (
  <div className="flex flex-col items-center justify-center p-12 space-y-8 bg-zinc-900/50 rounded-xl border border-zinc-800">
    <div className="relative w-32 h-32">
      {/* Pulsing rings */}
      <div className="absolute inset-0 border-4 border-zinc-800 rounded-full animate-ping opacity-25"></div>
      <div className="absolute inset-2 border-2 border-orange-900/50 rounded-full"></div>

      {/* Rotating spinner */}
      <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>

      {/* Center Icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Fingerprint className="w-12 h-12 text-white animate-pulse" />
      </div>
    </div>

    <div className="text-center space-y-2">
      <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 animate-pulse">
        {status}
      </div>
      <p className="text-zinc-500 text-sm">Gemini 2.5 is analyzing semantic and visual data...</p>
    </div>

    {/* Pseudo-progress steps visualizer */}
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="w-2 h-2 rounded-full bg-zinc-800 overflow-hidden relative">
          <div className="absolute inset-0 bg-orange-500 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
        </div>
      ))}
    </div>
  </div>
);

const BrandManager: React.FC<BrandManagerProps> = ({ dna, onSave }) => {
  const [isEditing, setIsEditing] = useState(!dna);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingLogo, setIsFetchingLogo] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Initializing...");
  const [logoError, setLogoError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: dna?.name || '',
    description: dna?.description || '',
    url: dna?.websiteUrl || ''
  });

  const [logoPreview, setLogoPreview] = useState<string | undefined>(dna?.logoImage);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        setLogoError(null); // Clear error on manual upload
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlBlur = async () => {
    if (formData.url && !logoPreview) {
      setIsFetchingLogo(true);
      const logo = await fetchLogoFromUrl(formData.url);
      if (logo) {
        setLogoPreview(logo);
        setLogoError(null);
      }
      setIsFetchingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogoError(null);
    setIsGenerating(true);
    setLoadingStatus("Initializing Agent...");

    try {
      const result = await generateBrandDNA(
        formData.name,
        formData.description,
        formData.url,
        (status) => setLoadingStatus(status)
      );

      // Check for extraction failure:
      // If user provided a URL (expecting extraction) AND no logo was found AND no manual logo exists
      if (formData.url && !result.logoImage && !logoPreview) {
        setLogoError("⚠️ Auto-extraction failed. Please upload logo manually to prevent random generation.");
        setIsGenerating(false);
        return; // Stop execution to force user action
      }

      // Merge: Prioritize manual upload (logoPreview), fallback to extracted (result.logoImage)
      const finalDNA = {
        ...result,
        logoImage: logoPreview || result.logoImage
      };

      onSave(finalDNA);
      // Update local preview in case it was extracted
      setLogoPreview(finalDNA.logoImage);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert("Failed to create Brand DNA. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <LoadingView status={loadingStatus} />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <h2 className="text-3xl font-bold text-white mb-6">Define Your Brand Identity</h2>
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 space-y-6 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-zinc-400 mb-2 text-sm font-medium">Brand Name</label>
              <input
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-white focus:border-orange-500 outline-none transition-colors"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Nebula Dynamics"
                required
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-2 text-sm font-medium">Brand Logo <span className="text-zinc-600 font-normal">(Used in assets)</span></label>
              {!logoPreview ? (
                <div className="space-y-2">
                  <label className={`flex items-center justify-center w-full h-[58px] bg-zinc-950 border border-dashed rounded-lg cursor-pointer hover:bg-zinc-900 transition-colors ${logoError ? 'border-red-500 bg-red-900/10' : 'border-zinc-700'}`}>
                    <div className={`flex items-center gap-2 text-sm ${logoError ? 'text-red-400' : 'text-zinc-500'}`}>
                      <Upload className="w-4 h-4" />
                      <span>Upload PNG/JPG</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  {isFetchingLogo && <div className="text-xs text-orange-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Fetching logo from URL...</div>}
                  {logoError && (
                    <div className="text-xs text-red-400 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{logoError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 h-[58px]">
                  <div className="h-full aspect-square bg-zinc-950 rounded-lg border border-zinc-800 p-1">
                    <img
                      src={logoPreview}
                      className="w-full h-full object-contain"
                      onError={() => {
                        setLogoPreview(undefined);
                        setLogoError("Failed to load image");
                      }}
                    />
                  </div>
                  <button type="button" onClick={() => setLogoPreview(undefined)} className="text-red-500 text-sm hover:underline">Remove</button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-2 text-sm font-medium">Website URL <span className="text-zinc-600 font-normal">(Auto-extracts visual cues)</span></label>
            <div className="flex gap-2">
              <div className="bg-zinc-800 flex items-center justify-center w-14 rounded-lg border border-zinc-700">
                <Globe className="w-6 h-6 text-zinc-400" />
              </div>
              <input
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-white focus:border-orange-500 outline-none transition-colors"
                value={formData.url}
                onChange={e => setFormData({ ...formData, url: e.target.value })}
                onBlur={handleUrlBlur}
                placeholder="https://example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-zinc-400 mb-2 text-sm font-medium">Core Vision & Description</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-white focus:border-orange-500 outline-none h-40 resize-none transition-colors"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what you do and what you stand for. (e.g. 'A high-end sustainable coffee shop with a minimalist, earthy aesthetic.')"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-orange-500/20"
          >
            <Sparkles className="w-5 h-5" />
            Forge Identity
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">Brand DNA</h2>
          <span className="px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-xs font-bold uppercase flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Active
          </span>
        </div>
        <button onClick={() => setIsEditing(true)} className="text-sm text-zinc-400 hover:text-white underline">Edit Inputs</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Visuals */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Palette className="w-24 h-24" />
          </div>

          {/* Logo Display */}
          {dna?.logoImage && (
            <div>
              <div className="flex items-center gap-2 text-orange-500 mb-3 font-medium">
                <ImageIcon className="w-4 h-4" /> <span>Brand Logo</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex justify-center">
                <img
                  src={dna.logoImage}
                  className="max-h-24 object-contain"
                  alt="Brand Logo"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 text-orange-500 mb-3 font-medium">
              <Palette className="w-4 h-4" /> <span>Palette</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {dna?.colors.map(c => (
                <div key={c} className="group relative">
                  <div className="w-14 h-14 rounded-full border-2 border-zinc-800 shadow-xl transition-transform hover:scale-110 cursor-pointer" style={{ backgroundColor: c }} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">{c}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-orange-500 mb-3 font-medium">
              <Type className="w-4 h-4" /> <span>Typography</span>
            </div>
            <p className="text-zinc-300 text-sm bg-zinc-950 p-4 rounded-lg border border-zinc-800 font-mono">{dna?.typography}</p>
          </div>
        </div>

        {/* Card 2: Essence */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Fingerprint className="w-24 h-24" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-orange-500 mb-3 font-medium">
              <Fingerprint className="w-4 h-4" /> <span>Visual Essence</span>
            </div>
            <p className="text-zinc-300 text-sm italic bg-zinc-950 p-4 rounded-lg border border-zinc-800 leading-relaxed">"{dna?.visualEssence}"</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-orange-500 mb-3 font-medium">
              <span>#</span> <span>Keywords</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {dna?.keywords.map(k => (
                <span key={k} className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded border border-zinc-700">{k}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Design System */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-orange-500" /> Design System Rules</h3>
        <p className="text-zinc-400 text-sm leading-relaxed">{dna?.designSystem}</p>
      </div>
    </div>
  );
};

export default BrandManager;