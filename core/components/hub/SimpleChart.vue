<template>
  <div class="w-full select-none">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full"
      :style="`height: ${H}px`"
      aria-label="Graphique d'évolution du chiffre d'affaires"
      role="img"
    >
      
      <g class="grid-lines">
        <line
          v-for="(tick, i) in yTicks"
          :key="i"
          :x1="padL"
          :y1="yPos(tick)"
          :x2="W - padR"
          :y2="yPos(tick)"
          stroke="#e5e7eb"
          stroke-width="1"
        />
        
        <text
          v-for="(tick, i) in yTicks"
          :key="`yt-${i}`"
          :x="padL - 8"
          :y="yPos(tick) + 4"
          text-anchor="end"
          font-size="10"
          fill="#9ca3af"
        >{{ formatY(tick) }}</text>
      </g>

      
      <g>
        <rect
          v-for="(pt, i) in props.data"
          :key="i"
          :x="barX(i)"
          :y="yPos(pt.value)"
          :width="barW"
          :height="chartH - yPos(pt.value) + padT"
          rx="4"
          ry="4"
          fill="var(--color-primary-500)"
          class="transition-opacity duration-150"
          @mouseenter="hovered = i"
          @mouseleave="hovered = null"
          :opacity="hovered === null || hovered === i ? 1 : 0.45"
        />
      </g>

      
      <g v-if="hovered !== null">
        <rect
          :x="barX(hovered) + barW / 2 - 28"
          :y="yPos(props.data[hovered].value) - 26"
          width="56"
          height="20"
          rx="4"
          fill="#1f2937"
        />
        <text
          :x="barX(hovered) + barW / 2"
          :y="yPos(props.data[hovered].value) - 12"
          text-anchor="middle"
          font-size="10"
          fill="white"
          font-weight="600"
        >{{ formatTooltip(props.data[hovered].value) }}</text>
      </g>

      
      <g>
        <text
          v-for="(pt, i) in props.data"
          :key="`xl-${i}`"
          :x="barX(i) + barW / 2"
          :y="H - 6"
          text-anchor="middle"
          font-size="10"
          fill="#9ca3af"
        >{{ pt.label }}</text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
export interface ChartPoint { label: string; value: number }

const props = defineProps<{
  data:   ChartPoint[]
  unit?:  string   
}>()

const W    = 600
const H    = 220
const padL = 48
const padR = 12
const padT = 16
const padB = 24
const chartH = H - padT - padB

const hovered = ref<number | null>(null)

const n       = computed(() => props.data.length)
const gap     = computed(() => 8)
const barW    = computed(() => (W - padL - padR - gap.value * (n.value - 1)) / n.value)
const barX    = (i: number) => padL + i * (barW.value + gap.value)

const maxVal  = computed(() => Math.max(...props.data.map(d => d.value), 1))
const yPos    = (v: number) => padT + chartH - (v / maxVal.value) * chartH
const yTicks  = computed(() => {
  const step = maxVal.value / 4
  return [0, 1, 2, 3, 4].map(i => Math.round(step * i))
})

const unit = computed(() => props.unit ?? '€')
const formatY       = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
const formatTooltip = (v: number) => unit.value ? `${v.toLocaleString('fr-FR')} ${unit.value}` : v.toLocaleString('fr-FR')
</script>
