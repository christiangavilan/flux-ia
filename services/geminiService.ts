
import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerationConfig, UploadedFile } from '../types';

const getClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

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

    // MODIFICACIÓN CRÍTICA: Se eliminaron las palabras "reflector", "softbox", "paraguas".
    // Se enfatiza "FUENTE INVISIBLE" para evitar que la IA dibuje el equipo.
    const lightingStyleDescription = lightingStyle === 'sharp' 
        ? "Simula una luz dura y direccional (Hard Light) proveniente de una fuente INVISIBLE y FUERA DE CAMPO. La luz debe golpear el producto directamente. Objetivo: Sombras definidas, alto micro-contraste, texturas resaltadas."
        : "Simula una luz difusa y envolvente (Soft Light) proveniente de grandes paneles difusores INVISIBLES y FUERA DE CAMPO. La luz debe abrazar el producto. Objetivo: Sombras muy suaves, transiciones tonales graduales, look Premium.";

    return `
# CONSTITUCIÓN DE FLUX IA (REGLAS DE ORO INVIOLABLES)

Como Jefe de Producción de Flux IA, estás sometido a las siguientes LEYES SUPREMAS. Cualquier desviación resultará en una falla del sistema:

### 🛡️ ARTÍCULO 1: INTEGRIDAD DEL PRODUCTO (EL HÉROE)
*   **MANDATO:** El producto es sagrado. Debe representarse con fidelidad absoluta.
*   **PROHIBICIONES:** Queda terminantemente PROHIBIDO alterar logos, tipografías, costuras, patrones, texturas o proporciones geométricas del producto original.
*   **ROL:** Eres un fotógrafo documental del producto, NO un diseñador industrial. Lo que ves es lo que muestras.

### 👤 ARTÍCULO 2: PROTECCIÓN DE MODELOS HUMANOS
*   **MANDATO:** Si la imagen contiene una persona (adulto o niño), es INTOCABLE.
*   **ACCIÓN:** Tu única tarea es recortarlos e integrarlos en el nuevo fondo.
*   **PROHIBICIONES:** NO cambies sus rasgos faciales, color de piel, pose, expresión ni la ropa que visten.

### 🧹 ARTÍCULO 3: LIMPIEZA DE SET (FUENTES DE LUZ INVISIBLES)
*   **MANDATO:** La imagen final es un activo de marketing, NO una foto "detrás de cámaras".
*   **REGLA DE ORO:** La luz debe parecer mágica. NUNCA muestres la fuente de la luz.
*   **LISTA NEGRA VISUAL (PROHIBIDO DIBUJAR):** Trípodes, patas de stand, softboxes negros, telas reflectoras, paraguas plateados, cables en el suelo, estructura del estudio.

### 🎨 ARTÍCULO 4: CALIDAD VISUAL (SIMULACIÓN 8K)
*   **MANDATO:** Evitar el "look de IA" (plástico, lavado o suavizado excesivo).
*   **ACCIÓN:** Fuerza un renderizado con texturas nítidas y micro-contraste realista. La madera debe tener veta; el metal, grano.
*   **FÍSICA:** Las sombras y reflejos deben obedecer estrictamente a la dirección de la luz solicitada (${lightingStyle === 'sharp' ? 'Dura' : 'Suave'}).

### 📐 ARTÍCULO 5: ENCUADRE Y COMPOSICIÓN
*   **MANDATO:** Totalidad del sujeto.
*   **ACCIÓN:** El producto NUNCA debe ser recortado por los bordes del lienzo. Añade "aire" (padding) suficiente alrededor del sujeto para asegurar que se vea completo y respire dentro del formato solicitado.

### 👁️ ARTÍCULO 6: FIDELIDAD DE COLOR
*   **MANDATO:** Precisión comercial.
*   **ACCIÓN:** Los colores del producto deben ser idénticos al input. Si el fondo afecta el color del producto (color cast), corrígelo localmente para mantener la fidelidad del SKU.

---

### ROLES ACTIVOS PARA ESTA MISIÓN:

1.  **Director de Arte:** Responsable de la coherencia atmosférica y la integración emocional del fondo.
2.  **Iluminador Técnico:** Ejecuta el estilo de iluminación: **${lightingStyleDescription}**.
3.  **Retocador Senior:** Ejecuta el recorte perfecto (masking) y la limpieza absoluta de la escena.
    `;
};

const getSeparationDescription = (level: number): string => {
    if (level < 20) return "con un espacio mínimo entre ellos, casi tocándose";
    if (level < 40) return "con una separación ligera entre ellos";
    if (level < 60) return "con una separación moderada y equilibrada";
    if (level < 80) return "con una separación amplia, dejando bastante espacio entre ellos";
    return "lo más separados posible, maximizando la distancia entre ellos dentro del lienzo";
};

