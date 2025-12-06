import React, { useState } from 'react';
import { GeneratedAsset, AssetType } from '../types';
import { generateVisualizationVideo } from '../services/geminiService';
import { Download, ExternalLink, Play, Video, Loader2 } from 'lucide-react';

interface GalleryProps {
  assets: GeneratedAsset[];
}

const Gallery: React.FC<GalleryProps> = ({ assets }) => {
  const [visualizingId, setVisualizingId] = useState<string | null>(null);
  
  const handleVisualize = async (asset: GeneratedAsset) => {
    setVisualizingId(asset.id);
    try {
       const hasKey = await window.aistudio.hasSelectedApiKey();
       if (!hasKey) {
           await window.aistudio.openSelectKey();
       }
       const videoUrl = await generateVisualizationVideo(asset.url, asset.subtype);
       // Simple hack: We replace the asset URL with video or open in new tab?
       // Let's open the video in a new tab for now or we need to update state in parent. 
       // For this demo, I will just open it.
       window.open(videoUrl, '_blank');
    } catch (e) {
      console.error(e);
      alert("Visualization failed. " + (e as Error).message);
    } finally {
      setVisualizingId(null);
    }
  };

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-zinc-600">
        <p>No final assets yet. Go to Studio to create.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assets.map((asset) => (
        <div key={asset.id} className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
          {/* Badge */}
          <div className="absolute top-3 left-3 z-10 flex gap-2">
            <span className="px-2 py-1 text-xs font-bold bg-black/70 backdrop-blur-md text-white rounded border border-zinc-700 uppercase tracking-wide">
              {asset.subtype}
            </span>
            {!asset.isDraft && <span className="px-2 py-1 text-xs font-bold bg-green-500/20 text-green-300 rounded border border-green-500/30 uppercase">Final</span>}
          </div>

          {/* Content */}
          <div className="aspect-square bg-zinc-950 flex items-center justify-center overflow-hidden">
             <img src={asset.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </div>

          {/* Actions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
             <div className="flex gap-2">
                 <a 
                    href={asset.url} 
                    download={`brand-forge-${asset.subtype}.png`}
                    className="p-2 bg-white text-black rounded-full hover:bg-zinc-200"
                    title="Download High Res"
                 >
                     <Download className="w-4 h-4" />
                 </a>
                 
                 {(asset.subtype.toLowerCase().includes('hoodie') || asset.subtype.toLowerCase().includes('billboard')) && (
                   <button 
                      onClick={() => handleVisualize(asset)}
                      disabled={visualizingId === asset.id}
                      className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-500 disabled:opacity-50"
                      title="Visualize with Veo"
                   >
                       {visualizingId === asset.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                   </button>
                 )}
             </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Gallery;
