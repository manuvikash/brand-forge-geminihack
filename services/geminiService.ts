import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BrandDNA, AssetType, Inspiration } from "../types";

const getClient = (apiKey?: string) => {
  const key = apiKey || process.env.API_KEY;
  if (!key) throw new Error("API Key not found. Please select a key.");
  return new GoogleGenAI({ apiKey: key });
};

// --- HELPERS ---

// Helper to fetch image from URL and convert to Base64 via CORS proxy
export const fetchImageToBase64 = async (url: string): Promise<string | undefined> => {
  try {
    // Use corsproxy.io to bypass CORS for demo purposes
    const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    if (!response.ok) return undefined;

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      console.warn("Fetched URL is not an image:", contentType);
      return undefined;
    }

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Failed to fetch logo image", e);
    return undefined;
  }
};

export const fetchLogoFromUrl = async (websiteUrl: string): Promise<string | undefined> => {
  try {
    const domain = new URL(websiteUrl).hostname;

    // Fallback chain: Try multiple sources for maximum compatibility
    const sources = [
      // 1. Google Favicon Service (most reliable, works for almost any site)
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      // 2. DuckDuckGo Icons (good fallback)
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      // 3. Clearbit (works for well-known brands)
      `https://logo.clearbit.com/${domain}`,
    ];

    for (const logoUrl of sources) {
      console.log(`Trying logo source: ${logoUrl}`);
      const result = await fetchImageToBase64(logoUrl);
      if (result) {
        console.log(`Successfully fetched logo from: ${logoUrl}`);
        return result;
      }
    }

    console.warn("All logo sources failed for domain:", domain);
    return undefined;
  } catch (e) {
    console.warn("Invalid URL for logo fetching", e);
    return undefined;
  }
};

// --- BRAND IDENTITY ---

export const generateBrandDNA = async (
  name: string,
  description: string,
  websiteUrl?: string,
  onStatusUpdate?: (status: string) => void
): Promise<BrandDNA> => {
  const ai = getClient();

  onStatusUpdate?.("Initializing AI Agent...");

  // If URL is provided, use Google Search to get context
  let searchContext = "";
  if (websiteUrl) {
    try {
      onStatusUpdate?.(`Scanning ${websiteUrl} for visual cues...`);
      const searchPrompt = `Research the visual identity and brand values of ${name} at ${websiteUrl}. Summarize the color palette, font styles, and overall vibe. Find a direct URL to their logo if possible.`;
      console.log('🔍 [SEARCH GROUNDING] Prompt:', searchPrompt);
      const searchResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: searchPrompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      searchContext = searchResponse.text || "";
      console.log('🔍 [SEARCH GROUNDING] Response:', searchContext);
      onStatusUpdate?.("Website context acquired...");
    } catch (e) {
      console.warn("❌ [SEARCH GROUNDING] Failed:", e);
      onStatusUpdate?.("Web scan skipped, proceeding with description...");
    }
  } else {
    onStatusUpdate?.("Analyzing brand description...");
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      colors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Hex codes" },
      typography: { type: Type.STRING },
      visualEssence: { type: Type.STRING, description: "Visual prompt description" },
      designSystem: { type: Type.STRING, description: "Bullet points on rules" },
      keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
      logoUrl: { type: Type.STRING, description: "Direct URL to the logo image found on the web, or empty string if not found." }
    },
    required: ["colors", "typography", "visualEssence", "designSystem", "keywords"]
  };

  const prompt = `
    Act as a Creative Director. Analyze this brand request.
    Brand: ${name}
    User Description: ${description}
    ${searchContext ? `Web Context: ${searchContext}` : ''}
    
    Extract the Brand DNA. 
    IMPORTANT: If you found a logo URL in the web context, include it in the 'logoUrl' field.
  `;

  console.log('🧬 [BRAND DNA] Prompt:', prompt);
  console.log('🧬 [BRAND DNA] Schema:', JSON.stringify(schema, null, 2));

  onStatusUpdate?.("Synthesizing Color Palette & Typography...");

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    }
  });
  
  console.log('🧬 [BRAND DNA] Raw Response:', response.text);

  onStatusUpdate?.("Finalizing Design System...");

  // Clean potential markdown wrapping before parsing
  let jsonStr = response.text || "{}";
  jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");

  const data = JSON.parse(jsonStr);

  let extractedLogoImage: string | undefined = undefined;
  if (data.logoUrl && data.logoUrl.length > 0) {
    onStatusUpdate?.("Extracting Logo Asset...");
    extractedLogoImage = await fetchImageToBase64(data.logoUrl);
  }

  onStatusUpdate?.("Brand DNA Forged.");
  return {
    name,
    description,
    websiteUrl,
    logoImage: extractedLogoImage, // Add the base64 extracted logo
    ...data
  };
};

