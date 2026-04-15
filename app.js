// app.js
App({
  onLaunch() {
    // 小程序启动时执行
    console.log('街唱小程序启动')

    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        // env 参数说明：
        // env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        // 此处请填入环境 ID, 环境 ID 可打开云控制台查看
        // 如不填则使用默认环境（第一个创建的环境）
        env: 'cloud1-7gj9tjvc8437e18c',
        traceUser: true
      })
    }

    // 检查用户登录状态
    this.checkLoginStatus()

    // 初始化全局数据
    this.initGlobalData()
  },

  globalData: {
    userInfo: null, // 用户信息
    isSinger: false, // 是否为歌手身份
    currentPlaylist: null, // 当前演唱中的歌单
    currentSong: null, // 当前演唱的歌曲
    singingList: [], // 演唱列表
    currentPerformance: null // 当前演出
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
    // 这里可以通过 wx.getStorageSync 获取本地存储的登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      // 验证用户是否还存在
      const user = db.UserDB.getUserById(userInfo.id)
      if (user) {
        this.globalData.userInfo = user
        this.globalData.isSinger = user.isSinger || false
      } else {
        // 用户不存在，清除本地存储
        wx.removeStorageSync('userInfo')
        // 重新登录
        this.wechatLogin()
      }
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
  }
})
