// 数据管理 utils/data.js
const util = require('./util.js')

// 本地存储 key 定义
const STORAGE_KEYS = {
  USER_INFO: 'userInfo',
  PLAYLISTS: 'playlists',
  CURRENT_PLAYLIST: 'currentPlaylist',
  SINGING_LIST: 'singingList',
  PERFORMANCE: 'performance', // 当前演出
  PERFORMANCE_HISTORY: 'performanceHistory' // 演出历史
}

/**
 * 获取所有歌单
 */
const getPlaylists = () => {
  try {
    const playlists = wx.getStorageSync(STORAGE_KEYS.PLAYLISTS) || []
    return Array.isArray(playlists) ? playlists : []
  } catch (error) {
    console.error('获取歌单失败:', error)
    return []
  }
}

/**
 * 添加歌单
 * @param {string} name - 歌单名称
 * @param {string} userId - 创建者ID（歌手ID）
 * @param {string} userName - 创建者名称
 */
const addPlaylist = (name, userId = null, userName = '') => {
  const playlists = getPlaylists()

  // 如果没有提供userId，尝试从本地存储获取当前用户
  if (!userId) {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      userId = userInfo.id || userInfo.openid
      userName = userInfo.nickname || userInfo.nickName || ''
    }
  }

  const newPlaylist = {
    id: util.generateId(),
    name,
    userId: userId, // 关联创建者（歌手）ID
    userName: userName, // 创建者名称
    songs: [],
    createTime: Date.now(),
    updateTime: Date.now(),
    qrCode: null // 二维码地址
  }

  playlists.push(newPlaylist)
  try {
    wx.setStorageSync(STORAGE_KEYS.PLAYLISTS, playlists)
    return newPlaylist
  } catch (error) {
    console.error('保存歌单失败:', error)
    util.showToast('保存失败')
    return null
  }
}

/**
 * 删除歌单
 */
const deletePlaylist = (playlistId) => {
  const playlists = getPlaylists()
  const filteredPlaylists = playlists.filter(p => p.id !== playlistId)

  try {
    wx.setStorageSync(STORAGE_KEYS.PLAYLISTS, filteredPlaylists)
    return true
  } catch (error) {
    console.error('删除歌单失败:', error)
    util.showToast('删除失败')
    return false
  }
}

/**
 * 根据ID获取歌单
 */
const getPlaylistById = (playlistId) => {
  const playlists = getPlaylists()
  return playlists.find(p => p.id === playlistId) || null
}

/**
 * 更新歌单
 */
const updatePlaylist = (playlistId, updates) => {
  const playlists = getPlaylists()
  const index = playlists.findIndex(p => p.id === playlistId)

  if (index === -1) {
    util.showToast('歌单不存在')
    return null
  }

  playlists[index] = {
    ...playlists[index],
    ...updates,
    updateTime: Date.now()
  }

  try {
    wx.setStorageSync(STORAGE_KEYS.PLAYLISTS, playlists)
    return playlists[index]
  } catch (error) {
    console.error('更新歌单失败:', error)
    util.showToast('更新失败')
    return null
  }
}

/**
 * 添加歌曲到歌单
 */
const addSongToPlaylist = (playlistId, song) => {
  const playlist = getPlaylistById(playlistId)

  if (!playlist) {
    util.showToast('歌单不存在')
    return false
  }

  if (playlist.songs.length >= 100) {
    util.showToast('每个歌单最多添加100首歌')
    return false
  }

  // 检查重复
  const isDuplicate = playlist.songs.some(s =>
    s.name.trim() === song.name.trim() &&
    s.artist.trim() === song.artist.trim()
  )

  if (isDuplicate) {
    util.showToast('该歌曲已存在于歌单中')
    return false
  }

  const newSong = {
    id: util.generateId(),
    name: song.name.trim(),
    artist: song.artist.trim(),
    cover: song.cover || '',
    priority: 0, // 优先级，爱心数
    addTime: Date.now(),
    order: playlist.songs.length
  }

  playlist.songs.push(newSong)

  if (updatePlaylist(playlistId, { songs: playlist.songs })) {
    return newSong
  }

  return false
}

