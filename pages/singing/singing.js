// 演唱页面 singing.js
const util = require('../../utils/util.js')
const data = require('../../utils/data.js')
const cloudApi = require('../../utils/cloudApi.js')
const app = getApp()

Page({
  data: {
    playlistId: '',
    playlist: null,
    singingList: [],
    currentIndex: 0,
    currentSong: null,
    nextSong: null,
    isPlaying: true,
    showList: false,
    sungCount: 0,
    remainingCount: 0,
    performanceId: null // 演出ID
  },

  onLoad(options) {
    if (options.playlistId) {
      this.setData({
        playlistId: options.playlistId
      })

      // 记录来源页面
      const pages = getCurrentPages()
      if (pages.length >= 2) {
        const prevPage = pages[pages.length - 2]
        this.returnTarget = prevPage.route
        console.log('来源页面:', this.returnTarget)
      }

      this.initSinging()
    } else {
      util.showToast('参数错误')
      wx.navigateBack()
    }
  },

  onShow() {
    // 页面显示时立即同步一次演唱列表
    this.refreshSingingList()
    // 定时刷新演唱列表
    this.pollingTimer = setInterval(() => {
      this.refreshSingingList()
    }, 3000)
  },

  onHide() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }
  },

  onUnload() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }

    // 注意：返回不结束演出，只有点击"结束演唱"按钮才结束
    // 演出状态会保持，直到用户主动结束

    // 根据来源页面设置返回标记
    if (this.returnTarget === 'pages/index/index') {
      // 从首页返回，切换到"我的歌单"标签
      app.globalData.returnToMyPlaylists = true
    }
  },

  // 导航栏返回按钮点击事件
  onNavigateBack() {
    // 返回不结束演出，只保存当前进度（已经在切换歌曲时保存）
    wx.navigateBack()
  },

  // 初始化演唱
  async initSinging() {
    try {
      // 获取当前用户信息（提前获取，后面需要用到）
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo) {
        util.showToast('请先登录')
        wx.navigateBack()
        return
      }

      // 检查是否有正在进行的演出
      const currentPerformance = data.getCurrentPerformance()
      console.log('initSinging - 检查演出:', currentPerformance, '当前歌单ID:', this.data.playlistId)

      if (currentPerformance && currentPerformance.status === 'ongoing' && currentPerformance.playlistId === this.data.playlistId) {
        // 有正在进行的演出，恢复演唱状态
        console.log('恢复演出状态:', currentPerformance)

        // 获取歌单信息（优先使用云函数，确保获取最新数据）
        let playlist = null
        try {
          playlist = await cloudApi.getPlaylist(this.data.playlistId)
        } catch (err) {
          console.log('云函数获取失败，尝试本地获取:', err)
          playlist = data.getPlaylistById(this.data.playlistId)
        }

        if (!playlist) {
          util.showToast('歌单不存在')
          wx.navigateBack()
          return
        }

        // 获取演唱进度（只需要currentIndex，不需要演唱列表，直接使用歌单歌曲）
        const progress = data.getPerformanceProgress()

        // 优先从云端获取演唱列表（恢复时获取最新数据）
        let singingList = null
        try {
          const cloudData = await cloudApi.getPerformanceSingingList(currentPerformance.id)
          if (cloudData && cloudData.singingList && cloudData.singingList.length > 0) {
            singingList = cloudData.singingList.map(s => ({ ...s, id: s.id || s._id || '' }))
            console.log('从云端恢复演唱列表:', singingList.length, '首')
          }
        } catch (err) {
          console.log('从云端获取演唱列表失败:', err)
        }

        // 云端没有则使用本地存储，本地也没有则用歌单初始化
        if (!singingList || singingList.length === 0) {
          singingList = data.getSingingList()
          if (!singingList || singingList.length === 0) {
            singingList = playlist.songs.map(s => ({ ...s, id: s.id || s._id || '' }))
          }
        }
        data.setSingingList(singingList)

        this.setData({
          playlist: playlist,
          singingList: singingList,
          isPlaying: true,
          sungCount: progress.sungCount,
          remainingCount: singingList.length - progress.currentIndex - 1,
          currentIndex: progress.currentIndex,
          performanceId: currentPerformance.id
        })

        // 更新全局演出信息
        app.globalData.currentPerformance = currentPerformance
        app.globalData.singingList = singingList

        this.updateCurrentSong()

        // 检查云端是否有这个演出，如果没有就同步上去
        try {
          console.log('检查云端是否有演出...')
          const cloudPerformances = await cloudApi.getUserPerformances(userInfo.id || userInfo.openid)
          const hasCloudPerformance = cloudPerformances && cloudPerformances.find(p => p.id === currentPerformance.id || p._id === currentPerformance.id)

          if (!hasCloudPerformance) {
            console.log('云端没有此演出，正在同步...')
            // 直接使用本地演出的ID创建云端演出，确保ID一致
            const cloudPerformance = await cloudApi.createPerformance(
              userInfo.id || userInfo.openid,
              {
                performanceId: currentPerformance.id,
                playlistId: this.data.playlistId,
                singerName: userInfo.nickname || userInfo.nickName,
                currentIndex: progress.currentIndex,
                sungCount: progress.sungCount
              }
            )
            console.log('云端演出同步成功:', cloudPerformance)
            // 同步演唱列表到云端
            await cloudApi.updatePerformanceSingingList(currentPerformance.id, singingList)
          } else {
            console.log('云端已有此演出')
          }
        } catch (error) {
          console.error('检查或同步云端演出失败:', error)
          // 不阻止功能继续
        }

        wx.showToast({
          title: '恢复演出',
          icon: 'success'
        })

        return // 恢复成功，不继续创建新演出
      }

      // 没有正在进行的演出，创建新演出

      // 获取歌单信息（优先使用云函数，确保获取最新数据）
      let playlist = null
      try {
        playlist = await cloudApi.getPlaylist(this.data.playlistId)
      } catch (err) {
        console.log('云函数获取失败，尝试本地获取:', err)
        playlist = data.getPlaylistById(this.data.playlistId)
      }

      if (!playlist) {
        util.showToast('歌单不存在')
        wx.navigateBack()
        return
      }

      // 创建新的演出（先本地，再云端）
      let performance = data.createPerformance(
        this.data.playlistId,
        userInfo.id || userInfo.openid,
        userInfo.nickname || userInfo.nickName
      )

      if (!performance) {
        util.showToast('创建演出失败')
        wx.navigateBack()
        return
      }

      // 同时保存到云端
      try {
        console.log('正在创建云端演出...')
        // 直接使用本地演出的ID创建云端演出，确保ID一致
        const cloudPerformance = await cloudApi.createPerformance(
          userInfo.id || userInfo.openid,
          {
            performanceId: performance.id,
            playlistId: this.data.playlistId,
            singerName: userInfo.nickname || userInfo.nickName,
            currentIndex: 0,
            sungCount: 0
          }
        )
        console.log('云端演出创建成功:', cloudPerformance)
      } catch (error) {
        console.error('创建云端演出失败，但本地演出已创建:', error)
        console.error('错误详情:', error.message)
        // 云端创建失败不影响本地功能，但记录详细错误
      }

      // 新演出：用歌单歌曲初始化演唱列表（先归一化ID再保存）
      const normalizedSongs = playlist.songs.map(s => ({ ...s, id: s.id || s._id || '' }))
      data.setSingingList(normalizedSongs)

      // 同步演唱列表到云端
      try {
        await cloudApi.updatePerformanceSingingList(performance.id, normalizedSongs)
        console.log('演唱列表已同步到云端')
      } catch (err) {
        console.error('同步演唱列表到云端失败:', err)
      }

      this.setData({
        playlist: playlist,
        singingList: normalizedSongs,
        isPlaying: true,
        sungCount: 0,
        remainingCount: playlist.songs.length,
        performanceId: performance.id
      })

      // 更新全局演出信息
      app.globalData.currentPerformance = performance
      app.globalData.singingList = normalizedSongs

      this.updateCurrentSong()

      wx.showToast({
        title: '演出开始',
        icon: 'success'
      })
    } catch (error) {
      console.error('初始化演唱失败:', error)
      util.showToast('启动失败，请重试')
      wx.navigateBack()
    }
  },

  // 刷新演唱列表（优先从云端同步点歌数据，本地作为备份）
  async refreshSingingList() {
    if (!this.data.performanceId) return

    try {
      // 优先从云端获取最新演唱列表（跨设备同步的关键）
      const cloudData = await cloudApi.getPerformanceSingingList(this.data.performanceId)
      if (cloudData && cloudData.singingList && cloudData.singingList.length > 0) {
        const cloudList = cloudData.singingList.map(s => ({ ...s, id: s.id || s._id || '' }))
        const currentList = this.data.singingList

        // 检测任何变化：长度变化、歌曲ID变化、优先级变化
        const hasChanged = cloudList.length !== currentList.length ||
          cloudList.some((s, i) => {
            const cur = currentList[i]
            return !cur || s.id !== cur.id || (s.priority || 0) !== (cur.priority || 0)
          })

        if (hasChanged) {
          console.log('云端演唱列表已更新，长度:', currentList.length, '->', cloudList.length)
          // 同时更新本地存储，保持一致性
          data.setSingingList(cloudList)
          this.setData({
            singingList: cloudList,
            remainingCount: cloudList.length - this.data.currentIndex - 1
          })
          app.globalData.singingList = cloudList
          this.updateCurrentSong()
        }
        return
      }
    } catch (err) {
      console.log('从云端获取演唱列表失败，尝试本地:', err)
    }

    // 云端获取失败时，回退到本地存储
    const latestList = data.getSingingList()
    if (!latestList || latestList.length === 0) return

    const normalizedList = latestList.map(s => ({ ...s, id: s.id || s._id || '' }))
    const currentList = this.data.singingList

    const hasChanged = normalizedList.length !== currentList.length ||
      normalizedList.some((s, i) => {
        const cur = currentList[i]
        return !cur || s.id !== cur.id || (s.priority || 0) !== (cur.priority || 0)
      })

    if (hasChanged) {
      console.log('本地演唱列表已更新，长度:', currentList.length, '->', normalizedList.length)
      this.setData({
        singingList: normalizedList,
        remainingCount: normalizedList.length - this.data.currentIndex - 1
      })
      app.globalData.singingList = normalizedList
      this.updateCurrentSong()
    }
  },

  // 更新当前歌曲
  updateCurrentSong() {
    const { singingList, currentIndex, sungCount } = this.data

    if (singingList.length === 0) {
      this.setData({
        currentSong: null,
        nextSong: null,
        remainingCount: 0
      })
      return
    }

    const currentSong = singingList[currentIndex] || null
    const nextSong = singingList[currentIndex + 1] || null

    this.setData({
      currentSong,
      nextSong,
      remainingCount: singingList.length - currentIndex - 1
    })

    // 更新全局状态
    app.globalData.currentSong = currentSong
    // 只更新演出的进度，不更新歌曲列表（直接使用歌单歌曲）
    data.updatePerformanceProgress(currentIndex, sungCount)

    // 更新到云端
    this.updatePerformanceToCloud(currentIndex, sungCount)

    console.log('演唱页面更新当前歌曲:', currentSong?.name, '索引:', currentIndex, '演出ID:', this.data.performanceId)
  },

  // 更新演出到云端
  async updatePerformanceToCloud(currentIndex, sungCount) {
    if (!this.data.performanceId) return

    try {
      // 只更新演出进度，不更新歌曲列表
      await cloudApi.updatePerformanceProgress(this.data.performanceId, currentIndex, sungCount)
      console.log('演出进度更新到云端成功')
    } catch (error) {
      console.error('更新演出到云端失败:', error)
    }
  },

  // 下一首
  nextSong() {
    const { singingList, currentIndex, sungCount } = this.data
    let newIndex = currentIndex + 1

    if (newIndex >= singingList.length) {
      util.showToast('已唱完所有歌曲')
      return
    }

    const newSungCount = sungCount + 1
    this.setData({
      currentIndex: newIndex,
      sungCount: newSungCount
    })

    // 直接调用 updateCurrentSong，它会使用新函数同时更新演出数据
    this.updateCurrentSong()
  },

  // 显示列表（直接使用歌单的歌曲列表）
  showList() {
    this.setData({
      showList: true
    })
  },

  // 关闭列表
  hideList() {
    this.setData({
      showList: false
    })
  },

  // 结束演唱
  async endSinging() {
    const confirm = await util.showModal('结束演唱', '确定要结束演唱吗？')
    if (!confirm) return

    this.endPerformance()

    // 根据来源页面设置返回标记
    if (this.returnTarget === 'pages/index/index') {
      app.globalData.returnToMyPlaylists = true
    }

    wx.navigateBack()
  },

  // 结束演出
  endPerformance() {
    if (this.data.performanceId) {
      // 结束当前演出
      data.endCurrentPerformance()

      // 清除全局状态
      app.globalData.currentPlaylist = null
      app.globalData.currentSong = null
      app.globalData.singingList = []
      app.globalData.currentPerformance = null

      wx.showToast({
        title: '演出结束',
        icon: 'none'
      })
    }
  },
})
