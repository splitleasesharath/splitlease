/**
 * Room Styles Data for AI Room Redesign
 *
 * Contains the 12 default interior design styles with their
 * names, descriptions, preview images, and Gemini API prompts.
 */

/**
 * @typedef {Object} RoomStyle
 * @property {string} id - Unique identifier for the style
 * @property {string} name - Display name
 * @property {string} description - Short description of the style
 * @property {string} imageUrl - Preview thumbnail image URL
 * @property {string} prompt - AI prompt for generating this style
 */

/**
 * Default room styles available for redesign
 * @type {RoomStyle[]}
 */
export const defaultRoomStyles = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean lines, minimalist furniture, and neutral colors',
    imageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=300&h=200&fit=crop',
    prompt: 'Transform this room into a modern style with clean lines, minimalist furniture, neutral colors, and contemporary design elements.',
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    description: 'Light woods, cozy textiles, and functional simplicity',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop',
    prompt: 'Redesign this room in Scandinavian style with light wood tones, cozy textiles, white walls, and functional simplicity.',
  },
  {
    id: 'industrial',
    name: 'Industrial',
    description: 'Exposed brick, metal accents, and raw materials',
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=300&h=200&fit=crop',
    prompt: 'Transform this room into an industrial style with exposed brick, metal accents, raw materials, and vintage lighting.',
  },
  {
    id: 'bohemian',
    name: 'Bohemian',
    description: 'Eclectic patterns, vibrant colors, and layered textiles',
    imageUrl: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=300&h=200&fit=crop',
    prompt: 'Redesign this room in bohemian style with eclectic patterns, vibrant colors, layered textiles, and global-inspired decor.',
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Essential furniture only, monochromatic palette',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&h=200&fit=crop',
    prompt: 'Transform this room into a minimalist style with only essential furniture, monochromatic palette, and maximum negative space.',
  },
  {
    id: 'traditional',
    name: 'Traditional',
    description: 'Classic furniture, rich colors, and ornate details',
    imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=300&h=200&fit=crop',
    prompt: 'Redesign this room in traditional style with classic furniture, rich warm colors, ornate details, and elegant accessories.',
  },
  {
    id: 'coastal',
    name: 'Coastal',
    description: 'Beach-inspired colors, natural textures, relaxed vibe',
    imageUrl: 'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=300&h=200&fit=crop',
    prompt: 'Transform this room into a coastal style with beach-inspired blues and whites, natural textures, and a relaxed seaside vibe.',
  },
  {
    id: 'mid-century-modern',
    name: 'Mid-Century Modern',
    description: 'Retro furniture, organic shapes, bold accent colors',
    imageUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=300&h=200&fit=crop',
    prompt: 'Redesign this room in mid-century modern style with retro furniture, organic shapes, tapered legs, and bold accent colors.',
  },
  {
    id: 'farmhouse',
    name: 'Farmhouse',
    description: 'Rustic wood, shiplap walls, cozy country charm',
    imageUrl: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=300&h=200&fit=crop',
    prompt: 'Transform this room into a farmhouse style with rustic wood elements, shiplap walls, vintage accessories, and cozy country charm.',
  },
  {
    id: 'art-deco',
    name: 'Art Deco',
    description: 'Geometric patterns, luxurious materials, glamorous accents',
    imageUrl: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=300&h=200&fit=crop',
    prompt: 'Redesign this room in Art Deco style with geometric patterns, luxurious materials like velvet and brass, and glamorous accents.',
  },
  {
    id: 'japandi',
    name: 'Japandi',
    description: 'Japanese minimalism meets Scandinavian warmth',
    imageUrl: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=300&h=200&fit=crop',
    prompt: 'Transform this room into Japandi style, blending Japanese minimalism with Scandinavian warmth, natural materials, and zen simplicity.',
  },
  {
    id: 'mediterranean',
    name: 'Mediterranean',
    description: 'Warm terracotta, arched doorways, rustic elegance',
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300&h=200&fit=crop',
    prompt: 'Redesign this room in Mediterranean style with warm terracotta tones, textured walls, wrought iron accents, and rustic elegance.',
  },
];

/**
 * @typedef {Object} PhotoTypeOption
 * @property {string} value - Value to send to API
 * @property {string} label - Display label
 */

/**
 * Available room/photo type options
 * @type {PhotoTypeOption[]}
 */
export const photoTypeOptions = [
  { value: 'living-room', label: 'Living Room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'dining-room', label: 'Dining Room' },
  { value: 'office', label: 'Home Office' },
  { value: 'outdoor', label: 'Outdoor Space' },
];
