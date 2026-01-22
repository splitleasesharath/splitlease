/**
 * Room Redesign Prompts
 *
 * Contains prompt templates for the Gemini Vision API to transform room images
 * into different interior design styles.
 */

/**
 * Build the redesign prompt for Gemini Vision API
 *
 * @param stylePrompt - The style-specific prompt from roomStyles data
 * @param photoType - Optional room type (e.g., 'living-room', 'bedroom')
 * @returns Complete prompt string for Gemini
 */
export const buildRedesignPrompt = (
  stylePrompt: string,
  photoType: string | null
): string => {
  const roomTypeText = photoType
    ? `This is a ${photoType.replace(/-/g, ' ')}.`
    : 'This is a room.';

  return `${roomTypeText} ${stylePrompt}

Please generate a photorealistic redesigned version of this room maintaining the same perspective and room layout, but applying the requested style changes. The result should look like a professional interior design rendering.

Important guidelines:
- Keep the exact same camera angle and perspective
- Maintain the room's basic structure (walls, windows, doors)
- Apply the style transformation to furniture, decor, and finishes
- Ensure the lighting feels natural and consistent
- Make the result photorealistic, not cartoonish`;
};

/**
 * Default style prompts by style ID
 * These match the prompts defined in roomStyles.ts on the frontend
 */
export const STYLE_PROMPTS: Readonly<Record<string, string>> = {
  'modern': 'Transform this room into a modern style with clean lines, minimalist furniture, neutral colors, and contemporary design elements.',
  'scandinavian': 'Redesign this room in Scandinavian style with light wood tones, cozy textiles, white walls, and functional simplicity.',
  'industrial': 'Transform this room into an industrial style with exposed brick, metal accents, raw materials, and vintage lighting.',
  'bohemian': 'Redesign this room in bohemian style with eclectic patterns, vibrant colors, layered textiles, and global-inspired decor.',
  'minimalist': 'Transform this room into a minimalist style with only essential furniture, monochromatic palette, and maximum negative space.',
  'traditional': 'Redesign this room in traditional style with classic furniture, rich warm colors, ornate details, and elegant accessories.',
  'coastal': 'Transform this room into a coastal style with beach-inspired blues and whites, natural textures, and a relaxed seaside vibe.',
  'mid-century-modern': 'Redesign this room in mid-century modern style with retro furniture, organic shapes, tapered legs, and bold accent colors.',
  'farmhouse': 'Transform this room into a farmhouse style with rustic wood elements, shiplap walls, vintage accessories, and cozy country charm.',
  'art-deco': 'Redesign this room in Art Deco style with geometric patterns, luxurious materials like velvet and brass, and glamorous accents.',
  'japandi': 'Transform this room into Japandi style, blending Japanese minimalism with Scandinavian warmth, natural materials, and zen simplicity.',
  'mediterranean': 'Redesign this room in Mediterranean style with warm terracotta tones, textured walls, wrought iron accents, and rustic elegance.',
};
