<template>
  <div class="detection-page">
    <!-- 顶部导航 -->
    <div class="top-nav">
      <button class="back-btn" @click="router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回座位管理
      </button>
      <h1 class="page-title">检测结果映射测试</h1>
      <span class="page-badge">Dev Only</span>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="state-wrap">
      <el-icon class="is-loading" :size="28" color="#909399"><Loading /></el-icon>
      <span style="margin-left:10px;color:#9ca3af;font-size:14px">加载座位区域数据…</span>
    </div>

    <div v-else class="main-layout">
      <!-- ===== 左侧 Canvas ===== -->
      <div class="canvas-panel">
        <!-- 图例 -->
        <div class="legend-bar">
          <span class="legend-item">
            <span class="legend-dot" style="background:rgba(59,130,246,0.8)"></span>seat_region（已标定）
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background:rgba(239,68,68,0.9)"></span>检测框
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background:rgba(34,197,94,0.9)"></span>命中座位
          </span>
        </div>

        <!-- Canvas 画布 -->
        <div class="canvas-wrap" ref="canvasWrap">
          <img
            ref="bgImg"
            :src="imageUrl"
            class="bg-img"
            @load="onImageLoad"
            alt="测试画面"
          />
          <canvas ref="canvas" class="overlay-canvas"></canvas>
        </div>

        <!-- 操作按钮 -->
        <div class="btn-row">
          <button class="action-btn btn-dark" @click="generateDetection('person')">
            🧍 生成模拟检测（person）
          </button>
          <button class="action-btn btn-dark" @click="generateDetection('phone')">
            📱 生成模拟检测（phone）
          </button>
          <button
            class="action-btn btn-primary"
            :disabled="!detection || reporting"
            @click="executeAndReport"
          >
            {{ reporting ? '上报中…' : '▶ 执行映射并上报' }}
          </button>
          <button class="action-btn btn-ghost" @click="clearDetection">
            清空检测框
          </button>
        </div>
      </div>

      <!-- ===== 右侧信息面板 ===== -->
      <div class="info-panel">

        <!-- 当前房间 -->
        <div class="info-card">
          <div class="card-title">房间信息</div>
          <div class="info-row">
            <span class="info-label">Room ID</span>
            <span class="info-value">{{ roomId }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">已加载区域</span>
            <span class="info-value">{{ seatRegions.length }} 个</span>
          </div>
          <div class="info-row">
            <span class="info-label">未标定座位</span>
            <span class="info-value text-muted">{{ unseatedCount }} 个</span>
          </div>
        </div>

        <!-- 切换 roomId -->
        <div class="info-card">
          <div class="card-title">切换房间</div>
          <div style="display:flex;gap:8px;align-items:center">
            <el-input-number
              v-model="inputRoomId"
              :min="1"
              :controls="false"
              style="width:90px"
            />
            <button class="action-btn btn-dark" style="flex:1;padding:8px 0" @click="switchRoom">
              加载
            </button>
          </div>
        </div>

        <!-- 当前检测框 -->
        <div class="info-card">
          <div class="card-title">当前检测框</div>
          <template v-if="detection">
            <div class="info-row">
              <span class="info-label">类型</span>
              <span :class="detection.type === 'person' ? 'badge-blue' : 'badge-orange'">
                {{ detection.type === 'person' ? '🧍 person' : '📱 phone' }}
              </span>
            </div>
            <div class="coord-grid">
              <div class="coord-item">
                <span class="coord-label">X1</span>
                <span class="coord-val">{{ fmt(detection.x1) }}</span>
              </div>
              <div class="coord-item">
                <span class="coord-label">Y1</span>
                <span class="coord-val">{{ fmt(detection.y1) }}</span>
              </div>
              <div class="coord-item">
                <span class="coord-label">X2</span>
                <span class="coord-val">{{ fmt(detection.x2) }}</span>
              </div>
              <div class="coord-item">
                <span class="coord-label">Y2</span>
                <span class="coord-val">{{ fmt(detection.y2) }}</span>
              </div>
            </div>
            <div class="info-row" style="margin-top:4px">
              <span class="info-label">中心点</span>
              <span class="info-value">
                ({{ fmt((detection.x1 + detection.x2) / 2) }},
                {{ fmt((detection.y1 + detection.y2) / 2) }})
              </span>
            </div>
          </template>
          <p v-else class="muted">尚未生成检测框</p>
        </div>

        <!-- 命中结果 -->
        <div class="info-card">
          <div class="card-title">命中结果</div>
          <template v-if="hitResult !== undefined">
            <div v-if="hitResult !== null" class="hit-success">
              <span class="hit-icon">✓</span>
              <div>
                <div class="hit-label">命中 Seat ID</div>
                <div class="hit-id">{{ hitResult }}</div>
              </div>
            </div>
            <div v-else class="hit-fail">
              <span class="hit-icon-fail">✗</span>
              <span>未命中任何座位区域</span>
            </div>
          </template>
          <p v-else class="muted">等待执行映射…</p>
        </div>

        <!-- 上报结果 -->
        <div class="info-card" v-if="reportResult">
          <div class="card-title">上报结果</div>
          <p :class="['report-msg', reportResult.ok ? 'tip-ok' : 'tip-err']">
            {{ reportResult.msg }}
          </p>
          <div v-if="reportResult.ok" class="report-detail">
            <div class="info-row">
              <span class="info-label">接口</span>
              <span class="info-value" style="font-size:12px;word-break:break-all">{{ reportResult.endpoint }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">时间</span>
              <span class="info-value" style="font-size:12px">{{ reportResult.time }}</span>
            </div>
          </div>
        </div>

        <!-- 已标定座位列表 -->
        <div class="info-card">
          <div class="card-title">已标定区域（{{ seatRegions.length }}）</div>
          <div class="region-list">
            <div
              v-for="r in seatRegions"
              :key="r.seatId"
              :class="['region-item', hitResult === r.seatId ? 'region-hit' : '']"
            >
              <span class="region-dot"></span>
              <span class="region-id">Seat {{ r.seatId }}</span>
              <span class="region-coord">
                ({{ fmt(r.x1) }},{{ fmt(r.y1) }}) → ({{ fmt(r.x2) }},{{ fmt(r.y2) }})
              </span>
            </div>
            <p v-if="seatRegions.length === 0" class="muted">暂无已标定区域，请先在标定页面完成标定</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Loading } from '@element-plus/icons-vue'
import { getSeatsByRoom, getSeatRegion } from '@/api/seat'
import { uploadRecognition } from '@/api/recognition'
import { uploadBehavior } from '@/api/behavior'
import testImage from '@/assets/images/test-image.jpeg'

const route  = useRoute()
const router = useRouter()

// ───────── 配置 ─────────
const imageUrl = testImage

// roomId：优先路由参数，否则默认 1
const roomId     = ref(Number(route.query.roomId || route.params.roomId || 1))
const inputRoomId = ref(roomId.value)

// ───────── 状态 ─────────
const loading      = ref(false)
const reporting    = ref(false)
const seatRegions  = ref([])   // [{ seatId, x1, y1, x2, y2 }]
const allSeats     = ref([])   // 全部座位（含未标定）
const detection    = ref(null) // 当前检测框
const hitResult    = ref(undefined) // null=未命中, number=seatId, undefined=未执行
const reportResult = ref(null)

const unseatedCount = computed(() =>
  allSeats.value.length - seatRegions.value.length
)

// ───────── Canvas refs ─────────
const canvas    = ref(null)
const canvasWrap = ref(null)
const bgImg     = ref(null)
let   ctx       = null

// ───────── 工具函数 ─────────
const fmt = (v) => (v == null ? '—' : Number(v).toFixed(4))

/** 格式化为后端需要的 LocalDateTime 字符串（不带 Z）*/
const nowLocalDT = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

/** 相对坐标 → canvas 像素 */
const relToPx = (rx, ry) => ({
  x: rx * canvas.value.width,
  y: ry * canvas.value.height
})

// ───────── 命中算法（中心点落点法）─────────
/**
 * @param {{ x1,y1,x2,y2,type }} det  检测框（相对坐标）
 * @param {{ seatId,x1,y1,x2,y2 }[]} regions  所有已标定区域
 * @returns {number|null} 命中的 seatId，或 null
 */
const findHitSeat = (det, regions) => {
  const cx = (det.x1 + det.x2) / 2
  const cy = (det.y1 + det.y2) / 2
  for (const r of regions) {
    if (cx >= r.x1 && cx <= r.x2 && cy >= r.y1 && cy <= r.y2) {
      return r.seatId
    }
  }
  return null
}

// ───────── 生成模拟检测框 ─────────
let detectionPresets = {
  person: [
    { x1: 0.08, y1: 0.15, x2: 0.22, y2: 0.55 },
    { x1: 0.28, y1: 0.18, x2: 0.44, y2: 0.58 },
    { x1: 0.50, y1: 0.12, x2: 0.65, y2: 0.52 },
    { x1: 0.70, y1: 0.20, x2: 0.85, y2: 0.60 },
  ],
  phone: [
    { x1: 0.10, y1: 0.30, x2: 0.20, y2: 0.50 },
    { x1: 0.32, y1: 0.28, x2: 0.42, y2: 0.48 },
    { x1: 0.55, y1: 0.25, x2: 0.63, y2: 0.45 },
    { x1: 0.72, y1: 0.32, x2: 0.82, y2: 0.52 },
  ]
}
let presetIndex = { person: 0, phone: 0 }

const generateDetection = (type) => {
  const presets = detectionPresets[type]
  const box = presets[presetIndex[type] % presets.length]
  presetIndex[type]++

  // 加一点随机抖动（±0.02），使测试更真实
  const jitter = () => (Math.random() - 0.5) * 0.04
  detection.value = {
    type,
    x1: Math.max(0, box.x1 + jitter()),
    y1: Math.max(0, box.y1 + jitter()),
    x2: Math.min(1, box.x2 + jitter()),
    y2: Math.min(1, box.y2 + jitter()),
  }
  hitResult.value = undefined
  reportResult.value = null
  drawAll()
}

// ───────── 执行映射 + 上报 ─────────
const executeAndReport = async () => {
  if (!detection.value) return

  // 1. 命中判断
  const seatId = findHitSeat(detection.value, seatRegions.value)
  hitResult.value = seatId
  drawAll()   // 立即更新命中高亮

  if (seatId === null) {
    ElMessage.warning('未命中任何座位区域，不上报')
    return
  }

  // 2. 上报
  reporting.value = true
  const detectTime = nowLocalDT()
  try {
    if (detection.value.type === 'person') {
      await uploadRecognition({
        seatId,
        occupied: true,
        detectTime,
        confidence: 0.95
      })
      reportResult.value = {
        ok: true,
        msg: '上报成功 ✓',
        endpoint: 'POST /recognition/upload',
        time: detectTime
      }
    } else {
      await uploadBehavior({
        seatId,
        behaviorType: 'phone_detected',
        detectTime,
        confidence: 0.88
      })
      reportResult.value = {
        ok: true,
        msg: '上报成功 ✓',
        endpoint: 'POST /behavior/upload',
        time: detectTime
      }
    }
    ElMessage.success(`Seat ${seatId} 上报成功`)
  } catch (e) {
    reportResult.value = {
      ok: false,
      msg: '上报失败：' + (e?.message || '请检查后端日志')
    }
    ElMessage.error('上报失败')
  } finally {
    reporting.value = false
  }
}

// ───────── 清空 ─────────
const clearDetection = () => {
  detection.value = null
  hitResult.value  = undefined
  reportResult.value = null
  drawAll()
}

// ───────── Canvas 初始化 ─────────
const onImageLoad = () => {
  resizeCanvas()
  drawAll()
}

const resizeCanvas = () => {
  if (!canvas.value || !bgImg.value) return
  canvas.value.width  = bgImg.value.offsetWidth
  canvas.value.height = bgImg.value.offsetHeight
  ctx = canvas.value.getContext('2d')
}

// ───────── 绘制 ─────────
const drawRect = (x, y, w, h, fillColor, strokeColor, label) => {
  ctx.save()
  ctx.fillStyle   = fillColor
  ctx.strokeStyle = strokeColor
  ctx.lineWidth   = 2
  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x, y, w, h)
  if (label) {
    ctx.fillStyle    = strokeColor
    ctx.font         = 'bold 12px sans-serif'
    ctx.textBaseline = 'top'
    ctx.fillText(label, x + 4, y + 4)
  }
  ctx.restore()
}

