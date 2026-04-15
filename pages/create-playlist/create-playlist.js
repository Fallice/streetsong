// 创建歌单页面 create-playlist.js
const util = require('../../utils/util.js')
const cloudApi = require('../../utils/cloudApi.js')

Page({
  data: {
    userInfo: null,
    playlistName: '',
    isCreating: false
  },

  onLoad() {
    this.initPage()
  },

  // 初始化页面
  initPage() {
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再创建歌单',
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
  },

  // 输入歌单名称
  onInputChange(e) {
    const value = e.detail.value
    if (value.length > 100) {
      util.showToast('歌单名称不能超过100字符')
      return
    }

    this.setData({
      playlistName: value
    })
  },

  // 创建歌单
  async createPlaylist() {
    const { userInfo, playlistName } = this.data

    if (!playlistName.trim()) {
      util.showToast('请输入歌单名称')
      return
    }

    this.setData({
      isCreating: true
    })

    try {
      const newPlaylist = await cloudApi.createPlaylist(userInfo.id, playlistName)

      wx.showToast({
        title: '歌单创建成功',
        icon: 'success'
      })

      // 跳转到歌单详情页面
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/playlist-detail/playlist-detail?playlistId=${newPlaylist._id}`
        })
      }, 1500)
    } catch (err) {
      console.error('创建歌单失败:', err)
      wx.showToast({
        title: '创建失败',
        icon: 'none'
      })
    } finally {
      this.setData({
        isCreating: false
      })
    }
  }
})