// --- INSPIRATIONS ---

export const analyzeInspiration = async (base64Image: string, userNote: string): Promise<string[]> => {
  const ai = getClient();

  const analysisPrompt = `Analyze this image. User note: "${userNote}". Extract 3-5 short, specific visual style cues (e.g., 'Chromatic aberration', 'Halftone patterns') that can be used in a prompt.`;
  console.log('🎨 [INSPIRATION] Analyzing image with prompt:', analysisPrompt);

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
        { text: analysisPrompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  let jsonStr = response.text || "[]";
  jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  const cues = JSON.parse(jsonStr);
  console.log('🎨 [INSPIRATION] Extracted cues:', cues);
  return cues;
};

// --- ASSET CREATION ---

const buildPrompt = (dna: BrandDNA, inspirations: Inspiration[], type: AssetType, subtype: string, specificInstruction?: string) => {
  const inspirationCues = inspirations.map(i => i.extractedCues.join(", ")).join("; ");
  const primaryColor = dna.colors[0] || "white";
  const accentColor = dna.colors[1] || "black";

  const logoInstruction = dna.logoImage
    ? "IMPORTANT: Incorporate the provided Logo image into the design. It should be clearly visible, undistorted, and placed appropriately for this item."
    : `The design incorporates the brand name "${dna.name}" stylized as a logo.`;

  let basePrompt = "";
  
  // Create detailed garment descriptions
  const getGarmentDetails = (subtype: string) => {
    const st = subtype.toLowerCase();
    if (st.includes('hoodie')) {
      return 'A pullover hoodie with a drawstring hood, kangaroo front pocket, and ribbed cuffs and hem. This is specifically a HOODIE with long sleeves and a hood, NOT a t-shirt.';
    } else if (st.includes('t-shirt') || st.includes('tshirt')) {
      return 'A short-sleeved t-shirt with a crew neck. This is specifically a T-SHIRT with short sleeves and no hood, NOT a hoodie.';
    } else if (st.includes('cap') || st.includes('hat')) {
      return 'A baseball cap with curved brim and adjustable back strap.';
    } else if (st.includes('tote')) {
      return 'A canvas tote bag with sturdy handles.';
    } else if (st.includes('mug')) {
      return 'A ceramic coffee mug with a handle.';
    }
    return `A ${subtype}`;
  };

  switch (type) {
    case AssetType.MERCHANDISE:
      // CRITICAL: Be extremely specific about garment type to prevent confusion
      const garmentDetails = getGarmentDetails(subtype);
      basePrompt = `
        CRITICAL INSTRUCTION: You MUST generate exactly a "${subtype}" and nothing else. Pay careful attention to the garment type.
        
        ${garmentDetails}
        
        PRODUCT DETAILS:
        - Item: ${subtype} (follow the exact specifications above)
        - Base fabric/material color: ${primaryColor}
        - Features a bold, eye-catching graphic design printed on the front
        - Material: High-quality, premium fabric/material with visible texture
        - Photography style: Professional product photography, studio setting
        - Background: Clean, neutral (white or light gray)
        - Lighting: Soft, even studio lighting with subtle shadows
        - Resolution: 4K quality with highly detailed fabric/material texture
        
        DESIGN ELEMENTS:
        ${logoInstruction}
        - Design vibe: ${dna.visualEssence}
        - Accent color in design: ${accentColor}
        - Design should be centered and prominent
        
        CRITICAL: This must be a ${subtype}, not any other garment type. Verify the garment matches "${subtype}" exactly.
      `;
      break;

    case AssetType.MARKETING:
      basePrompt = `
        A professional ${subtype} design for the brand "${dna.name}".
        Layout: Modern, clean, and high-impact.
        ${logoInstruction}
        Visuals: Incorporate the brand colors (${dna.colors.join(", ")}) and typography (${dna.typography}).
        Content: It should convey the vibe: ${dna.visualEssence}.
      `;
      break;

    case AssetType.DIGITAL:
      basePrompt = `
        A digital asset: ${subtype} for the brand "${dna.name}".
        Style: Optimized for screens, UI/UX friendly, digital art style.
        ${logoInstruction}
        Colors: ${dna.colors.join(", ")}.
        Vibe: ${dna.visualEssence}.
      `;
      break;

    default:
      basePrompt = `A creative brand asset (${subtype}) for "${dna.name}".`;
  }

  const finalPrompt = `
    ${basePrompt}
    ${specificInstruction ? `Instruction: ${specificInstruction}` : ''}
    
    BRAND DNA CONTEXT:
    - Keywords: ${dna.keywords.join(", ")}
    
    INSPIRATION CUES (Apply these artistic styles to the graphic design/layout):
    ${inspirationCues}
    
    REQUIREMENTS:
    - Realism: Photorealistic (unless specified otherwise).
    - Quality: Production ready, sharp focus.
    - Consistency: Adhere strictly to the color palette.
  `;
  
  console.log('📝 [PROMPT BUILDER]', {
    type,
    subtype,
    brandName: dna.name,
    colors: dna.colors,
    hasLogo: !!dna.logoImage,
    inspirationCount: inspirations.length,
    promptLength: finalPrompt.length
  });
  console.log('📝 [FULL PROMPT]:', finalPrompt);
  
  return finalPrompt;
};

// Phase 1: Drafts (Fast, Low Res) using Flash Image
export const generateDrafts = async (dna: BrandDNA, inspirations: Inspiration[], type: AssetType, subtype: string): Promise<string[]> => {
  const ai = getClient();

  console.log('🎨 [DRAFT GENERATION] Starting...', { type, subtype, hasLogo: !!dna.logoImage });

  // Create 4 different creative approaches
  const variations = [
    { 
      name: 'Minimal',
      instruction: 'Create a minimal, clean design with simple elements. Focus on typography and negative space. Keep it understated and elegant.'
    },
    {
      name: 'Bold',
      instruction: `Use the primary keywords: ${dna.keywords.slice(0, 2).join(', ')}. Make it bold and striking with strong visual elements.`
    },
    {
      name: 'Artistic',
      instruction: inspirations.length > 0 
        ? `Apply these visual styles heavily: ${inspirations[0]?.extractedCues.slice(0, 3).join(', ')}. Be creative and experimental.`
        : `Creative interpretation of ${dna.visualEssence}. Add artistic flair and unique styling.`
    },
    {
      name: 'Vibrant',
      instruction: `Emphasize the brand colors ${dna.colors.join(', ')}. Create a vibrant, energetic design with maximum visual impact.`
    }
  ];

  const parts: any[] = [];
  
  // Inject Logo if available (shared across all variations)
  if (dna.logoImage) {
    console.log('🖼️  [DRAFT GENERATION] Adding logo to parts');
    parts.push({
      inlineData: { mimeType: 'image/png', data: dna.logoImage.split(',')[1] }
    });
    parts.push({ text: "Use the image above as the Brand Logo. Incorporate it into the design." });
  }

  // Generate 4 variations in parallel with different prompts
  console.log('🎨 [DRAFT GENERATION] Using model: gemini-3-pro-image-preview with low resolution');
  const promises = variations.map((variation, idx) => {
    const promptText = buildPrompt(dna, inspirations, type, subtype, variation.instruction);
    const variationParts = [...parts, { text: promptText }];
    
    console.log(`🎨 [DRAFT ${idx + 1}] ${variation.name} variant`);
    
    return ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: variationParts },
      config: {
        imageConfig: { 
          aspectRatio: "1:1",
          imageSize: "512" // Low resolution for faster draft generation
        }
      }
    });
  });

  const responses = await Promise.all(promises);

  const images: string[] = [];
  responses.forEach((res, idx) => {
    console.log(`🎨 [DRAFT ${idx + 1}] Candidates:`, res.candidates?.length || 0);
    res.candidates?.[0]?.content?.parts?.forEach(part => {
      if (part.inlineData) {
        images.push(`data:image/png;base64,${part.inlineData.data}`);
        console.log(`✅ [DRAFT ${idx + 1}] ${variations[idx].name} image generated`);
      }
    });
  });

  console.log(`🎨 [DRAFT GENERATION] Complete. Generated ${images.length} images`);
  return images;
};

