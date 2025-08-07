<template>
  <div ref="chartRef" :style="{ width: '100%', height: height }"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  TitleComponent
} from 'echarts/components'

// 注册必要的 ECharts 组件
echarts.use([
  CanvasRenderer,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  TitleComponent
])

// Props
interface Props {
  option: any
  height?: string
  autoResize?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: '400px',
  autoResize: true
})

// Emits
const emit = defineEmits<{
  click: [params: any]
}>()

// Refs
const chartRef = ref<HTMLDivElement>()
const chartInstance = shallowRef<echarts.ECharts>()

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return
  
  chartInstance.value = echarts.init(chartRef.value)
  chartInstance.value.setOption(props.option)
  
  // 绑定点击事件
  chartInstance.value.on('click', (params) => {
    emit('click', params)
  })
}

// 更新图表配置
const updateOption = () => {
  if (chartInstance.value && props.option) {
    chartInstance.value.setOption(props.option, true)
  }
}

// 处理窗口大小变化
const handleResize = () => {
  if (chartInstance.value) {
    chartInstance.value.resize()
  }
}

// 监听 option 变化
watch(() => props.option, () => {
  updateOption()
}, { deep: true })

// 生命周期
onMounted(() => {
  initChart()
  
  if (props.autoResize) {
    window.addEventListener('resize', handleResize)
  }
})

onUnmounted(() => {
  if (props.autoResize) {
    window.removeEventListener('resize', handleResize)
  }
  
  if (chartInstance.value) {
    chartInstance.value.dispose()
  }
})
</script>