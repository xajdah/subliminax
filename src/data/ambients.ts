import type { AmbientDef } from '../types/studio'

export const AMBIENTS: AmbientDef[] = [
  // Nature & Weather
  { id: 'soft-rain', group: 'nature', label: 'Soft Rain', profile: 'rain-soft' },
  {
    id: 'heavy-thunder',
    group: 'nature',
    label: 'Heavy Thunderstorm & Distant Thunder',
    profile: 'thunder',
  },
  {
    id: 'gentle-ocean',
    group: 'nature',
    label: 'Gentle Ocean Waves',
    profile: 'ocean-gentle',
  },
  {
    id: 'coastal-surf',
    group: 'nature',
    label: 'Crashing Coastal Surf',
    profile: 'ocean-crash',
  },
  {
    id: 'forest-breeze',
    group: 'nature',
    label: 'Forest Breeze & Rustling Leaves',
    profile: 'forest',
  },
  {
    id: 'morning-birds',
    group: 'nature',
    label: 'Morning Birds & Brook',
    profile: 'birds-brook',
  },
  {
    id: 'campfire',
    group: 'nature',
    label: 'Crackling Campfire / Fireplace',
    profile: 'fire',
  },
  {
    id: 'tall-grass',
    group: 'nature',
    label: 'Wind Through Tall Grass',
    profile: 'grass-wind',
  },
  {
    id: 'desert-night',
    group: 'nature',
    label: 'Desert Night Breeze',
    profile: 'desert',
  },
  {
    id: 'mountain-stream',
    group: 'nature',
    label: 'Mountain Stream',
    profile: 'stream',
  },
  // Water & Acoustic Textures
  {
    id: 'underwater',
    group: 'texture',
    label: 'Underwater Depth / Submersion',
    profile: 'underwater',
  },
  {
    id: 'singing-bowls',
    group: 'texture',
    label: 'Singing Bowls & Tibetan Chimes',
    profile: 'bowls',
  },
  {
    id: 'wind-chimes',
    group: 'texture',
    label: 'Soft Wind Chimes',
    profile: 'chimes',
  },
  {
    id: 'temple-bell',
    group: 'texture',
    label: 'Distant Temple Bell / Drone',
    profile: 'temple',
  },
  {
    id: 'vinyl-hiss',
    group: 'texture',
    label: 'Vinyl Crackle & Warm Tape Hiss',
    profile: 'vinyl',
  },
  // Noise beds
  { id: 'pink-noise', group: 'noise', label: 'Pink Noise', profile: 'pink' },
  { id: 'brown-noise', group: 'noise', label: 'Brown Noise', profile: 'brown' },
  { id: 'white-noise', group: 'noise', label: 'White Noise', profile: 'white' },
  { id: 'green-noise', group: 'noise', label: 'Green Noise', profile: 'green' },
]

export const AMBIENT_GROUPS: { id: AmbientDef['group']; label: string }[] = [
  { id: 'nature', label: 'Nature & Weather' },
  { id: 'texture', label: 'Water & Acoustic Textures' },
  { id: 'noise', label: 'Noise Beds' },
]