// Phase 2: Edit/Refine (Flash Image or Pro Image)
// Analyze annotations to generate a better edit prompt
export const analyzeAnnotations = async (annotatedImage: string, userInstruction: string): Promise<string> => {
  const ai = getClient();
  
  console.log('🔍 [ANALYZE ANNOTATIONS] Analyzing user annotations...');
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: annotatedImage.split(',')[1] } },
        { text: `The user has annotated this image with bright green highlights to indicate areas they want to modify. User's instruction: "${userInstruction}"

Analyze the annotated regions and the user's instruction, then create a detailed, specific prompt for image editing that:
1. Identifies what objects/areas are highlighted
2. Understands what the user wants to change based on the instruction and context
3. Provides clear editing instructions

Respond with ONLY the improved editing prompt, nothing else.` }
      ]
    }
  });
  
  const improvedPrompt = response.candidates?.[0]?.content?.parts?.[0]?.text || userInstruction;
  console.log('🔍 [ANALYZE ANNOTATIONS] Improved prompt:', improvedPrompt);
  return improvedPrompt;
};

// Check spelling in image and provide fix instructions
export const checkSpelling = async (imageUrl: string): Promise<{
  hasErrors: boolean;
  errors: string[];
  fixInstruction: string;
}> => {
  const ai = getClient();
  
  console.log('✏️  [SPELL CHECK] Analyzing image for spelling errors...');
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: imageUrl.split(',')[1] } },
        { text: `Analyze all text visible in this image and check for spelling mistakes, typos, or grammatical errors.

Response format (JSON):
{
  "hasErrors": boolean,
  "errors": ["list of mistakes found with corrections"],
  "fixInstruction": "detailed instruction to fix all errors if any, or empty string if none"
}

Be thorough and check brand names, slogans, body text, and any visible text.` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hasErrors: { type: Type.BOOLEAN },
          errors: { type: Type.ARRAY, items: { type: Type.STRING } },
          fixInstruction: { type: Type.STRING }
        },
        required: ["hasErrors", "errors", "fixInstruction"]
      }
    }
  });
  
  let jsonStr = response.text || '{"hasErrors":false,"errors":[],"fixInstruction":""}';
  jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  const result = JSON.parse(jsonStr);
  
  console.log('✏️  [SPELL CHECK] Result:', result);
  return result;
};

