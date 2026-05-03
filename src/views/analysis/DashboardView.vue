<template>
  <div class="dashboard-page">

    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">数据分析</h1>
      <p class="page-subtitle">系统运行概览与使用情况</p>
    </div>

    <!-- 统计卡片 -->
    <div v-if="loadingDash" class="state-wrap">
      <el-icon class="is-loading" :size="28" color="#909399"><Loading /></el-icon>
    </div>
    <div v-else class="stat-grid">
      <div v-for="card in statCards" :key="card.label" class="stat-card">
        <span class="stat-label">{{ card.label }}</span>
        <span class="stat-value">{{ card.value ?? '-' }}</span>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="chart-section">

      <!-- 标题 + 房间选择 -->
      <div class="chart-header">
        <span class="chart-title">按小时占用率</span>
        <el-select
          v-model="selectedRoom"
          size="small"
          style="width: 140px"
          placeholder="选择自习室"
        >
          <el-option
            v-for="r in roomOptions"
            :key="r.value"
            :label="r.label"
            :value="r.value"
          />
        </el-select>
      </div>

      <!-- 当前自习室状态小卡片 -->
      <div v-if="roomCurrent" class="room-stat-row">
        <div class="room-stat-item">
          <span class="rs-label">总座位</span>
          <span class="rs-val">{{ roomCurrent.total }}</span>
        </div>
        <div class="room-stat-item">
          <span class="rs-label">可预约</span>
          <span class="rs-val rs-green">{{ roomCurrent.available }}</span>
        </div>
        <div class="room-stat-item">
          <span class="rs-label">已预约</span>
          <span class="rs-val rs-orange">{{ roomCurrent.reserved }}</span>
        </div>
        <div class="room-stat-item">
          <span class="rs-label">使用中</span>
          <span class="rs-val rs-red">{{ roomCurrent.occupied }}</span>
        </div>
        <div class="room-stat-item">
          <span class="rs-label">使用率</span>
          <span class="rs-val">{{ (roomCurrent.usageRate * 100).toFixed(1) }}%</span>
        </div>
      </div>

      <!-- ECharts 图表 (使用 v-loading 避免节点销毁重新渲染导致 ECharts 实例失效) -->
      <div 
        ref="chartEl" 
        class="chart-container" 
        v-loading="loadingChart"
        element-loading-text="正在加载数据..."
      ></div>

    </div>

  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  AxisPointerComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getDashboard, getRoomCurrent } from '@/api/analysis'
import { getStudyRooms } from '@/api/room'
import { getReservations } from '@/api/reservation'
import { getNotificationsByUser } from '@/api/notification'
import { getCurrentUserId } from '@/utils/auth'

// 按需注册 ECharts 组件
echarts.use([LineChart, GridComponent, TooltipComponent, AxisPointerComponent, CanvasRenderer])

// ===== 总览数据 =====
const loadingDash = ref(false)
const dash = ref(null)

const statCards = ref([
  { label: '总用户数',       key: 'userCount' },
  { label: '自习室数量',     key: 'roomCount' },
  { label: '座位总数',       key: 'seatCount' },
  { label: '当前使用中',     key: 'occupiedCount' },
  { label: '今日预约数',     key: 'todayReservationCount' },
  { label: '今日签到数',     key: 'todayCheckInCount' },
  { label: '今日自动释放',   key: 'todayAutoReleaseCount' },
  { label: '今日学习提醒',   key: 'todayPhoneWarningCount' },
].map(c => ({ ...c, value: null })))

const fetchDashboard = async () => {
  loadingDash.value = true
  try {
    dash.value = await getDashboard()
    
    // 修复“今日签到数”逻辑：基于 notification 的 checkin_success 统计
    const userId = getCurrentUserId()
    if (userId) {
      try {
        const notifs = await getNotificationsByUser(userId)
        const todayStr = new Date().toLocaleDateString()
        const checkinCount = notifs.filter(n => {
          const isCheckin = n.type === 'checkin_success'
          const dateVal = n.sendTime || n.send_time
          const isToday = dateVal ? new Date(dateVal).toLocaleDateString() === todayStr : false
          return isCheckin && isToday
        }).length
        
        // 覆盖后端的默认字段
        dash.value.todayCheckInCount = checkinCount || 0
      } catch (err) {
        console.error('[Analysis] 获取通知数据失败', err)
      }
    }
    
    statCards.value.forEach(c => { 
      c.value = dash.value[c.key] !== undefined && dash.value[c.key] !== null ? dash.value[c.key] : 0 
    })
  } catch (err) {
    console.error('[Analysis] 获取总览数据失败', err)
    ElMessage.error('获取总览数据失败')
  } finally {
    loadingDash.value = false
  }
}

// ===== 自习室选择 =====
const selectedRoom = ref(null)
const roomOptions = ref([])

const fetchRooms = async () => {
  try {
    const rooms = await getStudyRooms()
    roomOptions.value = rooms.map(r => ({
      label: r.roomName || r.name || `自习室${r.roomId}`,
      value: r.roomId,
      roomName: r.roomName || r.name 
    }))
    if (roomOptions.value.length > 0) {
      selectedRoom.value = roomOptions.value[0].value
      // watch(selectedRoom) 会自动触发 loadRoomData
    }
  } catch {
    ElMessage.error('获取自习室列表失败')
  }
}

// ===== 自习室当前状态 =====
const roomCurrent = ref(null)

// ===== 图表 =====
const chartEl = ref(null)
const loadingChart = ref(false)
let chartInstance = null

const initChart = () => {
  if (chartEl.value && !chartInstance) {
    chartInstance = echarts.init(chartEl.value)
    console.log('[Analysis] chart initialized')
  }
}

