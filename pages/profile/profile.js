// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    userInfo: null
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.id) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      })
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: null
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
      'userInfo.avatarUrl': '/images/avatar.png'
    })
  }
})
