import React from 'react';
import { BrandDNA } from '../types';
import { Palette, Type, Fingerprint } from 'lucide-react';

interface DNACardProps {
  dna: BrandDNA;
}

const DNACard: React.FC<DNACardProps> = ({ dna }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-full flex flex-col gap-6">
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-2xl font-bold text-white mb-1">{dna.name}</h2>
        <p className="text-zinc-500 text-sm">{dna.description}</p>
      </div>

      {/* Colors */}
      <div>
        <div className="flex items-center gap-2 text-zinc-300 mb-3 font-medium">
          <Palette className="w-4 h-4 text-orange-500" />
          <span>Color Palette</span>
        </div>
        <div className="flex gap-2">
          {dna.colors.map((color, i) => (
            <div key={i} className="group relative">
              <div
                className="w-12 h-12 rounded-full border-2 border-zinc-800 shadow-md transition-transform transform hover:scale-110 cursor-pointer"
                style={{ backgroundColor: color }}
                title={color}
              />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                {color}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div>
        <div className="flex items-center gap-2 text-zinc-300 mb-2 font-medium">
          <Type className="w-4 h-4 text-orange-500" />
          <span>Typography</span>
        </div>
        <p className="text-zinc-400 text-sm leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-800">
          {dna.typography}
        </p>
      </div>

      {/* Visual Essence */}
      <div className="flex-grow">
        <div className="flex items-center gap-2 text-zinc-300 mb-2 font-medium">
          <Fingerprint className="w-4 h-4 text-orange-500" />
          <span>Visual Essence (DNA)</span>
        </div>
        <div className="text-zinc-400 text-sm italic bg-zinc-950 p-3 rounded-lg border border-zinc-800 h-full">
            "{dna.visualEssence}"
        </div>
      </div>
      
      {/* Design System */}
       <div>
        <div className="flex items-center gap-2 text-zinc-300 mb-2 font-medium">
          <span className="text-orange-500 font-bold text-lg">#</span>
          <span>Design Rules</span>
        </div>
        <p className="text-zinc-400 text-sm bg-zinc-950 p-3 rounded-lg border border-zinc-800">
            {dna.designSystem}
        </p>
      </div>
    </div>
  );
};

export default DNACard;