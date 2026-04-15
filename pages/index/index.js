// 首页 index.js
const util = require('../../utils/util.js')
const cloudApi = require('../../utils/cloudApi.js')
const app = getApp()

Page({
  data: {
    playlistTab: 'street', // 歌单页面顶部标签：街唱歌单/我的歌单
    myPlaylists: [], // 我的歌单
    userInfo: null // 用户信息
  },

  onLoad() {
    // 获取用户信息
    this.getUserInfo()
  },

  onShow() {
    // 获取用户信息
    this.getUserInfo()
    // 获取歌单
    this.getPlaylists()
  },

  // 获取用户信息
  getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      })
      // 加载歌单
      this.getPlaylists()
    }
  },

  // 获取歌单
  async getPlaylists() {
    const userInfo = this.data.userInfo
    console.log('获取歌单, userInfo:', userInfo)
    if (userInfo) {
      try {
        console.log('调用 cloudApi.getPlaylists, userId:', userInfo.id)
        const myPlaylists = await cloudApi.getPlaylists(userInfo.id)
        console.log('获取歌单成功:', myPlaylists)
        this.setData({
          myPlaylists: myPlaylists || []
        })
      } catch (err) {
        console.error('获取歌单失败:', err)
        wx.showToast({
          title: '获取歌单失败',
          icon: 'none'
        })
      }
    } else {
      this.setData({
        myPlaylists: []
      })
    }
  },

  // 切换歌单页面顶部标签
  switchPlaylistTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      playlistTab: tab
    })
  },

  // 扫码功能
  scanCode() {
    wx.scanCode({
      success: (res) => {
        console.log('扫码结果:', res)
        // 解析二维码，获取歌单ID
        const playlistId = res.result
        if (playlistId) {
          wx.navigateTo({
            url: `/pages/singing-list/singing-list?playlistId=${playlistId}`
          })
        } else {
          util.showToast('无法识别该二维码')
        }
      },
      fail: () => {
        util.showToast('扫码失败')
      }
    })
  },

  // 去曲库
  goToLibrary() {
    wx.navigateTo({
      url: '/pages/library/library'
    })
  },

  // 去歌单管理
  goToPlaylists() {
    wx.navigateTo({
      url: '/pages/playlists/playlists'
    })
  },

  // 去演出记录
  goToPerformances() {
    wx.navigateTo({
      url: '/pages/performances/performances'
    })
  },

  // 创建歌单
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

  // 展示歌单二维码
  showPlaylistQR(e) {
    const { playlistId, playlistName } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/playlist-qr/playlist-qr?playlistId=${playlistId}&name=${encodeURIComponent(playlistName)}`
    })
  },

  // 跳转到我的页面
  goToProfile() {
    wx.redirectTo({
      url: '/pages/profile/profile'
    })
  }
})