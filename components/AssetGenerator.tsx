import React, { useState } from 'react';
import { BrandDNA, AssetType } from '../types';
import { Shirt, Image as ImageIcon, Video, Monitor, Loader2, Plus, AlertTriangle } from 'lucide-react';

interface AssetGeneratorProps {
  dna: BrandDNA;
  onGenerateAsset: (type: AssetType, subtype: string) => Promise<void>;
  isGenerating: boolean;
}

const AssetGenerator: React.FC<AssetGeneratorProps> = ({ dna, onGenerateAsset, isGenerating }) => {
  const [activeType, setActiveType] = useState<AssetType>(AssetType.MERCHANDISE);
  const [subtype, setSubtype] = useState<string>('Hoodie');
  const [needsKeySelection, setNeedsKeySelection] = useState(false);

  const assetOptions = {
    [AssetType.MERCHANDISE]: ['Hoodie', 'T-Shirt', 'Tote Bag', 'Baseball Cap', 'Coffee Mug'],
    [AssetType.MARKETING]: ['Event Poster', 'Hero Banner', 'Business Card', 'Flyer', 'Billboard'],
    [AssetType.DIGITAL]: ['Social Media Avatar', 'Instagram Story', 'Website Header', 'App Icon'],
    [AssetType.VIDEO]: ['Cinematic Ad']
  };

  const handleGenerate = async () => {
    // Both Gemini 3 Pro (used for Images) and Veo (used for Video) require a paid API key.
    // We must ensure the user has selected a key before proceeding.
    try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            setNeedsKeySelection(true);
            return;
        }
    } catch (e) {
        console.error("Error checking API key status", e);
        // If check fails (e.g. not in AI Studio environment), we proceed and let the API call fail if necessary
    }
    
    onGenerateAsset(activeType, subtype);
  };

  const handleSelectKey = async () => {
      try {
          await window.aistudio.openSelectKey();
          setNeedsKeySelection(false);
          // Auto trigger generation after selection
          onGenerateAsset(activeType, subtype);
      } catch (e) {
          console.error("Key selection failed", e);
      }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-full flex flex-col">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Plus className="w-5 h-5 text-orange-500" />
        Create Asset
      </h2>

      {/* Type Selector */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
            { id: AssetType.MERCHANDISE, icon: Shirt, label: 'Merch' },
            { id: AssetType.MARKETING, icon: ImageIcon, label: 'Print' },
            { id: AssetType.DIGITAL, icon: Monitor, label: 'Digital' },
            { id: AssetType.VIDEO, icon: Video, label: 'Video' }
        ].map((item) => (
            <button
                key={item.id}
                onClick={() => {
                    setActiveType(item.id);
                    setSubtype(assetOptions[item.id][0]);
                    setNeedsKeySelection(false);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    activeType === item.id
                    ? 'bg-zinc-800 border-orange-500 text-orange-500'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
            >
                <item.icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
            </button>
        ))}
      </div>

      {/* Subtype Selector */}
      <div className="mb-8">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Asset Type
        </label>
        <div className="grid grid-cols-2 gap-2">
            {assetOptions[activeType].map((opt) => (
                <button
                    key={opt}
                    onClick={() => setSubtype(opt)}
                    className={`px-3 py-2 text-sm rounded-md text-left transition-colors ${
                        subtype === opt
                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50'
                        : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-800'
                    }`}
                >
                    {opt}
                </button>
            ))}
        </div>
      </div>

      {/* Key Selection Warning */}
      {needsKeySelection && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-sm text-yellow-200 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                  <p>
                    High-quality generation ({activeType === AssetType.VIDEO ? 'Veo 2' : 'Imagen 3'}) requires a paid billing project.
                  </p>
              </div>
               <button 
                onClick={handleSelectKey}
                className="ml-7 text-left underline font-bold hover:text-white"
               >
                   Select API Key to Continue
               </button>
                <div className="ml-7 text-xs opacity-70">
                   See <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline">Billing Docs</a> for info.
               </div>
          </div>
      )}

      <div className="mt-auto">
        <button
            onClick={handleGenerate}
            disabled={isGenerating || needsKeySelection}
            className="w-full py-4 bg-white text-zinc-950 font-bold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            {isGenerating ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Forging...
                </>
            ) : (
                <>
                    Generate {activeType === AssetType.VIDEO ? 'Video' : 'Image'}
                </>
            )}
        </button>
        <p className="text-center text-xs text-zinc-600 mt-3">
            Using {activeType === AssetType.VIDEO ? 'Veo 2' : 'Imagen 3'}
        </p>
      </div>
    </div>
  );
};

export default AssetGenerator;