// Used when user draws on the image or changes the prompt for a specific draft
export const editAsset = async (
  originalImage: string,
  maskImage: string | null,
  instruction: string
): Promise<string> => {
  const ai = getClient();

  console.log('✏️  [EDIT ASSET] Instruction:', instruction);
  console.log('✏️  [EDIT ASSET] Has mask:', !!maskImage);

  let finalInstruction = instruction;
  let imageToUse = originalImage;

  // If a composite image with highlights is provided, analyze it first
  if (maskImage) {
    // Step 1: Analyze annotations to get better prompt
    finalInstruction = await analyzeAnnotations(maskImage, instruction);
    imageToUse = maskImage;
  }

  const parts: any[] = [
    { inlineData: { mimeType: 'image/png', data: imageToUse.split(',')[1] } },
    { text: maskImage 
      ? `Edit this image based on the following instruction. The bright green annotations show the areas to modify: ${finalInstruction}. 

IMPORTANT: 
- PRESERVE all original details, elements, colors, text, and composition EXACTLY as they are
- ONLY modify the specific areas marked with bright green annotations
- DO NOT remove or change anything unless explicitly instructed to do so
- Remove all green annotations from the final result and return a clean edited image
- Keep the same style, quality, and overall look of the original`
      : `${finalInstruction}

IMPORTANT:
- PRESERVE all original details, elements, colors, text, and composition EXACTLY as they are  
- ONLY make the specific changes requested in the instruction
- DO NOT remove or change anything unless explicitly instructed to do so
- Keep the same style, quality, and overall look of the original` 
    }
  ];

  console.log('✏️  [EDIT ASSET] Using model: gemini-3-pro-image-preview with low resolution');
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: {
      imageConfig: {
        imageSize: "512" // Low resolution for faster editing
      }
    }
  });
  
  console.log('✏️  [EDIT ASSET] Response received');

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Editing failed");
};

