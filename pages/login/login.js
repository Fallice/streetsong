// pages/login/login.js
const app = getApp()

Page({
  data: {
    isAgreed: false,
    showProfileModal: false,
    tempAvatarUrl: '',
    tempNickName: '',
    phoneNumber: '',
    loginLoading: false
  },

  onLoad() {
    // 检查是否已登录，已登录则直接跳转到我的页面
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.id) {
      wx.switchTab({
        url: '/pages/profile/profile'
      })
    }
  },

  // 协议勾选变化
  onAgreementChange(e) {
    const checked = e.detail.value.length > 0
    this.setData({
      isAgreed: checked
    })
  },

  // 显示用户协议
  showAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '街唱用户协议...\n（此处填写完整的用户协议内容）',
      showCancel: false
    })
  },

  // 显示隐私政策
  showPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '街唱隐私政策...\n（此处填写完整的隐私政策内容）',
      showCancel: false
    })
  },

  // 微信一键登录 - 使用 openid 登录
  async onWechatLogin() {
    if (!this.data.isAgreed) {
      wx.showToast({
        title: '请先同意协议',
        icon: 'none'
      })
      return
    }

    if (this.data.loginLoading) return

    this.setData({ loginLoading: true })
    wx.showLoading({ title: '登录中...' })

    try {
      // 调用云函数登录（通过 openid）
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      })

      console.log('登录云函数返回:', res)

      const result = res.result
      if (result && result.success) {
        const user = result.data

        // 检查用户是否完善了信息
        if (user.nickName && user.avatarUrl) {
          // 信息完整，直接保存并跳转
          this.saveUserAndRedirect(user)
        } else {
          // 信息不完整，弹出完善信息弹窗
          this.setData({
            showProfileModal: true
          })
        }
      } else {
        wx.showToast({
          title: result?.error || '登录失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('登录失败:', err)
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ loginLoading: false })
      wx.hideLoading()
    }
  },

  // 选择头像
  onChooseAvatar(e) {
    console.log('选择头像:', e.detail)
    this.setData({
      tempAvatarUrl: e.detail.avatarUrl
    })
  },

  // 输入昵称
  onNicknameInput(e) {
    this.setData({
      tempNickName: e.detail.value
    })
  },

  // 关闭弹窗
  closeModal() {
    this.setData({
      showProfileModal: false
    })
  },

  // 完成个人信息
  async completeProfile() {
    const { tempNickName, tempAvatarUrl } = this.data

    if (!tempNickName || !tempAvatarUrl) {
      wx.showToast({
        title: '请完善信息',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      // 上传头像到云存储
      let avatarUrl = tempAvatarUrl

      // 如果是临时文件路径，需要上传
      if (tempAvatarUrl.startsWith('wxfile://') || tempAvatarUrl.startsWith('http://tmp/')) {
        avatarUrl = await this.uploadAvatar(tempAvatarUrl)
      }

      // 调用云函数更新用户信息
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {
          action: 'updateProfile',
          nickName: tempNickName,
          avatarUrl: avatarUrl
        }
      })

      console.log('更新用户信息返回:', res)

      const result = res.result
      if (result && result.success) {
        const user = result.data
        this.setData({ showProfileModal: false })
        this.saveUserAndRedirect(user)
      } else {
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('保存失败:', err)
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 上传头像到云存储
  uploadAvatar(tempFilePath) {
    return new Promise((resolve, reject) => {
      const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`
      wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
        success: res => {
          resolve(res.fileID)
        },
        fail: reject
      })
    })
  },

  // 保存用户信息并跳转
  saveUserAndRedirect(user) {
    // 保存到本地存储
    wx.setStorageSync('userInfo', user)

    // 更新全局数据
    app.globalData.userInfo = user

    wx.showToast({
      title: '登录成功',
      icon: 'success'
    })

    // 跳转到我的页面
    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/profile/profile'
      })
    }, 1500)
  }
})