const drawAll = () => {
  if (!ctx || !canvas.value) return
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

  // 1. 绘制所有 seat_region（蓝色）
  seatRegions.value.forEach(r => {
    const isHit = hitResult.value === r.seatId
    if (isHit) return  // 命中的留给第3步绿色绘制
    const p1 = relToPx(r.x1, r.y1)
    const p2 = relToPx(r.x2, r.y2)
    drawRect(
      p1.x, p1.y, p2.x - p1.x, p2.y - p1.y,
      'rgba(59,130,246,0.15)', 'rgba(59,130,246,0.85)',
      `S${r.seatId}`
    )
  })

  // 2. 绘制检测框（红色）
  if (detection.value) {
    const d = detection.value
    const p1 = relToPx(d.x1, d.y1)
    const p2 = relToPx(d.x2, d.y2)
    drawRect(
      p1.x, p1.y, p2.x - p1.x, p2.y - p1.y,
      'rgba(239,68,68,0.15)', 'rgba(239,68,68,0.9)',
      d.type
    )

    // 绘制中心点十字
    const cx = relToPx((d.x1 + d.x2) / 2, (d.y1 + d.y2) / 2)
    ctx.save()
    ctx.strokeStyle = 'rgba(239,68,68,0.9)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx.x - 6, cx.y)
    ctx.lineTo(cx.x + 6, cx.y)
    ctx.moveTo(cx.x, cx.y - 6)
    ctx.lineTo(cx.x, cx.y + 6)
    ctx.stroke()
    ctx.restore()
  }

  // 3. 命中座位（绿色高亮，最上层）
  if (hitResult.value != null) {
    const r = seatRegions.value.find(s => s.seatId === hitResult.value)
    if (r) {
      const p1 = relToPx(r.x1, r.y1)
      const p2 = relToPx(r.x2, r.y2)
      drawRect(
        p1.x, p1.y, p2.x - p1.x, p2.y - p1.y,
        'rgba(34,197,94,0.25)', 'rgba(34,197,94,0.95)',
        `HIT S${r.seatId}`
      )
    }
  }
}

