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

const getRoleInstructions = (config: GenerationConfig): string => {
    const { lightingStyle } = config;

    const lightingStyleDescription = lightingStyle === 'sharp' ? "'Nítida y Enérgica'" : "'Suave y Uniforme'";

    return `
# INSTRUCCIONES DE IDENTIDAD Y ROLES PROFESIONALES (MANDATORIO)

Tu identidad se compone de múltiples roles profesionales. Debes fusionar las responsabilidades de cada perfil para garantizar que el resultado final cumpla con los estándares de la más alta calidad en e-commerce y publicidad.

---

### 1. Rol: Director de Arte y Retoque Ético (Maestro de la Composición y la Integridad)
*   **Objetivo Central:** Establecer la arquitectura visual de la imagen y garantizar la integridad del sujeto principal, especialmente si es un modelo humano.
*   **Reglas Obligatorias:**
    *   **Integridad de Modelos Humanos (Regla INVIOLABLE):** Si la imagen de origen contiene un modelo humano (adulto o niño), está terminantemente prohibido alterar, modificar, reemplazar o eliminar al modelo. El recorte debe ser perfecto, pero el modelo en sí (su cuerpo, rostro, pose y la ropa que lleva) es INTOCABLE. Tu trabajo se limita a cambiar el fondo y el entorno. CUALQUIER cambio en el modelo es una falla crítica.
    *   **Composición Fundacional:** Aplica la Regla de los Tercios. El sujeto principal (producto o modelo) debe ser el foco claro y ocupar visualmente entre el 30% y el 60% del encuadre para un equilibrio óptimo.
    *   **Gestión de Espacio Negativo (Airflow):** El espacio negativo debe ser utilizado estratégicamente para dirigir la mirada al sujeto y proporcionar "aire" para textos publicitarios, especialmente en formatos anchos.
    *   **Adaptabilidad al Aspecto Ratio (Mandatorio):** La composición debe ser responsiva y dinámica:
        *   **1:1 (Cuadrado):** Posición central fuerte, ideal para feeds de redes sociales.
        *   **4:5 (Vertical):** Enfoca en el sujeto, llenando el encuadre de forma natural. Perfecto para posts.
        *   **16:9 (Widescreen):** Utiliza el formato horizontal para contextualizar. El sujeto debe estar en un tercio lateral, dejando espacio para el ambiente o texto. Ideal para banners.
    *   **Percepción de Perspectiva:** Mantén una perspectiva realista. El sujeto debe estar correctamente escalado y colocado en el plano del fondo, respetando la línea del horizonte para evitar un aspecto de "recorte flotante".

---

### 2. Rol: Fotógrafo Profesional (Experto en Iluminación y Tono)
*   **Objetivo Principal:** Recrear la iluminación de un estudio fotográfico de alta gama.
*   **Gestión de la Luz:** El estilo seleccionado es **${lightingStyleDescription}**. Si es 'Nítida y Enérgica', usa iluminación dura para crear sombras definidas. Si es 'Suave y Uniforme', usa iluminación difusa para minimizar sombras. La luz debe parecer natural en la escena.
*   **Fotorrealismo:** La dirección y dureza de la luz en el sujeto deben coincidir con la luz del fondo generado.

---

### 3. Rol: Experto en Producción y E-commerce (Especialista en Conversión)
*   **Objetivo Principal:** Entregar un archivo final optimizado para la venta online.
*   **Nitidez y Detalle:** Aplica un pase de nitidez optimizado para el MÁXIMO NIVEL DE DETALLE Y RESOLUCIÓN. Los bordes y texturas deben ser extremadamente nítidos.
*   **Fidelidad al Producto:** La máxima prioridad es la fidelidad del color (color accuracy) para minimizar devoluciones. Los colores del producto no deben cambiar.
*   **Consistencia de Catálogo:** La imagen final debe sentirse profesional y coherente con un catálogo de e-commerce de alta calidad.
    `;
};

const getSeparationDescription = (level: number): string => {
    if (level < 20) return "con un espacio mínimo entre ellos, casi tocándose";
    if (level < 40) return "con una separación ligera entre ellos";
    if (level < 60) return "con una separación moderada y equilibrada";
    if (level < 80) return "con una separación amplia, dejando bastante espacio entre ellos";
    return "lo más separados posible, maximizando la distancia entre ellos dentro del lienzo";
};

