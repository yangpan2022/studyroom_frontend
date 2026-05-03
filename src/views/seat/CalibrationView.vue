<template>
  <div class="calibration-page">
    <!-- 顶部导航 -->
    <div class="top-nav">
      <button class="back-btn" @click="router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回座位管理
      </button>
      <h1 class="page-title">座位区域标定</h1>
    </div>

    <div class="main-layout">
      <!-- ===== 左侧 Canvas 区域 ===== -->
      <div class="canvas-panel">
        <!-- 模式切换 -->
        <div class="mode-bar">
          <span class="mode-label">显示模式：</span>
          <div class="mode-tabs">
            <button :class="['mode-tab', mode === 'image' ? 'active' : '']" @click="mode = 'image'">图片模式</button>
            <button :class="['mode-tab', mode === 'video' ? 'active' : '']" @click="mode = 'video'">视频模式</button>
          </div>
        </div>

        <div class="canvas-wrap" ref="canvasWrap">
          <!-- 底图 -->
          <img
            v-show="mode === 'image'"
            ref="bgImg"
            :src="imageUrl"
            class="bg-img"
            @load="onImageLoad"
            alt="摄像头画面"
          />
          <!-- 视频模式：使用房间绑定的 videoUrl -->
          <video
            v-if="mode === 'video' && roomVideoUrl"
            ref="videoEl"
            class="bg-img"
            :src="roomVideoUrl"
            autoplay
            muted
            loop
            playsinline
            @loadedmetadata="onVideoLoad"
          ></video>
          <!-- 手动展示提示：roomVideoUrl 为空时（房间未配置视频源） -->
          <div v-if="mode === 'video' && !roomVideoUrl" class="video-no-src">
            <el-icon :size="36" color="#9ca3af"><VideoCamera /></el-icon>
            <p style="color:#6b7280;font-size:14px;margin:8px 0 4px">当前房间未配置视频源</p>
            <p style="color:#9ca3af;font-size:12px;margin:0">请前往「自习室管理」设置视频文件</p>
          </div>
          <!-- Canvas 叠加层 -->
          <canvas
            ref="canvas"
            class="overlay-canvas"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @mouseleave="onMouseUp"
          ></canvas>
        </div>

        <!-- 图例 -->
        <div class="legend-bar">
          <span class="legend-item">
            <span class="legend-dot" style="background: rgba(0,123,255,0.8)"></span>
            当前座位标定
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background: rgba(40,167,69,0.8)"></span>
            其他座位标定
          </span>
        </div>
      </div>

      <!-- ===== 右侧信息与操作 ===== -->
      <div class="info-panel">
        <!-- 座位信息 -->
        <div class="info-card">
          <div class="card-title">当前座位</div>
          <div class="info-row">
            <span class="info-label">座位号</span>
            <span class="info-value">{{ seatInfo.seatNumber || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">所属自习室</span>
            <span class="info-value">{{ roomName }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">摄像头</span>
            <span :class="seatInfo.cameraEnabled ? 'badge-green' : 'badge-gray'">
              {{ seatInfo.cameraEnabled ? '已启用' : '未启用' }}
            </span>
          </div>
        </div>

        <!-- 标定坐标 -->
        <div class="info-card">
          <div class="card-title">标定坐标（相对比例 0~1）</div>
          <div class="coord-grid">
            <div class="coord-item">
              <span class="coord-label">X1</span>
              <span class="coord-val">{{ fmtCoord(region.x1) }}</span>
            </div>
            <div class="coord-item">
              <span class="coord-label">Y1</span>
              <span class="coord-val">{{ fmtCoord(region.y1) }}</span>
            </div>
            <div class="coord-item">
              <span class="coord-label">X2</span>
              <span class="coord-val">{{ fmtCoord(region.x2) }}</span>
            </div>
            <div class="coord-item">
              <span class="coord-label">Y2</span>
              <span class="coord-val">{{ fmtCoord(region.y2) }}</span>
            </div>
          </div>
          <p class="coord-tip">
            {{ hasRegion ? '已标定 ✓' : '尚未标定，请在图上拖拽框选' }}
          </p>
        </div>

        <!-- 其他座位标定情况 -->
        <div class="info-card">
          <div class="card-title">同室其他座位（{{ otherRegions.length }}已标定）</div>
          <div class="other-list">
            <div
              v-for="item in otherRegions"
              :key="item.seatId"
              class="other-item"
            >
              <span class="other-dot"></span>
              <span>{{ item.seatNumber }}</span>
              <span class="other-coord">{{ fmtCoord(item.x1) }},{{ fmtCoord(item.y1) }} → {{ fmtCoord(item.x2) }},{{ fmtCoord(item.y2) }}</span>
            </div>
            <p v-if="otherRegions.length === 0" class="muted">暂无其他座位已标定</p>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-group">
          <button class="action-btn btn-primary" :disabled="!hasRegion || saving" @click="saveRegion">
            {{ saving ? '保存中…' : '保存标定' }}
          </button>
          <button class="action-btn btn-ghost" @click="clearRegion">
            清除标定
          </button>
        </div>

        <p v-if="statusMsg" :class="['status-tip', statusOk ? 'tip-ok' : 'tip-err']">{{ statusMsg }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, VideoCamera } from '@element-plus/icons-vue'
import { getSeatsByRoom } from '@/api/seat'
import { getSeatRegion, saveSeatRegion, clearSeatRegion } from '@/api/seat'
import { getStudyRooms, getRoomById } from '@/api/room'
import request from '@/utils/request'
import testImage from '@/assets/images/test-image.jpeg'

const route = useRoute()
const router = useRouter()
const seatId = Number(route.params.id)

// ───────── 数据 ─────────
const seatInfo  = ref({})
const roomName  = ref('')
const roomVideoUrl = ref('')   // 从 GET /rooms/{id} 获取的视频路径
const mode      = ref('image')   // 'image' | 'video'
const videoEl   = ref(null)   // <video> 元素引用
// 标定固定用图片；视频模式背景由 roomVideoUrl 驱动
const imageUrl  = testImage

// 当前标定区域（相对坐标 0~1）
const region = ref({ x1: null, y1: null, x2: null, y2: null })

// 其他座位已有标定
const otherRegions = ref([])

const saving    = ref(false)
const statusMsg = ref('')
const statusOk  = ref(true)

const hasRegion = computed(() =>
  region.value.x1 !== null && region.value.y1 !== null &&
  region.value.x2 !== null && region.value.y2 !== null
)

const fmtCoord = (v) => (v === null || v === undefined) ? '—' : Number(v).toFixed(4)

// ───────── Canvas refs ─────────
const canvas   = ref(null)
const canvasWrap = ref(null)
const bgImg    = ref(null)

let ctx        = null
let isDrawing  = false
// 鼠标起点（像素）
let startPx    = { x: 0, y: 0 }
// 当前拖拽终点（像素）
let endPx      = { x: 0, y: 0 }

// ───────── 视频元数据加载完成 ─────────
const onVideoLoad = () => {
  // 视频模式下，canvas 与视频尺寸对齐（视频用 object-fit: contain，offsetWidth/H 准确）
  if (videoEl.value) {
    resizeCanvasToEl(videoEl.value)
    drawAll()
  }
}

// ───────── 图片加载完成 → 初始化 canvas ─────────
const onImageLoad = () => {
  resizeCanvas()
  drawAll()
}

/**
 * 统一的 canvas 尺寸同步函数。
 * getBoundingClientRect 获取媒体实际渲染尺寸，同时计算的偏移
 * 任 canvas-wrap 居中布局导致的 top/left 偏移。
 */
const resizeCanvas = () => {
  if (!canvas.value || !bgImg.value || !canvasWrap.value) return
  const mediaRect = bgImg.value.getBoundingClientRect()
  const wrapRect  = canvasWrap.value.getBoundingClientRect()
  const w    = Math.round(mediaRect.width)
  const h    = Math.round(mediaRect.height)
  const top  = Math.round(mediaRect.top  - wrapRect.top)
  const left = Math.round(mediaRect.left - wrapRect.left)
  if (w > 0 && h > 0) {
    canvas.value.width  = w
    canvas.value.height = h
    canvas.value.style.width  = w    + 'px'
    canvas.value.style.height = h    + 'px'
    canvas.value.style.top    = top  + 'px'
    canvas.value.style.left   = left + 'px'
    ctx = canvas.value.getContext('2d')
  }
}

const resizeCanvasToEl = (el) => {
  if (!canvas.value || !el || !canvasWrap.value) return
  const mediaRect = el.getBoundingClientRect()
  const wrapRect  = canvasWrap.value.getBoundingClientRect()
  const w    = Math.round(mediaRect.width)
  const h    = Math.round(mediaRect.height)
  const top  = Math.round(mediaRect.top  - wrapRect.top)
  const left = Math.round(mediaRect.left - wrapRect.left)
  if (w > 0 && h > 0) {
    canvas.value.width  = w
    canvas.value.height = h
    canvas.value.style.width  = w    + 'px'
    canvas.value.style.height = h    + 'px'
    canvas.value.style.top    = top  + 'px'
    canvas.value.style.left   = left + 'px'
    ctx = canvas.value.getContext('2d')
  }
}

// ───────── 坐标转换 ─────────
// 相对坐标 → 画布像素
const relToPx = (rx, ry) => ({
  x: rx * canvas.value.width,
  y: ry * canvas.value.height
})

// 画布像素 → 相对坐标（clamp 0~1）
const pxToRel = (px, py) => ({
  x: Math.min(1, Math.max(0, px / canvas.value.width)),
  y: Math.min(1, Math.max(0, py / canvas.value.height))
})

// 获取鼠标相对 canvas 的位置
const getMousePos = (e) => {
  const rect = canvas.value.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

// ───────── 绘制 ─────────
const drawAll = () => {
  if (!ctx || !canvas.value) return
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

  // 先绘制其他座位（绿色）
  otherRegions.value.forEach(r => {
    const p1 = relToPx(r.x1, r.y1)
    const p2 = relToPx(r.x2, r.y2)
    drawRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y, 'rgba(40,167,69,0.25)', 'rgba(40,167,69,0.9)', r.seatNumber)
  })

  // 绘制当前座位（蓝色）
  if (hasRegion.value) {
    const p1 = relToPx(region.value.x1, region.value.y1)
    const p2 = relToPx(region.value.x2, region.value.y2)
    drawRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y, 'rgba(0,123,255,0.25)', 'rgba(0,123,255,0.9)', seatInfo.value.seatNumber)
  }

  // 实时拖拽中的框
  if (isDrawing) {
    const w = endPx.x - startPx.x
    const h = endPx.y - startPx.y
    drawRect(startPx.x, startPx.y, w, h, 'rgba(0,123,255,0.20)', '#007bff')
  }
}

const drawRect = (x, y, w, h, fillColor, strokeColor, label) => {
  ctx.save()
  ctx.fillStyle   = fillColor
  ctx.strokeStyle = strokeColor
  ctx.lineWidth   = 2
  ctx.setLineDash([])

  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x, y, w, h)

  if (label) {
    ctx.fillStyle  = strokeColor
    ctx.font       = 'bold 12px sans-serif'
    ctx.textBaseline = 'top'
    ctx.fillText(label, x + 4, y + 4)
  }
  ctx.restore()
}

// ───────── 鼠标事件 ─────────
const onMouseDown = (e) => {
  isDrawing = true
  startPx = getMousePos(e)
  endPx   = { ...startPx }
}

const onMouseMove = (e) => {
  if (!isDrawing) return
  endPx = getMousePos(e)
  drawAll()
}

const onMouseUp = (e) => {
  if (!isDrawing) return
  isDrawing = false
  endPx = getMousePos(e)

  // 确保 x1<x2, y1<y2
  const minX = Math.min(startPx.x, endPx.x)
  const minY = Math.min(startPx.y, endPx.y)
  const maxX = Math.max(startPx.x, endPx.x)
  const maxY = Math.max(startPx.y, endPx.y)

  // 忽略极小拖拽（防手抖）
  if (maxX - minX < 5 || maxY - minY < 5) {
    drawAll()
    return
  }

  const r1 = pxToRel(minX, minY)
  const r2 = pxToRel(maxX, maxY)

  region.value = { x1: r1.x, y1: r1.y, x2: r2.x, y2: r2.y }
  drawAll()
}

// ───────── 保存 ─────────
const saveRegion = async () => {
  if (!hasRegion.value) return
  saving.value = true
  try {
    await saveSeatRegion(seatId, {
      seatId,
      x1: region.value.x1,
      y1: region.value.y1,
      x2: region.value.x2,
      y2: region.value.y2
    })
    statusMsg.value = '标定成功 ✓'
    statusOk.value  = true
    ElMessage.success('标定已保存')
  } catch (e) {
    statusMsg.value = '保存失败：' + (e?.message || '请重试')
    statusOk.value  = false
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// ───────── 清除 ─────────
const clearRegion = () => {
  region.value = { x1: null, y1: null, x2: null, y2: null }
  statusMsg.value = ''
  drawAll()
}

// ───────── 数据加载 ─────────
const loadData = async () => {
  try {
    // 1. 加载所有自习室，找到当前座位所属的座位信息
    //    先调所有房间，再匹配房间里的座位
    const rooms = await getStudyRooms()

    // 通过每个房间的 seats 接口找到 seatId 对应的信息
    // （若后端有 GET /seats/{id} 可直接调，这里用批量方式兼容）
    let foundSeat = null
    let foundRoom = null

    for (const room of rooms) {
      try {
        const seats = await getSeatsByRoom(room.roomId)
        const match = seats.find(s => s.seatId === seatId)
        if (match) {
          foundSeat = match
          foundRoom = room
          // 顺便拿同室其他座位
          const siblings = seats.filter(s => s.seatId !== seatId)
          // 并发获取其他座位的 region
          const regionResults = await Promise.allSettled(
            siblings.map(s => getSeatRegion(s.seatId).then(r => ({ ...r, seatNumber: s.seatNumber, seatId: s.seatId })))
          )
          otherRegions.value = regionResults
            .filter(r => r.status === 'fulfilled' && r.value && r.value.x1 !== null && r.value.x1 !== undefined)
            .map(r => r.value)
          break
        }
      } catch (_) { /* 某个房间请求失败则跳过 */ }
    }

    if (foundSeat) {
      seatInfo.value = foundSeat
      roomName.value  = foundRoom?.roomName || ''
      // 从 GET /rooms/{id} 拿 videoUrl，统一驱动标定背景视频
      if (foundRoom?.roomId) {
        try {
          const roomDetail = await getRoomById(foundRoom.roomId)
          roomVideoUrl.value = roomDetail.videoUrl || ''
        } catch (_) { /* videoUrl 拿不到时静默降级 */ }
      }
    }

    // 2. 加载当前座位区域
    try {
      const r = await getSeatRegion(seatId)
      if (r && r.x1 !== null && r.x1 !== undefined) {
        region.value = { x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2 }
      }
    } catch (_) { /* 无标定记录时忽略 404 */ }

    // 3. 等图片渲染完再重绘
    await nextTick()
    resizeCanvas()
    drawAll()
  } catch (e) {
    ElMessage.error('加载数据失败')
  }
}

// 窗口 resize 时重置 canvas 尺寸
const onResize = () => {
  resizeCanvas()
  drawAll()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
/* ===== 整体布局 ===== */
.calibration-page {
  background: #f5f6f7;
  min-height: 100vh;
  padding: 0 0 48px;
  box-sizing: border-box;
}

/* 顶部导航 */
.top-nav {
  display: flex;
  align-items: center;
  gap: 20px;
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

/* 主布局 */
.main-layout {
  display: flex;
  gap: 24px;
  padding: 28px 28px 0;
  align-items: flex-start;
}

/* ===== 左侧 Canvas ===== */
.canvas-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 模式切换 */
.mode-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mode-label {
  font-size: 13px;
  color: #6b7280;
  white-space: nowrap;
}

.mode-tabs {
  display: flex;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.mode-tab {
  padding: 6px 16px;
  background: #fff;
  border: none;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.mode-tab.active {
  background: #111;
  color: #fff;
}

/* Canvas 包裹层 */
.canvas-wrap {
  position: relative;
  background: #1a1a1a;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
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
  /* 宽高由 JS 通过 canvas.style.width/height 精确设定 */
  /* 不得用 CSS width:100%;height:100% 覆盖，否则会拉伸 canvas 导致坐标偏移 */
  cursor: crosshair;
  pointer-events: auto;
}

.video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  color: #9ca3af;
  font-size: 14px;
}

/* 图例 */
.legend-bar {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #6b7280;
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

/* ===== 右侧信息面板 ===== */
.info-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  background: #fff;
  border-radius: 10px;
  padding: 18px 20px;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 信息行 */
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid #f3f4f6;
}
.info-row:last-child { border-bottom: none; }

.info-label {
  font-size: 13px;
  color: #9ca3af;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #111;
}

.badge-green {
  font-size: 12px;
  color: #16a34a;
  font-weight: 500;
}

.badge-gray {
  font-size: 12px;
  color: #9ca3af;
}

/* 坐标网格 */
.coord-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.coord-item {
  background: #f9fafb;
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.coord-label {
  font-size: 11px;
  color: #9ca3af;
  text-transform: uppercase;
}

.coord-val {
  font-size: 14px;
  font-weight: 600;
  color: #111;
  font-variant-numeric: tabular-nums;
}

.coord-tip {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
}

/* 其他座位列表 */
.other-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.other-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
}

.other-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: rgba(40,167,69,0.8);
  flex-shrink: 0;
}

.other-coord {
  font-size: 11px;
  color: #9ca3af;
  font-variant-numeric: tabular-nums;
  margin-left: auto;
}

.muted {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
}

/* 操作按钮组 */
.action-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  width: 100%;
  padding: 11px 0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  border: none;
}

.btn-primary {
  background: #111;
  color: #fff;
}
.btn-primary:hover:not(:disabled) { background: #333; }
.btn-primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.btn-ghost {
  background: #fff;
  color: #374151;
  border: 1px solid #e5e7eb;
}
.btn-ghost:hover { background: #f3f4f6; }

/* 状态提示 */
.status-tip {
  font-size: 13px;
  text-align: center;
  margin: 0;
  font-weight: 500;
}
.tip-ok  { color: #16a34a; }
.tip-err { color: #dc2626; }

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .main-layout {
    flex-direction: column;
    padding: 16px;
  }
  .info-panel {
    width: 100%;
  }
}
</style>
