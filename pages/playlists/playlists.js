// 歌单管理页面 playlists.js
const util = require('../../utils/util.js')
const data = require('../../utils/data.js')

Page({
  data: {
    userInfo: null,
    playlists: [],
    currentTab: 'playlists'
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    this.getPlaylists()
  },

  // 初始化页面
  initPage() {
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }

    this.setData({
      userInfo: userInfo
    })

    this.getPlaylists()
  },

  // 获取歌单列表
  getPlaylists() {
    const playlists = data.getPlaylists()
    this.setData({
      playlists
    })
  },

  // 创建新歌单
  createPlaylist() {
    wx.navigateTo({
      url: '/pages/create-playlist/create-playlist'
    })
  },

  // 查看歌单详情
  viewPlaylistDetail(e) {
    const { playlistId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/playlist-detail/playlist-detail?playlistId=${playlistId}`
    })
  },

  // 删除歌单
  async deletePlaylist(e) {
    const { playlistId } = e.currentTarget.dataset
    const confirm = await util.showModal('删除歌单', '确定要删除这个歌单吗？删除后无法恢复。')

    if (confirm) {
      const success = data.deletePlaylist(playlistId)
      if (success) {
        util.showToast('删除成功')
        this.getPlaylists()
      }
    }
  },

  // 开始演唱
  startSinging(e) {
    const { playlistId } = e.currentTarget.dataset
    const playlist = data.getPlaylistById(playlistId)

    if (!playlist || playlist.songs.length === 0) {
      util.showToast('歌单不能为空，请先添加歌曲')
      return
    }

    // 设置当前演唱的歌单
    const appInstance = getApp()
    appInstance.globalData.currentPlaylist = playlist

    // 初始化演唱列表
    const songs = [...playlist.songs]
    data.setSingingList(songs)
    appInstance.globalData.singingList = songs

    wx.navigateTo({
      url: `/pages/singing/singing?playlistId=${playlistId}`
    })
  },

  // 生成二维码
  async generateQRCode(e) {
    const { playlistId } = e.currentTarget.dataset
    util.showLoading('正在生成二维码')

    try {
      const qrCode = await data.generateQRCode(playlistId)
      // 保存二维码到歌单
      data.updatePlaylist(playlistId, { qrCode })
      util.hideLoading()
      util.showToast('二维码生成成功')
      this.getPlaylists()
    } catch (error) {
      util.hideLoading()
      util.showToast('生成二维码失败')
    }
  },

  // 显示歌单二维码
  showPlaylistQR(e) {
    const { playlistId, playlistName } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/playlist-qr/playlist-qr?playlistId=${playlistId}&name=${encodeURIComponent(playlistName || '歌单')}`
    })
  }
})