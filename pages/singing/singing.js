// 演唱页面 singing.js
const util = require('../../utils/util.js')
const data = require('../../utils/data.js')
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

      // 记录来源页面
      const pages = getCurrentPages()
      if (pages.length >= 2) {
        const prevPage = pages[pages.length - 2]
        this.returnTarget = prevPage.route
        console.log('来源页面:', this.returnTarget)
      }

      this.initSinging()
    } else {
      util.showToast('参数错误')
      wx.navigateBack()
    }
  },

  onShow() {
    // 定时刷新演唱列表
    this.pollingTimer = setInterval(() => {
      this.refreshSingingList()
    }, 3000)
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

    // 注意：返回不结束演出，只有点击"结束演唱"按钮才结束
    // 演出状态会保持，直到用户主动结束

    // 根据来源页面设置返回标记
    if (this.returnTarget === 'pages/index/index') {
      // 从首页返回，切换到"我的歌单"标签
      app.globalData.returnToMyPlaylists = true
    }
  },

  // 导航栏返回按钮点击事件
  onNavigateBack() {
    // 返回不结束演出，只保存当前进度（已经在切换歌曲时保存）
    wx.navigateBack()
  },

  // 初始化演唱
  async initSinging() {
    try {
      // 检查是否有正在进行的演出
      const currentPerformance = data.getCurrentPerformance()
      if (currentPerformance && currentPerformance.status === 'ongoing' && currentPerformance.playlistId === this.data.playlistId) {
        // 有正在进行的演出，恢复演唱状态
        console.log('恢复演出状态:', currentPerformance)

        // 获取歌单信息
        let playlist = null
        try {
          playlist = await cloudApi.getPlaylist(this.data.playlistId)
        } catch (err) {
          console.log('云函数获取失败，尝试本地获取:', err)
          playlist = data.getPlaylistById(this.data.playlistId)
        }

        if (!playlist) {
          util.showToast('歌单不存在')
          wx.navigateBack()
          return
        }

        // 获取演唱进度
        const progress = data.getPerformanceProgress()
        const singingList = data.getPerformanceSingingList()

        this.setData({
          playlist: playlist,
          singingList: singingList,
          isPlaying: true,
          sungCount: progress.sungCount,
          remainingCount: singingList.length - progress.currentIndex - 1,
          currentIndex: progress.currentIndex,
          performanceId: currentPerformance.id
        })

        // 更新全局演出信息
        app.globalData.currentPerformance = currentPerformance
        app.globalData.singingList = singingList

        this.updateCurrentSong()

        wx.showToast({
          title: '恢复演出',
          icon: 'success'
        })

        return // 恢复成功，不继续创建新演出
      }

      // 没有正在进行的演出，创建新演出

      // 获取歌单信息（优先使用云函数，失败则使用本地存储）
      let playlist = null
      try {
        playlist = await cloudApi.getPlaylist(this.data.playlistId)
      } catch (err) {
        console.log('云函数获取失败，尝试本地获取:', err)
        playlist = data.getPlaylistById(this.data.playlistId)
      }

      if (!playlist) {
        util.showToast('歌单不存在')
        wx.navigateBack()
        return
      }

      // 获取当前用户信息
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo) {
        util.showToast('请先登录')
        wx.navigateBack()
        return
      }

      // 创建新的演出
      const performance = data.createPerformance(
        this.data.playlistId,
        userInfo.id || userInfo.openid,
        userInfo.nickname || userInfo.nickName
      )

      if (!performance) {
        util.showToast('创建演出失败')
        wx.navigateBack()
        return
      }

      // 获取歌单歌曲作为初始演唱列表
      let singingList = [...(playlist.songs || [])]
      if (singingList.length === 0) {
        singingList = []
      }

      // 更新演出演唱列表
      data.updatePerformanceSingingList(singingList)

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

      wx.showToast({
        title: '演出开始',
        icon: 'success'
      })
    } catch (error) {
      console.error('初始化演唱失败:', error)
      util.showToast('启动失败，请重试')
      wx.navigateBack()
    }
  },

  // 刷新演唱列表
  refreshSingingList() {
    // 从演出数据获取最新演唱列表
    const singingList = data.getPerformanceSingingList()
    if (singingList && singingList.length !== this.data.singingList.length) {
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
  nextSong() {
    const { singingList, currentIndex, sungCount } = this.data
    let newIndex = currentIndex + 1

    if (newIndex >= singingList.length) {
      util.showToast('已唱完所有歌曲')
      return
    }

    const newSungCount = sungCount + 1
    this.setData({
      currentIndex: newIndex,
      sungCount: newSungCount
    })

    // 保存演唱进度
    data.updatePerformanceProgress(newIndex, newSungCount)

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
    // 计算新的已演唱数量：如果跳到前面，已演唱数量不减少
    const newSungCount = index > this.data.currentIndex ? this.data.sungCount + (index - this.data.currentIndex) : this.data.sungCount

    this.setData({
      currentIndex: index,
      sungCount: newSungCount,
      showList: false
    })

    // 保存演唱进度
    data.updatePerformanceProgress(index, newSungCount)

    this.updateCurrentSong()
  },

  // 结束演唱
  async endSinging() {
    const confirm = await util.showModal('结束演唱', '确定要结束演唱吗？')
    if (!confirm) return

    this.endPerformance()

    // 根据来源页面设置返回标记
    if (this.returnTarget === 'pages/index/index') {
      app.globalData.returnToMyPlaylists = true
    }

    wx.navigateBack()
  },

  // 结束演出
  endPerformance() {
    if (this.data.performanceId) {
      // 结束当前演出
      data.endCurrentPerformance()

      // 清除全局状态
      app.globalData.currentPlaylist = null
      app.globalData.currentSong = null
      app.globalData.singingList = []
      app.globalData.currentPerformance = null

      wx.showToast({
        title: '演出结束',
        icon: 'none'
      })
    }
  },
})
