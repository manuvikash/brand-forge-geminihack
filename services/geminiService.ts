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
        model: 'gemini-3-pro-preview',
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
  // Artificial delay for UX pacing if the search was too fast
  if (!websiteUrl) await new Promise(r => setTimeout(r, 800));

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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
    model: 'gemini-3-pro-preview',
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
  const promptText = buildPrompt(dna, inspirations, type, subtype, "Create 4 distinct variations.");

  console.log('🎨 [DRAFT GENERATION] Starting...', { type, subtype, hasLogo: !!dna.logoImage });

  const parts: any[] = [{ text: promptText }];

  // Inject Logo if available
  if (dna.logoImage) {
    console.log('🖼️  [DRAFT GENERATION] Adding logo to parts');
    parts.push({
      inlineData: { mimeType: 'image/png', data: dna.logoImage.split(',')[1] }
    });
    // Add instruction for the image part
    parts.push({ text: "Use the image above as the Brand Logo referenced in the prompt. Place it naturally on the product." });
  }

  // Generate images using Imagen 3
  // We'll generate 4 parallel requests for diversity.
  console.log('🎨 [DRAFT GENERATION] Using model: gemini-3-pro-image-preview');
  const promises = Array(4).fill(0).map(() =>
    ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts }, // Use constructed parts with potential logo
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    })
  );

  const responses = await Promise.all(promises);

  const images: string[] = [];
  responses.forEach((res, idx) => {
    console.log(`🎨 [DRAFT ${idx + 1}] Candidates:`, res.candidates?.length || 0);
    res.candidates?.[0]?.content?.parts?.forEach(part => {
      if (part.inlineData) {
        images.push(`data:image/png;base64,${part.inlineData.data}`);
        console.log(`✅ [DRAFT ${idx + 1}] Image generated successfully`);
      }
    });
  });

  console.log(`🎨 [DRAFT GENERATION] Complete. Generated ${images.length} images`);
  return images;
};

// Phase 2: Edit/Refine (Flash Image or Pro Image)
// Used when user draws on the image or changes the prompt for a specific draft
export const editAsset = async (
  originalImage: string,
  maskImage: string | null,
  instruction: string
): Promise<string> => {
  const ai = getClient();

  console.log('✏️  [EDIT ASSET] Instruction:', instruction);
  console.log('✏️  [EDIT ASSET] Has mask:', !!maskImage);

  const parts: any[] = [
    { inlineData: { mimeType: 'image/png', data: originalImage.split(',')[1] } },
    { text: instruction }
  ];

  // If a drawing/mask is provided, add it.
  if (maskImage) {
    parts.push({ inlineData: { mimeType: 'image/png', data: maskImage.split(',')[1] } });
    parts.push({ text: "Use the second image as a sketch/mask guidance for the changes." });
  }

  console.log('✏️  [EDIT ASSET] Using model: gemini-3-pro-image-preview');
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
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
      imageConfig: { imageSize: "1K" } // Or 2K/4K if needed
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

// Phase 4: Visualize (Veo 2)
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

  console.log('🎬 [VIDEO] Model: veo-2.0-generate-exp');
  console.log('🎬 [VIDEO] Prompt:', prompt);
  console.log('🎬 [VIDEO] Subtype:', subtype);

  let operation = await ai.models.generateVideos({
    model: 'veo-2.0-generate-exp',
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