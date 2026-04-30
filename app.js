// app.js
const db = require('./utils/database.js')

App({
  globalData: {
    userInfo: null, // 用户信息
    isSinger: false, // 是否为歌手身份
    currentPlaylist: null, // 当前演唱中的歌单
    currentSong: null, // 当前演唱的歌曲
    singingList: [], // 演唱列表
    currentPerformance: null, // 当前演出
    returnToMyPlaylists: false, // 从演唱页面返回时切换到"我的歌单"标签
    navigationBarHeight: 0 // 导航栏高度（全局）
  },

  onLaunch(options) {
    // 小程序启动时执行
    console.log('街唱小程序启动', options)

    // 计算导航栏高度
    this.calculateNavigationBarHeight()

    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-7gj9tjvc8437e18c',
        traceUser: true
      })
    }

    // 检查用户登录状态
    this.checkLoginStatus()

    // 初始化全局数据
    this.initGlobalData()

    // 处理扫码进入场景
    this.handleSceneParams(options)
  },

  onShow(options) {
    // 处理从后台被扫码打开的场景
    this.handleSceneParams(options)

    // 不要每次小程序显示时都重新检查登录状态，避免闪屏
    // 只在真正需要时才检查
  },

  // 处理场景参数（扫码进入）
  handleSceneParams(options) {
    console.log('处理场景参数:', options)

    // 微信小程序码扫码进入时，scene 参数在 options.query.scene 中
    const scene = options.query && options.query.scene

    if (scene) {
      // scene 是二维码中的参数，需要解码
      // 我们生成的格式是: p=playlistId
      const decodedScene = decodeURIComponent(scene)
      console.log('扫码进入，scene参数:', decodedScene)

      // 解析 scene 参数
      const params = this.parseSceneParams(decodedScene)
      console.log('解析后的参数:', params)

      if (params.p) {
        // p 参数表示歌单ID，跳转到演唱页面
        const playlistId = params.p
        console.log('准备跳转到歌单页面:', playlistId)

        // 延迟执行跳转，确保页面栈已准备好
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/singing-list/singing-list?playlistId=${playlistId}&fromScan=true`,
            fail: (err) => {
              console.error('跳转失败:', err)
              // 如果 navigateTo 失败（可能页面栈已满），尝试 redirectTo
              wx.redirectTo({
                url: `/pages/singing-list/singing-list?playlistId=${playlistId}&fromScan=true`
              })
            }
          })
        }, 500)
      }
    }
  },

  // 解析 scene 参数
  parseSceneParams(sceneStr) {
    const params = {}
    if (!sceneStr) return params

    // 支持格式: key1=value1&key2=value2
    const pairs = sceneStr.split('&')
    pairs.forEach(pair => {
      const [key, value] = pair.split('=')
      if (key && value !== undefined) {
        params[key] = decodeURIComponent(value)
      }
    })

    return params
  },

  globalData: {
    userInfo: null, // 用户信息
    isSinger: false, // 是否为歌手身份
    currentPlaylist: null, // 当前演唱中的歌单
    currentSong: null, // 当前演唱的歌曲
    singingList: [], // 演唱列表
    currentPerformance: null, // 当前演出
    returnToMyPlaylists: false // 从演唱页面返回时切换到"我的歌单"标签
  },

  // 微信登录（使用云函数）
  wechatLogin(userInfo = null) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        data: {
          userInfo: userInfo
        }
      }).then(res => {
        if (res.result.success) {
          const user = res.result.data
          this.globalData.userInfo = user
          wx.setStorageSync('userInfo', user)
          resolve(user)
        } else {
          reject(new Error(res.result.error))
        }
      }).catch(error => {
        console.error('微信登录失败:', error)
        reject(error)
      })
    })
  },

  // 检查登录状态
  checkLoginStatus() {
    // 只从本地存储获取用户信息，避免异步云函数调用导致的闪屏
    const userInfo = wx.getStorageSync('userInfo')
    console.log('检查登录状态，本地存储信息:', userInfo)

    if (userInfo) {
      // 直接使用本地存储的用户信息，不调用云函数
      this.globalData.userInfo = userInfo
      this.globalData.isSinger = userInfo.isSinger || false
    } else {
      console.log('本地无用户信息，未登录')
      this.globalData.userInfo = null
      this.globalData.isSinger = false
    }
  },

  // 初始化全局数据
  initGlobalData() {
    // 初始化一些默认值
    this.globalData.singingList = []
    this.globalData.currentPerformance = null
  },

  // 获取用户信息（从数据库）
  getUserInfo() {
    return new Promise((resolve) => {
      if (this.globalData.userInfo) {
        resolve(this.globalData.userInfo)
      } else {
        // 检查本地存储是否有用户信息
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo) {
          this.globalData.userInfo = userInfo
          resolve(userInfo)
        } else {
          // 未登录，不自动登录，返回 null
          resolve(null)
        }
      }
    })
  },

  // 歌手身份登录
  loginAsSinger() {
    const userInfo = this.globalData.userInfo || {}
    userInfo.isSinger = true
    db.UserDB.updateUser(userInfo.id, { isSinger: true })
    this.globalData.isSinger = true
    this.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
  },

  // 观众身份登录
  loginAsAudience() {
    const userInfo = this.globalData.userInfo || {}
    userInfo.isSinger = false
    db.UserDB.updateUser(userInfo.id, { isSinger: false })
    this.globalData.isSinger = false
    this.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
  },

  // 创建演出
  createPerformance(performanceData) {
    return db.PerformanceDB.createPerformance(performanceData)
  },

  // 结束演出
  endPerformance(performanceId) {
    return db.PerformanceDB.endPerformance(performanceId)
  },

  // 模拟数据存储方法
  storage: {
    get(key) {
      return wx.getStorageSync(key) || null
    },
    set(key, value) {
      wx.setStorageSync(key, value)
    },
    remove(key) {
      wx.removeStorageSync(key)
    }
  },

  // 计算导航栏高度
  calculateNavigationBarHeight() {
    try {
      const systemInfo = wx.getWindowInfo() || wx.getSystemInfoSync()
      const menuButton = wx.getMenuButtonBoundingClientRect()

      if (menuButton) {
        const navigationBarHeight = menuButton.top + menuButton.height + (menuButton.top - systemInfo.safeArea.top) * 2
        this.globalData.navigationBarHeight = navigationBarHeight
        console.log('导航栏高度计算成功:', navigationBarHeight)
      } else {
        // 降级方案：使用系统状态栏高度 + 默认导航栏高度
        this.globalData.navigationBarHeight = systemInfo.safeArea.top + 44
        console.log('导航栏高度使用降级方案:', this.globalData.navigationBarHeight)
      }
    } catch (error) {
      console.error('计算导航栏高度失败:', error)
      // 最坏情况的默认值
      this.globalData.navigationBarHeight = 88
    }
  }
})
