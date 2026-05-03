import request from '@/utils/request'

/**
 * 上报座位占用识别结果
 * POST /recognition/upload
 * @param {{ seatId, occupied, detectTime, confidence }} data
 */
export const uploadRecognition = (data) => request.post('/recognition/upload', data)

/**
 * 查询指定座位的最近识别记录
 * GET /recognition/records?seatId={seatId}
 */
export const getRecognitionBySeat = (seatId) =>
  request.get('/recognition/records', { params: { seatId } })