const getBlurDescription = (level: number): string => {
    if (level <= 0) return "El fondo debe ser completamente nítido (f/16).";
    if (level < 20) return "Aplica un desenfoque de fondo muy sutil (f/8).";
    if (level < 40) return "Aplica un desenfoque de fondo suave (f/5.6).";
    if (level < 60) return "Aplica un desenfoque de fondo moderado, separando sujeto y fondo (f/4).";
    if (level < 80) return "Aplica un desenfoque de fondo fuerte y cremoso (f/2.8).";
    return "Aplica un desenfoque de fondo máximo (Bokeh artístico f/1.4), abstrayendo el entorno.";
};

const buildGenerationPrompt = (config: GenerationConfig, imageCount: number, isVariation: boolean = false): string => {
    const { backgroundType, backgroundKeywords, aspectRatio, productView, addReflection, separateProducts, productSeparation, backgroundBlur } = config;

    let backgroundInstruction = '';
    switch (backgroundType) {
        case 'pure_white':
            backgroundInstruction = 'un fondo infinito BLANCO PURO (#FFFFFF). Sin viñetas, sin sombras raras en las esquinas. Estudio comercial limpio.';
            break;
        case 'neutral_gray':
            backgroundInstruction = 'un fondo infinito GRIS NEUTRO (#F7F7F7). Profesional y sobrio.';
            break;
        case 'themed':
            backgroundInstruction = `un entorno fotorrealista de alta gama: "${backgroundKeywords}". La integración debe ser física (sombras de contacto) y lumínica.`;
            break;
        case 'automatic':
            backgroundInstruction = `un escenario generado por IA (Auto-Director) que maximice el valor comercial del producto detectado. Analiza materiales y colores para proponer el mejor contraste y contexto de lujo.`;
            break;
    }

    const steps = [
        `PASO 1 (ANÁLISIS): Identifica el sujeto principal (producto o modelo).`,
        `PASO 2 (EXTRACCIÓN): Recorta el sujeto con precisión quirúrgica. Cuidado extremo con cabellos o bordes translúcidos.`
    ];

    switch (productView) {
        case 'original':
            steps.push(`PASO 3 (INTEGRIDAD): ¡ALERTA ROJA! Mantén el sujeto 100% idéntico al original píxel a píxel. NO modifiques colores, tramas ni logotipos.`);
            break;
        case 'enhanced':
            steps.push(`PASO 3 (MEJORA): Mantén la geometría y logos intactos, pero puedes mejorar sutilmente el contraste local y la viveza de los materiales para un look más "publicitario".`);
            break;
    }

    if (imageCount > 1) {
        let arrangementInstruction = `PASO 4 (COMPOSICIÓN MÚLTIPLE): Organiza todos los sujetos en el lienzo.`;
        if (separateProducts && (backgroundType === 'pure_white' || backgroundType === 'neutral_gray')) {
            const separationText = getSeparationDescription(productSeparation);
            arrangementInstruction += ` MODO GRID: Coloca los productos ${separationText}. Asegura que NO se superpongan.`;
        } else {
            arrangementInstruction += ` Crea una composición de grupo natural y cohesiva.`;
        }
        steps.push(arrangementInstruction);
    }

    steps.push(`PASO 5 (GENERACIÓN DE FONDO): Coloca el resultado en ${backgroundInstruction}.`);
    
    if ((backgroundType === 'themed' || backgroundType === 'automatic') && backgroundBlur > 0) {
        steps.push(`PASO 6 (ÓPTICA): ${getBlurDescription(backgroundBlur)}`);
    }

    if (addReflection && (backgroundType === 'pure_white' || backgroundType === 'neutral_gray')) {
        steps.push(`PASO EXTRA: Genera un reflejo de suelo sutil y elegante (efecto espejo pulido).`);
    }
    
    let aspectRatioDetails = '';
    switch(aspectRatio) {
      case '1:1': aspectRatioDetails = 'Cuadrado (1:1)'; break;
      case '4:5': aspectRatioDetails = 'Vertical (4:5)'; break;
      case '16:9': aspectRatioDetails = 'Horizontal (16:9)'; break;
    }
    
    steps.push(`PASO CRÍTICO (ENCUADRE): Ajusta la cámara para cumplir el formato ${aspectRatioDetails}. IMPORTANTE: Deja "aire" (padding) alrededor del producto. NO cortes el producto en los bordes.`);

    const numberedSteps = steps.map((step) => `${step}`).join('\n');
    
    const roleInstructions = getRoleInstructions(config);

    // SE AÑADE UN BLOQUE DE NEGATIVE PROMPT EXPLÍCITO AL FINAL
    const basePrompt = `
      ${roleInstructions}

      ---
      **EJECUCIÓN DE MISIÓN (PRIORIDAD: CALIDAD COMERCIAL):**
      
      Sigue esta secuencia estricta:
      ${numberedSteps}

      ---
      ⛔ NEGATIVE PROMPT (EXCLUSIONES VISUALES ESTRICTAS):
      La imagen final NO DEBE CONTENER BAJO NINGUNA CIRCUNSTANCIA:
      - Equipos de iluminación visibles (softboxes, paraguas, reflectores, aros de luz).
      - Estructuras de estudio (trípodes, soportes C-stand, pinzas, cables).
      - Cámaras, lentes o fotógrafos reflejados.
      - Bordes de la mesa de bodegón o fin del rollo de papel.
      
      La luz debe emanar de fuentes INVISIBLES.
    `;

    if (isVariation) {
        return `
        **VARIANTE CREATIVA SOLICITADA**
        Manteniendo TODAS las Reglas de Oro (especialmente Integridad del Producto y Limpieza de Set), genera una versión alternativa con una composición o ángulo de luz ligeramente diferente.
        ---
        ${basePrompt}
        `
    }

    return basePrompt;
};