// Phase 3: Finalize (High Res) using Imagen 3
export const finalizeAsset = async (dna: BrandDNA, draftImage: string, subtype: string): Promise<string> => {
  const ai = getClient();

  // We use the draft as a reference image to guide the high-quality generation
  const prompt = `
    Re-create this concept in extremely high resolution and production quality.
    Item: ${subtype} for brand ${dna.name}.
    Maintain the composition and colors of the reference image exactly, but improve texture, lighting, and detail.
    Resolution: 4K.
  `;

  console.log('🎯 [FINALIZE] Model: gemini-3-pro-image-preview');
  console.log('🎯 [FINALIZE] Prompt:', prompt);
  console.log('🎯 [FINALIZE] Subtype:', subtype);
  console.log('🎯 [FINALIZE] Has logo:', !!dna.logoImage);

  const parts: any[] = [
    { inlineData: { mimeType: 'image/png', data: draftImage.split(',')[1] } },
    { text: prompt }
  ];

  // We should re-inject the logo here to ensure the high-res version also has the correct logo details, 
  // although the draft image usually serves as the main reference.
  // Adding the logo again reinforces its fidelity in the upscale.
  if (dna.logoImage) {
    parts.push({ inlineData: { mimeType: 'image/png', data: dna.logoImage.split(',')[1] } });
    parts.push({ text: "Ensure the logo (provided as the second image) is rendered with perfect clarity and fidelity." });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: {
      imageConfig: { imageSize: "2K" } // High 2K resolution for final output
    }
  });

  console.log('🎯 [FINALIZE] Response candidates:', response.candidates?.length || 0);

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      console.log('✅ [FINALIZE] High-res image generated successfully');
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  console.error('❌ [FINALIZE] No image data in response');
  throw new Error("Finalization failed");
};

