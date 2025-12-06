import React, { useState } from 'react';
import { BrandDNA, Inspiration, AssetType, GeneratedAsset } from '../types';
import { generateDrafts, editAsset, finalizeAsset, generateVisualizationVideo } from '../services/geminiService';
import { Shirt, Image as ImageIcon, Monitor, Video, Loader2, Sparkles, ArrowRight, Box } from 'lucide-react';
import AssetEditor from './AssetEditor';

interface StudioProps {
  dna: BrandDNA;
  inspirations: Inspiration[];
  onAssetCreated: (asset: GeneratedAsset) => void;
}

const Studio: React.FC<StudioProps> = ({ dna, inspirations, onAssetCreated }) => {
  // Steps: 0 = Category, 1 = Subtype, 2 = Drafting, 3 = Selection/Editing
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<AssetType>(AssetType.MERCHANDISE);
  const [selectedSubtype, setSelectedSubtype] = useState('');
  
  const [drafts, setDrafts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Editor State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);

  // Categories
  const categories = [
    { id: AssetType.MERCHANDISE, icon: Shirt, label: 'Merch', items: ['Hoodie', 'T-Shirt', 'Cap', 'Tote Bag'] },
    { id: AssetType.MARKETING, icon: ImageIcon, label: 'Print', items: ['Poster', 'Flyer', 'Billboard', 'Business Card'] },
    { id: AssetType.DIGITAL, icon: Monitor, label: 'Digital', items: ['Social Post', 'Banner', 'App Icon'] },
  ];

  const handleGenerateDrafts = async () => {
    setIsLoading(true);
    setStep(2);
    try {
      const results = await generateDrafts(dna, inspirations, selectedType, selectedSubtype);
      setDrafts(results);
      setStep(3);
    } catch (e) {
      console.error(e);
      alert("Failed to generate drafts.");
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDraft = async (mask: string | null, instruction: string) => {
    if (editingIndex === null) return;
    setIsProcessingEdit(true);
    try {
      const newImage = await editAsset(drafts[editingIndex], mask, instruction);
      const newDrafts = [...drafts];
      newDrafts[editingIndex] = newImage;
      setDrafts(newDrafts);
    } catch (e) {
      console.error(e);
      alert("Edit failed");
    } finally {
      setIsProcessingEdit(false);
    }
  };

  const handleFinalize = async () => {
    if (editingIndex === null) return;
    setIsProcessingEdit(true); // Re-using this loader state for finalizing
    
    // Check Key for Pro model
    try {
       const hasKey = await window.aistudio.hasSelectedApiKey();
       if (!hasKey) {
           await window.aistudio.openSelectKey();
       }
    } catch(e) { console.warn("Key check skipped", e)}

    try {
      const highResUrl = await finalizeAsset(dna, drafts[editingIndex], selectedSubtype);
      
      const newAsset: GeneratedAsset = {
          id: crypto.randomUUID(),
          type: selectedType,
          subtype: selectedSubtype,
          url: highResUrl,
          promptUsed: 'Finalized from draft',
          createdAt: Date.now(),
          isDraft: false
      };
      
      onAssetCreated(newAsset);
      // Reset
      setStep(0);
      setDrafts([]);
      setEditingIndex(null);
    } catch (e) {
      console.error(e);
      alert("Finalization failed");
    } finally {
      setIsProcessingEdit(false);
    }
  };

  // Step 0: Category Selection
  if (step === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">What do you want to create?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedType(cat.id); setStep(1); }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl hover:bg-zinc-800 hover:border-orange-500/50 transition-all group text-left"
            >
              <div className="w-12 h-12 bg-zinc-950 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <cat.icon className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{cat.label}</h3>
              <p className="text-sm text-zinc-500">Create {cat.items.join(', ')}...</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 1: Subtype Selection
  if (step === 1) {
    const category = categories.find(c => c.id === selectedType);
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-white mb-8">Select Item Type</h2>
        <div className="grid grid-cols-2 gap-4">
          {category?.items.map((item) => (
            <button
              key={item}
              onClick={() => { setSelectedSubtype(item); handleGenerateDrafts(); }}
              className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 hover:bg-white hover:text-black hover:font-bold transition-all"
            >
              {item}
            </button>
          ))}
        </div>
        <button onClick={() => setStep(0)} className="mt-8 text-zinc-500 hover:text-white text-sm">Back</button>
      </div>
    );
  }

  // Step 2: Loading Drafts
  if (step === 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <h3 className="text-xl font-bold text-white">Forging Concepts...</h3>
        <p className="text-zinc-500 mt-2">Generating low-latency drafts using Gemini 2.5 Flash</p>
      </div>
    );
  }

  // Step 3: Selection
  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
           <h2 className="text-2xl font-bold text-white">Select a Draft</h2>
           <p className="text-zinc-400 text-sm">Click to edit and finalize. These are low-res previews.</p>
        </div>
        <button onClick={() => setStep(0)} className="text-sm text-zinc-500">Cancel</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {drafts.map((src, i) => (
          <div 
            key={i} 
            onClick={() => setEditingIndex(i)}
            className="group relative aspect-square bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:border-orange-500 transition-all"
          >
            <img src={src} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
               <span className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-bold text-sm">
                 <Sparkles className="w-4 h-4" /> Edit / Finalize
               </span>
            </div>
          </div>
        ))}
      </div>

      {editingIndex !== null && (
        <AssetEditor 
          imageUrl={drafts[editingIndex]} 
          onClose={() => setEditingIndex(null)}
          onUpdate={handleUpdateDraft}
          onFinalize={handleFinalize}
          isProcessing={isProcessingEdit}
        />
      )}
    </div>
  );
};

export default Studio;
