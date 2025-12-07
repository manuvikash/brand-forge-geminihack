# Ads Feature Documentation

## Overview
The **Ads** tab is an AI-powered video advertisement creation tool that enables users to brainstorm, design, and generate complete video ads using Gemini 2.0 Flash and Veo 3.1.

## Features

### 1. Interactive Brainstorming Chat 🎬
- **AI-Powered Ideation**: Gemini 2.0 Flash acts as a creative advertising strategist
- **Brand-Aware**: Uses the brand's DNA (colors, typography, visual essence) to guide suggestions
- **Conversational Flow**: Natural back-and-forth dialogue to refine concepts
- **Proactive Suggestions**: AI suggests creative angles, emotions, and storytelling approaches
- **Example Prompts**: Provides starter ideas to help users begin

### 2. Storyboard Generation 📋
When an idea is finalized, the system generates:

#### Voiceover Script
- 15-20 second professional script
- Brand-aligned tone and messaging
- Clear call-to-action or memorable tagline
- Generated using Gemini 2.0 Flash based on conversation context

#### Keyframes (2-3 Visual Shots)
- Generated using **Imagen 3.0** (imagen-3.0-generate-001)
- Vivid scene descriptions from Gemini
- Professional advertising photography quality
- Maintains brand colors and visual essence
- 16:9 aspect ratio for video compatibility

### 3. Full Video Generation 🎥
- **Video Creation**: Uses **Veo 3.1** (veo-3.1-generate-preview) to create dynamic video
- **Resolution**: 720p, 16:9 aspect ratio
- **Duration**: 15-20 seconds
- **Quality**: Cinematic camera movements and professional production value
- **Brand Integration**: Incorporates brand visual identity throughout

### 4. Download & Export 💾
- Direct video download capability
- Professional file naming
- Ready for social media, website, or advertising platforms

## User Flow

```
1. Navigate to Ads tab (requires Brand DNA)
   ↓
2. Chat with AI to brainstorm concept
   ↓
3. Click "Finalize & Create Storyboard"
   ↓
4. Review voiceover script and keyframes
   ↓
5. Click "Generate Full Video"
   ↓
6. Preview and download final video ad
   ↓
7. Start new concept or iterate
```

## Technical Implementation

### Components
- **Ads.tsx**: Main component with chat interface and storyboard display
  - Message management with real-time updates
  - Progress tracking for async operations
  - Error handling with user-friendly messages
  - Responsive layout (chat + storyboard side-by-side)

### Services (geminiService.ts)

#### `brainstormAdIdea()`
- **Model**: gemini-2.0-flash-exp
- **Input**: Brand DNA + conversation history
- **Output**: Creative suggestions and refinements
- **Context**: System prompt includes brand identity details

#### `generateVoiceoverScript()`
- **Model**: gemini-2.0-flash-exp
- **Input**: Brand DNA + conversation history
- **Output**: 15-20 second voiceover script
- **Quality**: Professional advertising copy

#### `generateAdKeyframes()`
- **Planning**: Gemini creates 2-3 scene descriptions
- **Generation**: Imagen 3.0 generates high-quality images
- **Output**: Array of {url, description} objects
- **Format**: Base64 encoded PNG, 16:9 aspect ratio

#### `generateAdVideo()`
- **Model**: veo-3.1-generate-preview
- **Input**: Primary keyframe + creative prompt
- **Processing**: Async polling (up to 5 minutes)
- **Output**: Video URL with API key
- **Progress**: Callback updates for user feedback

## Design Highlights

### UI/UX Features
- **Gradient Accents**: Purple-pink gradient theme for Ads tab
- **Smooth Animations**: Fade-in effects for messages
- **Loading States**: Multiple progress indicators
- **Error Handling**: Graceful failure messages in chat
- **Empty States**: Clear guidance when no content
- **Responsive Grid**: Adaptive keyframe layout (1 or 2 columns)

### Visual Polish
- Message bubbles with shadows and borders
- Hover effects on keyframes
- Frame numbering badges
- Icon-based section headers
- Gradient buttons for primary actions
- Loading spinners with descriptive text

## Error Handling

### Graceful Failures
- Chat errors: "Could you rephrase or try a different angle?"
- Storyboard errors: Detailed error message with retry suggestion
- Video errors: Explains content filters or server issues
- All errors logged to console for debugging

### Content Safety
- Veo 3.1 may filter inappropriate content
- RAI (Responsible AI) filter detection
- User-friendly error messages for content issues

## Future Enhancements (Optional)

1. **Audio Integration**: Add actual voiceover using text-to-speech
2. **Multiple Video Variations**: Generate A/B test versions
3. **Timeline Editor**: Allow manual keyframe timing adjustments
4. **Music Selection**: Background music from library
5. **Export Formats**: Multiple resolution/format options
6. **Template Library**: Pre-built ad templates by industry
7. **Analytics Integration**: Track ad performance metrics

## Testing the Feature

1. **Create Brand DNA** in Identity tab first
2. **Navigate to Ads tab** (Film icon in sidebar)
3. **Start with example prompt**:
   - "Create an energetic product launch ad"
   - "Make an emotional brand story about community"
   - "Design a minimalist showcase of our key features"
4. **Refine through conversation** with AI
5. **Generate storyboard** when satisfied
6. **Create final video** (note: this takes 1-3 minutes)
7. **Download and review** the result

## Dependencies

### AI Models Used
- ✅ Gemini 2.0 Flash (brainstorming + scripting)
- ✅ Imagen 3.0 (keyframe generation)
- ✅ Veo 3.1 Preview (video generation)

### UI Libraries
- ✅ React with TypeScript
- ✅ Lucide Icons (Film, Mic, Image, etc.)
- ✅ Tailwind CSS (styling)

## Notes

- Video generation uses polling and may take 1-5 minutes
- Requires valid API key with access to Veo 3.1
- Generated videos are preview quality (720p)
- Content filters may reject certain concepts
- Conversation context is maintained throughout session
- Reset clears storyboard but keeps chat history

---

**Status**: ✅ Fully implemented and integrated
**Location**: `/components/Ads.tsx` + `/services/geminiService.ts`
**Integration**: Added to `App.tsx` and `Sidebar.tsx`
