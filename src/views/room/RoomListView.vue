<template>
  <div class="room-list-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">自习室</h1>
        <p class="page-subtitle">选择一个自习室开始学习</p>
      </div>
      <div class="header-right">
        <el-input
          v-model="searchQuery"
          placeholder="搜索自习室名称"
          clearable
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <button class="add-btn" @click="router.push('/rooms/create')">新增自习室</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-wrap">
      <el-icon class="is-loading" :size="28" color="#909399"><Loading /></el-icon>
    </div>

    <!-- 无数据 -->
    <div v-else-if="rooms.length === 0" class="state-wrap">
      <el-empty description="暂无自习室" />
    </div>
    <div v-else-if="filteredRooms.length === 0" class="state-wrap">
      <el-empty description="没有匹配的自习室" />
    </div>

    <!-- 列表 -->
    <div v-else class="room-list">
      <div
        v-for="room in filteredRooms"
        :key="room.roomId"
        class="room-item"
      >
        <!-- 左侧信息 -->
        <div class="room-info">
          <span class="room-name">{{ room.roomName }}</span>
          <div class="room-meta">
            <span>容纳 {{ seatCounts[room.roomId] ?? room.capacity }} 人</span>
          </div>
        </div>

        <!-- 中间状态 -->
        <div class="room-status">
          <span :class="['status-dot', room.status === 'open' ? 'dot-open' : 'dot-closed']"></span>
          <span :class="['status-text', room.status === 'open' ? 'text-open' : 'text-closed']">
            {{ room.status === 'open' ? '开放中' : '已关闭' }}
          </span>
        </div>

        <!-- 右侧按钮 -->
        <button
          class="select-btn"
          :disabled="room.status !== 'open'"
          @click="enterRoom(room.roomId)"
        >
          选择
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loading, Search } from '@element-plus/icons-vue'
import { getStudyRooms } from '@/api/room'
import { getSeatsByRoom } from '@/api/seat'

const router = useRouter()
const rooms = ref([])
const loading = ref(false)
const seatCounts = ref({})
const searchQuery = ref('')

const filteredRooms = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return rooms.value
  return rooms.value.filter(r =>
    (r.roomName || '').toLowerCase().includes(q)
  )
})

const fetchRooms = async () => {
  loading.value = true
  try {
    rooms.value = await getStudyRooms()
    // 并行获取每个自习室的座位数
    const results = await Promise.allSettled(
      rooms.value.map(r => getSeatsByRoom(r.roomId))
    )
    results.forEach((result, i) => {
      const roomId = rooms.value[i].roomId
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        seatCounts.value[roomId] = result.value.length
      }
    })
  } catch (e) {
    console.error('获取自习室列表失败', e)
  } finally {
    loading.value = false
  }
}

const enterRoom = (roomId) => {
  router.push(`/rooms/${roomId}/seats`)
}

onMounted(fetchRooms)
</script>

<style scoped>
.room-list-page {
  background: #f5f6f7;
  padding: 40px 0 48px;
  box-sizing: border-box;
}

.page-header {
  max-width: 860px;
  margin: 0 auto 32px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.header-left {
  flex-shrink: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.search-input {
  width: 200px;
}

.add-btn {
  white-space: nowrap;
  padding: 8px 18px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.add-btn:hover {
  background: #333;
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

/* 列表容器 */
.room-list {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 每一行 */
.room-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 10px;
  background: #fff;
  transition: background 0.15s;
}

.room-item:hover {
  background: #f0f0f0;
}

/* 左侧信息 */
.room-info {
  flex: 1;
  min-width: 0;
}

.room-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #111;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-meta {
  font-size: 13px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4px;
}

.divider {
  color: #ccc;
}

/* 状态 */
.room-status {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot-open  { background: #22c55e; }
.dot-closed { background: #ef4444; }

.status-text {
  font-size: 13px;
}

.text-open   { color: #16a34a; }
.text-closed { color: #dc2626; }

/* 黑色按钮 */
.select-btn {
  flex-shrink: 0;
  padding: 8px 20px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.select-btn:hover:not(:disabled) {
  background: #333;
}

.select-btn:disabled {
  background: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
}

/* Loading / Empty */
.state-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

/* ===== 响应式 ===== */

/* 平板：< 768px */
@media (max-width: 768px) {
  .room-list-page {
    padding: 32px 0;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 20px;
  }

  .header-right {
    width: 100%;
  }

  .search-input {
    flex: 1;
    width: auto;
  }

  .room-item {
    flex-wrap: wrap;
    gap: 10px;
    padding: 14px 16px;
  }

  .room-status {
    order: 3;
  }

  .select-btn {
    order: 4;
    margin-left: auto;
  }
}

/* 手机：< 480px */
@media (max-width: 480px) {
  .room-list-page {
    padding: 20px 0;
  }

  .page-title {
    font-size: 20px;
  }

  .page-header,
  .room-list {
    padding: 0 16px;
  }

  .room-item {
    padding: 12px 14px;
    border-radius: 8px;
  }

  .room-name {
    font-size: 14px;
  }

  .status-text {
    display: none;  /* 只保留圆点，节省空间 */
  }

  .select-btn {
    padding: 7px 14px;
    font-size: 13px;
  }

  .add-btn {
    padding: 7px 12px;
    font-size: 13px;
  }
}
</style>