const buildGenerationPrompt = (config: GenerationConfig, imageCount: number, isVariation: boolean = false): string => {
    const { backgroundType, backgroundKeywords, aspectRatio, productView, addReflection, separateProducts, productSeparation } = config;

    let backgroundInstruction = '';
    switch (backgroundType) {
        case 'pure_white':
            backgroundInstruction = 'un fondo sólido y blanco puro (#FFFFFF)';
            break;
        case 'neutral_gray':
            backgroundInstruction = 'un fondo sólido y gris neutro (#F7F7F7)';
            break;
        case 'themed':
            backgroundInstruction = `una escena fotorrealista descrita como: "${backgroundKeywords}". El sujeto debe parecer naturalmente integrado en este entorno.`;
            break;
        case 'automatic':
            backgroundInstruction = `Actúa como un director de arte experto. Analiza en profundidad el producto subido (su estilo, color dominante, forma, materiales y categoría). Basado en este análisis, genera un fondo fotorrealista que sea contextualmente relevante y visualmente impactante. El fondo debe realzar las cualidades del producto, crear una atmósfera aspiracional y ser perfecto para una campaña de e-commerce de alta gama. Por ejemplo, para un reloj de lujo, podrías generar una escena sobre una superficie de mármol oscuro con iluminación dramática. Para unas zapatillas de running, una pista de atletismo al amanecer.`;
            break;
    }

    const steps = [
        `Analiza la imagen de entrada para determinar si el sujeto principal es un producto aislado o un modelo humano (adulto o niño) presentando un producto.`,
        `Elimina impecablemente el fondo original, creando un recorte perfecto (enmascaramiento de calidad profesional) del sujeto principal. Si es un modelo humano, presta atención extrema al detalle en el cabello y los bordes de la ropa.`
    ];

    switch (productView) {
        case 'original':
            steps.push(`REGLA INVIOLABLE: Mantén la apariencia original del sujeto (producto y/o modelo) sin ninguna modificación en su color, textura, forma, logos o detalles. Presenta el sujeto exactamente como está en la imagen de origen. La fidelidad al 100% es crítica.`);
            break;
        case 'enhanced':
            steps.push(`REGLA DE ORO: El producto y/o modelo deben permanecer 100% idénticos al original. NO se permite NINGUNA alteración de color, textura, forma, logos o cualquier detalle intrínseco. Tu misión es presentar el mismo sujeto intacto, pero explorando una composición o un ángulo de cámara ligeramente más dinámico y atractivo. Imagina que tomas la foto desde una perspectiva sutilmente diferente para darle un mayor impacto visual, sin modificar el producto en sí.`);
            break;
    }

    if (imageCount > 1) {
        let arrangementInstruction = `Organiza todos los sujetos recortados en una composición única y cohesiva. Asegúrate de que la escala, la perspectiva y la iluminación entre ellos sean consistentes y realistas. TODOS deben aparecer juntos en la imagen final.`;
        if (separateProducts && (backgroundType === 'pure_white' || backgroundType === 'neutral_gray')) {
            const separationText = getSeparationDescription(productSeparation);
            arrangementInstruction += ` CRÍTICO: Los productos deben colocarse por separado en el lienzo, sin tocarse ni superponerse, ${separationText}.`;
        }
        steps.push(arrangementInstruction);
    }

    steps.push(`Coloca el/los sujeto(s) resultante(s) en un nuevo fondo. El fondo debe ser: ${backgroundInstruction}.`);

    if (addReflection && (backgroundType === 'pure_white' || backgroundType === 'neutral_gray')) {
        steps.push(`Añade un reflejo sutil y realista del sujeto en la superficie para mejorar la sensación de profundidad.`);
    }
    
    let aspectRatioDetails = '';
    switch(aspectRatio) {
      case '1:1': 
        aspectRatioDetails = 'La imagen debe ser un cuadrado perfecto.'; 
        break;
      case '4:5':
        aspectRatioDetails = 'La imagen debe ser un rectángulo vertical.';
        break;
      case '16:9': 
        aspectRatioDetails = 'La imagen debe ser un rectángulo horizontal.'; 
        break;
    }
    
    const resolutionInstruction = `REQUISITO DE CALIDAD CRÍTICO: Genera la imagen con el MÁXIMO NIVEL DE DETALLE Y RESOLUCIÓN POSIBLE, apuntando a una resolución nativa de 1536px en su lado más largo.`;
        
    steps.push(`${resolutionInstruction} REQUISITO DE FORMATO MANDATORIO: La imagen debe adherirse estricta e impecablemente a la relación de aspecto ${aspectRatio} (${aspectRatioDetails}). No se aceptarán desviaciones. El sujeto principal debe ser el protagonista indiscutible.`);


    const numberedSteps = steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
    
    const roleInstructions = getRoleInstructions(config);

    const basePrompt = `
      ${roleInstructions}

      ---
      **MISIÓN ACTUAL:**
      **DIRECTIVA CRÍTICA SOBRE MODELOS HUMANOS Y PRODUCTOS:** Tu prioridad absoluta es preservar el producto y/o modelo 100% intacto. NO alteres su apariencia, ropa, pose, color o detalles. Tu única misión es cambiar el fondo y ajustar la iluminación general de la escena.
      
      Ahora, aplicando rigurosamente todos los roles y directrices anteriores, ejecuta la siguiente misión paso a paso:

      **Pasos a Seguir:**
      ${numberedSteps}
    `;

    if (isVariation) {
        return `
        **GENERAR UNA VARIANTE CREATIVA.**
        Tu objetivo es crear una nueva versión, claramente diferente, de la siguiente solicitud. Explora una composición, ángulo o detalle ambiental diferente para proporcionar una alternativa única. Los dos resultados deben ser totalmente distintos, pero AMBOS deben seguir la regla inviolable sobre no alterar productos o modelos humanos si están presentes.
        ---
        ${basePrompt}
        `
    }

    return basePrompt;
};

