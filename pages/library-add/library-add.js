// pages/library-add/library-add.js
const cloudApi = require('../../utils/cloudApi.js')

Page({
  data: {
    userInfo: null,
    isEdit: false,
    songId: null,
    songName: '',
    artist: ''
  },

  onLoad(options) {
    this.getUserInfo()

    // 如果是编辑模式
    if (options.id) {
      this.setData({
        isEdit: true,
        songId: options.id,
        songName: decodeURIComponent(options.name || ''),
        artist: decodeURIComponent(options.artist || '')
      })
    }
  },

  // 获取用户信息
  getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
    }
  },

  // 输入歌曲名称
  onSongNameInput(e) {
    this.setData({ songName: e.detail.value })
  },

  // 输入歌手
  onArtistInput(e) {
    this.setData({ artist: e.detail.value })
  },

  // 确认添加/修改
  async onConfirm() {
    const { userInfo, isEdit, songId, songName, artist } = this.data

    if (!songName.trim()) {
      wx.showToast({ title: '请输入歌曲名称', icon: 'none' })
      return
    }

    if (!artist.trim()) {
      wx.showToast({ title: '请输入歌手名称', icon: 'none' })
      return
    }

    try {
      if (isEdit) {
        // 修改歌曲
        await cloudApi.updateSongInLibrary(userInfo.id, songId, {
          name: songName.trim(),
          artist: artist.trim()
        })
        wx.showToast({ title: '修改成功' })
      } else {
        // 添加歌曲
        await cloudApi.addSongToLibrary(userInfo.id, {
          name: songName.trim(),
          artist: artist.trim()
        })
        wx.showToast({ title: '添加成功' })
      }

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 500)
    } catch (err) {
      console.error('操作失败:', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  }
})