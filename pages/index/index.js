// 首页 index.js
const util = require('../../utils/util.js')
const cloudApi = require('../../utils/cloudApi.js')
const data = require('../../utils/data.js')
const app = getApp()

Page({
  data: {
    playlistTab: 'street', // 歌单页面顶部标签：街唱歌单/我的歌单
    currentTab: 0, // 当前选中的 tab 索引（0: 街唱歌单, 1: 我的歌单）
    myPlaylists: [], // 我的歌单
    userInfo: null, // 用户信息
    hasHandledScene: false // 标记是否已处理过场景参数，避免重复跳转
  },

  onLoad(options) {
    console.log('=== 首页 onLoad ===')
    console.log('完整 options:', JSON.stringify(options))

    // 获取用户信息
    this.getUserInfo()

    // 处理扫码进入的参数
    this.handleSceneParams(options)
  },

  // 处理扫码场景参数
  handleSceneParams(options) {
    // 检查是否已处理过场景参数，避免重复跳转
    if (this.data.hasHandledScene) {
      console.log('场景参数已处理过，跳过')
      return
    }

    console.log('=== handleSceneParams 开始 ===')
    console.log('输入 options:', options)

    // 方式1：普通小程序码扫码进入，scene 在 options.scene 中
    if (options.scene) {
      console.log('方式1: 检测到 options.scene')
      try {
        // scene 需要解码，可能需要多次解码！
        let decodedScene = options.scene
        console.log('原始 scene:', decodedScene)

        // 尝试解码
        decodedScene = decodeURIComponent(decodedScene)
        console.log('第一次 decode:', decodedScene)

        // 如果还包含 %，再解码一次（微信可能会双重编码）
        if (decodedScene.includes('%')) {
          decodedScene = decodeURIComponent(decodedScene)
          console.log('第二次 decode:', decodedScene)
        }

        console.log('最终 decodedScene:', decodedScene)

        // 解析参数，支持两种格式
        let playlistId = null
        if (decodedScene.startsWith('p=')) {
          const params = this.parseSceneParams(decodedScene)
          console.log('解析后的参数:', params)
          if (params.p) {
            playlistId = params.p
            console.log('✅ 找到歌单ID（p=格式）:', playlistId)
          }
        } else {
          // 没有 p= 前缀，直接就是ID
          playlistId = decodedScene
          console.log('✅ 找到歌单ID（直接格式）:', playlistId)
        }

        if (playlistId) {
          this.goToSingingList(playlistId)
          return
        }
      } catch (e) {
        console.error('解析 scene 出错:', e)
      }
    }

    // 方式2：如果 scene 没找到，检查 options.query 或者直接从 query 获取
    console.log('尝试方式2：检查 query')
    if (options && options.query && options.query.scene) {
      console.log('检测到 options.query.scene')
      try {
        const scene = decodeURIComponent(options.query.scene)
        console.log('query.scene:', scene)
        const params = this.parseSceneParams(scene)
        if (params.p) {
          const playlistId = params.p
          console.log('✅ 找到歌单ID (方式2):', playlistId)
          this.goToSingingList(playlistId)
          return
        }
      } catch (e) {
        console.error('方式2出错:', e)
      }
    }

    // 方式3：检查是不是直接在 options 里有 playlistId
    console.log('尝试方式3：检查直接参数')
    if (options && options.playlistId) {
      console.log('✅ 直接找到 playlistId:', options.playlistId)
      this.goToSingingList(options.playlistId)
      return
    }

    // 方式4：检查 options.query 里有没有 p 参数
    if (options && options.query && options.query.p) {
      console.log('✅ 找到 options.query.p:', options.query.p)
      this.goToSingingList(options.query.p)
      return
    }

    console.log('❌ 没有找到任何歌单相关参数')
  },

  // 跳转到 singing-list 页面
  goToSingingList(playlistId) {
    console.log('🎯 准备跳转到歌单页面，playlistId:', playlistId)

    // 标记场景参数已处理
    this.setData({
      hasHandledScene: true
    })

    // 延迟跳转，确保页面已准备好
    setTimeout(() => {
      wx.navigateTo({
        url: `/pages/singing-list/singing-list?playlistId=${playlistId}&fromScan=true`,
        success: () => {
          console.log('✅ 跳转成功')
        },
        fail: (err) => {
          console.error('❌ 跳转失败:', err)
          wx.showModal({
            title: '提示',
            content: '跳转失败，请重试',
            showCancel: false
          })
        }
      })
    }, 500)
  },

  // 解析 scene 参数
  parseSceneParams(sceneStr) {
    const params = {}
    if (!sceneStr) return params

    console.log('parseSceneParams 输入:', sceneStr)

    // 支持格式: key1=value1&key2=value2
    const pairs = sceneStr.split('&')
    pairs.forEach(pair => {
      // 找到第一个等号的位置，后面的都属于value
      const eqIndex = pair.indexOf('=')
      if (eqIndex !== -1) {
        const key = pair.substring(0, eqIndex)
        const value = pair.substring(eqIndex + 1)
        if (key) {
          params[key] = decodeURIComponent(value)
        }
      }
    })

    console.log('parseSceneParams 输出:', params)
    return params
  },

  onShow() {
    // 获取用户信息
    this.getUserInfo()

    // 检查是否需要切换到"我的歌单"标签（从演唱页面返回）
    if (app.globalData.returnToMyPlaylists) {
      app.globalData.returnToMyPlaylists = false
      this.setData({
        playlistTab: 'mine',
        currentTab: 1
      })
    }

    // 只有在不是刚进入页面的情况下才重置标志位
    // 这样可以避免在 onLoad 处理之后又被 onShow 重新处理
  },

  onHide() {
    // 页面隐藏时重置标志位，确保下次重新进入时能正常处理
    this.setData({
      hasHandledScene: false
    })
  },

  onUnload() {
    // 页面卸载时重置标志位
    this.setData({
      hasHandledScene: false
    })
  },

  // 获取用户信息
  getUserInfo() {
    // 优先从 app.globalData 获取用户信息
    if (app.globalData.userInfo) {
      console.log('从 app.globalData 获取用户信息')
      this.setData({
        userInfo: app.globalData.userInfo
      })
      // 加载歌单
      this.getPlaylists()
    } else {
      // 从本地存储获取作为备选
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        console.log('从本地存储获取用户信息')
        this.setData({
          userInfo: userInfo
        })
        // 加载歌单
        this.getPlaylists()
      } else {
        console.log('未获取到用户信息')
        this.setData({
          userInfo: null
        })
      }
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

        // 获取当前演出信息
        const currentPerformance = data.getCurrentPerformance()

        // 为每个歌单标记是否正在演唱
        const playlistsWithStatus = (myPlaylists || []).map(playlist => {
          const isSinging = currentPerformance &&
                            currentPerformance.status === 'ongoing' &&
                            currentPerformance.playlistId === playlist.id
          return {
            ...playlist,
            isSinging
          }
        })

        this.setData({
          myPlaylists: playlistsWithStatus
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

  // 切换歌单页面顶部标签（点击）
  switchPlaylistTab(e) {
    const tab = e.currentTarget.dataset.tab
    const currentTab = tab === 'street' ? 0 : 1
    this.setData({
      playlistTab: tab,
      currentTab: currentTab
    })
  },

  // 滑动切换 tab（监听 swiper 变化）
  onTabChange(e) {
    const currentTab = e.detail.current
    const tab = currentTab === 0 ? 'street' : 'mine'
    this.setData({
      currentTab: currentTab,
      playlistTab: tab
    })
  },

  // 扫码功能
  scanCode() {
    wx.scanCode({
      onlyFromCamera: true,
      success: (res) => {
        console.log('=== 扫码结果 ===')
        console.log('完整扫码结果:', JSON.stringify(res))

        // 尝试几种方式解析二维码
        let playlistId = null

        // 方式1：直接就是歌单ID（res.result）
        if (res.result && res.result.length > 5) {
          console.log('方式1: 使用 res.result')
          playlistId = res.result
        }

        // 方式2：小程序码扫码返回 path，从 path 中提取 scene
        if (!playlistId && res.path) {
          console.log('方式2: 解析 path:', res.path)
          // 从 path 中提取查询参数
          const queryIndex = res.path.indexOf('?')
          if (queryIndex !== -1) {
            const queryString = res.path.substring(queryIndex + 1)
            console.log('查询字符串:', queryString)

            // 解析查询参数（处理 key=value=value 的情况）
            const params = {}
            const pairs = queryString.split('&')
            pairs.forEach(pair => {
              const eqIndex = pair.indexOf('=')
              if (eqIndex !== -1) {
                const key = pair.substring(0, eqIndex)
                const value = pair.substring(eqIndex + 1)
                if (key) {
                  params[key] = decodeURIComponent(value)
                }
              }
            })
            console.log('解析出的 params:', params)

            // 先找 scene 参数，再解析 scene
            if (params.scene) {
              console.log('找到 scene:', params.scene)
              // 如果 scene 以 p= 开头
              if (params.scene.startsWith('p=')) {
                const sceneParams = this.parseSceneParams(params.scene)
                if (sceneParams.p) {
                  playlistId = sceneParams.p
                  console.log('从 scene 中解析出歌单ID（p=格式）:', playlistId)
                }
              } else {
                // 没有 p= 前缀，直接作为歌单ID
                playlistId = params.scene
                console.log('从 scene 中解析出歌单ID（直接格式）:', playlistId)
              }
            }
            // 如果没有 scene，看看有没有直接的 p 参数
            else if (params.p) {
              playlistId = params.p
              console.log('直接找到 p 参数:', playlistId)
            }
          }
        }

        // 方式3：如果有 res.query，直接从 query 中取
        if (!playlistId && res.query) {
          console.log('方式3: 解析 query:', res.query)
          if (res.query.scene) {
            const scene = decodeURIComponent(res.query.scene)
            const sceneParams = this.parseSceneParams(scene)
            if (sceneParams.p) {
              playlistId = sceneParams.p
            }
          } else if (res.query.p) {
            playlistId = res.query.p
          }
        }

        // 方式4：如果返回的是完整链接，尝试提取参数
        if (!playlistId && res.result && res.result.includes('p=')) {
          console.log('方式4: 解析完整链接')
          const match = res.result.match(/p=([^&]+)/)
          if (match && match[1]) {
            playlistId = decodeURIComponent(match[1])
          }
        }

        console.log('=== 最终解析出的歌单ID:', playlistId)

        if (playlistId) {
          wx.navigateTo({
            url: `/pages/singing-list/singing-list?playlistId=${playlistId}`
          })
        } else {
          wx.showModal({
            title: '提示',
            content: `无法识别该二维码\n扫码结果：${JSON.stringify(res)}`,
            showCancel: false
          })
        }
      },
      fail: (err) => {
        console.error('扫码失败:', err)
        wx.showToast({
          title: '扫码失败',
          icon: 'none'
        })
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

  // 查看歌单详情（若正在演唱则进入演唱页面）
  viewPlaylistDetail(e) {
    const { playlistId } = e.currentTarget.dataset

    // 查找对应的歌单
    const playlist = this.data.myPlaylists.find(p => p.id === playlistId)

    if (playlist && playlist.isSinging) {
      // 正在演唱中，进入演唱页面
      wx.navigateTo({
        url: `/pages/singing/singing?playlistId=${playlistId}`
      })
    } else {
      // 未演唱，进入歌单详情
      wx.navigateTo({
        url: `/pages/playlist-detail/playlist-detail?playlistId=${playlistId}`
      })
    }
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