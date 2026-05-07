// 观众点歌列表页面 singing-list.js
const util = require('../../utils/util.js')
const data = require('../../utils/data.js')
const db = require('../../utils/database.js')
const cloudApi = require('../../utils/cloudApi.js')

Page({
  data: {
    playlistId: '',
    playlist: null,
    singingList: [],
    currentSong: null,
    nextSong: null,
    userLikes: {},
    hasOrderedSong: false,
    orderedSongIds: [], // 已点歌曲ID列表
    // 演出状态
    hasPerformance: false,
    performance: null,
    singerId: '',
    singerName: '',
    isLoading: true,
    isScrollable: true // 是否需要滚动，默认为true
  },

  onLoad(options) {
    // 检测是否为开发模式
    const accountInfo = wx.getAccountInfoSync()
    const isDevMode = accountInfo.miniProgram.envVersion === 'develop'
    this.setData({ isDevMode })

    console.log('singing-list onLoad 参数:', options)

    // 如果是扫码进入
    if (options.playlistId) {
      this.setData({
        playlistId: options.playlistId
      })

      // 从扫码进入的提示
      if (options.fromScan) {
        wx.showToast({
          title: '扫码进入成功',
          icon: 'success',
          duration: 2000
        })
      }

      // 开发模式下，如果是模拟扫码，显示调试信息
      if (isDevMode && options.simulated) {
        console.log('模拟扫码进入，歌单ID:', options.playlistId)
      }
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
    // 每次显示页面时检查演出状态，并确保使用最新歌单数据
    const refreshData = async () => {
      const playlist = this.data.playlist || await this.getPlaylistFromCloud(this.data.playlistId) || data.getPlaylistById(this.data.playlistId)
      if (playlist) {
        this.setData({ playlist })
        this.checkPerformanceStatus(playlist)
      }
    }
    refreshData()

    // 检查页面是否需要滚动
    setTimeout(() => {
      this.checkScrollStatus()
    }, 100)

    // 定时刷新列表
    this.pollingTimer = setInterval(() => {
      this.refreshSingingList()
    }, 3000)
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
  async initPage() {
    wx.showLoading({ title: '加载中...' })

    console.log('=== initPage 开始 ===')
    console.log('歌单ID:', this.data.playlistId)

    try {
      // 优先从云端获取最新歌单数据
      let playlist = await this.getPlaylistFromCloud(this.data.playlistId)
      console.log('云端歌单查询结果:', playlist)

      // 如果云端没有，再尝试从本地存储获取
      if (!playlist) {
        console.log('云端未找到歌单，从本地获取')
        playlist = data.getPlaylistById(this.data.playlistId)
        console.log('本地歌单查询结果:', playlist)
      }

      if (!playlist) {
        console.error('无法获取歌单')
        util.showToast('歌单不存在')
        wx.hideLoading()
        return
      }

      console.log('使用歌单数据:', playlist)

      this.setData({
        playlist: playlist,
        singerId: playlist.userId || '1',
        singerName: playlist.userName || playlist.singerName || '歌手',
        isLoading: false
      })

      wx.hideLoading()

      // 检查演出状态 - 确保获取最新数据
      this.checkPerformanceStatus(playlist)
    } catch (error) {
      console.error('初始化页面失败:', error)
      wx.hideLoading()
      util.showToast('加载失败')
    }
  },

  // 从云数据库获取歌单
  async getPlaylistFromCloud(playlistId) {
    try {
      console.log('=== 调用云函数获取歌单 ===')
      console.log('输入 playlistId:', playlistId)

      // 方式1：先尝试完整ID
      let result = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getPlaylist',
          data: {
            playlistId: playlistId
          }
        }
      })

      console.log('方式1结果:', result)

      // 如果方式1没找到，尝试方式2：用短ID查询
      if (!result.result?.success || !result.result?.data) {
        console.log('方式1失败，尝试方式2：短ID模糊查询')
        result = await wx.cloud.callFunction({
          name: 'api',
          data: {
            action: 'findPlaylistBySuffix',
            data: {
              suffix: playlistId
            }
          }
        })
        console.log('方式2结果:', result)
      }

      if (result.result && result.result.success && result.result.data) {
        const playlist = result.result.data
        console.log('✅ 找到歌单:', playlist)
        // 确保歌单数据格式一致
        return {
          id: playlist.id || playlist._id,
          name: playlist.name,
          userId: playlist.userId,
          userName: playlist.userName || '歌手',
          songs: playlist.data?.songs || playlist.songs || [],
          createTime: playlist.createdAt ? new Date(playlist.createdAt).getTime() : Date.now()
        }
      } else {
        console.error('❌ 两种方式都没找到歌单')
        return null
      }
    } catch (error) {
      console.error('从云端获取歌单失败:', error)
      return null
    }
  },

  // 检查演出状态
  async checkPerformanceStatus(playlist) {
    const { playlistId } = this.data

    console.log('检查演出状态，歌单ID:', playlistId)

    // 先从本地存储获取
    let localPerformance = data.getCurrentPerformance()
    // 同时也从云端获取演出信息
    let cloudPerformance = await this.getPerformanceFromCloud(playlistId)

    console.log('本地演出:', localPerformance, '云端演出:', cloudPerformance)

    // 始终优先使用云端数据（云端是最新的）
    let performance = cloudPerformance

    // 如果云端有演出，同步到本地
    if (performance && performance.status === 'ongoing' && performance.playlistId === playlistId) {
      console.log('使用云端演出并同步到本地:', performance)
      try {
        wx.setStorageSync('performance', performance)
      } catch (error) {
        console.error('同步云端演出到本地失败:', error)
      }
    } else if (localPerformance && localPerformance.status === 'ongoing' && localPerformance.playlistId === playlistId) {
      // 云端没有但本地有，使用本地
      performance = localPerformance
    } else {
      performance = null
    }

    console.log('最终使用的演出信息:', performance)

    // 检查是否是当前歌单的演出
    const hasOngoingPerformance = performance &&
                                   performance.status === 'ongoing' &&
                                   performance.playlistId === playlistId

    console.log('是否有进行中的演出:', hasOngoingPerformance)

    if (hasOngoingPerformance) {
      // 演出进行中，确保获取最新的演出数据
      performance = data.getCurrentPerformance() || performance

      // 检查是否是新的演出（与之前不同的演出ID）
      const previousPerformanceId = wx.getStorageSync('previousPerformanceId')
      const isNewPerformance = performance.id !== previousPerformanceId

      if (isNewPerformance) {
        // 新演出，清空点歌记录和点赞记录
        wx.setStorageSync('orderedSongs', [])
        wx.setStorageSync('previousPerformanceId', performance.id)
        wx.setStorageSync('userLikes', {})
        this.setData({
          hasOrderedSong: false,
          orderedSongIds: [],
          userLikes: {}
        })
      } else {
        // 同一演出，恢复点歌记录和点赞记录
        const orderedSongs = wx.getStorageSync('orderedSongs') || []
        const userLikes = wx.getStorageSync('userLikes') || {}
        this.setData({
          hasOrderedSong: orderedSongs.length > 0,
          orderedSongIds: orderedSongs.map(s => s.id),
          userLikes: userLikes
        })
      }

      // 优先从云端获取演唱列表（跨设备同步），云端没有则用本地，本地也没有则用歌单初始化
      let singingList = null
      if (performance.id) {
        try {
          const cloudData = await cloudApi.getPerformanceSingingList(performance.id)
          if (cloudData && cloudData.singingList && cloudData.singingList.length > 0) {
            singingList = cloudData.singingList
          }
        } catch (err) {
          console.log('从云端获取演唱列表失败:', err)
        }
      }

      if (!singingList || singingList.length === 0) {
        singingList = data.getSingingList()
      }
      if (!singingList || singingList.length === 0 || isNewPerformance) {
        singingList = playlist.songs
      }
      // 统一归一化歌曲ID：确保每条歌曲都有 id 字段
      singingList = singingList.map(s => ({ ...s, id: s.id || s._id || '' }))
      data.setSingingList(singingList)
      const currentIndex = performance.currentIndex || 0

      console.log('演出的 currentIndex:', currentIndex)

      // 根据当前演唱索引计算当前歌曲和下一首歌曲
      const currentSong = singingList[currentIndex] || null
      const nextSong = (currentIndex + 1 < singingList.length) ? singingList[currentIndex + 1] : null

      console.log('设置当前歌曲:', currentSong?.name, '索引:', currentIndex)

      this.setData({
        hasPerformance: true,
        performance: performance,
        singingList: singingList,
        currentIndex: currentIndex,
        currentSong: currentSong,
        nextSong: nextSong,
        singerId: performance.singerId || this.data.singerId,
        singerName: performance.singerName || this.data.singerName
      })

      // 延迟检查滚动状态
      setTimeout(() => {
        this.checkScrollStatus()
      }, 100)

      wx.showToast({
        title: '进入演出成功',
        icon: 'success'
      })
    } else {
      // 没有演出或演出已结束
      this.setData({
        hasPerformance: false,
        performance: null,
        singingList: [],
        currentSong: null,
        nextSong: null
      })

      // 延迟检查滚动状态
      setTimeout(() => {
        this.checkScrollStatus()
      }, 100)

      // 显示调试信息
      if (performance) {
        console.log('演出状态不匹配:', {
          performanceStatus: performance.status,
          performancePlaylistId: performance.playlistId,
          currentPlaylistId: playlistId
        })
      }
    }
  },

  // 从云数据库获取演出信息
  async getPerformanceFromCloud(playlistId) {
    try {
      console.log('正在从云端获取演出信息，歌单ID:', playlistId)
      const result = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getPerformancesByPlaylistId',
          data: {
            playlistId: playlistId
          }
        }
      })

      console.log('云函数响应:', result)

      if (result.result && result.result.success) {
        const performances = result.result.data || []
        console.log('所有演出信息:', performances)
        // 找到进行中的演出
        const ongoing = performances.find(p => p.status === 'ongoing')
        console.log('进行中的演出:', ongoing)
        if (ongoing) {
          const performance = {
            id: ongoing.id || ongoing._id,
            playlistId: ongoing.playlistId,
            singerId: ongoing.userId || ongoing.singerId,
            singerName: ongoing.singerName,
            status: ongoing.status,
            currentIndex: ongoing.currentIndex || 0,
            sungCount: ongoing.sungCount || 0,
            title: ongoing.title || '演出中'
          }
          console.log('返回的演出信息:', performance)
          return performance
        }
      }
      return null
    } catch (error) {
      console.error('从云端获取演出失败:', error)
      return null
    }
  },

  // 刷新演唱列表
  async refreshSingingList() {
    const { hasPerformance, playlist } = this.data

    // 优先从云端获取最新的演出数据，确保与演唱页面同步
    let currentPerformance = await this.getPerformanceFromCloud(this.data.playlistId)

    // 如果云端没有，再从本地存储获取
    if (!currentPerformance) {
      console.log('云端未找到演出信息，尝试从本地获取')
      currentPerformance = data.getCurrentPerformance()
    }
    const isOngoing = currentPerformance &&
                       currentPerformance.status === 'ongoing' &&
                       currentPerformance.playlistId === this.data.playlistId

    console.log('刷新演唱列表，演出状态:', isOngoing, 'currentIndex:', currentPerformance?.currentIndex, '演出ID:', currentPerformance?.id)

    // 如果演出状态发生变化，重新检查演出状态
    if (isOngoing !== hasPerformance) {
      console.log('演出状态发生变化，重新检查演出状态')
      this.checkPerformanceStatus(playlist)
      return
    }

    if (isOngoing && currentPerformance) {
      const performanceId = currentPerformance.id
      const currentIndex = currentPerformance.currentIndex || 0

      // 优先从云端获取演唱列表（跨设备同步）
      let singingList = null
      if (performanceId) {
        try {
          const cloudData = await cloudApi.getPerformanceSingingList(performanceId)
          if (cloudData && cloudData.singingList && cloudData.singingList.length > 0) {
            singingList = cloudData.singingList.map(s => ({ ...s, id: s.id || s._id || '' }))
            // 同步到本地存储
            data.setSingingList(singingList)
          }
        } catch (err) {
          console.log('从云端获取演唱列表失败:', err)
        }
      }

      // 云端没有则使用本地存储，本地也没有则用歌单歌曲
      if (!singingList || singingList.length === 0) {
        singingList = data.getSingingList()
        if (!singingList || singingList.length === 0) {
          singingList = playlist.songs
        }
      }
      singingList = singingList.map(s => ({ ...s, id: s.id || s._id || '' }))

      // 同步云端演出信息到本地
      try {
        wx.setStorageSync('performance', currentPerformance)
      } catch (error) {
        console.error('同步云端演出到本地失败:', error)
      }

      // 检测变化：索引变化或演唱列表变化
      const indexChanged = this.data.currentIndex !== currentIndex
      const currentPageList = this.data.singingList
      const listChanged = singingList.length !== currentPageList.length ||
        singingList.some((s, i) => {
          const cur = currentPageList[i]
          return !cur || s.id !== cur.id || (s.priority || 0) !== (cur.priority || 0)
        })

      if (indexChanged || listChanged) {
        const currentSong = singingList[currentIndex] || null
        const nextSong = (currentIndex + 1 < singingList.length) ? singingList[currentIndex + 1] : null

        console.log('更新列表，索引变化:', indexChanged, '列表变化:', listChanged)

        this.setData({
          singingList: singingList,
          currentIndex: currentIndex,
          currentSong: currentSong,
          nextSong: nextSong,
          performance: currentPerformance
        })
      }
    } else if (hasPerformance) {
      // 演出已结束，更新状态
      this.setData({
        hasPerformance: false,
        performance: null,
        singingList: [],
        currentSong: null,
        nextSong: null
      })
    }

    // 检查并设置滚动状态
    this.checkScrollStatus()
  },

  // 检查并设置滚动状态
  checkScrollStatus() {
    // 直接设置为可以滚动，确保内容多时支持滚动
    this.setData({
      isScrollable: true
    })
  },

  // 检查演唱列表是否发生变化
  hasSingingListChanged(newSingingList, newIndex) {
    const { singingList, currentIndex } = this.data

    // 如果索引不同，肯定变化了
    if (newIndex !== currentIndex) {
      return true
    }

    // 如果长度不同，肯定变化了
    if (newSingingList.length !== singingList.length) {
      return true
    }

    // 逐个检查歌曲是否相同
    for (let i = 0; i < newSingingList.length; i++) {
      const oldSong = singingList[i]
      const newSong = newSingingList[i]

      // 如果歌曲ID不同，或者优先级不同，或者留言不同，说明变化了
      if (oldSong.id !== newSong.id ||
          (oldSong.priority || 0) !== (newSong.priority || 0) ||
          oldSong.message !== newSong.message) {
        return true
      }
    }

    return false
  },

  // 爱心点赞
  async likeSong(e) {
    const songId = e.currentTarget.dataset.songId
    console.log('likeSong 点击, songId:', songId, 'dataset:', e.currentTarget.dataset)

    // 检查是否正在演出
    if (!this.data.hasPerformance) {
      util.showToast('当前没有演出')
      return
    }

    // 检查是否已经点赞过
    const userLikes = { ...this.data.userLikes }
    if (userLikes[songId]) {
      util.showToast('您已经为这首歌点过心了')
      return
    }

    // 更新爱心数
    const singingList = [...this.data.singingList]
    // 直接通过 songId 找到对应的歌曲，而不是依赖 index
    const song = singingList.find(s => s.id === songId)
    console.log('找到的歌曲:', song)
    if (song) {
      song.priority = (song.priority || 0) + 1

      // 重新排序（保持前两首不变，后面的按爱心数排序，相同爱心数按添加时间）
      const firstTwo = singingList.slice(0, 2)
      const rest = singingList.slice(2).sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority
        }
        return a.addTime - b.addTime
      })

      const newList = [...firstTwo, ...rest]

      // 保存更新后的演唱列表到本地存储
      data.setSingingList(newList)

      // 记录用户点赞
      userLikes[songId] = true
      wx.setStorageSync('userLikes', userLikes)
      this.setData({
        singingList: newList,
        userLikes: userLikes
      })

      // 同步到云端（让演唱页面能跨设备获取更新）
      const performanceId = this.data.performance?.id
      if (performanceId) {
        try {
          await cloudApi.updatePerformanceSingingList(performanceId, newList)
          console.log('点赞已同步到云端')
        } catch (err) {
          console.error('同步点赞到云端失败:', err)
        }
      }

      util.showToast('支持成功！')
    }
  },

  // 跳转到点歌页面
  goToPointSongPage() {
    if (this.data.hasOrderedSong) {
      util.showToast('本场演出您已经点过歌了')
      return
    }

    // 检查是否有演出
    if (!this.data.hasPerformance) {
      util.showToast('当前没有演出')
      return
    }

    // 存储当前歌手信息到本地，供点歌页面使用
    const singerInfo = {
      id: this.data.singerId || '1',
      name: this.data.singerName || '歌手',
      performanceId: this.data.performance ? this.data.performance.id : ''
    }
    wx.setStorageSync('currentSinger', singerInfo)

    wx.navigateTo({
      url: `/pages/point-song/point-song?playlistId=${this.data.playlistId}&hasOrderedSong=${this.data.hasOrderedSong}`
    })
  },

  // 开发模式：开始模拟演出
  startSimulatedPerformance() {
    const { playlist, playlistId } = this.data
    if (!playlist || !playlist.songs || playlist.songs.length === 0) {
      util.showToast('歌单为空，无法开始演出')
      return
    }

    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {
      id: 'simulated_user',
      nickname: '模拟歌手',
      nickName: '模拟歌手'
    }

    // 创建演出
    const performance = data.createPerformance(
      playlistId,
      userInfo.id || 'simulated_user',
      userInfo.nickname || userInfo.nickName || '模拟歌手'
    )

    if (performance) {
      // 注意：不再设置演出的演唱列表，因为现在直接使用歌单歌曲

      // 刷新状态
      this.checkPerformanceStatus()

      wx.showToast({
        title: '模拟演出已开始',
        icon: 'success'
      })
    } else {
      util.showToast('创建演出失败')
    }
  },

  // 开发模式：显示调试信息
  showDebugInfo() {
    const { playlistId, hasPerformance, performance } = this.data
    const currentPerf = data.getCurrentPerformance()

    wx.showModal({
      title: '调试信息',
      content: `歌单ID: ${playlistId}\n演出状态: ${hasPerformance ? '进行中' : '无'}\n当前演出歌单: ${currentPerf ? currentPerf.playlistId : '无'}\n演出ID: ${performance ? performance.id : '无'}`,
      showCancel: false
    })
  }
})
