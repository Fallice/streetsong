// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    isLoading: true // 添加加载状态
  },

  onLoad() {
    // 同步设置loading状态，避免闪屏
    this.setData({ isLoading: false })
    this.checkLoginStatus()
  },

  onShow() {
    // 避免重复设置loading状态
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    // 同步检查本地存储，直接设置状态，避免异步加载的闪屏
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.id) {
      // 如果没有头像或头像为空，使用默认头像
      if (!userInfo.avatarUrl || userInfo.avatarUrl === '') {
        userInfo.avatarUrl = '/images/avatar.svg'
      }
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo,
        isLoading: false
      })
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: null,
        isLoading: false
      })
    }
  },

  // 跳转到登录页面
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录信息
          wx.removeStorageSync('userInfo')

          // 更新全局数据
          app.globalData.userInfo = null

          this.setData({
            isLoggedIn: false,
            userInfo: null
          })

          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  // 跳转到曲库页面
  goToLibrary() {
    wx.navigateTo({
      url: '/pages/library/library'
    })
  },

  // 跳转到首页
  goToIndex() {
    wx.redirectTo({
      url: '/pages/index/index'
    })
  },

  // 头像加载失败
  onAvatarError(e) {
    console.error('头像加载失败:', e)
    // 设置默认头像
    this.setData({
      'userInfo.avatarUrl': '/images/avatar.svg'
    })
  }
})
