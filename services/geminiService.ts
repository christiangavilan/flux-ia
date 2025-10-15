import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerationConfig, UploadedFile } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const base64ToGenerativePart = (base64: string, mimeType: string) => {
    return {
        inlineData: {
            data: base64,
            mimeType,
        },
    };
};

const buildGenerationPrompt = (config: GenerationConfig, imageCount: number, isVariation: boolean = false): string => {
    const { backgroundType, backgroundKeywords, lightingStyle, aspectRatio, outputSize, productView } = config;

    let backgroundInstruction = '';
    switch (backgroundType) {
        case 'pure_white':
            backgroundInstruction = 'a solid, pure white background (#FFFFFF)';
            break;
        case 'neutral_gray':
            backgroundInstruction = 'a solid, neutral gray background (#CCCCCC)';
            break;
        case 'themed':
            backgroundInstruction = `a photorealistic scene described as: "${backgroundKeywords}". The product(s) must look naturally placed within this environment.`;
            break;
        case 'automatic':
            backgroundInstruction = `a fitting, photorealistic background that creatively complements the product's style, category, and potential use case. Analyze the product and generate a contextually relevant and visually appealing environment for e-commerce. The product(s) must look naturally placed within this new scene.`;
            break;
    }

    let lightingInstruction = '';
    switch (lightingStyle) {
        case 'sharp':
            lightingInstruction = "'Nitidez y Energía' (Sharp and Energetic): use cool, crisp lighting with high contrast to create a modern, energetic feel.";
            break;
        case 'soft':
            lightingInstruction = "'Suave y Uniforme' (Soft and Uniform): use warm, soft, diffused lighting to create an elegant, gentle, and premium feel.";
            break;
    }
    
    let productViewInstruction = '';
    switch (productView) {
        case 'original':
            productViewInstruction = "3. CRITICAL: Maintain the product's original appearance without any modifications to its color, texture, shape, or details. Present the product exactly as it is in the source image.";
            break;
        case 'enhanced':
            productViewInstruction = "3. Subtly enhance the product's appearance, improving color saturation, texture clarity, and lighting to make it more appealing, while strictly maintaining its core identity and all original details.";
            break;
    }

    const compositionInstruction = imageCount > 1
        ? "4. Arrange the cut-out products into a single, cohesive, and visually appealing composition. Ensure the scale, perspective, and lighting between the products are consistent and realistic."
        : "";

    const basePrompt = `
      You are a world-class E-commerce Product Photographer AI. Your mission is to transform user-provided product images into professional, high-impact advertisement photos.
      Follow these steps precisely:
      1. Precisely identify the main product(s) in the image(s).
      2. Impeccably remove their original backgrounds, creating a perfect cutout with professional-grade masking.
      ${productViewInstruction}
      ${compositionInstruction}
      5. Place the product(s) onto a new background. The background must be: ${backgroundInstruction}.
      6. Apply a professional lighting style to the entire final composition. The style is ${lightingInstruction}.
      7. The final image must be of the highest quality, equivalent to a ${outputSize} photograph, and have a strict aspect ratio of ${aspectRatio}. The product(s) must be the undeniable protagonists.
    `;

    if (isVariation) {
        return `
        GENERATE A CREATIVE VARIATION.
        Your goal is to create a new, distinctly different version of the following product photography request. Explore a different composition, angle, or environmental detail to provide a unique alternative. The two results must be totally different.
        ---
        ${basePrompt}
        `
    }

    return basePrompt;
};

export const generateProductImage = async (images: UploadedFile[], config: GenerationConfig): Promise<string[]> => {
    try {
        const imageParts = images.map(img => base64ToGenerativePart(img.base64, img.type));

        const generate = async (isVariation: boolean = false) => {
            const prompt = buildGenerationPrompt(config, images.length, isVariation);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }, ...imageParts] },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const firstPart = response.candidates?.[0]?.content?.parts?.[0];
            if (firstPart && firstPart.inlineData) {
                return firstPart.inlineData.data;
            }
            throw new Error(`The model did not return an image for the ${isVariation ? 'second' : 'first'} option. The response may have been blocked.`);
        }

        if (config.backgroundType === 'themed' || config.backgroundType === 'automatic') {
            const [image1, image2] = await Promise.all([
                generate(false),
                generate(true),
            ]);
            return [image1, image2];
        } else {
            const result = await generate(false);
            return [result];
        }
        
    } catch (error) {
        console.error("Error generating product image:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to generate image. Please check your prompt or API key.");
    }
};

export const refineProductImage = async (baseImage: UploadedFile, command: string, config: GenerationConfig): Promise<string> => {
    if (!command.trim()) {
        throw new Error("Refinement command cannot be empty.");
    }

    try {
        const prompt = `
            You are an expert Photo Editor AI.
            You are given a previously generated product photograph. Your task is to apply a specific refinement based on the user's command, making a subtle yet effective adjustment.
            User's command: "${command}".
            Apply this change to the provided image. Maintain the original aspect ratio of ${config.aspectRatio}. Do not drastically change the style, lighting, or background unless specifically asked. The change should be incremental and professional.
        `;

        const imagePart = base64ToGenerativePart(baseImage.base64, baseImage.type);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }, imagePart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        const firstPart = response.candidates?.[0]?.content?.parts?.[0];
        if (firstPart && firstPart.inlineData) {
            return firstPart.inlineData.data;
        } else {
            throw new Error("No image was generated for refinement. The response may have been blocked.");
        }

    } catch (error) {
        console.error("Error refining product image:", error);
        throw new Error("Failed to refine image. Please try a different command.");
    }
};