// ───────── 数据加载 ─────────
const loadRoomData = async (rid) => {
  loading.value = true
  seatRegions.value = []
  allSeats.value    = []
  detection.value   = null
  hitResult.value   = undefined
  reportResult.value = null

  try {
    const seats = await getSeatsByRoom(rid)
    allSeats.value = Array.isArray(seats) ? seats : []

    // 并行查询每个座位的 region
    const results = await Promise.allSettled(
      allSeats.value.map(s => getSeatRegion(s.seatId))
    )
    seatRegions.value = allSeats.value
      .map((s, i) => {
        const res = results[i]
        if (
          res.status === 'fulfilled' &&
          res.value &&
          res.value.x1 != null && res.value.y1 != null &&
          res.value.x2 != null && res.value.y2 != null
        ) {
          return { seatId: s.seatId, x1: res.value.x1, y1: res.value.y1, x2: res.value.x2, y2: res.value.y2 }
        }
        return null
      })
      .filter(Boolean)

    await nextTick()
    resizeCanvas()
    drawAll()
  } catch (e) {
    ElMessage.error('加载数据失败：' + (e?.message || ''))
  } finally {
    loading.value = false
  }
}

const switchRoom = () => {
  roomId.value = inputRoomId.value
  loadRoomData(roomId.value)
}

