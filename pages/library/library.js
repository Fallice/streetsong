// pages/library/library.js
const cloudApi = require('../../utils/cloudApi.js')
const app = getApp()

Page({
  data: {
    userInfo: null,
    songs: [],
    showActionSheet: false,
    currentSongId: null,
    currentIndex: null
  },

  onLoad() {
    this.getUserInfo()
  },

  onShow() {
    this.getLibrarySongs()
  },

  // 获取用户信息
  getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
    }
  },

  // 获取曲库歌曲
  async getLibrarySongs() {
    const userInfo = this.data.userInfo
    if (!userInfo) return

    try {
      const library = await cloudApi.getLibrary(userInfo.id)
      this.setData({
        songs: library ? library.songs : []
      })
    } catch (err) {
      console.error('获取曲库失败:', err)
      wx.showToast({ title: '获取失败', icon: 'none' })
    }
  },

  // 跳转到添加歌曲页面
  goToAddSong() {
    wx.navigateTo({
      url: '/pages/library-add/library-add'
    })
  },

  // 显示排序选项
  showSortOptions(e) {
    const index = e.currentTarget.dataset.index
    wx.showActionSheet({
      itemList: ['置顶', '上移一位', '下移一位', '移至底部'],
      success: (res) => {
        this.handleSort(index, res.tapIndex)
      }
    })
  },

  // 处理排序
  async handleSort(index, action) {
    const songs = [...this.data.songs]
    const userInfo = this.data.userInfo

    switch (action) {
      case 0: // 置顶
        if (index > 0) {
          const song = songs.splice(index, 1)[0]
          songs.unshift(song)
        }
        break
      case 1: // 上移一位
        if (index > 0) {
          const temp = songs[index]
          songs[index] = songs[index - 1]
          songs[index - 1] = temp
        }
        break
      case 2: // 下移一位
        if (index < songs.length - 1) {
          const temp = songs[index]
          songs[index] = songs[index + 1]
          songs[index + 1] = temp
        }
        break
      case 3: // 移至底部
        if (index < songs.length - 1) {
          const song = songs.splice(index, 1)[0]
          songs.push(song)
        }
        break
    }

    // 更新曲库
    this.setData({ songs })
    // 这里需要更新云数据库中的歌曲顺序
    // 由于云函数没有实现批量更新，这里简化处理
  },

  // 显示更多选项
  showMoreOptions(e) {
    const id = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    this.setData({
      showActionSheet: true,
      currentSongId: id,
      currentIndex: index
    })
  },

  // 隐藏操作弹窗
  hideActionSheet() {
    this.setData({
      showActionSheet: false,
      currentSongId: null,
      currentIndex: null
    })
  },

  // 阻止冒泡
  preventBubble() {},

  // 修改歌曲
  editSong() {
    const { userInfo, songId, songName, artist } = this.data

    wx.showModal({
      title: '修改歌曲',
      content: '请在下方输入框中修改歌曲信息',
      showCancel: false,
      confirmText: '好的'
    })

    this.hideActionSheet()
    this.setData({ isEditMode: true })
  },

  // 确认修改
  confirmEdit() {
    const { userInfo, currentSongId, songName, artist } = this.data
    if (!songName || !artist) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    db.UserLibraryDB.updateSong(userInfo.id, currentSongId, {
      name: songName,
      artist: artist
    })

    this.setData({ isEditMode: false })
    this.getLibrarySongs()
    wx.showToast({ title: '修改成功' })
  },

  // 删除歌曲
  async deleteSong() {
    const userInfo = this.data.userInfo
    const songId = this.data.currentSongId

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这首歌吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await cloudApi.removeSongFromLibrary(userInfo.id, songId)
            this.getLibrarySongs()
            wx.showToast({ title: '删除成功' })
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })

    this.hideActionSheet()
  }
})