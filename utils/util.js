// 工具函数 utils/util.js

/**
 * 格式化时间
 */
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

/**
 * 生成16位唯一ID
 */
const generateId = () => {
  const timestamp = Date.now().toString(36).substr(2) // 时间戳
  const random = Math.random().toString(36).substr(2, 6) // 6位随机数
  const id = (timestamp + random).substr(0, 16) // 总共16位
  return id.toUpperCase() // 可转为大写，方便查看
}

/**
 * 防抖函数
 */
const debounce = (func, wait) => {
  let timeout
  return function(...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

/**
 * 显示Toast提示
 */
const showToast = (title, icon = 'none', duration = 2000) => {
  wx.showToast({
    title,
    icon,
    duration
  })
}

/**
 * 显示加载提示
 */
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  })
}

/**
 * 隐藏加载提示
 */
const hideLoading = () => {
  wx.hideLoading()
}

/**
 * 显示确认弹窗
 */
const showModal = (title, content, options = {}) => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmColor: '#FF4D4F',
      ...options,
      success(res) {
        resolve(res.confirm)
      }
    })
  })
}

/**
 * 验证歌单名称
 */
const validatePlaylistName = (name) => {
  if (!name || !name.trim()) {
    showToast('请输入歌单名称')
    return false
  }
  if (name.length > 100) {
    showToast('歌单名称不能超过100字符')
    return false
  }
  return true
}

/**
 * 验证歌曲信息
 */
const validateSong = (song, existingSongs = []) => {
  if (!song.name || !song.name.trim()) {
    showToast('请输入歌曲名称')
    return false
  }
  if (!song.artist || !song.artist.trim()) {
    showToast('请输入歌手名称')
    return false
  }

  // 检查重复
  const isDuplicate = existingSongs.some(s =>
    s.name.trim() === song.name.trim() &&
    s.artist.trim() === song.artist.trim()
  )
  if (isDuplicate) {
    showToast('该歌曲已存在于歌单中')
    return false
  }

  return true
}

module.exports = {
  formatTime,
  generateId,
  debounce,
  showToast,
  showLoading,
  hideLoading,
  showModal,
  validatePlaylistName,
  validateSong
}