const renderChart = (hourlyData) => {
  if (!chartInstance) return

  // 补全 0-23 所有小时
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const rateMap = Object.fromEntries((hourlyData || []).map(d => [d.hour, d.usageRate]))
  // 若无数据，图表最低可用实现：返回 0，确保图表正常画线
  const rates = hours.map(h => rateMap[h] !== undefined ? +(rateMap[h] * 100).toFixed(1) : 0)

  console.log('[Analysis] hourly raw data:', hourlyData)
  console.log('[Analysis] hourly xAxis:', hours.map(h => String(h)))
  console.log('[Analysis] hourly series:', rates)

  chartInstance.setOption({
    animation: false,
    grid: { top: 24, right: 24, bottom: 40, left: 48 },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0]
        return p.value !== null
          ? `${p.axisValue}:00  占用率 ${p.value}%`
          : `${p.axisValue}:00  暂无数据`
      }
    },
    xAxis: {
      type: 'category',
      data: hours.map(h => String(h)),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: { color: '#9ca3af', fontSize: 12, formatter: v => `${v}时` }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { color: '#9ca3af', fontSize: 12, formatter: v => `${v}%` }
    },
    series: [{
      type: 'line',
      data: rates,
      smooth: true,
      connectNulls: false,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { color: '#3b82f6', width: 2 },
      itemStyle: { color: '#3b82f6' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(59,130,246,0.18)' },
          { offset: 1, color: 'rgba(59,130,246,0)' }
        ])
      }
    }]
  }, true)
}

const loadRoomData = async () => {
  if (!selectedRoom.value) return
  loadingChart.value = true
  roomCurrent.value = null
  
  // 确保 chart 实例尽早初始化完毕
  await nextTick()
  initChart()

  // 清理现有数据
  if (chartInstance) {
    chartInstance.clear()
  }

  try {
    const [current, allReservations] = await Promise.all([
      getRoomCurrent(selectedRoom.value),
      getReservations()
    ])
    roomCurrent.value = current
    
    // 生成基于 reservation 时间的真实小时占用数据
    const totalSeats = current?.total || 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tmr = new Date(today)
    tmr.setDate(tmr.getDate() + 1)
    
    const currentRoomOpt = roomOptions.value.find(r => r.value === selectedRoom.value)
    const targetRoomName = currentRoomOpt ? currentRoomOpt.roomName : null
    
    const roomReservations = allReservations.filter(r => 
      (targetRoomName && r.roomName === targetRoomName) || r.roomId === selectedRoom.value
    ).filter(r => ['reserved', 'occupied', 'completed'].includes(r.status))
    
    console.log('[Analysis] selectedRoomId:', selectedRoom.value)
    console.log('[Analysis] roomSeats:', totalSeats)
    console.log('[Analysis] roomReservations:', roomReservations)
    
    const generatedHourly = []
    for (let h = 0; h < 24; h++) {
      const hourStart = new Date(today)
      hourStart.setHours(h, 0, 0, 0)
      const hourEnd = new Date(today)
      hourEnd.setHours(h, 59, 59, 999)
      
      let overlapCount = 0
      roomReservations.forEach(r => {
        const rStart = new Date(r.startTime)
        const rEnd = new Date(r.endTime || tmr) // 假设如果没结束，一直持续到晚上
        if (rStart < hourEnd && rEnd > hourStart) {
          overlapCount++
        }
      })
      const finalCount = Math.min(overlapCount, totalSeats)
      generatedHourly.push({
        hour: h,
        usageRate: totalSeats > 0 ? (finalCount / totalSeats) : 0
      })
    }
    
    renderChart(generatedHourly)
    if (chartInstance) {
      chartInstance.resize()
    }
    console.log('[Analysis] chart updated')
  } catch (err) {
    console.error('[Analysis] 获取自习室图表数据失败', err)
    ElMessage.error('获取自习室数据失败')
  } finally {
    loadingChart.value = false 
  }
}

// 监听 selectedRoom 的变化，重新加载房间数据
watch(selectedRoom, async (newVal) => {
  if (newVal) {
    await loadRoomData()
  }
})

// 窗口 resize 时 ECharts 跟随缩放
const onResize = () => chartInstance?.resize()

onMounted(async () => {
  await fetchDashboard()
  await fetchRooms()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  chartInstance?.dispose()
})
</script>

<style scoped>
.dashboard-page {
  background: #f5f6f7;
  padding: 40px 0 48px;
  box-sizing: border-box;
}

/* 标题 */
.page-header {
  max-width: 900px;
  margin: 0 auto 28px;
  padding: 0 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #111;
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 14px;
  color: #999;
  margin: 0;
}

/* 统计网格 */
.stat-grid {
  max-width: 900px;
  margin: 0 auto 28px;
  padding: 0 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

.stat-label {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 400;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #111;
  line-height: 1;
}

/* 图表区 */
.chart-section {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  padding: 24px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: #111;
}

/* 当前状态行 */
.room-stat-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.room-stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rs-label {
  font-size: 12px;
  color: #9ca3af;
}

.rs-val {
  font-size: 18px;
  font-weight: 700;
  color: #111;
}

.rs-green  { color: #22c55e; }
.rs-orange { color: #f97316; }
.rs-red    { color: #ef4444; }

/* ECharts 容器 */
.chart-container {
  width: 100%;
  height: 320px;
}

/* Loading / Empty */
.state-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

/* 响应式 */
@media (max-width: 600px) {
  .page-header { padding: 0 16px; }
  .stat-grid   { padding: 0 16px; grid-template-columns: repeat(2, 1fr); }
  .chart-section { margin: 0 16px; padding: 16px; }
  .stat-value  { font-size: 22px; }
}
</style>