import React, { useState } from 'react';
import { BrandDNA, GeneratedAsset, Inspiration } from './types';
import Sidebar from './components/Sidebar';
import BrandManager from './components/BrandManager';
import Inspirations from './components/Inspirations';
import Studio from './components/Studio';
import Gallery from './components/Gallery';

const App: React.FC = () => {
  // Global State
  const [dna, setDna] = useState<BrandDNA | null>(null);
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState('identity');

  // Handlers
  const handleSaveDNA = (newDna: BrandDNA) => {
    setDna(newDna);
    setActiveTab('studio'); // Move to studio after creating identity
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        hasDNA={!!dna} 
      />

      <main className="flex-1 overflow-auto relative">
        <div className="max-w-7xl mx-auto p-8">
          
          {/* View Router */}
          {activeTab === 'identity' && (
            <BrandManager 
              dna={dna} 
              onSave={handleSaveDNA} 
            />
          )}

          {activeTab === 'inspirations' && (
            <Inspirations 
              inspirations={inspirations}
              onAddInspiration={(insp) => setInspirations([...inspirations, insp])}
              onRemoveInspiration={(id) => setInspirations(inspirations.filter(i => i.id !== id))}
            />
          )}

          {activeTab === 'studio' && dna && (
            <div className="space-y-12">
               <Studio 
                 dna={dna} 
                 inspirations={inspirations}
                 onAssetCreated={(asset) => setAssets([asset, ...assets])}
               />
               
               {assets.length > 0 && (
                 <div className="border-t border-zinc-800 pt-8">
                    <h3 className="text-xl font-bold text-white mb-6">Asset Gallery</h3>
                    <Gallery assets={assets} />
                 </div>
               )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;