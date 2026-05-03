import request from '@/utils/request'

/**
 * 上报行为检测结果
 * POST /behavior/upload
 * @param {{ seatId, behaviorType, detectTime, confidence }} data
 */
export const uploadBehavior = (data) => request.post('/behavior/upload', data)