/**
 * 删除歌单中的歌曲
 */
const removeSongFromPlaylist = (playlistId, songId) => {
  const playlist = getPlaylistById(playlistId)

  if (!playlist) {
    util.showToast('歌单不存在')
    return false
  }

  const filteredSongs = playlist.songs.filter(s => s.id !== songId)
  return updatePlaylist(playlistId, { songs: filteredSongs })
}

/**
 * 更新歌曲信息
 */
const updateSong = (playlistId, songId, updates) => {
  const playlist = getPlaylistById(playlistId)

  if (!playlist) {
    util.showToast('歌单不存在')
    return false
  }

  const songIndex = playlist.songs.findIndex(s => s.id === songId)

  if (songIndex === -1) {
    util.showToast('歌曲不存在')
    return false
  }

  playlist.songs[songIndex] = {
    ...playlist.songs[songIndex],
    ...updates
  }

  return updatePlaylist(playlistId, { songs: playlist.songs })
}

/**
 * 调整歌曲排序
 */
const reorderSongs = (playlistId, songs) => {
  return updatePlaylist(playlistId, { songs })
}

/**
 * 获取演唱列表
 */
const getSingingList = () => {
  try {
    return wx.getStorageSync(STORAGE_KEYS.SINGING_LIST) || []
  } catch (error) {
    console.error('获取演唱列表失败:', error)
    return []
  }
}

/**
 * 设置演唱列表
 */
const setSingingList = (songs) => {
  try {
    wx.setStorageSync(STORAGE_KEYS.SINGING_LIST, songs)
    return true
  } catch (error) {
    console.error('设置演唱列表失败:', error)
    util.showToast('设置失败')
    return false
  }
}

/**
 * 观众点歌
 */
const addSongToSingingList = (song) => {
  const singingList = getSingingList()

  // 检查是否已存在该歌曲
  const existingSong = singingList.find(s =>
    s.name === song.name && s.artist === song.artist
  )

  if (existingSong) {
    // 如果已存在，增加爱心数
    existingSong.priority += 1
  } else {
    // 如果不存在，添加到演唱列表，默认爱心数为1
    singingList.push({
      ...song,
      priority: 1,
      id: util.generateId(),
      addTime: Date.now()
    })
  }

  // 重新排序（按爱心数降序，相同爱心数按添加时间升序）
  const sortedList = singingList.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority
    }
    return a.addTime - b.addTime
  })

  return setSingingList(sortedList)
}

/**
 * 生成歌曲二维码（模拟）
 */
const generateQRCode = (playlistId) => {
  return new Promise((resolve) => {
    // 模拟生成二维码，实际需要调用微信API
    setTimeout(() => {
      const qrCode = `data:image/png;base64,${btoa(playlistId)}`
      resolve(qrCode)
    }, 1000)
  })
}

/**
 * ========== 演出相关 ==========
 */

/**
 * 获取当前演出
 */
const getCurrentPerformance = () => {
  try {
    return wx.getStorageSync(STORAGE_KEYS.PERFORMANCE) || null
  } catch (error) {
    console.error('获取当前演出失败:', error)
    return null
  }
}

/**
 * 创建新演出
 * @param {string} playlistId - 歌单ID
 * @param {string} userId - 歌手ID
 * @param {string} userName - 歌手名称
 */
const createPerformance = (playlistId, userId, userName) => {
  // 先结束之前的演出
  endCurrentPerformance()

  const performance = {
    id: util.generateId(),
    playlistId: playlistId,
    singerId: userId,
    singerName: userName,
    status: 'ongoing', // ongoing | ended
    startTime: Date.now(),
    endTime: null,
    singingList: [],
    currentIndex: 0, // 当前演唱歌曲索引
    sungCount: 0 // 已演唱歌曲数量
  }

  try {
    wx.setStorageSync(STORAGE_KEYS.PERFORMANCE, performance)
    return performance
  } catch (error) {
    console.error('创建演出失败:', error)
    return null
  }
}

/**
 * 结束当前演出
 */
