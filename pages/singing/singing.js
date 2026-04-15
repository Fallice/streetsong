// 演唱页面 singing.js
const util = require('../../utils/util.js')
const cloudApi = require('../../utils/cloudApi.js')
const app = getApp()

Page({
  data: {
    playlistId: '',
    playlist: null,
    singingList: [],
    currentIndex: 0,
    currentSong: null,
    nextSong: null,
    isPlaying: true,
    showList: false,
    sungCount: 0,
    remainingCount: 0,
    performanceId: null // 演出ID
  },

  onLoad(options) {
    if (options.playlistId) {
      this.setData({
        playlistId: options.playlistId
      })
      this.initSinging()
    } else {
      util.showToast('参数错误')
      wx.navigateBack()
    }
  },

  onShow() {
    // 定时获取最新演唱列表（模拟）
    this.pollingTimer = setInterval(() => {
      this.refreshSingingList()
    }, 5000)
  },

  onHide() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }
  },

  onUnload() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }

    // 清理演唱状态
    app.globalData.currentPlaylist = null
    app.globalData.currentSong = null
    app.globalData.singingList = []
  },

  // 初始化演唱
  async initSinging() {
    try {
      // 获取歌单信息
      const playlist = await cloudApi.getPlaylist(this.data.playlistId)
      if (!playlist) {
        util.showToast('歌单不存在')
        wx.navigateBack()
        return
      }

      // 获取用户信息
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo) {
        util.showToast('请先登录')
        wx.navigateBack()
        return
      }

      // 创建新的演出
      const performance = await cloudApi.createPerformance(userInfo.id, {
        title: playlist.name + ' 演唱会',
        playlistId: this.data.playlistId
      })

      // 获取演唱列表
      let singingList = [...(playlist.songs || [])]

      this.setData({
        playlist: playlist,
        singingList: singingList,
        isPlaying: true,
        sungCount: 0,
        remainingCount: singingList.length,
        performanceId: performance.id
      })

      // 更新全局演出信息
      app.globalData.currentPerformance = performance
      app.globalData.singingList = singingList

      this.updateCurrentSong()
    } catch (error) {
      console.error('初始化演出失败:', error)
      util.showToast('初始化演出失败')
      wx.navigateBack()
    }
  },

  // 刷新演唱列表
  refreshSingingList() {
    // 从全局数据获取最新演唱列表
    const singingList = app.globalData.singingList || this.data.singingList
    if (singingList.length !== this.data.singingList.length) {
      this.setData({
        singingList: singingList
      })
      this.updateCurrentSong()
    }
  },

  // 更新当前歌曲
  updateCurrentSong() {
    const { singingList, currentIndex } = this.data

    if (singingList.length === 0) {
      this.setData({
        currentSong: null,
        nextSong: null,
        remainingCount: 0
      })
      return
    }

    const currentSong = singingList[currentIndex] || null
    const nextSong = singingList[currentIndex + 1] || null

    this.setData({
      currentSong,
      nextSong,
      remainingCount: singingList.length - currentIndex - 1
    })

    // 更新全局状态
    app.globalData.currentSong = currentSong
  },

  // 下一首
  async nextSong() {
    const { singingList, currentIndex, sungCount } = this.data
    let newIndex = currentIndex + 1

    if (newIndex >= singingList.length) {
      util.showToast('已唱完所有歌曲')
      return
    }

    this.setData({
      currentIndex: newIndex,
      sungCount: sungCount + 1
    })

    this.updateCurrentSong()
  },

  // 显示列表
  showList() {
    this.setData({
      showList: true
    })
  },

  // 关闭列表
  hideList() {
    this.setData({
      showList: false
    })
  },

  // 选择歌曲
  selectSong(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      currentIndex: index,
      showList: false
    })
    this.updateCurrentSong()
  },

  // 结束演唱
  async endSinging() {
    const confirm = await util.showModal('结束演唱', '确定要结束演唱吗？')
    if (!confirm) return

    // 结束演出
    if (this.data.performanceId) {
      try {
        await cloudApi.endPerformance(this.data.performanceId)
      } catch (err) {
        console.error('结束演出失败:', err)
      }
    }

    // 清理全局状态
    app.globalData.currentPlaylist = null
    app.globalData.currentSong = null
    app.globalData.singingList = []
    app.globalData.currentPerformance = null

    wx.navigateBack()
  }
})
