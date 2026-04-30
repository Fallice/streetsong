// 观众点歌列表页面 singing-list.js
const util = require('../../utils/util.js')
const data = require('../../utils/data.js')
const db = require('../../utils/database.js')

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
    // 每次显示页面时检查演出状态
    this.checkPerformanceStatus()

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
      // 先尝试从本地存储获取（歌手自己的手机）
      let playlist = data.getPlaylistById(this.data.playlistId)
      console.log('本地歌单查询结果:', playlist)

      // 如果本地没有，从云数据库获取
      if (!playlist) {
        console.log('本地未找到歌单，从云端获取')
        playlist = await this.getPlaylistFromCloud(this.data.playlistId)
        console.log('云端歌单查询结果:', playlist)
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
      this.checkPerformanceStatus()
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
  async checkPerformanceStatus() {
    const { playlistId } = this.data

    console.log('检查演出状态，歌单ID:', playlistId)

    // 先从本地存储获取
    let performance = data.getCurrentPerformance()

    // 如果本地没有，尝试从云端获取
    if (!performance) {
      console.log('本地未找到演出信息，尝试从云端获取')
      performance = await this.getPerformanceFromCloud(playlistId)
    }

    console.log('当前演出信息:', performance)

    // 检查是否是当前歌单的演出
    const hasOngoingPerformance = performance &&
                                   performance.status === 'ongoing' &&
                                   performance.playlistId === playlistId

    console.log('是否有进行中的演出:', hasOngoingPerformance)

    if (hasOngoingPerformance) {
      // 演出进行中
      const singingList = performance.singingList || []
      const currentIndex = performance.currentIndex || 0

      // 检查是否是新的演出（与之前不同的演出ID）
      const previousPerformanceId = wx.getStorageSync('previousPerformanceId')
      if (performance.id !== previousPerformanceId) {
        // 新演出，清空点歌记录
        wx.setStorageSync('orderedSongs', [])
        wx.setStorageSync('previousPerformanceId', performance.id)
        // 清空点赞记录
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

      // 根据当前演唱索引计算当前歌曲和下一首歌曲
      const currentSong = singingList[currentIndex] || null
      const nextSong = (currentIndex + 1 < singingList.length) ? singingList[currentIndex + 1] : null

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
      const result = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getPerformancesByPlaylistId',
          data: {
            playlistId: playlistId
          }
        }
      })

      if (result.result && result.result.success) {
        const performances = result.result.data || []
        // 找到进行中的演出
        const ongoing = performances.find(p => p.status === 'ongoing')
        if (ongoing) {
          return {
            id: ongoing.id || ongoing._id,
            playlistId: ongoing.playlistId,
            singerId: ongoing.userId || ongoing.singerId,
            singerName: ongoing.singerName,
            status: ongoing.status,
            singingList: ongoing.singingList || [],
            title: ongoing.title || '演出中'
          }
        }
      }
      return null
    } catch (error) {
      console.error('从云端获取演出失败:', error)
      return null
    }
  },

  // 刷新演唱列表
  refreshSingingList() {
    const { hasPerformance, performance } = this.data

    // 无论当前是否显示演出状态，都要检查最新的演出数据
    const currentPerformance = data.getCurrentPerformance()
    const isOngoing = currentPerformance &&
                       currentPerformance.status === 'ongoing' &&
                       currentPerformance.playlistId === this.data.playlistId

    // 如果演出状态发生变化，立即更新
    if (isOngoing !== hasPerformance) {
      this.checkPerformanceStatus()
      return
    }

    if (isOngoing && currentPerformance) {
      // 检查演出ID是否匹配
      if (performance && currentPerformance.id === performance.id) {
        const singingList = currentPerformance.singingList || []
        const currentIndex = currentPerformance.currentIndex || 0

        // 检查是否有变化：不仅检查长度和索引，还检查歌曲内容是否变化
        const hasChanged = this.hasSingingListChanged(singingList, currentIndex)

        if (hasChanged) {
          // 根据当前演唱索引计算当前歌曲和下一首歌曲
          const currentSong = singingList[currentIndex] || null
          const nextSong = (currentIndex + 1 < singingList.length) ? singingList[currentIndex + 1] : null

          this.setData({
            singingList: singingList,
            currentIndex: currentIndex,
            currentSong: currentSong,
            nextSong: nextSong
          })
        }
      } else if (isOngoing) {
        // 如果演出ID不匹配，重新检查演出状态
        this.checkPerformanceStatus()
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
  likeSong(e) {
    const { songId } = e.currentTarget.dataset

    // 检查是否正在演出
    if (!this.data.hasPerformance) {
      util.showToast('当前没有演出')
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
    // 直接通过 songId 找到对应的歌曲，而不是依赖 index
    const song = singingList.find(s => s.id === songId)
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

      // 更新演出的演唱列表
      data.updatePerformanceSingingList(newList)

      // 记录用户点赞
      userLikes[songId] = true
      // 存储到本地存储
      wx.setStorageSync('userLikes', userLikes)
      this.setData({
        singingList: newList,
        userLikes: { ...userLikes } // 使用展开运算符确保触发更新
      })

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
      // 设置演唱列表
      data.updatePerformanceSingingList(playlist.songs)

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
