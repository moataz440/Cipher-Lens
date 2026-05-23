/**
 * api.js - Axios API Client
 * Improvements:
 *   - Base URL from env variable with fallback
 *   - Timeout set (prevents hanging requests)
 *   - encryptImage/decryptImage use FormData correctly
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000,  // 2 minutes for large files / PBKDF2
})

export const encryptImage = (file, algorithm, key, onUploadProgress) =>
  api.post('/api/encryption/encrypt', (() => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('algorithm', algorithm)
    fd.append('key', key)
    return fd
  })(), { onUploadProgress })

export const decryptImage = (file, algorithm, key) =>
  api.post('/api/encryption/decrypt', (() => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('algorithm', algorithm)
    fd.append('key', key)
    return fd
  })())

export const generateKey = (length = 32) =>
  api.get('/api/encryption/generate-key', { params: { length } })

export const checkKeyStrength = (key) => {
  const fd = new FormData()
  fd.append('key', key)
  return api.post('/api/encryption/key-strength', fd)
}

export const benchmarkAlgorithms = (file, key) => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('key', key)
  return api.post('/api/analytics/benchmark', fd)
}

export const getAlgorithmInfo = () =>
  api.get('/api/analytics/algorithms')

export default api
