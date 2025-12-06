import React, { useState } from 'react';
import { Inspiration } from '../types';
import { analyzeInspiration } from '../services/geminiService';
import { Plus, Upload, Loader2, Trash2 } from 'lucide-react';

interface InspirationsProps {
  inspirations: Inspiration[];
  onAddInspiration: (insp: Inspiration) => void;
  onRemoveInspiration: (id: string) => void;
}

const Inspirations: React.FC<InspirationsProps> = ({ inspirations, onAddInspiration, onRemoveInspiration }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!preview) return;
    setIsUploading(true);
    try {
      const cues = await analyzeInspiration(preview, note);
      const newInsp: Inspiration = {
        id: crypto.randomUUID(),
        imageUrl: preview,
        description: note,
        extractedCues: cues
      };
      onAddInspiration(newInsp);
      setPreview(null);
      setNote('');
    } catch (e) {
      console.error(e);
      alert("Failed to analyze image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col gap-8">
      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-2xl font-bold text-white">Inspiration Board</h2>
            <p className="text-zinc-400 text-sm">Upload images to extract style cues for your assets.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl p-6 flex flex-col gap-4">
          <h3 className="text-white font-medium flex items-center gap-2"><Plus className="w-4 h-4 text-orange-500" /> New Inspiration</h3>
          
          {!preview ? (
            <label className="flex-1 flex flex-col items-center justify-center bg-zinc-950 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-900 transition-colors min-h-[200px]">
              <Upload className="w-8 h-8 text-zinc-600 mb-2" />
              <span className="text-xs text-zinc-500">Click to upload image</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          ) : (
            <div className="relative aspect-square rounded-lg overflow-hidden border border-zinc-700">
               <img src={preview} className="w-full h-full object-cover" />
               <button onClick={() => setPreview(null)} className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}

          <textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why do you like this? (e.g. 'Love the neon glow')"
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white resize-none h-20 outline-none focus:border-orange-500"
          />

          <button 
            onClick={handleAnalyze}
            disabled={!preview || isUploading}
            className="w-full bg-white text-black font-bold py-2 rounded hover:bg-zinc-200 disabled:opacity-50 flex justify-center"
          >
            {isUploading ? <Loader2 className="animate-spin w-4 h-4" /> : "Extract Cues"}
          </button>
        </div>

        {/* List */}
        {inspirations.map((insp) => (
           <div key={insp.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 group">
              <div className="aspect-video rounded-lg overflow-hidden bg-zinc-950 relative">
                 <img src={insp.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                 <button onClick={() => onRemoveInspiration(insp.id)} className="absolute top-2 right-2 bg-red-500/80 p-1.5 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3" />
                 </button>
              </div>
              <div>
                  <div className="flex flex-wrap gap-1 mb-2">
                     {insp.extractedCues.map((cue, i) => (
                        <span key={i} className="text-[10px] uppercase font-bold text-orange-400 bg-orange-900/20 px-1.5 py-0.5 rounded">{cue}</span>
                     ))}
                  </div>
                  <p className="text-zinc-500 text-xs italic">"{insp.description}"</p>
              </div>
           </div>
        ))}
      </div>
    </div>
  );
};

export default Inspirations;
