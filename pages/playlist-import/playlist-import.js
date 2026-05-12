// pages/playlist-import/playlist-import.js
const cloudApi = require('../../utils/cloudApi.js')
const util = require('../../utils/util.js')

Page({
  data: {
    url: '',
    state: 'input', // input | loading | success | error
    loadingText: '正在获取歌单信息...',
    result: null,
    errorMsg: '',
    importCancelled: false
  },

  onLoad() {
    this._cancelled = false
  },

  onUnload() {
    // 页面卸载时标记取消
    this._cancelled = true
  },

  // 输入框变化
  onUrlInput(e) {
    this.setData({ url: e.detail.value })
  },

  // 检测是否是QQ音乐歌单链接，提取歌单ID
  parsePlaylistUrl(url) {
    // 支持格式: https://i2.y.qq.com/n3/other/pages/details/playlist.html?...&id=9391274505&...
    // 支持格式: https://y.qq.com/n/ryqq_v2/playlist/9391274505
    const patterns = [
      /[?&]id=(\d+)/,
      /playlist\/(\d+)/,
      /\/playlist\/(\d+)/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  },

  // 开始导入
  async startImport() {
    const url = this.data.url.trim()
    if (!url) {
      util.showToast('请输入QQ音乐歌单链接')
      return
    }

    const playlistId = this.parsePlaylistUrl(url)
    if (!playlistId) {
      util.showToast('无法识别歌单链接，请检查链接格式')
      return
    }

    // 进入加载状态，重置取消标记
    this._cancelled = false
    this.setData({
      state: 'loading',
      loadingText: '正在获取歌单信息...'
    })

    try {
      await this.doImport(playlistId)
    } catch (err) {
      console.error('导入失败:', err)
      if (this._cancelled) return
      this.setData({
        state: 'error',
        errorMsg: err.message || '导入失败，请重试'
      })
    }
  },

  // 执行导入
  async doImport(playlistId) {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      throw new Error('请先登录')
    }

    // 模拟分步进度
    this.setData({ loadingText: '正在读取歌单歌曲...' })

    // 给UI一点时间更新
    await this.delay(300)
    if (this._cancelled) return

    // 调用云函数获取并导入
    const result = await cloudApi.importQQPlaylist(userInfo.id, playlistId)

    if (this._cancelled) return

    if (result.success) {
      this.setData({
        state: 'success',
        result: result
      })
    } else {
      this.setData({
        state: 'error',
        errorMsg: result.error || '导入失败'
      })
    }
  },

  // 重新导入
  retryImport() {
    this.setData({
      state: 'input',
      result: null,
      errorMsg: ''
    })
  },

  // 完成并返回
  finishImport() {
    wx.navigateBack()
  },

  // 阻止返回（加载中时）
  preventBack() {
    wx.showModal({
      title: '导入进行中',
      content: '请等待导入完成后再离开页面',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
})