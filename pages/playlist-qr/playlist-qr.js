// pages/playlist-qr/playlist-qr.js
const app = getApp()
const cloudApi = require('../../utils/cloudApi.js')

Page({
  data: {
    playlistId: '',
    playlistName: '',
    qrCodeUrl: ''
  },

  onLoad(options) {
    console.log('QR页面参数:', options)
    if (options.playlistId) {
      this.setData({
        playlistId: options.playlistId,
        playlistName: decodeURIComponent(options.name || '歌单')
      })
      // 延迟一点执行，确保页面已渲染
      setTimeout(() => {
        this.generateQRCode()
      }, 100)
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
    }
  },

  // 生成小程序码
  async generateQRCode() {
    wx.showLoading({ title: '生成中...' })

    try {
      // 调用云函数生成小程序码
      const result = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getMiniProgramCode',
          data: {
            scene: this.data.playlistId,
            page: 'pages/singing-list/singing-list',
            width: 430
          }
        }
      })

      console.log('生成小程序码结果:', result)

      if (result.result && result.result.success) {
        this.setData({
          qrCodeUrl: result.result.data
        })
      } else {
        console.error('云函数返回失败:', result.result)
        // 如果云函数失败，使用本地Canvas生成二维码
        this.generateCanvasQRCode()
      }
    } catch (err) {
      console.error('生成小程序码失败:', err)
      // 使用本地Canvas生成二维码作为备用方案
      this.generateCanvasQRCode()
    } finally {
      wx.hideLoading()
    }
  },

  // 使用Canvas生成二维码（备用方案）
  generateCanvasQRCode() {
    const playlistId = this.data.playlistId
    const playlistName = this.data.playlistName

    // 创建查询
    const query = wx.createSelectorQuery()
    query.select('#qrCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) {
          console.error('Canvas未找到')
          this.showShareFallback()
          return
        }

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const size = 400 // 固定大小

        // 设置canvas大小
        canvas.width = size
        canvas.height = size

        // 绘制白色背景
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, size, size)

        // 绘制边框
        ctx.strokeStyle = '#D4A574'
        ctx.lineWidth = 8
        ctx.strokeRect(16, 16, size - 32, size - 32)

        // 绘制装饰角标
        this.drawCornerMarkers(ctx, size)

        // 绘制中间图标背景
        ctx.fillStyle = 'rgba(212, 165, 116, 0.1)'
        ctx.beginPath()
        ctx.arc(size / 2, size / 2 - 20, 60, 0, Math.PI * 2)
        ctx.fill()

        // 绘制文字
        ctx.fillStyle = '#D4A574'
        ctx.font = 'bold 48px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('🎵', size / 2, size / 2 - 10)

        ctx.fillStyle = '#2C2419'
        ctx.font = 'bold 28px sans-serif'
        ctx.fillText('街唱', size / 2, size / 2 + 60)

        ctx.fillStyle = '#8B7D6B'
        ctx.font = '20px sans-serif'
        ctx.fillText('扫码点歌', size / 2, size / 2 + 100)

        // 绘制歌单名称
        ctx.fillStyle = '#B5A99A'
        ctx.font = '16px sans-serif'
        const displayName = playlistName.length > 10 ? playlistName.substring(0, 10) + '...' : playlistName
        ctx.fillText(displayName, size / 2, size / 2 + 140)

        // 导出图片
        wx.canvasToTempFilePath({
          canvas: canvas,
          width: size,
          height: size,
          destWidth: size,
          destHeight: size,
          success: (res) => {
            console.log('Canvas生成成功:', res.tempFilePath)
            this.setData({
              qrCodeUrl: res.tempFilePath
            })
          },
          fail: (err) => {
            console.error('生成Canvas失败:', err)
            this.showShareFallback()
          }
        })
      })
  },

  // 绘制角落标记
  drawCornerMarkers(ctx, size) {
    const markerSize = 40
    const offset = 30
    ctx.fillStyle = '#D4A574'

    // 左上
    ctx.fillRect(offset, offset, markerSize, 8)
    ctx.fillRect(offset, offset, 8, markerSize)

    // 右上
    ctx.fillRect(size - offset - markerSize, offset, markerSize, 8)
    ctx.fillRect(size - offset - 8, offset, 8, markerSize)

    // 左下
    ctx.fillRect(offset, size - offset - 8, markerSize, 8)
    ctx.fillRect(offset, size - offset - markerSize, 8, markerSize)

    // 右下
    ctx.fillRect(size - offset - markerSize, size - offset - 8, markerSize, 8)
    ctx.fillRect(size - offset - 8, size - offset - markerSize, 8, markerSize)
  },

  // 显示分享备用方案
  showShareFallback() {
    this.setData({
      qrCodeUrl: ''
    })
    wx.hideLoading()
    wx.showModal({
      title: '提示',
      content: '小程序码生成需要上线后才能使用，请先使用分享功能邀请好友',
      showCancel: false,
      success: () => {
        // 可以在这里添加引导分享的逻辑
      }
    })
  },

  // 保存二维码到本地
  async saveQRCode() {
    const { qrCodeUrl } = this.data
    if (!qrCodeUrl) {
      wx.showToast({ title: '二维码未生成', icon: 'none' })
      return
    }

    try {
      let filePath = qrCodeUrl

      // 如果是网络图片，先下载
      if (qrCodeUrl.startsWith('http')) {
        const downloadRes = await wx.downloadFile({ url: qrCodeUrl })
        filePath = downloadRes.tempFilePath
      }

      // 保存到相册
      await wx.saveImageToPhotosAlbum({ filePath })

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
    } catch (err) {
      console.error('保存二维码失败:', err)
      if (err.errMsg?.includes('auth deny') || err.errMsg?.includes('authorize')) {
        wx.showModal({
          title: '需要授权',
          content: '请授权保存图片到相册',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      } else {
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    }
  },

  // 分享给朋友
  onShareAppMessage() {
    const { playlistId, playlistName } = this.data
    return {
      title: `${playlistName} - 扫码点歌`,
      path: `/pages/singing-list/singing-list?playlistId=${playlistId}`,
      imageUrl: '/images/share-cover.png'
    }
  }
})
