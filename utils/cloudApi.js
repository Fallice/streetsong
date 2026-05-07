// 云函数API封装
const cloud = {
  // 调用云函数
  callFunction(action, data = {}) {
    console.log('调用云函数:', { action, data })
    return wx.cloud.callFunction({
      name: 'api',
      data: {
        action,
        data
      }
    }).then(res => {
      console.log('云函数响应:', { action, result: res })
      if (res.result && res.result.success) {
        return res.result.data
      } else {
        throw new Error(res.result?.error || '调用失败')
      }
    })
  },

  // ========== 用户相关 ==========
  getUser(userId) {
    return this.callFunction('getUser', { userId })
  },

  // ========== 曲库相关 ==========
  getLibrary(userId) {
    return this.callFunction('getLibrary', { userId })
  },

  addSongToLibrary(userId, song) {
    return this.callFunction('addSongToLibrary', { userId, song })
  },

  removeSongFromLibrary(userId, songId) {
    return this.callFunction('removeSongFromLibrary', { userId, songId })
  },

  updateSongInLibrary(userId, songId, song) {
    return this.callFunction('updateSongInLibrary', { userId, songId, song })
  },

  // ========== 歌单相关 ==========
  getPlaylists(userId) {
    return this.callFunction('getPlaylists', { userId })
  },

  getPlaylist(playlistId) {
    return this.callFunction('getPlaylist', { playlistId })
  },

  createPlaylist(userId, name) {
    return this.callFunction('createPlaylist', { userId, name })
  },

  deletePlaylist(playlistId) {
    return this.callFunction('deletePlaylist', { playlistId })
  },

  addSongToPlaylist(playlistId, song) {
    return this.callFunction('addSongToPlaylist', { playlistId, song })
  },

  removeSongFromPlaylist(playlistId, songId) {
    return this.callFunction('removeSongFromPlaylist', { playlistId, songId })
  },

  reorderPlaylistSongs(playlistId, songs) {
    return this.callFunction('reorderPlaylistSongs', { playlistId, songs })
  },

  // ========== 演出相关 ==========
  getPerformance(performanceId) {
    return this.callFunction('getPerformance', { performanceId })
  },

  getUserPerformances(userId) {
    return this.callFunction('getUserPerformances', { userId })
  },

  createPerformance(userId, data) {
    return this.callFunction('createPerformance', { userId, ...data })
  },

  endPerformance(performanceId) {
    return this.callFunction('endPerformance', { performanceId })
  },

  // 更新演出进度
  updatePerformanceProgress(performanceId, currentIndex, sungCount) {
    return this.callFunction('updatePerformanceProgress', {
      performanceId,
      currentIndex,
      sungCount
    })
  },

  // 获取歌单二维码（首次生成后缓存到云端歌单文档，forceRefresh 跳过缓存重新生成）
  getPlaylistQRCode(playlistId, forceRefresh) {
    return this.callFunction('getPlaylistQRCode', { playlistId, forceRefresh })
  },

  // 更新演出演唱列表（用于同步点赞和点歌）
  updatePerformanceSingingList(performanceId, singingList) {
    return this.callFunction('updatePerformanceSingingList', {
      performanceId,
      singingList
    })
  },

  // 获取演出演唱列表
  getPerformanceSingingList(performanceId) {
    return this.callFunction('getPerformanceSingingList', {
      performanceId
    })
  },

  // ========== 点歌记录相关 ==========
  createPointRecord(data) {
    return this.callFunction('createPointRecord', data)
  },

  getPointRecords(performanceId) {
    return this.callFunction('getPointRecords', { performanceId })
  },

  getUserPointRecords(userId) {
    return this.callFunction('getUserPointRecords', { userId })
  },

  updatePointRecordStatus(recordId, status) {
    return this.callFunction('updatePointRecordStatus', { recordId, status })
  }
}

module.exports = cloud