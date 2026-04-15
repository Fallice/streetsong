// 歌单详情页面 playlist-detail.js
const util = require('../../utils/util.js')
const cloudApi = require('../../utils/cloudApi.js')
const data = require('../../utils/data.js')

Page({
  data: {
    playlist: null,
    playlistId: '',
    songs: [],
    showAddModal: false,
    showMenu: false,
    showEditModal: false,
    showSortModal: false,
    currentSongId: '',
    currentSongIndex: -1,
    newSong: {
      name: '',
      artist: ''
    },
    editPlaylistName: ''
  },

  onLoad(options) {
    if (options.playlistId) {
      this.setData({
        playlistId: options.playlistId
      })
      this.getPlaylist()
    } else {
      util.showToast('参数错误')
      wx.navigateBack()
    }
  },

  // 获取歌单信息
  async getPlaylist() {
    try {
      const playlist = await cloudApi.getPlaylist(this.data.playlistId)
      if (!playlist) {
        util.showToast('歌单不存在')
        wx.navigateBack()
        return
      }

      this.setData({
        playlist: playlist,
        songs: playlist.songs || []
      })
    } catch (err) {
      console.error('获取歌单失败:', err)
      util.showToast('获取歌单失败')
    }
  },

  // 编辑歌单名称
  editPlaylistName() {
    this.setData({
      showEditModal: true,
      editPlaylistName: this.data.playlist ? this.data.playlist.name : ''
    })
  },

  // 隐藏编辑歌单名称模态框
  hideEditModal() {
    this.setData({
      showEditModal: false,
      editPlaylistName: ''
    })
  },

  // 编辑歌单名称输入
  onEditNameChange(e) {
    this.setData({
      editPlaylistName: e.detail.value
    })
  },

  // 确认编辑歌单名称
  async confirmEditName() {
    const { editPlaylistName, playlistId } = this.data

    if (!editPlaylistName || !editPlaylistName.trim()) {
      util.showToast('请输入歌单名称')
      return
    }

    try {
      // 调用云函数更新歌单名称
      await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'updatePlaylist',
          data: {
            playlistId: playlistId,
            name: editPlaylistName.trim()
          }
        }
      })

      util.showToast('修改成功')
      this.getPlaylist()
      this.hideEditModal()
    } catch (err) {
      console.error('更新失败:', err)
      util.showToast('修改失败')
    }
  },

  // 显示添加歌曲模态框
  showAddSongModal() {
    this.setData({
      showAddModal: true,
      newSong: {
        name: '',
        artist: ''
      }
    })
  },

  // 隐藏添加歌曲模态框
  hideAddSongModal() {
    this.setData({
      showAddModal: false,
      newSong: {
        name: '',
        artist: ''
      }
    })
  },

  // 输入歌曲信息
  onSongInputChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      [`newSong.${field}`]: value
    })
  },

  // 添加歌曲
  async addSong() {
    const { newSong, playlistId, songs } = this.data

    if (!util.validateSong(newSong, songs)) {
      return
    }

    try {
      await cloudApi.addSongToPlaylist(playlistId, newSong)
      util.showToast('歌曲添加成功')
      this.getPlaylist()
      this.hideAddSongModal()
    } catch (err) {
      console.error('添加歌曲失败:', err)
      util.showToast('添加失败')
    }
  },

  // 显示操作菜单
  showActionMenu(e) {
    const { songId, index } = e.currentTarget.dataset
    this.setData({
      showMenu: true,
      currentSongId: songId,
      currentSongIndex: index
    })
  },

  // 隐藏操作菜单
  hideActionMenu() {
    this.setData({
      showMenu: false,
      currentSongId: '',
      currentSongIndex: -1
    })
  },

  // 编辑歌曲
  editSong() {
    this.hideActionMenu()
    util.showToast('编辑功能即将上线')
  },

  // 删除歌曲
  async deleteSong() {
    this.hideActionMenu()
    const { currentSongId, playlistId } = this.data

    const confirm = await util.showModal('删除歌曲', '确定要删除这首歌曲吗？')
    if (!confirm) return

    try {
      await cloudApi.removeSongFromPlaylist(playlistId, currentSongId)
      util.showToast('删除成功')
      this.getPlaylist()
    } catch (err) {
      console.error('删除失败:', err)
      util.showToast('删除失败')
    }
  },

  // 显示排序弹窗
  sortSong(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      showSortModal: true,
      currentSongIndex: index
    })
  },

  // 隐藏排序弹窗
  hideSortModal() {
    this.setData({
      showSortModal: false,
      currentSongIndex: -1
    })
  },

  // 上移歌曲
  moveUp() {
    const { currentSongIndex, songs, playlistId } = this.data
    if (currentSongIndex <= 0) {
      util.showToast('已经是第一首了')
      return
    }

    const newSongs = [...songs]
    const temp = newSongs[currentSongIndex]
    newSongs[currentSongIndex] = newSongs[currentSongIndex - 1]
    newSongs[currentSongIndex - 1] = temp

    this.setData({
      songs: newSongs,
      showSortModal: false,
      currentSongIndex: -1
    })

    data.reorderSongs(playlistId, newSongs)
    util.showToast('排序已更新')
  },

  // 下移歌曲
  moveDown() {
    const { currentSongIndex, songs, playlistId } = this.data
    if (currentSongIndex >= songs.length - 1) {
      util.showToast('已经是最后一首了')
      return
    }

    const newSongs = [...songs]
    const temp = newSongs[currentSongIndex]
    newSongs[currentSongIndex] = newSongs[currentSongIndex + 1]
    newSongs[currentSongIndex + 1] = temp

    this.setData({
      songs: newSongs,
      showSortModal: false,
      currentSongIndex: -1
    })

    data.reorderSongs(playlistId, newSongs)
    util.showToast('排序已更新')
  },

  // 置顶歌曲
  moveToTop() {
    const { currentSongIndex, songs, playlistId } = this.data
    if (currentSongIndex === 0) {
      util.showToast('已经在最前面了')
      return
    }

    const newSongs = [...songs]
    const temp = newSongs.splice(currentSongIndex, 1)[0]
    newSongs.unshift(temp)

    this.setData({
      songs: newSongs,
      showSortModal: false,
      currentSongIndex: -1
    })

    data.reorderSongs(playlistId, newSongs)
    util.showToast('已置顶')
  },

  // 置底歌曲
  moveToBottom() {
    const { currentSongIndex, songs, playlistId } = this.data
    if (currentSongIndex === songs.length - 1) {
      util.showToast('已经在最后面了')
      return
    }

    const newSongs = [...songs]
    const temp = newSongs.splice(currentSongIndex, 1)[0]
    newSongs.push(temp)

    this.setData({
      songs: newSongs,
      showSortModal: false,
      currentSongIndex: -1
    })

    data.reorderSongs(playlistId, newSongs)
    util.showToast('已置底')
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 什么都不做，只是阻止冒泡
  },

  // 开始演唱
  startSinging() {
    const { playlist, songs } = this.data

    if (songs.length === 0) {
      util.showToast('歌单不能为空')
      return
    }

    // 设置当前演唱的歌单
    const appInstance = getApp()
    appInstance.globalData.currentPlaylist = playlist

    // 初始化演唱列表
    const songList = [...songs]
    appInstance.globalData.singingList = songList

    wx.navigateTo({
      url: `/pages/singing/singing?playlistId=${this.data.playlistId}`
    })
  }
})