const endCurrentPerformance = () => {
  const performance = getCurrentPerformance()
  if (performance && performance.status === 'ongoing') {
    performance.status = 'ended'
    performance.endTime = Date.now()

    try {
      // 保存到历史
      const history = wx.getStorageSync(STORAGE_KEYS.PERFORMANCE_HISTORY) || []
      history.push(performance)
      wx.setStorageSync(STORAGE_KEYS.PERFORMANCE_HISTORY, history)

      // 清空当前演出
      wx.setStorageSync(STORAGE_KEYS.PERFORMANCE, null)

      // 清空演唱列表
      setSingingList([])

      return true
    } catch (error) {
      console.error('结束演出失败:', error)
      return false
    }
  }
  return false
}

/**
 * 检查歌单是否有正在进行的演出
 * @param {string} playlistId - 歌单ID
 */
const hasOngoingPerformance = (playlistId) => {
  const performance = getCurrentPerformance()
  return performance &&
         performance.status === 'ongoing' &&
         performance.playlistId === playlistId
}

/**
 * 获取演出对应的演唱列表
 */
const getPerformanceSingingList = () => {
  const performance = getCurrentPerformance()
  if (performance && performance.status === 'ongoing') {
    return performance.singingList || []
  }
  return []
}

/**
 * 更新演出的演唱列表
 * @param {Array} singingList - 演唱列表
 */
const updatePerformanceSingingList = (singingList) => {
  const performance = getCurrentPerformance()
  if (performance && performance.status === 'ongoing') {
    performance.singingList = singingList
    try {
      wx.setStorageSync(STORAGE_KEYS.PERFORMANCE, performance)
      // 同时更新全局演唱列表
      setSingingList(singingList)
      return true
    } catch (error) {
      console.error('更新演出演唱列表失败:', error)
      return false
    }
  }
  return false
}

/**
 * 更新演唱进度
 * @param {number} currentIndex - 当前歌曲索引
 * @param {number} sungCount - 已演唱数量
 */
const updatePerformanceProgress = (currentIndex, sungCount) => {
  const performance = getCurrentPerformance()
  if (performance && performance.status === 'ongoing') {
    performance.currentIndex = currentIndex
    performance.sungCount = sungCount
    try {
      wx.setStorageSync(STORAGE_KEYS.PERFORMANCE, performance)
      // 同时更新全局演唱列表，确保同步
      setSingingList(performance.singingList || [])
      return true
    } catch (error) {
      console.error('更新演唱进度失败:', error)
      return false
    }
  }
  return false
}

/**
 * 获取演唱进度
 */
const getPerformanceProgress = () => {
  const performance = getCurrentPerformance()
  if (performance && performance.status === 'ongoing') {
    return {
      currentIndex: performance.currentIndex || 0,
      sungCount: performance.sungCount || 0,
      singingList: performance.singingList || []
    }
  }
  return null
}

/**
 * 清除用户的点歌记录（当演出结束时调用）
 * @param {string} performanceId - 演出ID
 */
const clearOrderedSongsForPerformance = (performanceId) => {
  try {
    const orderedSongs = wx.getStorageSync('orderedSongs') || []
    // 只保留不属于当前演出的记录（如果有performanceId关联的话）
    // 简单处理：演出结束时清空所有点歌记录
    wx.setStorageSync('orderedSongs', [])
    return true
  } catch (error) {
    console.error('清除点歌记录失败:', error)
    return false
  }
}

module.exports = {
  STORAGE_KEYS,
  getPlaylists,
  addPlaylist,
  deletePlaylist,
  getPlaylistById,
  updatePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  updateSong,
  reorderSongs,
  getSingingList,
  setSingingList,
  addSongToSingingList,
  generateQRCode,
  // 演出相关
  getCurrentPerformance,
  createPerformance,
  endCurrentPerformance,
  hasOngoingPerformance,
  getPerformanceSingingList,
  updatePerformanceSingingList,
  clearOrderedSongsForPerformance,
  // 演唱进度相关
  updatePerformanceProgress,
  getPerformanceProgress
}