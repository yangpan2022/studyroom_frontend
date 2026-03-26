import request from '@/utils/request'

/**
 * 获取指定自习室的座位列表
 * GET /rooms/{roomId}/seats
 */
export function getSeatsByRoom(roomId) {
  return request.get(`/rooms/${roomId}/seats`)
}
