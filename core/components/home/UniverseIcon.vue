
<script setup lang="ts">
type IconName =
  | 'olive'       
  | 'chef'        
  | 'cutlery'     
  | 'globe'       
  | 'grocery'     
  | 'pastry'      
  | 'chef-hat'    
  | 'award'       
  | 'spice'       
  | 'pepper'      
  | 'grain'       
  | 'fruit'       
  | 'honey'       
  | 'leaf'        
  | 'shield'      

defineProps<{
  name: IconName
}>()
</script>

<template>
  <svg
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    
    <g v-if="name === 'olive'">
      
      <path d="M14 14 C 18 18 22 20 28 22" />
      <path d="M14 14 L 12 10" />
      
      <path d="M16 16 C 14 12 18 10 22 14 C 20 18 18 18 16 16 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M16 16 C 14 12 18 10 22 14 C 20 18 18 18 16 16 Z" />
      
      <path d="M26 14 C 30 10 36 12 36 18 C 32 20 28 18 26 14 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M26 14 C 30 10 36 12 36 18 C 32 20 28 18 26 14 Z" />
      
      <ellipse cx="32" cy="36" rx="14" ry="16" fill="currentColor" fill-opacity="0.12" />
      <ellipse cx="32" cy="36" rx="14" ry="16" />
      
      <path d="M24 30 C 26 26 30 24 32 26" />
    </g>

    
    <g v-else-if="name === 'chef'">
      <path d="M18 28 C 12 28 10 22 14 18 C 14 12 20 10 24 14 C 28 10 36 10 40 14 C 44 10 50 12 50 18 C 54 22 52 28 46 28 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M18 28 C 12 28 10 22 14 18 C 14 12 20 10 24 14 C 28 10 36 10 40 14 C 44 10 50 12 50 18 C 54 22 52 28 46 28 Z" />
      <path d="M18 28 L 18 46 C 18 50 20 52 24 52 L 40 52 C 44 52 46 50 46 46 L 46 28" />
      <path d="M18 38 L 46 38" />
    </g>

    
    
    <g v-else-if="name === 'cutlery'">
      
      <path d="M19 10 L 19 22" />
      <path d="M22 10 L 22 22" />
      <path d="M25 10 L 25 22" />
      <path d="M16 10 L 16 22" />
      <path d="M16 22 C 16 24 17 26 20.5 26 C 24 26 25 24 25 22" fill="currentColor" fill-opacity="0.12" />
      <path d="M16 22 C 16 24 17 26 20.5 26 C 24 26 25 24 25 22" />
      <path d="M20.5 26 L 20.5 54" />
      
      <path d="M44 10 C 50 14 50 24 44 30 L 44 10 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M44 10 C 50 14 50 24 44 30 L 44 10 Z" />
      <path d="M44 30 L 44 54" />
      
      <ellipse cx="32" cy="18" rx="5" ry="9" fill="currentColor" fill-opacity="0.12" />
      <ellipse cx="32" cy="18" rx="5" ry="9" />
      <path d="M32 27 L 32 54" />
    </g>

    
    <g v-else-if="name === 'globe'">
      <circle cx="32" cy="32" r="22" fill="currentColor" fill-opacity="0.12" />
      <circle cx="32" cy="32" r="22" />
      <ellipse cx="32" cy="32" rx="22" ry="9" />
      <ellipse cx="32" cy="32" rx="9" ry="22" />
      <path d="M12 24 C 20 28 44 28 52 24" />
      <path d="M12 40 C 20 36 44 36 52 40" />
    </g>

    
    <g v-else-if="name === 'grocery'">
      <path d="M14 22 L 50 22 L 46 52 L 18 52 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M14 22 L 50 22 L 46 52 L 18 52 Z" />
      <path d="M22 22 L 22 16 C 22 12 26 10 32 10 C 38 10 42 12 42 16 L 42 22" />
      <path d="M24 32 L 40 32" />
      <path d="M24 40 L 40 40" />
    </g>

    
    <g v-else-if="name === 'pastry'">
      <path d="M16 40 Q 24 20 32 24 Q 40 28 48 24 Q 52 32 44 44 Q 32 50 20 48 Q 12 46 16 40 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M16 40 Q 24 20 32 24 Q 40 28 48 24 Q 52 32 44 44 Q 32 50 20 48 Q 12 46 16 40 Z" />
      <path d="M22 34 L 26 38" />
      <path d="M30 30 L 34 34" />
      <path d="M38 32 L 42 36" />
      <path d="M26 44 L 30 46" />
      <path d="M36 42 L 40 44" />
    </g>

    
    <g v-else-if="name === 'award'">
      <circle cx="32" cy="26" r="14" fill="currentColor" fill-opacity="0.12" />
      <circle cx="32" cy="26" r="14" />
      <circle cx="32" cy="26" r="8" />
      <path d="M24 38 L 20 56 L 28 52 L 32 58 L 36 52 L 44 56 L 40 38" />
      <path d="M32 20 L 34 24 L 38 24.5 L 35 27.5 L 36 32 L 32 30 L 28 32 L 29 27.5 L 26 24.5 L 30 24 Z" />
    </g>

    
    <g v-else-if="name === 'spice'">
      <path d="M22 14 L 42 14 L 44 22 L 20 22 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M22 14 L 42 14 L 44 22 L 20 22 Z" />
      <path d="M20 22 L 20 52 C 20 54 22 56 24 56 L 40 56 C 42 56 44 54 44 52 L 44 22" />
      <circle cx="28" cy="18" r="1" fill="currentColor" />
      <circle cx="32" cy="18" r="1" fill="currentColor" />
      <circle cx="36" cy="18" r="1" fill="currentColor" />
      <path d="M28 32 L 36 32" />
      <path d="M28 40 L 36 40" />
      <path d="M28 48 L 36 48" />
    </g>

    
    
    <g v-else-if="name === 'pepper'">
      
      <path d="M30 10 C 28 12 26 12 24 14 C 24 16 26 18 30 18" fill="currentColor" fill-opacity="0.12" />
      <path d="M30 10 C 28 12 26 12 24 14 C 24 16 26 18 30 18" />
      <path d="M30 10 L 30 18" />
      
      <path d="M28 18 C 22 22 22 32 26 42 C 28 50 32 54 36 52 C 40 48 42 38 40 28 C 38 22 34 18 28 18 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M28 18 C 22 22 22 32 26 42 C 28 50 32 54 36 52 C 40 48 42 38 40 28 C 38 22 34 18 28 18 Z" />
    </g>

    
    
    <g v-else-if="name === 'chef-hat'">
      
      <path d="M22 12 C 18 14 14 18 14 24 C 14 28 16 32 20 34 C 18 38 18 42 22 44 L 42 44 C 46 42 46 38 44 34 C 48 32 50 28 50 24 C 50 18 46 14 42 12 C 38 8 34 8 32 12 C 30 8 26 8 22 12 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M22 12 C 18 14 14 18 14 24 C 14 28 16 32 20 34 C 18 38 18 42 22 44 L 42 44 C 46 42 46 38 44 34 C 48 32 50 28 50 24 C 50 18 46 14 42 12 C 38 8 34 8 32 12 C 30 8 26 8 22 12 Z" />
      
      <path d="M20 44 L 20 52 C 20 53 21 54 22 54 L 42 54 C 43 54 44 53 44 52 L 44 44" />
      <path d="M20 48 L 44 48" />
    </g>

    
    <g v-else-if="name === 'grain'">
      <path d="M32 10 C 26 18 26 30 32 36 C 38 30 38 18 32 10 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M32 10 C 26 18 26 30 32 36 C 38 30 38 18 32 10 Z" />
      <path d="M32 14 L 32 34" />
      <path d="M18 30 C 14 36 18 46 24 48 C 28 42 26 34 18 30 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M18 30 C 14 36 18 46 24 48 C 28 42 26 34 18 30 Z" />
      <path d="M46 30 C 50 36 46 46 40 48 C 36 42 38 34 46 30 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M46 30 C 50 36 46 46 40 48 C 36 42 38 34 46 30 Z" />
      <path d="M32 36 L 32 56" />
    </g>

    
    <g v-else-if="name === 'fruit'">
      <circle cx="32" cy="36" r="18" fill="currentColor" fill-opacity="0.12" />
      <circle cx="32" cy="36" r="18" />
      <path d="M32 18 C 28 14 28 10 32 8" />
      <path d="M32 18 C 36 14 40 14 44 10" />
    </g>

    
    <g v-else-if="name === 'honey'">
      <path d="M20 22 L 32 16 L 44 22 L 44 40 L 32 46 L 20 40 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M20 22 L 32 16 L 44 22 L 44 40 L 32 46 L 20 40 Z" />
      <path d="M32 16 L 32 46" />
      <path d="M20 22 L 44 40" />
      <path d="M44 22 L 20 40" />
    </g>

    
    <g v-else-if="name === 'leaf'">
      <path d="M14 48 C 14 28 28 14 50 14 C 50 36 36 50 16 50 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M14 48 C 14 28 28 14 50 14 C 50 36 36 50 16 50 Z" />
      <path d="M16 48 L 40 24" />
    </g>

    
    <g v-else-if="name === 'shield'">
      <path d="M32 8 L 50 16 L 50 32 C 50 44 42 52 32 56 C 22 52 14 44 14 32 L 14 16 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M32 8 L 50 16 L 50 32 C 50 44 42 52 32 56 C 22 52 14 44 14 32 L 14 16 Z" />
      <path d="M24 32 L 30 38 L 42 24" />
    </g>
  </svg>
</template>