export const generateProductImage = async (images: UploadedFile[], config: GenerationConfig): Promise<string[]> => {
    try {
        const ai = getClient();
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
            throw new Error(`El modelo no devolvió imagen. Posible bloqueo de seguridad.`);
        }

        const promises = [generate(false), generate(true)];
        const results = await Promise.allSettled(promises);
        
        const successfulImages = results
            .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
            .map(result => result.value);

        if (successfulImages.length === 0) {
            const firstRejection = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
            const errorMessage = firstRejection?.reason?.message || "Error en generación. Intenta reformular el prompt.";
            throw new Error(errorMessage);
        }

        return successfulImages;
        
    } catch (error) {
        console.error("Error generating product image:", error);
        throw error instanceof Error ? error : new Error("Fallo en el servicio de IA.");
    }
};

export const refineProductImage = async (baseImage: UploadedFile, command: string, config: GenerationConfig): Promise<string> => {
    if (!command.trim()) {
        throw new Error("El comando de refinamiento está vacío.");
    }

    try {
        const ai = getClient();
        const lightingDesc = config.lightingStyle === 'sharp' ? 'Dura/Nítida' : 'Suave/Difusa';

        const prompt = `
            Eres un Editor Senior de Flux IA. Tu misión es refinar una imagen existente siguiendo ESTRICTAMENTE la Constitución de Reglas de Oro.

            **TU OBJETIVO:**
            Ejecutar el comando del usuario: "${command}"

            **TUS RESTRICCIONES (CONSTITUCIÓN):**
            1.  **INTEGRIDAD:** El producto y/o modelo son SAGRADOS. No cambies sus colores, formas o texturas bajo ninguna circunstancia. Solo edita la luz, el ambiente o el fondo.
            2.  **LIMPIEZA (CRÍTICO):** La imagen DEBE permanecer limpia. NO agregues trípodes, luces, softboxes ni reflectores aunque edites la iluminación. La fuente de luz es invisible.
            3.  **CALIDAD:** Mantén la resolución visual y el realismo de las texturas.

            **CONTEXTO TÉCNICO:**
            Estilo de luz actual: ${lightingDesc}.
            Formato: ${config.aspectRatio}.
            
            Procede con la edición manteniendo la esencia de la imagen original.
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
            throw new Error("No se generó imagen de refinamiento.");
        }

    } catch (error) {
        console.error("Error refining product image:", error);
        throw new Error("No se pudo refinar la imagen.");
    }
};

export const enhancePrompt = async (userText: string, type: 'background' | 'refinement' = 'background'): Promise<string> => {
    try {
        const ai = getClient();
        let systemInstruction = '';
        
        if (type === 'background') {
            systemInstruction = `
            Actúa como un Director de Arte de E-commerce.
            Mejora el siguiente concepto de fondo breve para convertirlo en un prompt detallado y lujoso.
            INPUT: "${userText}"
            REGLAS:
            - Describe materiales, iluminación y atmósfera.
            - Manténlo fotorrealista.
            - NO describas el producto, solo el entorno.
            - Responde SOLO con el prompt mejorado en español.
            `;
        } else {
            systemInstruction = `
            Actúa como un Técnico de Imagen Digital.
            Traduce la solicitud del usuario a lenguaje técnico fotográfico preciso.
            INPUT: "${userText}"
            EJEMPLOS:
            "más luz" -> "Aumentar exposición global +0.5 pasos y abrir sombras."
            "fondo más borroso" -> "Reducir profundidad de campo a f/2.8 para mayor bokeh."
            Responde SOLO con la instrucción técnica.
            `;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: systemInstruction }] },
        });

        return response.text?.trim() || userText;
    } catch (error) {
        console.error("Error enhancing prompt:", error);
        return userText;
    }
};