// 窗口 resize
const onResize = () => { resizeCanvas(); drawAll() }

onMounted(() => {
  loadRoomData(roomId.value)
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
/* ===== 页面基础 ===== */
.detection-page {
  background: #f5f6f7;
  min-height: 100vh;
  padding: 0 0 48px;
  box-sizing: border-box;
}

/* 顶部导航 */
.top-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 28px;
  background: #fff;
  border-bottom: 1px solid #ebebeb;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}
.back-btn:hover { background: #333; }

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #111;
  margin: 0;
}

.page-badge {
  font-size: 11px;
  font-weight: 600;
  color: #f97316;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 4px;
  padding: 2px 8px;
  letter-spacing: 0.5px;
}

/* ===== 主布局 ===== */
.main-layout {
  display: flex;
  gap: 24px;
  padding: 24px 28px 0;
  align-items: flex-start;
}

/* ===== 左侧 ===== */
.canvas-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 图例 */
.legend-bar {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #6b7280;
  flex-wrap: wrap;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  display: inline-block;
}

/* Canvas 容器 */
.canvas-wrap {
  position: relative;
  background: #1a1a1a;
  border-radius: 10px;
  overflow: hidden;
  min-height: 360px;
}
.bg-img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 65vh;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
}
.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 本页仅展示，不交互 */
}