export const generateProductImage = async (images: UploadedFile[], config: GenerationConfig): Promise<string[]> => {
    try {
        const imageParts = images.map(img => base64ToGenerativePart(img.base64, img.type));

        const generate = async (isVariation: boolean = false): Promise<string> => {
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
            throw new Error(`El modelo no devolvió una imagen para la ${isVariation ? 'segunda' : 'primera'} opción. La respuesta puede haber sido bloqueada.`);
        }

        const promises = [generate(false), generate(true)];
        const results = await Promise.allSettled(promises);
        
        const successfulImages = results
            .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
            .map(result => result.value);

        if (successfulImages.length === 0) {
            const firstRejection = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
            const errorMessage = firstRejection?.reason?.message || "Ambas generaciones de imágenes fallaron. La respuesta pudo haber sido bloqueada por filtros de seguridad.";
            throw new Error(errorMessage);
        }

        return successfulImages;
        
    } catch (error) {
        console.error("Error generating product image:", error);
        throw error instanceof Error ? error : new Error("Failed to generate image. Please check your prompt or API key.");
    }
};

export const refineProductImage = async (baseImage: UploadedFile, command: string, config: GenerationConfig): Promise<string> => {
    if (!command.trim()) {
        throw new Error("Refinement command cannot be empty.");
    }

    try {
        const backgroundDescription = config.backgroundType === 'themed' ? `temático descrito como "${config.backgroundKeywords}"` : config.backgroundType.replace(/_/g, ' ');
        const lightingDescription = config.lightingStyle === 'sharp' ? 'Nítida y Enérgica' : 'Suave y Uniforme';

        const prompt = `
            Eres un experto Editor de Fotos IA.
            Tu tarea es aplicar un refinamiento específico a una fotografía de producto generada previamente, basándote en el comando del usuario.

            **CONTEXTO DE LA IMAGEN ORIGINAL (MANDATORIO):**
            *   **Tipo de Fondo:** ${backgroundDescription}
            *   **Estilo de Iluminación:** ${lightingDescription}
            *   **Relación de Aspecto:** ${config.aspectRatio}

            Tu refinamiento debe respetar este contexto. Realiza un ajuste sutil y profesional que se integre de forma natural con la estética existente. No alteres drásticamente el estilo, la composición o los colores.

            **COMANDO DEL USUARIO A EJECUTAR:**
            "${command}"

            **REGLA CRÍTICA INVIOLABLE:**
            El producto y/o modelo humano en la imagen son INTOCABLES. NO los alteres de ninguna manera (color, forma, textura, etc.). Tu tarea es aplicar los cambios al entorno, la iluminación general o la atmósfera, pero el sujeto principal debe permanecer 100% idéntico al original.
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
            throw new Error("No se generó ninguna imagen para el refinamiento. La respuesta puede haber sido bloqueada.");
        }

    } catch (error) {
        console.error("Error refining product image:", error);
        throw new Error("No se pudo refinar la imagen. Por favor, intenta con un comando diferente.");
    }
};