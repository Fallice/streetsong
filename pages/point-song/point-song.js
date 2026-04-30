// 点歌页面 point-song.js
const util = require('../../utils/util.js')
const data = require('../../utils/data.js')
const db = require('../../utils/database.js')
const cloudApi = require('../../utils/cloudApi.js')

Page({
  data: {
    playlistId: '',
    performanceId: '',
    singerId: '',
    searchText: '',
    songLibrary: [],
    filteredSongs: [],
    displaySongs: [],
    showPointModal: false,
    selectedSong: {},
    pointMessage: '',
    hasOrderedSong: false,
    orderedSongIds: [],
    hasPerformance: false
  },

  onLoad(options) {
    // 获取已点歌记录
    const orderedSongs = wx.getStorageSync('orderedSongs') || []
    const orderedSongIds = orderedSongs.map(s => s.id)

    if (options.playlistId) {
      this.setData({
        playlistId: options.playlistId,
        hasOrderedSong: options.hasOrderedSong === 'true',
        orderedSongIds: orderedSongIds
      })
    }

    // 获取当前歌手信息
    const currentSinger = wx.getStorageSync('currentSinger')
    if (currentSinger) {
      this.setData({
        singerId: currentSinger.id || '1',
        performanceId: currentSinger.performanceId || ''
      })
    }

    // 检查演出状态
    this.checkPerformanceStatus()

    // 初始化曲库
    this.initSongLibraryFromUserLibrary()
  },

  onShow() {
    // 每次显示时检查演出状态并刷新曲库
    this.checkPerformanceStatus()
    // 刷新曲库数据
    this.initSongLibraryFromUserLibrary()
  },

  // 检查演出状态
  checkPerformanceStatus() {
    const { playlistId, performanceId } = this.data

    // 获取当前演出
    const performance = data.getCurrentPerformance()

    console.log('点歌页面 - 检查演出状态:', {
      playlistId,
      performanceId,
      performance
    })

    // 检查是否是当前演出的有效点歌
    const hasOngoingPerformance = performance &&
                                   performance.status === 'ongoing' &&
                                   performance.playlistId === playlistId

    if (!hasOngoingPerformance) {
      console.log('演出无效:', {
        hasPerformance: !!performance,
        status: performance?.status,
        performancePlaylistId: performance?.playlistId,
        currentPlaylistId: playlistId
      })

      // 如果没有playlistId，可能是直接访问页面，显示提示但不返回
      if (!playlistId) {
        console.log('没有playlistId，跳过演出检查')
        this.setData({
          hasPerformance: false
        })
        return
      }

      // 演出已结束或无效，提示用户并返回
      wx.showModal({
        title: '演出已结束',
        content: '当前演出已经结束，无法继续点歌',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }

    // 检查是否是同一个演出
    if (performanceId && performance.id !== performanceId) {
      // 演出ID不匹配，说明是新演出，清空点歌记录
      wx.setStorageSync('orderedSongs', [])
      this.setData({
        hasOrderedSong: false,
        orderedSongIds: []
      })
    }

    this.setData({
      hasPerformance: true,
      performanceId: performance.id,
      singerId: performance.singerId || this.data.singerId
    })

    console.log('演出状态检查通过:', {
      performanceId: performance.id,
      singerId: performance.singerId
    })
  },

  // 从用户曲库初始化歌曲
  async initSongLibraryFromUserLibrary() {
    try {
      // 获取演唱列表中已有的歌曲ID
      const performance = data.getCurrentPerformance()
      const singingList = performance ? performance.singingList || [] : []
      const singingSongIds = singingList.map(s => s.id)

      // 优先使用演出中的歌手ID
      const singerId = this.data.singerId || (performance ? performance.singerId : '')

      console.log('初始化曲库:', { singerId, singingSongIds: singingSongIds.length })

      let librarySongs = []

      if (singerId) {
        try {
          // 优先从云端获取曲库
          const library = await cloudApi.getLibrary(singerId)
          librarySongs = library ? library.songs : []
          console.log('从云端获取曲库成功:', librarySongs.length, '首')
        } catch (err) {
          console.error('从云端获取曲库失败:', err)
          // 如果云端获取失败，尝试从本地内存数据库获取
          librarySongs = db.UserLibraryDB.getLibrarySongs(singerId)
          console.log('从本地获取曲库:', librarySongs.length, '首')
        }
      }

      // 如果没有获取到曲库，使用默认数据
      if (!librarySongs || librarySongs.length === 0) {
        console.log('使用默认曲库数据')
        librarySongs = this.getDefaultLibrary()
      }

      // 过滤掉已在演唱列表中的歌曲
      const availableSongs = librarySongs.filter(song =>
        !singingSongIds.includes(song.id) &&
        !this.data.orderedSongIds.includes(song.id)
      )

      // 如果没有可用歌曲，显示所有歌曲
      const songLibrary = availableSongs.length > 0 ? availableSongs : librarySongs

      this.setData({
        songLibrary: songLibrary,
        filteredSongs: songLibrary,
        displaySongs: songLibrary
      })

      console.log('曲库初始化完成:', songLibrary.length, '首')
    } catch (error) {
      console.error('初始化曲库失败:', error)
      // 使用默认数据作为后备
      const defaultLibrary = this.getDefaultLibrary()
      this.setData({
        songLibrary: defaultLibrary,
        filteredSongs: defaultLibrary,
        displaySongs: defaultLibrary
      })
    }
  },

  // 获取默认曲库（用于演示）
  getDefaultLibrary() {
    return [
      { id: 'd1', name: '晴天', artist: '周杰伦' },
      { id: 'd2', name: '告白气球', artist: '周杰伦' },
      { id: 'd3', name: '演员', artist: '薛之谦' },
      { id: 'd4', name: '体面', artist: '于文文' },
      { id: 'd5', name: '南山南', artist: '马頔' },
      { id: 'd6', name: '成都', artist: '赵雷' },
      { id: 'd7', name: '消愁', artist: '毛不易' },
      { id: 'd8', name: '像我这样的人', artist: '毛不易' }
    ]
  },

  // 搜索输入
  onSearchInput(e) {
    const searchText = e.detail.value
    this.setData({
      searchText: searchText
    })
    this.filterSongs(searchText)
  },

  // 搜索确认
  onSearchConfirm() {
    this.filterSongs(this.data.searchText)
  },

  // 清除搜索
  clearSearch() {
    this.setData({
      searchText: ''
    })
    this.filterSongs('')
  },

  // 过滤歌曲
  filterSongs(searchText) {
    if (!searchText || searchText.trim() === '') {
      this.setData({
        filteredSongs: this.data.songLibrary,
        displaySongs: this.data.songLibrary
      })
      return
    }

    const search = searchText.toLowerCase()
    const filtered = this.data.songLibrary.filter(song =>
      song.name.toLowerCase().includes(search) ||
      song.artist.toLowerCase().includes(search)
    )

    this.setData({
      filteredSongs: filtered,
      displaySongs: filtered
    })
  },

  // 显示点歌弹窗
  showPointModal(e) {
    const { song } = e.currentTarget.dataset

    if (this.data.hasOrderedSong) {
      util.showToast('本场演出您已经点过歌了')
      return
    }

    // 检查演出状态
    if (!this.data.hasPerformance) {
      util.showToast('当前没有演出')
      return
    }

    this.setData({
      showPointModal: true,
      selectedSong: song,
      pointMessage: ''
    })
  },

  // 隐藏点歌弹窗
  hidePointModal() {
    this.setData({
      showPointModal: false,
      selectedSong: {},
      pointMessage: ''
    })
  },

  // 寄语输入
  onMessageInput(e) {
    this.setData({
      pointMessage: e.detail.value
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 什么都不做，只是阻止冒泡
  },

  // 确认点歌
  confirmPointSong() {
    const { selectedSong, pointMessage, orderedSongIds, performanceId } = this.data

    if (!selectedSong || !selectedSong.id) {
      util.showToast('请选择一首歌曲')
      return
    }

    // 再次检查演出状态
    const performance = data.getCurrentPerformance()
    if (!performance || performance.status !== 'ongoing') {
      util.showToast('演出已结束，无法点歌')
      this.hidePointModal()
      return
    }

    // 获取演唱列表
    let singingList = performance.singingList || []

    // 检查用户是否已经点过这首歌
    if (orderedSongIds.includes(selectedSong.id)) {
      util.showToast('您已经点过这首歌了')
      this.hidePointModal()
      return
    }

    // 创建新点歌
    const newSong = {
      ...selectedSong,
      priority: 1,
      addTime: Date.now(),
      message: pointMessage.trim()
    }

    // 添加到演唱列表
    singingList.push(newSong)

    // 更新演出的演唱列表
    data.updatePerformanceSingingList(singingList)

    // 保存点歌记录
    const orderedSongs = wx.getStorageSync('orderedSongs') || []
    orderedSongs.push({
      id: selectedSong.id,
      name: selectedSong.name,
      performanceId: performanceId,
      orderTime: Date.now()
    })
    wx.setStorageSync('orderedSongs', orderedSongs)

    util.showToast('点歌成功！')
    this.hidePointModal()

    // 返回上一页
    setTimeout(() => {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        const prevPage = pages[pages.length - 2]
        if (prevPage) {
          prevPage.setData({
            hasOrderedSong: true,
            singingList: singingList,
            orderedSongIds: [...orderedSongIds, selectedSong.id]
          })
        }
        wx.navigateBack()
      }
    }, 500)
  }
})