/* 按钮行 */
.btn-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 10px;
}

/* ===== 通用按钮 ===== */
.action-btn {
  padding: 10px 0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 0.15s, opacity 0.15s;
  white-space: nowrap;
}
.btn-dark {
  background: #111;
  color: #fff;
}
.btn-dark:hover { background: #333; }

.btn-primary {
  background: #16a34a;
  color: #fff;
}
.btn-primary:hover:not(:disabled) { background: #15803d; }
.btn-primary:disabled { background: #d1d5db; cursor: not-allowed; color: #9ca3af; }

.btn-ghost {
  background: #fff;
  color: #374151;
  border: 1px solid #e5e7eb;
}
.btn-ghost:hover { background: #f3f4f6; }

/* ===== 右侧信息面板 ===== */
.info-panel {
  width: 290px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.info-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px 18px;
}

.card-title {
  font-size: 11px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f3f4f6;
}
.info-row:last-child { border-bottom: none; }

.info-label { font-size: 12px; color: #9ca3af; }
.info-value { font-size: 13px; font-weight: 600; color: #111; }
.text-muted { color: #9ca3af; }

.badge-blue {
  font-size: 12px;
  color: #2563eb;
  font-weight: 600;
  background: #eff6ff;
  border-radius: 4px;
  padding: 2px 8px;
}
.badge-orange {
  font-size: 12px;
  color: #ea580c;
  font-weight: 600;
  background: #fff7ed;
  border-radius: 4px;
  padding: 2px 8px;
}

/* 坐标网格 */
.coord-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 10px 0 4px;
}
.coord-item {
  background: #f9fafb;
  border-radius: 6px;
  padding: 7px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.coord-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; }
.coord-val { font-size: 13px; font-weight: 600; color: #111; font-variant-numeric: tabular-nums; }

/* 命中结果 */
.hit-success {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}
.hit-icon {
  width: 32px;
  height: 32px;
  background: #dcfce7;
  color: #16a34a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}
.hit-label { font-size: 11px; color: #9ca3af; margin-bottom: 2px; }
.hit-id { font-size: 22px; font-weight: 700; color: #16a34a; }

.hit-fail {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #dc2626;
  padding: 6px 0;
}
.hit-icon-fail {
  width: 28px;
  height: 28px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

/* 上报结果 */
.report-msg { font-size: 13px; font-weight: 600; margin: 0 0 10px; }
.tip-ok  { color: #16a34a; }
.tip-err { color: #dc2626; }
.report-detail {}

/* 区域列表 */
.region-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  max-height: 200px;
  overflow-y: auto;
}
.region-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 6px;
  background: #f9fafb;
  font-size: 12px;
  transition: background 0.15s;
}
.region-item.region-hit {
  background: #dcfce7;
  border: 1px solid #86efac;
}
.region-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: rgba(59,130,246,0.7);
  flex-shrink: 0;
}
.region-hit .region-dot { background: #16a34a; }
.region-id { font-weight: 600; color: #374151; white-space: nowrap; }
.region-coord { font-size: 11px; color: #9ca3af; margin-left: auto; font-variant-numeric: tabular-nums; }

.muted { font-size: 12px; color: #9ca3af; margin: 0; }

/* Loading */
.state-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .main-layout { flex-direction: column; padding: 16px; }
  .info-panel { width: 100%; }
  .btn-row { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .btn-row { grid-template-columns: 1fr; }
}
</style>
