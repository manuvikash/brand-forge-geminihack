import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Loader2, Undo, Eraser, Pen } from 'lucide-react';

interface AssetEditorProps {
  imageUrl: string;
  onClose: () => void;
  onUpdate: (mask: string | null, instruction: string) => Promise<void>;
  onFinalize: () => void;
  isProcessing: boolean;
}

const AssetEditor: React.FC<AssetEditorProps> = ({ imageUrl, onClose, onUpdate, onFinalize, isProcessing }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  
  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // We don't draw the image on the canvas, we just use the canvas for the MASK/DRAWING layer.
    // The image sits behind it in CSS.
  }, []);

  const startDrawing = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.strokeStyle = tool === 'pen' ? '#ffffff' : 'rgba(0,0,0,1)';
    ctx.globalCompositeOperation = tool === 'pen' ? 'source-over' : 'destination-out';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleUpdate = () => {
    const canvas = canvasRef.current;
    const mask = canvas ? canvas.toDataURL('image/png') : null;
    onUpdate(mask, instruction);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden shadow-2xl">
        
        {/* Editor Area */}
        <div className="flex-1 bg-zinc-950 relative flex items-center justify-center p-4">
             <div className="relative w-[500px] h-[500px] bg-zinc-900 shadow-xl rounded-lg overflow-hidden">
                <img src={imageUrl} className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" />
                <canvas 
                    ref={canvasRef}
                    width={500}
                    height={500}
                    className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                />
             </div>
             
             {/* Toolbar */}
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-800 rounded-full p-2 flex gap-2 shadow-lg border border-zinc-700">
                <button 
                  onClick={() => setTool('pen')}
                  className={`p-2 rounded-full ${tool === 'pen' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
                >
                  <Pen className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setTool('eraser')}
                   className={`p-2 rounded-full ${tool === 'eraser' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
                >
                  <Eraser className="w-4 h-4" />
                </button>
                <div className="w-px bg-zinc-600 mx-1"></div>
                <button 
                   onClick={() => {
                       const ctx = canvasRef.current?.getContext('2d');
                       ctx?.clearRect(0,0, 500, 500);
                   }}
                   className="p-2 text-zinc-400 hover:text-red-400"
                >
                   <Undo className="w-4 h-4" />
                </button>
             </div>
        </div>

        {/* Controls */}
        <div className="w-80 border-l border-zinc-800 p-6 flex flex-col gap-6 bg-zinc-900">
           <div className="flex justify-between items-center">
              <h3 className="text-white font-bold">Edit Draft</h3>
              <button onClick={onClose}><X className="w-5 h-5 text-zinc-500 hover:text-white" /></button>
           </div>

           <div className="space-y-4">
              <label className="text-xs text-zinc-400 uppercase font-bold">Refine Instruction</label>
              <textarea 
                 value={instruction}
                 onChange={(e) => setInstruction(e.target.value)}
                 className="w-full h-32 bg-zinc-950 border border-zinc-700 rounded p-3 text-sm text-white resize-none focus:border-orange-500 outline-none"
                 placeholder="Describe changes (e.g. 'Add a red circle logo', 'Make the text larger'). Draw on the image to guide the AI."
              />
              <button 
                 onClick={handleUpdate}
                 disabled={isProcessing}
                 className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                  {isProcessing ? <Loader2 className="animate-spin w-4 h-4" /> : "Apply Changes"}
              </button>
           </div>

           <div className="mt-auto pt-6 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 mb-4">Happy with the draft? Upscale it to production quality (4K).</p>
              <button 
                 onClick={onFinalize}
                 className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-lg shadow-lg"
              >
                 Finalize & Export
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AssetEditor;
