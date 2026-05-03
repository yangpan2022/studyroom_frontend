<template>
  <div class="monitor-page">

    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-select
          v-model="currentRoomId"
          placeholder="选择自习室"
          class="room-select"
          @change="onRoomChange"
        >
          <el-option v-for="r in rooms" :key="r.roomId" :label="r.roomName" :value="r.roomId" />
        </el-select>

        <div class="mode-tabs">
          <button
            class="mode-tab"
            :class="{ active: displayMode === 'video' }"
            @click="displayMode = 'video'"
          >视频模式</button>
          <button
            class="mode-tab"
            :class="{ active: displayMode === 'image' }"
            @click="displayMode = 'image'"
          >图片模式</button>
        </div>
      </div>

      <div class="toolbar-right">
        <span class="detect-badge">
          <span class="pulse-dot"></span>
          {{ displayMode === 'video' ? 'AI检测叠加中' : '轮询刷新中' }}
        </span>
        <button class="refresh-btn" :disabled="refreshing" @click="manualRefresh">
          <el-icon :class="refreshing ? 'is-loading' : ''"><Refresh /></el-icon>
          刷新
        </button>
      </div>
    </div>

    <!-- 主体布局 -->
    <div class="main-layout">

      <!-- ===== 左侧画面区 ===== -->
      <div class="canvas-panel">

        <!-- 画面区 + canvas 叠加 -->
        <div class="canvas-wrap" ref="canvasWrap">

          <!--
            【视频模式】
            videoUrl 从 room.videoUrl 读取，切换房间时自动更换。
            loadedmetadata 事件触发后读取原始分辨率用于检测框坐标归一化。
          -->
          <video
            v-show="displayMode === 'video'"
            ref="videoEl"
            class="media-element"
            :src="videoUrl"
            autoplay
            muted
            loop
            playsinline
            @loadedmetadata="onVideoMetadata"
          ></video>


          <!-- 【图片模式】静态图片作为背景 -->
          <img
            v-show="displayMode === 'image'"
            ref="bgImg"
            :src="imageUrl"
            class="media-element"
            @load="onImageLoad"
            alt="房间标定画面"
          />

          <!-- 无标定数据提示（在 canvas-wrap 内，不遮挡侧边栏） -->
          <div v-if="!loading && seatRegions.length === 0" class="no-data-overlay">
            <el-icon :size="40" color="#d1d5db"><Warning /></el-icon>
            <p>当前房间暂无标定数据</p>
            <p class="no-data-sub">请先前往「座位管理」完成区域标定</p>
          </div>

          <!-- loading 遮罩 -->
          <div v-if="loading" class="canvas-loading">
            <el-icon class="is-loading" :size="32" color="#fff"><Loading /></el-icon>
          </div>

          <!--
            【核心叠加层】canvas 绝对定位覆盖在媒体元素上方。
            尺寸通过 syncCanvasSize() 与下方媒体元素保持完全一致。
            绘制由 requestAnimationFrame 循环驱动，保证流畅。
          -->
          <canvas ref="canvas" class="overlay-canvas"></canvas>
        </div>

        <!-- 图例 -->
        <div class="legend-bar">
          <span class="legend-item">
            <span class="legend-dot" style="background:rgba(64,158,255,0.15);border:1.5px solid #409EFF"></span>
            已标定座位
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background:rgba(103,194,58,0.25);border:2px solid #67C23A"></span>
            正在使用
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background:rgba(245,108,108,0.15);border:1.5px solid #F56C6C"></span>
            检测到人员
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background:rgba(230,162,60,0.15);border:1.5px solid #E6A23C"></span>
            已预约
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background:rgba(156,39,176,0.15);border:2px solid #9C27B0"></span>
            检测到手机使用
          </span>
        </div>
      </div>

      <!-- ===== 右侧信息区 ===== -->
      <div class="info-panel">

        <!-- 1. 房间信息 -->
        <div class="info-card">
          <div class="card-title">当前房间</div>
          <template v-if="currentRoom">
            <div class="info-row">
              <span class="info-label">名称</span>
              <span class="info-value">{{ currentRoom.roomName }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">位置</span>
              <span class="info-value">{{ currentRoom.location || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">座位总数</span>
              <span class="info-value">{{ seats.length }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">已标定</span>
              <span class="info-value">{{ seatRegions.length }}</span>
            </div>
          </template>
          <p v-else class="muted">选择房间后显示</p>
        </div>

        <!-- 2. 座位状态统计 -->
        <div class="info-card">
          <div class="card-title">座位状态统计</div>
          <div class="stat-grid">
            <div class="stat-item">
              <span class="stat-num">{{ seats.length }}</span>
              <span class="stat-label">总座位</span>
            </div>
            <div class="stat-item">
              <span class="stat-num text-green">{{ statusCount.available }}</span>
              <span class="stat-label">可用</span>
            </div>
            <div class="stat-item">
              <span class="stat-num text-yellow">{{ statusCount.reserved }}</span>
              <span class="stat-label">已预约</span>
            </div>
            <div class="stat-item">
              <span class="stat-num text-blue">{{ statusCount.occupied }}</span>
              <span class="stat-label">使用中</span>
            </div>
            <div class="stat-item">
              <span class="stat-num" style="color:#409EFF">{{ seatRegions.length }}</span>
              <span class="stat-label">已标定</span>
            </div>
            <div class="stat-item">
              <span class="stat-num" style="color:#F56C6C">{{ aiDetectionCount }}</span>
              <span class="stat-label">AI检测</span>
            </div>
          </div>
        </div>

        <!-- 3. 当前 AI 检测帧 -->
        <div class="info-card">
          <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
            <span>AI 检测结果</span>
            <span
              :class="['ai-status-badge', aiMatchesRoom ? 'badge-ai-on' : 'badge-ai-off']"
            >
              {{ aiMatchesRoom ? '• AI检测中' : '• 当前房间暂无检测数据' }}
            </span>
          </div>
          <template v-if="latestDetection && aiMatchesRoom">
            <div class="info-row">
              <span class="info-label">帧编号</span>
              <span class="info-value mono">#{{ latestDetection.frameIndex }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">检测到人数</span>
              <span class="info-value">{{ aiDetectionCount }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">命中座位数</span>
              <span class="info-value text-green">{{ occupiedCount }}</span>
            </div>
            <div class="seat-chip-row">
              <div
                v-for="ss in latestDetection.seatStatus"
                :key="ss.seatId"
                :class="['seat-chip', ss.occupied ? 'chip-occupied' : 'chip-empty']"
              >
                <span>S{{ ss.seatId }}</span>
                <span class="chip-status">{{ ss.occupied ? '占用' : '空闲' }}</span>
              </div>
            </div>
          </template>
          <p v-else class="muted">{{ latestDetection ? '当前房间暂无匹配的检测数据' : '轮询中…' }}</p>
        </div>

        <!-- 4. 最近识别记录（来自后端） -->
        <div class="info-card">
          <div class="card-title">最近识别记录</div>
          <div v-if="recentRecognitions.length > 0" class="record-list">
            <div
              v-for="rec in recentRecognitions"
              :key="rec.recordId || (rec.detectTime + rec.seatId)"
              class="record-item"
            >
              <div class="record-main">
                <span class="record-seat">座位 {{ getSeatNumber(rec.seatId) }}</span>
                <span :class="rec.occupied ? 'badge-blue' : 'badge-gray-sm'">
                  {{ rec.occupied ? '占用' : '空闲' }}
                </span>
              </div>
              <div class="record-meta">
                <span>{{ (rec.confidence * 100).toFixed(0) }}%</span>
                <span class="divider">·</span>
                <span>{{ formatTime(rec.detectTime) }}</span>
              </div>
            </div>
          </div>
          <p v-else class="muted">暂无识别记录</p>
        </div>

        <!-- 5. 最近通知 -->
        <div class="info-card">
          <div class="card-title">最近通知</div>
          <div v-if="recentNotifs.length > 0" class="notif-list-mini">
            <div
              v-for="n in recentNotifs"
              :key="n.notificationId"
              :class="['notif-mini-item', n.status === 'unread' ? 'notif-unread' : '']"
            >
              <span v-if="n.status === 'unread'" class="notif-mini-dot"></span>
              <div class="notif-mini-body">
                <p class="notif-mini-msg">{{ n.message }}</p>
                <span class="notif-mini-time">{{ formatTime(n.sendTime) }}</span>
              </div>
            </div>
          </div>
          <p v-else class="muted">暂无通知</p>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Warning, Loading } from '@element-plus/icons-vue'
import { getStudyRooms, getRoomById } from '@/api/room'
import { getSeatsByRoom, getSeatRegion } from '@/api/seat'
import { getRecognitionBySeat } from '@/api/recognition'
import { getNotificationsByUser } from '@/api/notification'
import { getCurrentUser, getCurrentUserId } from '@/utils/auth'
import testImage from '@/assets/images/test-image.jpeg'

// ─── 路由 & 权限 ───────────────────────────────────────────────
const router      = useRouter()
const currentUser = getCurrentUser()
const userId      = getCurrentUserId()

// ─── 媒体源 ────────────────────────────────────────────────────
const imageUrl  = testImage

/**
 * videoUrl 和 videoType 从 GET /rooms/{roomId} 动态读取。
 * 切换房间时自动更换视频，不再使用任何硬编码路径。
 */
const videoUrl  = ref('')        // 当前房间的视频路径
/**
 * Python 输出的检测结果 JSON，由前端通过 fetch 轮询读取。
 * 在多房间架构中，改为动态按 roomId 加载 latest_{roomId}.json
 */
// const DETECTION_JSON_URL = '/media/detections/latest.json' // 改为动态路径

// 显示模式切换
const displayMode = ref('video')   // 'video' | 'image'

// ─── 数据 State ────────────────────────────────────────────────
const rooms              = ref([])
const currentRoomId      = ref(null)
const currentRoom        = computed(
  () => rooms.value.find(r => r.roomId === currentRoomId.value) || null
)
const seats              = ref([])
const seatRegions        = ref([])   // 后端存储的相对坐标 (0~1)
const recentRecognitions = ref([])
const recentNotifs       = ref([])
const loading            = ref(false)
const refreshing         = ref(false)

// ─── AI 检测数据 ───────────────────────────────────────────────
/**
 * latestDetection — 存储最近一次从 latest.json 读取且 roomId 匹配的结果。
 *
 * 结构（对应 Python 输出的 latest.json）:
 * {
 *   roomId:      number,
 *   frameIndex:  number,
 *   frameWidth:  number,
 *   frameHeight: number,
 *   detections:  [...],   // {type, x1,y1,x2,y2, confidence}
 *   seatStatus:  [...],   // {seatId, occupied}
 *   updatedAt:   string,
 * }
 *
 * 当最新 JSON 的 roomId 与当前页面 currentRoomId 不一致时，
 * 不会覆盖此值，检测框也不会渲染。
 */
const latestDetection = ref(null)

/**
 * aiMatchesRoom — true 表示 latestDetection 属于当前房间，可渲染检测框。
 * false 时只显示蓝色 seat_region，不显示红框/绿框。
 */
const aiMatchesRoom = computed(() =>
  latestDetection.value !== null &&
  latestDetection.value.roomId === currentRoomId.value
)

/** 当前帧命中（occupied=true）的座位 ID Set，仅 roomId 一致时有效 */
const occupiedSeatIds = computed(() => {
  if (!aiMatchesRoom.value) return new Set()
  return new Set(
    (latestDetection.value.seatStatus || []).filter(s => s.occupied).map(s => s.seatId)
  )
})

const aiDetectionCount = computed(() =>
  aiMatchesRoom.value
    ? (latestDetection.value.detections || []).filter(d => d.type === 'person').length
    : 0
)
const occupiedCount = computed(() =>
  aiMatchesRoom.value
    ? (latestDetection.value.seatStatus || []).filter(s => s.occupied).length
    : 0
)

/**
 * mergedSeats — 将后端静态 seat 列表与 latestDetection.seatStatus 合并。
 *
 * 问题根因：
 *   - seats（公来自 POST /seats）是后端静态数据，不含 phone_detected
 *   - latestDetection.seatStatus 是 AI 实时数据，含 phone_detected / occupied
 *   - 两者分离导致 drawAll 里 phone_detected 永远为 undefined
 *
 * 修复：将 AI 实时字段注入 seat，让渲染层下永远只依赖 mergedSeats。
 */
const mergedSeats = computed(() => {
  if (!aiMatchesRoom.value || !latestDetection.value?.seatStatus?.length) {
    return seats.value
  }

  // ── 诊断日志：打印两边 seatId 的类型，确认是否一致 ──
  console.log('[DEBUG] ai seatId types:',
    latestDetection.value.seatStatus.map(s => `${typeof s.seatId}(${s.seatId}) phone=${s.phone_detected}`)
  )
  console.log('[DEBUG] seat seatId types:',
    seats.value.map(s => `${typeof s.seatId}(${s.seatId})`)
  )

  // 统一用 Number() 作为 Map 的 key，消除 string vs number 类型不一致
  const aiMap = new Map()
  latestDetection.value.seatStatus.forEach(s => aiMap.set(Number(s.seatId), s))

  return seats.value.map(seat => {
    const ai = aiMap.get(Number(seat.seatId))   // 同样强制 Number 查找
    if (ai?.phone_detected) {
      console.log(`[DEBUG] merged: seat ${seat.seatId} → phone_detected=true`)
    }
    return {
      ...seat,
      occupied:       ai ? !!ai.occupied       : false,
      phone_detected: ai ? !!ai.phone_detected : false,
    }
  })
})

// ─── 座位统计 ──────────────────────────────────────────────────
const statusCount = computed(() => ({
  available: seats.value.filter(s => s.status === 'available').length,
  reserved:  seats.value.filter(s => s.status === 'reserved').length,
  occupied:  seats.value.filter(s => s.status === 'occupied').length,
}))

// ─── DOM Refs ──────────────────────────────────────────────────
const canvas    = ref(null)
const canvasWrap = ref(null)
const videoEl   = ref(null)
const bgImg     = ref(null)
let   ctx       = null

/**
 * 原始视频分辨率（从 HTMLVideoElement.videoWidth/videoHeight 读取）。
 * 用于将 YOLO 检测框坐标从"原始视频像素"归一化。
 * 初始为 0，loadedmetadata 事件后更新。
 */
let nativeVideoW = 0
let nativeVideoH = 0

// ─── 工具函数 ──────────────────────────────────────────────────
const fmt2 = n => String(n).padStart(2, '0')
const formatTime = str => {
  if (!str) return '-'
  const d = new Date(str)
  return `${d.getMonth()+1}/${d.getDate()} ${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`
}
const getSeatNumber = seatId => {
  const s = seats.value.find(s => s.seatId === seatId)
  return s ? (s.seatNumber ?? seatId) : seatId
}

// ─── Canvas 尺寸同步 ───────────────────────────────────────────
/**
 * 将 canvas 的宽高同步到当前可见媒体元素的显示尺寸。
 * 窗口 resize 或模式切换时都需要调用。
 */
const syncCanvasSize = () => {
  if (!canvas.value || !canvasWrap.value) return
  const el = displayMode.value === 'video' ? videoEl.value : bgImg.value
  if (!el) return

  /**
   * 关键修复：不仅同步 canvas 宽高，还要同步 top/left 偏移。
   *
   * canvas-wrap 用 flex:1 填满可用高度。
   * 媒体元素 width:100%;height:auto 按宽高比流出，被 align-items:center 垂直居中。
   * canvas position:absolute top:0 如果不修正，会跟 canvas-wrap 顶部对齐，
   * 而不是视频内容顶部，导致标定框整体上移。
   *
   * 修复：计算 media 和 canvas-wrap 的 BoundingClientRect 差局，
   * 作为 canvas 的 top/left 唄子，让 canvas 严格覆盖媒体内容区。
   */
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

// ─── 坐标转换（关键：统一相对坐标体系）──────────────────────────
/**
 * 【seat_region 坐标转换】相对坐标 (0~1) → canvas 显示像素
 *
 * CalibrationView 保存时已将坐标归一化为 0~1（除以图片显示尺寸）。
 * 后端存储的就是 0~1 的相对值，与原图分辨率无关。
 * 这里直接 × canvas 当前显示宽高，不需要知道图片或视频的原始分辨率。
 */
const relToPx = (rx, ry) => ({
  x: rx * canvas.value.width,
  y: ry * canvas.value.height,
})

/**
 * 【YOLO 检测框坐标转换】原始视频像素坐标 → canvas 显示像素
 *
 * Python YOLO 输出的坐标基于视频原始分辨率（如 1920×1080）。
 * 转换分两步：
 *   ① 先除以原始分辨率，归一化为 0~1 相对坐标
 *   ② 再乘以 canvas 显示尺寸，得到屏幕像素
 *
 * 这样无论浏览器窗口多大，检测框都不会漂移。
 */
const detToPx = (dx, dy) => {
  if (!nativeVideoW || !nativeVideoH) {
    // 原始分辨率未知时，按比例降级（极少发生）
    return { x: dx, y: dy }
  }
  return {
    x: (dx / nativeVideoW) * canvas.value.width,
    y: (dy / nativeVideoH) * canvas.value.height,
  }
}

// ─── Canvas 绘制（核心）────────────────────────────────────────
/**
 * drawAll() — 每帧由 requestAnimationFrame 驱动调用。
 *
 * 绘制层级（从低到高）：
 *   1. seat_region 蓝框（已标定座位）
 *   2. seat_region 黄框（已预约/未签到）
 *   3. seat_region 绿框（AI 判定占用，覆盖蓝框）
 *   4. YOLO 红框（Python 检测到的人体框）
 */
const drawAll = () => {
  if (!ctx || !canvas.value) return
  const cw = canvas.value.width
  const ch = canvas.value.height
  ctx.clearRect(0, 0, cw, ch)

  // ── 层 1~4：seat_region 绘制（色彩优先级: 紫 > 绿 > 黄 > 蓝）──

  // 调试：确认 mergedSeats 已包含 phone_detected。偏尔打印避免刷屏
  if (Math.random() < 0.02) {
    console.log('[DEBUG] mergedSeats:', mergedSeats.value)
  }

  seatRegions.value.forEach(r => {
    // 强制转为 Number 再比较，避免 seatId 类型（number vs string）不一致导致 find() 失败
    const seat            = mergedSeats.value.find(s => Number(s.seatId) === Number(r.seatId))
    const isPhoneDetected = !!seat?.phone_detected   // 手机行为（最高优先级）
    const isOccupied      = !!seat?.occupied          // AI 判定占用
    const isReserved      = seat?.status === 'reserved' // 后端已预约
    const label           = seat?.seatNumber ? String(seat.seatNumber) : `S${r.seatId}`

    // 调试：打印每个座位的关键字段，确认 phone_detected 是否正确读到
    console.log('[DEBUG] seat draw:', {
      id: seat?.seatId,
      phone: seat?.phone_detected,
      occupied: seat?.occupied,
      chosenColor: isPhoneDetected ? '#9C27B0(紫)' : isOccupied ? '#67C23A(绿)' : isReserved ? '#E6A23C(黄)' : '#409EFF(蓝)'
    })

    // 相对坐标 → 像素
    const p1 = relToPx(r.x1, r.y1)
    const p2 = relToPx(r.x2, r.y2)
    const w  = p2.x - p1.x
    const h  = p2.y - p1.y

    ctx.save()

    if (isPhoneDetected) {
      // 紫框：检测到手机行为（最高优先级）
      ctx.strokeStyle = '#9C27B0'
      ctx.lineWidth   = 3
      ctx.fillStyle   = 'rgba(156,39,176,0.15)'
      ctx.fillRect(p1.x, p1.y, w, h)
      ctx.strokeRect(p1.x, p1.y, w, h)
      // 主标签：座位号
      ctx.fillStyle    = '#9C27B0'
      ctx.font         = 'bold 12px sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillText(label, p1.x + 4, p1.y + 4)
      // 副标签：Using Phone（在主标签下方）
      ctx.font      = 'bold 10px sans-serif'
      ctx.fillStyle = '#CE93D8'
      ctx.fillText('☏ Using Phone', p1.x + 4, p1.y + 18)
    } else if (isOccupied) {
      // 绿框：AI 命中座位
      ctx.strokeStyle = '#67C23A'
      ctx.lineWidth   = 3
      ctx.fillStyle   = 'rgba(103,194,58,0.18)'
      ctx.fillRect(p1.x, p1.y, w, h)
      ctx.strokeRect(p1.x, p1.y, w, h)
      ctx.fillStyle    = '#67C23A'
      ctx.font         = 'bold 12px sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillText(`${label} ✓`, p1.x + 4, p1.y + 4)
    } else if (isReserved) {
      // 黄框：已预约未签到
      ctx.strokeStyle = '#E6A23C'
      ctx.lineWidth   = 1.5
      ctx.fillStyle   = 'rgba(230,162,60,0.12)'
      ctx.fillRect(p1.x, p1.y, w, h)
      ctx.strokeRect(p1.x, p1.y, w, h)
      ctx.fillStyle    = '#E6A23C'
      ctx.font         = 'bold 11px sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillText(label, p1.x + 4, p1.y + 4)
    } else {
      // 蓝框：已标定、空闲
      ctx.strokeStyle = '#409EFF'
      ctx.lineWidth   = 1.5
      ctx.fillStyle   = 'rgba(64,158,255,0.08)'
      ctx.fillRect(p1.x, p1.y, w, h)
      ctx.strokeRect(p1.x, p1.y, w, h)
      ctx.fillStyle    = '#409EFF'
      ctx.font         = 'bold 11px sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillText(label, p1.x + 4, p1.y + 4)
    }

    ctx.restore()
  })

  // ── 层 4：YOLO 检测框（仅 roomId 匹配 + 视频模式 + 有分辨率时渲染）──
  if (displayMode.value === 'video' && aiMatchesRoom.value && nativeVideoW > 0) {
    const rawDets = latestDetection.value.detections || []

    // 调试输出（偶尔打印，避免刷屏）
    if (rawDets.length > 0 && Math.random() < 0.05) {
      console.log('[DEBUG] canvas size:', canvas.value.width, canvas.value.height)
      console.log('[DEBUG] det sample:', rawDets[0])
    }

    rawDets.forEach(det => {
      const isPerson = det.type === 'person'
      const isPhone  = det.type === 'cell phone' || det.type === 'phone'
      if (!isPerson && !isPhone) return

      // 相对坐标 (0~1) → canvas 显示像素
      const x1 = det.x1 * canvas.value.width
      const y1 = det.y1 * canvas.value.height
      const x2 = det.x2 * canvas.value.width
      const y2 = det.y2 * canvas.value.height
      const w  = x2 - x1
      const h  = y2 - y1

      // ── 颜色主题 ──────────────────────────────────────────────
      // person：红色   phone：紫色（与 seat phone_detected 颜色全局一致）
      const color      = isPerson ? '#F56C6C' : '#9C27B0'
      const fillAlpha  = isPerson ? 'rgba(245,108,108,0.06)' : 'rgba(156,39,176,0.08)'
      const badgeBg    = isPerson ? 'rgba(245,108,108,0.88)' : 'rgba(156,39,176,0.90)'

      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth   = isPerson ? 1.5 : 2
      ctx.fillStyle   = fillAlpha
      ctx.fillRect(x1, y1, w, h)
      ctx.strokeRect(x1, y1, w, h)

      // ── 标签：类别 + 置信度 ────────────────────────────────────
      const typeLabel = isPerson ? 'person' : 'phone'
      const confPart  = det.confidence != null ? ` ${Math.round(det.confidence * 100)}%` : ''
      const label     = `${typeLabel}${confPart}`

      ctx.font = 'bold 10px sans-serif'
      const tw = ctx.measureText(label).width + 8
      const th = 15

      // 标签背景框：紧贴检测框顶部上方
      const labelY = y1 >= th ? y1 - th : y1 + h  // 如果顶部放不下就放在框底部
      ctx.fillStyle = badgeBg
      ctx.fillRect(x1, labelY, tw, th)

      // 标签文字
      ctx.fillStyle    = '#fff'
      ctx.textBaseline = 'top'
      ctx.fillText(label, x1 + 4, labelY + 3)

      ctx.restore()
    })
  }
}

// ─── requestAnimationFrame 绘制循环 ──────────────────────────
let rafId = null

const startRaf = () => {
  const loop = () => {
    syncCanvasSize()   // 每帧检查尺寸（低开销，保证 resize 时不漂移）
    drawAll()
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
}

const stopRaf = () => {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
}

// ─── 媒体事件 ──────────────────────────────────────────────────
/**
 * video loadedmetadata：读取原始分辨率，此后 detToPx 才能正确工作。
 * Python YOLO 输出的像素坐标基于这个分辨率。
 */
const onVideoMetadata = () => {
  if (!videoEl.value) return
  nativeVideoW = videoEl.value.videoWidth
  nativeVideoH = videoEl.value.videoHeight
  console.log(`[Monitor] 视频原始分辨率: ${nativeVideoW}×${nativeVideoH}`)
  syncCanvasSize()
}

const onImageLoad = () => { syncCanvasSize() }

// ─── AI 检测数据轮询（按房间读取 latest_{roomId}.json）────────────────
/**
 * pollLatestDetection — 轮询当前房间的 JSON。
 *
 * 规则：
 *   - 文件路径使用动态 `latest_${currentRoomId.value}.json` 区分房间内容
 *   - 读取成功且 roomId 一致  → 更新 latestDetection，绘制检测框
 *   - 读取失败或 404          → 清除状态 latestDetection = null，UI 显示"暂无数据"，不报错
 */
let detectionPollTimer = null

const pollLatestDetection = async () => {
  if (!currentRoomId.value) return
  
  const detectionUrl = `/media/detections/latest_${currentRoomId.value}.json`

  try {
    const res = await fetch(`${detectionUrl}?t=${Date.now()}`)
    if (!res.ok) {
      // 404 等情况表示当前房间没有正在运行 AI，清空数据
      if (latestDetection.value !== null) {
        latestDetection.value = null
      }
      return
    }
    const data = await res.json()

    // 作为一个保险校验（主要依靠 URL 已经按房间隔离了）
    const jsonRoomId = data.roomId ?? null

    if (jsonRoomId !== null && jsonRoomId !== currentRoomId.value) {
      // 内部 roomId 仍然不一致：可能是脏数据或旧文件，防御性忽略并清空
      latestDetection.value = null
      return
    }

    // 成功匹配：更新 latestDetection
    latestDetection.value = {
      roomId:      jsonRoomId,
      frameIndex:  data.frameIndex  ?? data.frame_index ?? 0,
      frameWidth:  data.frameWidth  ?? data.frame_width  ?? 0,
      frameHeight: data.frameHeight ?? data.frame_height ?? 0,
      detections:  Array.isArray(data.detections)  ? data.detections  : [],
      seatStatus:  Array.isArray(data.seatStatus)  ? data.seatStatus  :
                   Array.isArray(data.seat_status)  ? data.seat_status : [],
      updatedAt:   data.updatedAt ?? data.updated_at ?? '',
    }
  } catch (e) {
    // 捕获到语法错误、网络断开等情况时也优雅清空
    if (latestDetection.value !== null) {
      latestDetection.value = null
    }
  }
}

const startDetectionPoll = () => {
  // 立即执行一次，再每 500ms 轮询
  pollLatestDetection()
  detectionPollTimer = setInterval(pollLatestDetection, 500)
}

const stopDetectionPoll = () => {
  clearInterval(detectionPollTimer)
  detectionPollTimer = null
}

// ─── 后端数据加载 ─────────────────────────────────────────────
const loadRoomData = async rid => {
  loading.value           = true
  seatRegions.value       = []
  recentRecognitions.value = []
  try {
    // 0. 从 GET /rooms/{roomId} 拿 videoUrl（统一视频来源）
    try {
      const roomDetail = await getRoomById(rid)
      videoUrl.value  = roomDetail.videoUrl  || ''
    } catch (_) {
      // 拿不到时静默降级（保持旧值）
    }
    
    const seatData = await getSeatsByRoom(rid)
    seats.value = Array.isArray(seatData) ? seatData : []

    // 并行拉取所有座位的 region
    const regResults = await Promise.allSettled(
      seats.value.map(s => getSeatRegion(s.seatId))
    )
    /**
     * 后端存储的 seat_region 是相对坐标（0~1）。
     * CalibrationView 保存时使用如下公式：
     *   x_rel = x_px / image.offsetWidth
     *   y_rel = y_px / image.offsetHeight
     * 因此这里无需做任何额外处理，直接使用即可。
     * 绘制时通过 relToPx() 乘以 canvas 显示尺寸。
     */
    seatRegions.value = seats.value
      .map((s, i) => {
        const res = regResults[i]
        if (
          res.status === 'fulfilled' && res.value &&
          res.value.x1 != null && res.value.y1 != null
        ) {
          return {
            seatId: s.seatId,
            x1: Number(res.value.x1),
            y1: Number(res.value.y1),
            x2: Number(res.value.x2),
            y2: Number(res.value.y2),
          }
        }
        return null
      })
      .filter(Boolean)

    await loadRecognitions()
    await nextTick()
    syncCanvasSize()
  } catch (e) {
    ElMessage.error('加载数据失败：' + (e?.message || ''))
  } finally {
    loading.value = false
  }
}

const loadRecognitions = async () => {
  if (!seats.value.length) return
  try {
    const targetSeats = seats.value.filter(s => s.cameraEnabled).slice(0, 8)
    if (!targetSeats.length) return
    const results = await Promise.allSettled(
      targetSeats.map(s => getRecognitionBySeat(s.seatId))
    )
    const all = []
    results.forEach(res => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        const latest = [...res.value].sort(
          (a, b) => new Date(b.detectTime) - new Date(a.detectTime)
        )[0]
        if (latest) all.push(latest)
      }
    })
    recentRecognitions.value = all
      .sort((a, b) => new Date(b.detectTime) - new Date(a.detectTime))
      .slice(0, 5)
  } catch (_) { /* 静默 */ }
}

const loadRecentNotifs = async () => {
  if (!userId) return
  try {
    const data = await getNotificationsByUser(userId)
    recentNotifs.value = [...data]
      .sort((a, b) => new Date(b.sendTime) - new Date(a.sendTime))
      .slice(0, 5)
  } catch (_) { /* 静默 */ }
}

const silentRefresh = async () => {
  if (!currentRoomId.value) return
  try {
    const [seatRes] = await Promise.allSettled([getSeatsByRoom(currentRoomId.value)])
    if (seatRes.status === 'fulfilled' && Array.isArray(seatRes.value)) {
      seats.value = seatRes.value
    }
    await Promise.allSettled([loadRecognitions(), loadRecentNotifs()])
  } catch (_) { /* 静默 */ }
}

// ─── 交互 ────────────────────────────────────────────────────
const onRoomChange = rid => {
  // 切换房间时清空旧检测结果，避免前一个房间数据短暂残留
  latestDetection.value = null
  loadRoomData(rid)
}

const manualRefresh = async () => {
  if (!currentRoomId.value || refreshing.value) return
  refreshing.value = true
  await Promise.allSettled([silentRefresh(), pollLatestDetection()])
  refreshing.value = false
  ElMessage.success('已刷新')
}

// 切模式时重新同步 canvas 尺寸
watch(displayMode, () => nextTick(syncCanvasSize))

// ─── 生命周期 ────────────────────────────────────────────────
let pollTimer = null
const onResize = () => { syncCanvasSize() }

onMounted(async () => {
  // 1. 房间列表
  try {
    const data = await getStudyRooms()
    rooms.value = Array.isArray(data) ? data : []
    if (rooms.value.length > 0) {
      currentRoomId.value = rooms.value[0].roomId
      await loadRoomData(currentRoomId.value)
    }
  } catch {
    ElMessage.error('加载自习室失败')
  }

  await loadRecentNotifs()

  // 2. 启动 latest.json 准实时轮询（每 500ms，含 roomId 过滤）
  startDetectionPoll()

  // 3. 启动 rAF 绘制循环
  startRaf()

  // 4. 5s 轮询座位状态 + 通知
  pollTimer = setInterval(silentRefresh, 5000)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  stopRaf()
  stopDetectionPoll()
  clearInterval(pollTimer)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
/* ── 页面根 ── */
.monitor-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #f5f6f7;
}

/* ── 工具栏 ── */
.toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #ebebeb;
}
.toolbar-left  { display: flex; align-items: center; gap: 10px; }
.toolbar-right { display: flex; align-items: center; gap: 10px; }
.room-select   { width: 160px; }

.mode-tabs {
  display: flex;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}
.mode-tab {
  padding: 6px 14px;
  background: #fff;
  border: none;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}
.mode-tab.active   { background: #111; color: #fff; }
.mode-tab:disabled { color: #d1d5db; cursor: not-allowed; background: #fafafa; }

.detect-badge {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: #6b7280;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 4px 12px;
}
.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  animation: pulse 1.8s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1;   transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.85); }
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.refresh-btn:hover:not(:disabled) { background: #333; }
.refresh-btn:disabled { background: #d1d5db; cursor: not-allowed; }

/* ── 主体布局 ── */
.main-layout {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px 24px;
  overflow: hidden;
  min-height: 0;
}

/* ── 左侧画面区 ── */
.canvas-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.canvas-wrap {
  position: relative;
  background: #111;
  border-radius: 10px;
  overflow: hidden;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* video 与 img 共用同一样式类，与 CalibrationView 完全一致 */
.media-element {
  display: block;
  width: 100%;
  height: auto;         /* 不强制拉伸，保持原始宽高比自然流出 */
  max-height: 65vh;     /* 与 CalibrationView 对齐 */
  object-fit: contain;
  user-select: none;
}

/*
  canvas 绝对定位，完全覆盖媒体元素。
  pointer-events: none 保证不拦截视频交互。
  尺寸由 syncCanvasSize() 精确同步，不能用 CSS 100% 代替
  （CSS 会拉伸，导致坐标换算错误）。
*/
.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.canvas-loading {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.no-data-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(17,17,17,0.82);
  color: #9ca3af;
  font-size: 14px;
  z-index: 5;
  border-radius: 10px;
}
.no-data-sub { font-size: 12px; color: #6b7280; margin: 0; }

/* 图例 */
.legend-bar {
  flex-shrink: 0;
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #6b7280;
  flex-wrap: wrap;
}
.legend-item { display: flex; align-items: center; gap: 7px; }
.legend-dot {
  width: 14px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}

/* ── 右侧信息区 ── */
.info-panel {
  width: 286px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.info-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px 18px;
  flex-shrink: 0;
}

.card-title {
  font-size: 11px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 12px;
}

/* AI 状态徽章 */
.ai-status-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  padding: 2px 7px;
  border-radius: 20px;
  flex-shrink: 0;
}
.badge-ai-on  { background: rgba(103,194,58,0.15); color: #67C23A; }
.badge-ai-off { background: rgba(144,147,153,0.15); color: #909399; }

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px solid #f3f4f6;
}
.info-row:last-child { border-bottom: none; }
.info-label { font-size: 12px; color: #9ca3af; }
.info-value { font-size: 13px; font-weight: 600; color: #111; }
.mono       { font-variant-numeric: tabular-nums; }

/* 统计格 */
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.stat-item {
  background: #f9fafb;
  border-radius: 7px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.stat-num { font-size: 20px; font-weight: 700; color: #111; font-variant-numeric: tabular-nums; }
.stat-label { font-size: 11px; color: #9ca3af; }

/* AI 命中座位芯片 */
.seat-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.seat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 10px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  gap: 2px;
}
.chip-occupied { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.chip-empty    { background: #f9fafb; color: #9ca3af; border: 1px solid #e5e7eb; }
.chip-status   { font-size: 10px; font-weight: 400; }

/* 识别记录 */
.record-list  { display: flex; flex-direction: column; gap: 8px; }
.record-item  { padding: 8px 10px; background: #f9fafb; border-radius: 7px; }
.record-main  { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
.record-seat  { font-size: 13px; font-weight: 600; color: #111; }
.record-meta  { font-size: 11px; color: #9ca3af; display: flex; gap: 4px; }

/* 通知 mini */
.notif-list-mini { display: flex; flex-direction: column; gap: 8px; }
.notif-mini-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  background: #f9fafb;
  border-radius: 7px;
}
.notif-unread    { border-left: 3px solid #ef4444; }
.notif-mini-dot  { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; margin-top: 5px; flex-shrink: 0; }
.notif-mini-body { flex: 1; min-width: 0; }
.notif-mini-msg  { font-size: 12px; color: #374151; margin: 0 0 3px; line-height: 1.4; word-break: break-word; }
.notif-mini-time { font-size: 11px; color: #9ca3af; }

/* 角标 */
.badge-green   { font-size: 12px; color: #16a34a; font-weight: 500; background: #dcfce7; border-radius: 4px; padding: 2px 8px; }
.badge-blue    { font-size: 11px; color: #2563eb; font-weight: 600; background: #eff6ff; border-radius: 4px; padding: 2px 7px; }
.badge-gray-sm { font-size: 11px; color: #6b7280; background: #f3f4f6; border-radius: 4px; padding: 2px 7px; }
.text-green    { color: #16a34a; }
.text-yellow   { color: #ca8a04; }
.text-blue     { color: #2563eb; }
.text-gray     { color: #6b7280; }
.divider       { color: #d1d5db; }
.muted         { font-size: 12px; color: #9ca3af; margin: 0; }
</style>
