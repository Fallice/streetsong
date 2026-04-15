// 观众点歌列表页面 singing-list.js
const util = require('../../utils/util.js')
const data = require('../../utils/data.js')

Page({
  data: {
    playlistId: '',
    playlist: null,
    singingList: [],
    currentSong: null,
    userLikes: {},
    hasOrderedSong: false,
    showPointModal: false,
    pointSong: {
      name: '',
      artist: '',
      message: ''
    },
    searchKeyword: '',
    showSearch: false
  },

  onLoad(options) {
    // 如果是扫码进入
    if (options.playlistId) {
      this.setData({
        playlistId: options.playlistId
      })
    } else {
      // 演示模式，使用第一个歌单
      const playlists = data.getPlaylists()
      if (playlists.length > 0) {
        this.setData({
          playlistId: playlists[0].id
        })
      } else {
        util.showToast('暂无歌单')
        return
      }
    }

    this.initPage()
  },

  onShow() {
    // 定时刷新列表
    this.pollingTimer = setInterval(() => {
      this.refreshSingingList()
    }, 5000)
  },

  onHide() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
    }
  },

  onUnload() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
    }
  },

  // 初始化页面
  initPage() {
    const playlist = data.getPlaylistById(this.data.playlistId)
    if (!playlist) {
      util.showToast('歌单不存在')
      return
    }

    // 获取或初始化演唱列表
    let singingList = data.getSingingList()
    if (!singingList || singingList.length === 0) {
      singingList = [...playlist.songs]
      data.setSingingList(singingList)
    }

    this.setData({
      playlist: playlist,
      singingList: singingList,
      currentSong: singingList[0] || null
    })
  },

  // 刷新演唱列表
  refreshSingingList() {
    const singingList = data.getSingingList()
    if (singingList && singingList.length > 0) {
      this.setData({
        singingList: singingList,
        currentSong: singingList[0] || null
      })
    }
  },

  // 爱心点赞
  likeSong(e) {
    const { index, songId } = e.currentTarget.dataset

    if (index < 2) {
      util.showToast('前两首歌曲不能点赞哦')
      return
    }

    // 检查是否已经点赞过
    const userLikes = this.data.userLikes
    if (userLikes[songId]) {
      util.showToast('您已经为这首歌点过心了')
      return
    }

    // 更新爱心数
    const singingList = [...this.data.singingList]
    const song = singingList[index]
    song.priority = (song.priority || 0) + 1

    // 重新排序（保持前两首不变，后面的按爱心数排序）
    const firstTwo = singingList.slice(0, 2)
    const rest = singingList.slice(2).sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }
      return a.addTime - b.addTime
    })

    const newList = [...firstTwo, ...rest]
    data.setSingingList(newList)

    // 记录用户点赞
    userLikes[songId] = true
    this.setData({
      singingList: newList,
      userLikes
    })

    util.showToast('支持成功！')
  },

  // 显示点歌模态框
  showPointModal() {
    if (this.data.hasOrderedSong) {
      util.showToast('本场演出您已经点过歌了')
      return
    }

    this.setData({
      showPointModal: true
    })
  },

  // 关闭点歌模态框
  hidePointModal() {
    this.setData({
      showPointModal: false,
      pointSong: {
        name: '',
        artist: '',
        message: ''
      }
    })
  },

  // 输入点歌信息
  onPointInputChange(e) {
    const { field } = e.currentTarget.dataset
    this.setData({
      [`pointSong.${field}`]: e.detail.value
    })
  },

  // 提交点歌
  submitPointSong() {
    const { pointSong, singingList } = this.data

    if (!pointSong.name || !pointSong.name.trim()) {
      util.showToast('请输入歌曲名称')
      return
    }

    if (!pointSong.artist || !pointSong.artist.trim()) {
      util.showToast('请输入歌手名称')
      return
    }

    // 添加到演唱列表
    const newSong = {
      id: util.generateId(),
      name: pointSong.name.trim(),
      artist: pointSong.artist.trim(),
      message: pointSong.message,
      priority: 1,
      addTime: Date.now()
    }

    const newList = [...singingList, newSong]
    data.setSingingList(newList)

    this.setData({
      singingList: newList,
      hasOrderedSong: true
    })

    this.hidePointModal()
    util.showToast('点歌成功！')
  }
})