// Real-World Preview using Veo 3.1
export const generateRealWorldPreview = async (assetImage: string, subtype: string, brandDNA: BrandDNA): Promise<string> => {
  const ai = getClient();

  // Structured JSON-based prompts with detailed scene direction
  let promptJson: any = {};
  const st = subtype.toLowerCase();
  
  if (st.includes('hoodie') || st.includes('shirt') || st.includes('tshirt') || st.includes('t-shirt')) {
    promptJson = {
      "scene_description": "Professional corporate office environment during daytime",
      "subject": {
        "type": "Young professional, 25-30 years old",
        "wardrobe": `Wearing the EXACT ${subtype} design from reference image - match all colors, graphics, text, logo placement precisely`,
        "action": "Walking confidently through modern glass-walled office corridor with natural stride"
      },
      "camera": {
        "movement": "Smooth tracking shot following subject from side angle, steady cam",
        "framing": "Medium shot keeping the ${subtype} design clearly visible and centered",
        "transitions": "Cut to front view showing chest/design area in detail, then back to tracking"
      },
      "environment": {
        "setting": "Contemporary open-plan office with clean white walls, glass partitions, green plants",
        "lighting": "Natural window light from left side, soft ambient office lighting",
        "background_activity": "Blurred office workers at desks, creating authentic workplace atmosphere"
      },
      "technical_specs": {
        "duration": "6-8 seconds",
        "color_grading": "Clean, professional, slight warmth",
        "focus": "Rack focus from background to ${subtype} design on subject"
      },
      "critical_requirement": `The ${subtype} design MUST be 100% identical to reference image - exact colors, exact graphics, exact text, exact logo placement. No modifications allowed.`
    };
  } else if (st.includes('billboard')) {
    promptJson = {
      "scene_description": "POV from inside a moving car on a multi-lane highway during golden hour",
      "billboard": {
        "size": "Large roadside billboard (48ft x 14ft standard)",
        "content": "Displays EXACT design from reference image with 100% fidelity - same layout, colors, text, graphics, logo position",
        "position": "Right side of highway, 50 meters ahead initially",
        "mounting": "Professional steel frame structure on elevated platform"
      },
      "camera": {
        "perspective": "Dashboard camera POV, slight right angle to capture billboard",
        "movement": "Smooth forward motion at highway speed (~65 mph), approaching then passing billboard",
        "framing": "Billboard starts small in frame, grows to fill 60% of frame at closest point, then passes"
      },
      "environment": {
        "road": "4-lane highway with light traffic, clear asphalt",
        "time": "Late afternoon, golden hour lighting (4-5 PM)",
        "weather": "Clear sky with few clouds, excellent visibility",
        "surroundings": "Green grass embankment, distant trees, other highway signs visible"
      },
      "motion_details": {
        "car_speed": "Constant 65 mph",
        "passing_duration": "Billboard visible for 5-6 seconds total",
        "closest_approach": "2-3 seconds in, billboard fills maximum frame",
        "motion_blur": "Slight on foreground (dashboard edge), billboard crisp when centered"
      },
      "technical_specs": {
        "duration": "6-8 seconds",
        "color_grading": "Warm golden hour tones, enhanced billboard visibility",
        "sound_suggestion": "Highway ambient, wind, engine hum"
      },
      "critical_requirement": "Billboard design MUST match reference image with absolute precision - every pixel, every color value, every text character, every graphic element identical. Zero deviation permitted."
    };
  } else if (st.includes('banner') || st.includes('poster')) {
    promptJson = {
      "scene_description": "Modern office interior with cork or fabric notice board on white wall",
      "subject": {
        "type": "Professional hands (manicured, neutral tone)",
        "action": "Carefully positioning and smoothing ${subtype} onto notice board, starting top-right, smoothing downward"
      },
      "poster_details": {
        "design": `EXACT design from reference image - match perfectly: colors, layout, text, graphics, logo`,
        "material": "High-quality printed ${subtype}, slight paper texture visible",
        "size": "Standard poster/banner dimensions"
      },
      "camera": {
        "angle": "Close-up, slightly elevated angle (15 degrees)",
        "movement": "Static initially, slow push-in to show design details mid-shot",
        "framing": "Hands and ${subtype} fill 80% of frame, maintaining focus on design"
      },
      "environment": {
        "wall": "Clean white wall or light gray cork board",
        "lighting": "Soft overhead office lighting, no harsh shadows on poster",
        "background": "Slightly out of focus office environment, other notices visible blurred"
      },
      "action_sequence": [
        "Hands bring ${subtype} into frame from bottom",
        "Position upper corners against board",
        "Smooth hands moving down poster, removing air bubbles",
        "Final pat to secure, hands move away revealing complete design"
      ],
      "technical_specs": {
        "duration": "6-8 seconds",
        "color_grading": "Neutral, true-to-life colors emphasizing ${subtype} design",
        "focus": "Shallow depth of field, ${subtype} design sharp, background soft"
      },
      "critical_requirement": `${subtype} design must be IDENTICAL to reference image - perfect color match, perfect layout match, all text and graphics exactly as shown.`
    };
  } else if (st.includes('cap') || st.includes('hat')) {
    promptJson = {
      "scene_description": "Urban street environment, trendy neighborhood during daytime",
      "subject": {
        "type": "Stylish individual, 20-30 years old, contemporary streetwear",
        "headwear": `Wearing the EXACT ${subtype} design from reference image - match colors, graphics, logo precisely`,
        "action": "Walking casually down sidewalk with confident stride"
      },
      "camera": {
        "movement": "Orbiting 270-degree arc around subject while they walk",
        "path": "Start front-left, circle to back, end front-right",
        "framing": "Upper body and head shots, keeping ${subtype} design visible throughout",
        "speed": "Smooth gimbal movement, 6-second complete orbit"
      },
      "environment": {
        "location": "Clean urban sidewalk with brick buildings, cafe storefronts",
        "lighting": "Natural daylight, slight overcast for even lighting on ${subtype}",
        "background": "Pedestrians walking (blurred), parked bicycles, street signs"
      },
      "angle_sequence": [
        "0s-2s: Front-left view, ${subtype} brim and front design visible",
        "2s-4s: Side and back view showing profile and back of ${subtype}",
        "4s-6s: Front-right view, final clear view of ${subtype} design"
      ],
      "technical_specs": {
        "duration": "6-8 seconds",
        "color_grading": "Urban chic, slightly desaturated background, ${subtype} colors accurate",
        "stabilization": "Smooth gimbal, no camera shake"
      },
      "critical_requirement": `${subtype} design MUST be 100% faithful to reference image - exact colors, exact graphics, exact logo, exact text.`
    };
  } else if (st.includes('tote') || st.includes('bag')) {
    promptJson = {
      "scene_description": "Trendy coffee shop district, outdoor pedestrian area",
      "subject": {
        "type": "Fashionable person, casual-chic outfit",
        "carrying": `The EXACT ${subtype} design from reference image - match all colors, graphics, text, logo perfectly`,
        "action": "Walking naturally through shopping street, bag swinging gently with stride"
      },
      "camera": {
        "primary_angle": "Side tracking shot at waist level",
        "movement": "Parallel tracking with subject, maintaining consistent distance",
        "framing": "${subtype} visible throughout, occupying 30-40% of frame"
      },
      "environment": {
        "setting": "Upscale shopping district with cafe umbrellas, boutique windows",
        "time": "Mid-morning, soft natural light",
        "atmosphere": "Few other pedestrians, green plants, street furniture"
      },
      "bag_movement": {
        "physics": "Natural swing with walking gait, 2-second pendulum motion",
        "visibility": "Design faces camera 60% of time as bag swings",
        "handling": "Carried on shoulder or in hand, design prominently displayed"
      },
      "technical_specs": {
        "duration": "6-8 seconds",
        "color_grading": "Lifestyle aesthetic, warm tones, ${subtype} colors accurate",
        "motion": "Natural walking pace, bag sway matches stride rhythm"
      },
      "critical_requirement": `${subtype} design must be EXACTLY as shown in reference image - perfect color fidelity, perfect graphic reproduction, all details identical.`
    };
  } else {
    promptJson = {
      "scene_description": `Professional showcase environment for ${subtype}`,
      "subject": `The EXACT ${subtype} design from reference image`,
      "camera": {
        "movement": "Cinematic reveal with slow push-in and orbit",
        "framing": "Hero product shot, ${subtype} centered and prominent"
      },
      "lighting": "Studio-quality three-point lighting, emphasizing design details",
      "technical_specs": {
        "duration": "6-8 seconds",
        "aesthetic": `${brandDNA.visualEssence}`,
        "color_accuracy": "Reference image match required"
      },
      "critical_requirement": `${subtype} MUST match reference image with 100% precision - all colors, text, graphics, layout exactly as provided.`
    };
  }

  const prompt = `Generate video based on this scene direction:\n\n${JSON.stringify(promptJson, null, 2)}\n\nBrand: ${brandDNA.name}`;

  console.log('🎬 [PREVIEW] Model: veo-3.1-generate-preview');
  console.log('🎬 [PREVIEW] JSON Prompt:', JSON.stringify(promptJson, null, 2));
  console.log('🎬 [PREVIEW] Subtype:', subtype);

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-generate-preview',
    prompt: prompt,
    image: {
      imageBytes: assetImage.split(',')[1],
      mimeType: 'image/png'
    },
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
  });

  console.log('🎬 [PREVIEW] Operation started, polling...');

  // Poll for completion
  let pollCount = 0;
  while (!operation.done && pollCount < 60) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation });
    pollCount++;
    console.log(`🎬 [PREVIEW] Poll ${pollCount}: ${operation.done ? 'COMPLETE' : 'In progress...'}`);
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) {
    console.error('❌ [PREVIEW] No video URI in response');
    throw new Error("Preview generation failed");
  }

  console.log('✅ [PREVIEW] Video generated successfully:', videoUri);
  return `${videoUri}&key=${process.env.API_KEY}`;
};

