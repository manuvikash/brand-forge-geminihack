import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface BrandFormProps {
  onGenerate: (name: string, description: string) => Promise<void>;
  isLoading: boolean;
}

const BrandForm: React.FC<BrandFormProps> = ({ onGenerate, isLoading }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && description) {
      onGenerate(name, description);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-600 mb-2">
          Start Your Legacy
        </h1>
        <p className="text-zinc-400">Describe your vision, and we will forge your identity.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Brand Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder-zinc-600"
            placeholder="e.g. Nebula Dynamics"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Description & Vision</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder-zinc-600 resize-none"
            placeholder="What does your company do? What is the vibe? (e.g. Sustainable futuristic coffee shop, minimalist and earthy)"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold py-4 rounded-lg shadow-lg hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Extracting DNA...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Forge Identity
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default BrandForm;