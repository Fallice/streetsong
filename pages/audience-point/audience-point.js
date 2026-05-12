// 观众扫码点歌页面 audience-point.js
const util = require('../../utils/util.js')
const data = require('../../utils/data.js')
const db = require('../../utils/database.js')
const app = getApp()

Page({
  data: {
    qrCodeData: '',
    scanResult: null,
    isScanning: false,
    showScanArea: true,
    playlistId: '',
    playlist: null,
    singingList: [],
    showPointModal: false,
    pointSong: {
      name: '',
      artist: '',
      message: ''
    },
    userLikes: {},
    orderedCount: 0,
    maxOrderLimit: 3,
    showError: false,
    errorMsg: '',
    performanceId: null, // 演出ID
    currentUser: null // 当前用户
  },

  onLoad(options) {
    // 获取用户信息
    app.getUserInfo().then(userInfo => {
      this.setData({
        currentUser: userInfo
      })

      if (options.playlistId) {
        // 如果有传入歌单ID，直接初始化，不显示扫描界面
        this.setData({
          playlistId: options.playlistId,
          showScanArea: false
        })
        this.initPlaylist()
      } else {
        // 没有传入参数，显示扫描界面
        this.startScan()
      }
    }).catch(error => {
      console.error('获取用户信息失败:', error)
      util.showToast('获取用户信息失败')
      wx.navigateBack()
    })
  },

  onShow() {
    // 从存储同步已点歌数量
    const orderedSongs = wx.getStorageSync('orderedSongs') || []
    const perfId = this.data.performanceId
    const count = perfId
      ? orderedSongs.filter(s => s.performanceId === perfId).length
      : orderedSongs.length
    this.setData({ orderedCount: count })
  },

  // 开始扫描
  startScan() {
    this.scanCode()
  },

  // 扫描二维码
  scanCode() {
    this.setData({
      isScanning: true,
      showScanArea: true,
      showError: false
    })

    const that = this

    // 模拟扫码过程
    setTimeout(() => {
      that.setData({
        isScanning: false
      })

      // 成功扫描（演示用，实际需要调用wx.scanCode）
      that.scanSuccess()
    }, 1500)
  },

  // 扫描成功
  scanSuccess() {
    // 模拟从二维码解析出歌单ID和演出ID
    const playlists = data.getPlaylists()
    if (playlists.length > 0) {
      const playlistId = playlists[0].id

      // 查找或创建演出
      let performanceId = null
      const ongoingPerformances = db.PerformanceDB.getOngoingPerformances()

      if (ongoingPerformances.length > 0) {
        performanceId = ongoingPerformances[0].id
      } else {
        const performance = db.PerformanceDB.createPerformance({
          singerId: '1', // 模拟歌手ID
          title: '演出',
          playlistId: playlistId,
          singingList: playlists[0].songs
        })
        performanceId = performance.id
      }

      this.setData({
        playlistId: playlistId,
        performanceId: performanceId,
        showScanArea: false
      })

      this.initPlaylist()
    } else {
      this.showScanError('未找到歌单，请先创建歌单')
    }
  },

  // 显示扫描错误
  showScanError(msg) {
    this.setData({
      isScanning: false,
      showError: true,
      errorMsg: msg
    })
  },

  // 重新扫描
  reScan() {
    this.scanCode()
  },

  // 初始化歌单
  initPlaylist() {
    const playlist = data.getPlaylistById(this.data.playlistId)
    if (!playlist) {
      this.showScanError('歌单不存在')
      return
    }

    let singingList = data.getSingingList()
    if (!singingList || singingList.length === 0) {
      singingList = [...playlist.songs]
      data.setSingingList(singingList)

      // 注意：不再更新演出的演唱列表，因为现在直接使用歌单歌曲
    }

    this.setData({
      playlist: playlist,
      singingList: singingList
    })

    // 更新观众人数
    if (this.data.performanceId) {
      db.PerformanceDB.incrementAudienceCount(this.data.performanceId)
    }

    // 定时刷新
    this.refreshTimer = setInterval(() => {
      this.refreshList()
    }, 5000)
  },

  // 刷新列表
  refreshList() {
    const singingList = data.getSingingList()
    this.setData({
      singingList: singingList
    })
  },

  onUnload() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }

    // 减少观众人数
    if (this.data.performanceId) {
      db.PerformanceDB.decrementAudienceCount(this.data.performanceId)
    }
  },

  // 爱心点赞
  likeSong(e) {
    const { index, songId } = e.currentTarget.dataset

    if (index < 2) {
      util.showToast('前两首歌曲不能点赞哦')
      return
    }

    const { userLikes, singingList } = this.data
    const newList = [...singingList]

    if (userLikes[songId]) {
      // 如果已经点赞，再次点击取消，数字-1
      newList[index].priority = (newList[index].priority || 0) - 1
      userLikes[songId] = false
    } else {
      // 如果未点赞，点击点赞，数字+1
      newList[index].priority = (newList[index].priority || 0) + 1
      userLikes[songId] = true
    }

    const firstTwo = newList.slice(0, 2)
    const rest = newList.slice(2).sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }
      return a.addTime - b.addTime
    })

    const finalList = [...firstTwo, ...rest]
    data.setSingingList(finalList)

    this.setData({
      singingList: finalList,
      userLikes: userLikes
    })

    util.showToast(userLikes[songId] ? '支持成功！' : '取消支持')
  },

  // 跳转到点歌选择页面
  showPointModal() {
    if (this.data.orderedCount >= this.data.maxOrderLimit) {
      util.showToast(`本场演出最多点${this.data.maxOrderLimit}首歌，您已点满`)
      return
    }

    // 跳转到新的点歌选择页面
    const perfId = this.data.performanceId || ''
    wx.navigateTo({
      url: `/pages/point-song/point-song?playlistId=${this.data.playlistId}&performanceId=${perfId}`
    })
  },
})