// Phase 4: Visualize (Veo 3)
export const generateVisualizationVideo = async (assetImage: string, subtype: string): Promise<string> => {
  const ai = getClient();

  let prompt = "";
  if (subtype.toLowerCase().includes('hoodie') || subtype.toLowerCase().includes('shirt')) {
    prompt = "A cinematic video of a fashion model walking down a city street wearing this exact clothing item. Realistic fabric physics, 4k.";
  } else if (subtype.toLowerCase().includes('billboard')) {
    prompt = "A cinematic video from a moving car driving past a large highway billboard displaying this exact advertisement. Realistic lighting, 4k.";
  } else {
    prompt = "A cinematic commercial showcase of this product, rotating slowly in a studio environment.";
  }

  console.log('🎬 [VIDEO] Model: veo-3.1-generate-preview');
  console.log('🎬 [VIDEO] Prompt:', prompt);
  console.log('🎬 [VIDEO] Subtype:', subtype);

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-generate-preview',
    prompt: prompt,
    image: {
      imageBytes: assetImage.split(',')[1],
      mimeType: 'image/png'
    },
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
  });
  
  console.log('🎬 [VIDEO] Operation started, polling for completion...');

  let pollCount = 0;
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation });
    pollCount++;
    console.log(`🎬 [VIDEO] Poll ${pollCount}: ${operation.done ? 'COMPLETE' : 'In progress...'}`);
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) {
    console.error('❌ [VIDEO] No video URI in response');
    throw new Error("Video generation failed");
  }

  console.log('✅ [VIDEO] Video generated successfully:', videoUri);
  return `${videoUri}&key=${process.env.API_KEY}`;
};
