import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { BrandDNA } from '../types';
import { 
  brainstormAdIdea, 
  generateVoiceoverScript, 
  generateAdKeyframes, 
  generateAdVideo 
} from '../services/geminiService';
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  Film, 
  Mic, 
  Image as ImageIcon,
  Play,
  Download,
  RotateCcw
} from 'lucide-react';

interface AdsProps {
  dna: BrandDNA;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AdStoryboard {
  concept: string;
  voiceoverScript: string;
  keyframes: {
    url: string;
    description: string;
  }[];
}

const Ads: React.FC<AdsProps> = ({ dna }) => {
  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Storyboard State
  const [storyboard, setStoryboard] = useState<AdStoryboard | null>(null);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [editableScript, setEditableScript] = useState('');
  
  // Video State
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState('');

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greeting: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Hey! I'm excited to brainstorm a video ad for ${dna.name}! 🎬\n\nI've studied your brand DNA - the ${dna.colors.join(', ')} palette, your ${dna.visualEssence} vibe, and the overall design system.\n\nWhat kind of ad are you thinking? Here are some ideas to get started:\n\n• Product showcase highlighting key features\n• Emotional brand story connecting with your audience\n• Energetic launch announcement\n• Customer testimonial-style ad\n• Behind-the-scenes brand culture\n\nLet's create something amazing together!`,
        timestamp: Date.now()
      };
      setMessages([greeting]);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Build conversation history
      const conversationHistory = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await brainstormAdIdea(dna, conversationHistory);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Brainstorming error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Could you rephrase or try a different angle?',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateStoryboard = async () => {
    setIsGeneratingStoryboard(true);
    setStoryboard(null);
    setVideoUrl(null);

    try {
      // Extract the ad concept from conversation
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Add progress message
      const progressMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '🎬 Analyzing your concept and generating the voiceover script...',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, progressMessage]);

      // Generate voiceover script
      const script = await generateVoiceoverScript(dna, conversationHistory);

      // Update progress
      const keyframeMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '🎨 Creating stunning keyframes for your ad...',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, keyframeMessage]);

      // Generate keyframes (2-3 images)
      const keyframes = await generateAdKeyframes(dna, conversationHistory, script);

      setStoryboard({
        concept: conversationHistory[conversationHistory.length - 1].content,
        voiceoverScript: script,
        keyframes
      });
      setEditableScript(script);

      // Add confirmation message
      const confirmMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: '✨ Perfect! I\'ve created your storyboard below with the voiceover script and keyframes. You can edit the script if needed, then hit "Generate Full Video" when ready!',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, confirmMessage]);

    } catch (error) {
      console.error('Storyboard generation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Oops! Something went wrong while creating the storyboard: ${errorMsg}. Please try again or refine your concept.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!storyboard) return;

    setIsGeneratingVideo(true);
    setVideoUrl(null);

    try {
      const video = await generateAdVideo(
        dna,
        editableScript, // Use the edited script
        storyboard.keyframes,
        (status) => setVideoProgress(status)
      );

      setVideoUrl(video);
      
      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '🎉 Your video ad is ready! Check it out below. You can download it or start fresh with a new concept.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, successMessage]);

    } catch (error) {
      console.error('Video generation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Video generation failed: ${errorMsg}. This can happen due to content filters or server load. Try regenerating or adjusting your concept.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGeneratingVideo(false);
      setVideoProgress('');
    }
  };

  const handleReset = () => {
    setStoryboard(null);
    setVideoUrl(null);
    setEditableScript('');
    const resetMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Let\'s start fresh! What new ad concept should we explore?',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, resetMessage]);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
            <Film className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Ad Creator</h1>
        </div>
        <p className="text-zinc-400">
          Brainstorm creative video ads with AI, then bring them to life with storyboards and full video generation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Chat Panel */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col h-full max-h-full overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-500" />
              <h2 className="font-semibold text-white">Brainstorming Session</h2>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 shadow-lg ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white'
                      : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  }`}
                >
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({children}) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
                        ul: ({children}) => <ul className="text-sm space-y-1 mb-2 last:mb-0 list-disc pl-4">{children}</ul>,
                        ol: ({children}) => <ol className="text-sm space-y-1 mb-2 last:mb-0 list-decimal pl-4">{children}</ol>,
                        li: ({children}) => <li className="text-sm">{children}</li>,
                        strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                        em: ({children}) => <em className="italic">{children}</em>,
                        code: ({children}) => <code className="bg-zinc-700 px-1 rounded text-xs">{children}</code>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                  <span className="text-sm text-zinc-400">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-zinc-800 flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Describe your ad concept..."
                disabled={isTyping}
                className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isTyping}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {/* Finalize Button */}
            {messages.length > 1 && !storyboard && (
              <button
                onClick={handleGenerateStoryboard}
                disabled={isGeneratingStoryboard}
                className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-semibold"
              >
                {isGeneratingStoryboard ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Storyboard...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Finalize & Create Storyboard
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Storyboard & Video Panel */}
        <div className="flex flex-col h-full overflow-y-auto space-y-6">
          {/* Storyboard */}
          {storyboard && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h2 className="font-semibold text-white">Storyboard</h2>
              </div>

              {/* Voiceover Script */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-4 h-4 text-purple-500" />
                  <h3 className="text-sm font-semibold text-white">Voiceover Script (Editable)</h3>
                </div>
                <textarea
                  value={editableScript}
                  onChange={(e) => setEditableScript(e.target.value)}
                  rows={6}
                  className="w-full bg-zinc-800 rounded-lg p-4 border border-zinc-700 focus:border-purple-500 focus:outline-none text-sm text-zinc-300 leading-relaxed resize-none"
                  placeholder="Edit the voiceover script..."
                />
                <p className="text-xs text-zinc-500 mt-2">
                  Edit the script to refine your ad's message before generating the video.
                </p>
              </div>

              {/* Keyframes */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4 text-pink-500" />
                  <h3 className="text-sm font-semibold text-white">
                    Keyframes ({storyboard.keyframes.length})
                  </h3>
                </div>
                <div className={`grid gap-4 ${storyboard.keyframes.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {storyboard.keyframes.map((frame, idx) => (
                    <div key={idx} className="bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 hover:border-pink-500 transition-colors group">
                      <div className="relative">
                        <img
                          src={frame.url}
                          alt={frame.description}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold text-white">
                          Frame {idx + 1}
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-zinc-400 leading-relaxed">{frame.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate Video Button */}
              {!videoUrl && (
                <button
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo}
                  className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-pink-600 to-red-600 text-white rounded-lg hover:from-pink-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-semibold"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {videoProgress || 'Generating Video...'}
                    </>
                  ) : (
                    <>
                      <Film className="w-5 h-5" />
                      Generate Full Video
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Final Video */}
          {videoUrl && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-green-500" />
                  <h2 className="font-semibold text-white">Final Video Ad</h2>
                </div>
                <button
                  onClick={handleReset}
                  className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Start New
                </button>
              </div>

              <div className="bg-black rounded-lg overflow-hidden mb-4">
                <video
                  src={videoUrl}
                  controls
                  className="w-full"
                  autoPlay
                  loop
                />
              </div>

              <a
                href={videoUrl}
                download={`${dna.name}-ad-${Date.now()}.mp4`}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                <Download className="w-5 h-5" />
                Download Video
              </a>
            </div>
          )}

          {/* Empty State */}
          {!storyboard && !videoUrl && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 border-dashed p-12 text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-500">
                Brainstorm your ad concept in the chat, then finalize to see your storyboard here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Ads;
