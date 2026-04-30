// pages/playlist-qr/playlist-qr.js
const app = getApp()
const cloudApi = require('../../utils/cloudApi.js')
const data = require('../../utils/data.js')

Page({
  data: {
    playlistId: '',
    playlistName: '',
    qrCodeUrl: '',
    isDevMode: false // 是否为开发模式
  },

  onLoad(options) {
    console.log('QR页面参数:', options)

    // 检测是否为开发/体验模式（通过环境变量或特定参数）
    const accountInfo = wx.getAccountInfoSync()
    const isDevMode = accountInfo.miniProgram.envVersion === 'develop' ||
                      accountInfo.miniProgram.envVersion === 'trial' || // 体验版
                      options.dev === '1'
    this.setData({ isDevMode })

    // 打印当前环境信息
    console.log('当前小程序环境:', accountInfo.miniProgram.envVersion)

    if (options.playlistId) {
      this.setData({
        playlistId: options.playlistId,
        playlistName: decodeURIComponent(options.name || '歌单')
      })
      // 延迟一点执行，确保页面已渲染
      setTimeout(() => {
        this.generateQRCode()
      }, 100)
    } else if (isDevMode) {
      // 开发模式下没有参数也允许进入
      this.setData({
        playlistId: 'test_' + Date.now(),
        playlistName: '测试歌单'
      })
      wx.showToast({
        title: '测试模式',
        icon: 'none'
      })
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
      // 生成小程序码使用的 scene 参数（限制32字符）
      const playlistId = this.data.playlistId
      let scene = `p=${playlistId}`

      console.log('原始 scene:', scene, '长度:', scene.length)

      // 如果超过32字符，缩短后面的ID部分
      if (scene.length > 32) {
        // 计算 p= 后面还可以放多少字符
        const availableLength = 32 - 2
        const shortId = playlistId.substring(playlistId.length - availableLength)
        scene = `p=${shortId}`
        console.log('缩短后的 scene:', scene, '长度:', scene.length)
      }

      console.log('最终 scene参数:', scene, '长度:', scene.length)

      // 调用云函数生成小程序码
      const result = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getMiniProgramCode',
          data: {
            scene: scene,
            page: 'pages/index/index', // 扫码先进入首页，再由首页跳转
            width: 430,
            forceRefresh: true // 强制刷新，避免返回旧缓存
          }
        }
      })

      console.log('生成小程序码结果:', result)

      if (result.result && result.result.success) {
        const qrData = result.result.data
        console.log('qrData:', qrData, '类型:', typeof qrData)

        // 确保返回的数据格式正确
        let fileUrl = ''
        let fileID = ''

        if (typeof qrData === 'string') {
          // 如果是字符串，说明只有 fileUrl（旧版本的缓存）
          fileUrl = qrData
          fileID = ''
        } else if (qrData && qrData.fileUrl) {
          // 如果是对象，直接获取
          fileUrl = qrData.fileUrl
          fileID = qrData.fileID || ''
        }

        if (fileUrl) {
          this.setData({
            qrCodeUrl: fileUrl,
            qrCodeFileID: fileID,
            isRealQRCode: true
          })
          console.log('成功显示真实小程序码')
        } else {
          console.error('未找到有效的二维码URL')
          this.generateCanvasQRCode()
        }
      } else {
        console.error('云函数返回失败:', result.result)
        // 如果云函数失败，使用本地Canvas生成二维码
        this.generateCanvasQRCode()
      }
    } catch (err) {
      console.error('生成小程序码失败:', err)
      // 显示更详细的错误信息
      wx.showModal({
        title: '生成失败',
        content: `错误信息: ${err.message || '未知错误'}`,
        showCancel: false
      })
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

        // 绘制二维码样式的方块
        const blockSize = 12
        const margin = 40
        ctx.fillStyle = '#2C2419'

        // 绘制定位角（左上、右上、左下）- 真正的二维码样式
        this.drawPositionMarker(ctx, margin, margin, 50)
        this.drawPositionMarker(ctx, size - margin - 50, margin, 50)
        this.drawPositionMarker(ctx, margin, size - margin - 50, 50)

        // 生成基于 playlistId 的伪随机数据，使每个二维码看起来不同但可重复
        const seed = this.hashString(playlistId)
        const random = this.seededRandom(seed)

        // 绘制数据区域（中间区域）
        const dataStart = margin + 60
        const dataEnd = size - margin - 60

        for (let i = dataStart; i < dataEnd; i += blockSize) {
          for (let j = dataStart; j < dataEnd; j += blockSize) {
            // 跳过定位角区域
            if ((i < margin + 60 && j < margin + 60) ||
                (i > size - margin - 60 && j < margin + 60) ||
                (i < margin + 60 && j > size - margin - 60)) {
              continue
            }
            // 根据种子生成伪随机图案
            if (random() > 0.5) {
              ctx.fillRect(i, j, blockSize - 1, blockSize - 1)
            }
          }
        }

        // 在二维码中央添加小图标
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(size / 2 - 30, size / 2 - 30, 60, 60)

        ctx.fillStyle = '#D4A574'
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, 20, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 20px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('🎵', size / 2, size / 2 + 7)

        // 添加体验版提示文字
        ctx.fillStyle = '#8B7D6B'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('体验版模拟二维码', size / 2, size - 15)

        // 导出图片
        wx.canvasToTempFilePath({
          canvas: canvas,
          width: size,
          height: size,
          destWidth: size * 2,
          destHeight: size * 2,
          success: (res) => {
            console.log('Canvas生成成功:', res.tempFilePath)
            this.setData({
              qrCodeUrl: res.tempFilePath,
              isRealQRCode: false
            })

            // 显示体验版提示
            if (this.data.isDevMode) {
              wx.showModal({
                title: '体验版提示',
                content: '体验版无法生成真正的小程序码，当前显示的是模拟二维码。正式上线后将自动生成可扫描的小程序码。',
                showCancel: false
              })
            }
          },
          fail: (err) => {
            console.error('生成Canvas失败:', err)
            this.showShareFallback()
          }
        })
      })
  },

  // 字符串哈希函数
  hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  },

  // 种子随机数生成器
  seededRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
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

  // 生成测试二维码（开发模式专用）
  generateTestQRCode() {
    const testData = {
      type: 'playlist',
      id: 'test_playlist_' + Date.now(),
      name: '测试歌单',
      songs: [
        { id: 's1', name: '晴天', artist: '周杰伦' },
        { id: 's2', name: '告白气球', artist: '周杰伦' },
        { id: 's3', name: '演员', artist: '薛之谦' }
      ]
    }

    // 保存测试数据到本地存储

    // 创建测试歌单
    data.addPlaylist('测试歌单')
    const playlists = data.getPlaylists()
    const testPlaylist = playlists[playlists.length - 1]

    // 添加测试歌曲
    testData.songs.forEach(song => {
      data.addSongToPlaylist(testPlaylist.id, song)
    })

    // 获取当前用户信息
    const userInfo = wx.getStorageSync('userInfo') || {
      id: 'test_user',
      nickname: '测试歌手',
      nickName: '测试歌手'
    }

    // 创建演出（模拟正在演唱中）
    const performance = data.createPerformance(
      testPlaylist.id,
      userInfo.id || userInfo.openid || 'test_user',
      userInfo.nickname || userInfo.nickName || '测试歌手'
    )

    if (performance) {
      // 更新演出演唱列表
      data.updatePerformanceSingingList(testData.songs)
      console.log('测试演出已创建:', performance)
    }

    // 更新当前显示的歌单ID
    this.setData({
      playlistId: testPlaylist.id,
      playlistName: '测试歌单'
    })

    // 生成二维码
    wx.showLoading({ title: '生成测试二维码...' })

    // 使用Canvas生成包含测试信息的二维码
    this.drawTestQRCode(testPlaylist.id, '测试歌单')

    wx.hideLoading()

    wx.showModal({
      title: '测试二维码已生成',
      content: `歌单ID: ${testPlaylist.id}\n包含3首测试歌曲\n演出状态: ${performance ? '演唱中' : '未开始'}\n\n你可以：\n1. 点击二维码选择"模拟扫码进入"\n2. 保存二维码并用微信扫码测试`,
      showCancel: false
    })
  },

  // 绘制测试二维码
  drawTestQRCode(playlistId, playlistName) {
    const query = wx.createSelectorQuery()
    query.select('#qrCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) return

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const size = 400

        canvas.width = size
        canvas.height = size

        // 白色背景
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, size, size)

        // 绘制二维码样式的方块
        const blockSize = 20
        const margin = 40
        ctx.fillStyle = '#2C2419'

        // 绘制定位角
        this.drawPositionMarker(ctx, margin, margin, 60)
        this.drawPositionMarker(ctx, size - margin - 60, margin, 60)
        this.drawPositionMarker(ctx, margin, size - margin - 60, 60)

        // 绘制随机数据块（模拟二维码）
        for (let i = margin + 80; i < size - margin - 80; i += blockSize) {
          for (let j = margin + 80; j < size - margin - 80; j += blockSize) {
            if (Math.random() > 0.5) {
              ctx.fillRect(i, j, blockSize - 2, blockSize - 2)
            }
          }
        }

        // 中间留空显示文字
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(size / 2 - 60, size / 2 - 60, 120, 120)

        // 中间图标
        ctx.fillStyle = '#D4A574'
        ctx.beginPath()
        ctx.arc(size / 2, size / 2 - 10, 40, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 36px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('测', size / 2, size / 2 + 5)

        // 底部文字
        ctx.fillStyle = '#8B7D6B'
        ctx.font = '16px sans-serif'
        ctx.fillText('TEST', size / 2, size - 20)

        // 导出
        wx.canvasToTempFilePath({
          canvas: canvas,
          width: size,
          height: size,
          destWidth: size,
          destHeight: size,
          success: (res) => {
            this.setData({
              qrCodeUrl: res.tempFilePath
            })
          }
        })
      })
  },

  // 绘制定位标记（二维码的角）
  drawPositionMarker(ctx, x, y, size) {
    ctx.fillStyle = '#2C2419'
    ctx.fillRect(x, y, size, size)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(x + 10, y + 10, size - 20, size - 20)
    ctx.fillStyle = '#2C2419'
    ctx.fillRect(x + 20, y + 20, size - 40, size - 40)
  },

  // 保存二维码到本地
  saveQRCode() {
    const { qrCodeUrl, qrCodeFileID } = this.data
    if (!qrCodeUrl) {
      wx.showToast({ title: '二维码未生成', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })

    // 检查是否是本地临时文件（模拟二维码）
    if (qrCodeUrl.startsWith('wxfile://') || qrCodeUrl.startsWith('http://tmp/')) {
      console.log('直接保存本地临时文件:', qrCodeUrl)
      this.saveToAlbum(qrCodeUrl)
      return
    }

    // 优先使用 fileID 下载（如果有）
    if (qrCodeFileID && qrCodeFileID.startsWith('cloud://')) {
      console.log('使用 fileID 下载:', qrCodeFileID)
      wx.cloud.downloadFile({
        fileID: qrCodeFileID,
        success: (res) => {
          console.log('云存储下载成功:', res)
          this.saveToAlbum(res.tempFilePath)
        },
        fail: (err) => {
          wx.hideLoading()
          console.error('云存储下载失败:', err)
          // 失败时尝试使用 URL 下载
          this.downloadByUrl(qrCodeUrl)
        }
      })
    } else {
      // 使用 URL 下载
      this.downloadByUrl(qrCodeUrl)
    }
  },

  // 使用 URL 下载图片
  downloadByUrl(url) {
    console.log('使用 URL 下载:', url)
    wx.downloadFile({
      url: url,
      success: (res) => {
        console.log('下载结果:', res)
        if (res.statusCode === 200) {
          this.saveToAlbum(res.tempFilePath)
        } else {
          wx.hideLoading()
          console.error('下载失败，状态码:', res.statusCode)
          wx.showToast({ title: '下载失败', icon: 'none' })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('下载文件失败:', err)
        wx.showToast({ title: '下载失败', icon: 'none' })
      }
    })
  },

  // 保存到相册
  saveToAlbum(filePath) {
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: () => {
        wx.hideLoading()
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('保存到相册失败:', err)
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
            title: '保存失败: ' + (err.errMsg || '未知错误'),
            icon: 'none'
          })
        }
      }
    })
  },

  // 分享给朋友
  onShareAppMessage() {
    const { playlistId, playlistName } = this.data
    return {
      title: `${playlistName} - 扫码点歌`,
      path: `/pages/singing-list/singing-list?playlistId=${playlistId}`,
      imageUrl: '/images/share-cover.png'
    }
  },

  // 预览二维码（长按或点击）
  previewQRCode() {
    const { qrCodeUrl, playlistId, isDevMode } = this.data
    if (!qrCodeUrl) return

    // 预览图片
    wx.previewImage({
      urls: [qrCodeUrl],
      current: qrCodeUrl
    })

    // 开发模式下显示测试菜单
    if (isDevMode) {
      setTimeout(() => {
        wx.showActionSheet({
          itemList: ['模拟扫码进入', '复制页面路径', '查看歌单ID'],
          success: (res) => {
            switch (res.tapIndex) {
              case 0:
                // 模拟扫码进入
                wx.showLoading({ title: '正在进入...' })
                setTimeout(() => {
                  wx.hideLoading()
                  wx.navigateTo({
                    url: `/pages/singing-list/singing-list?playlistId=${playlistId}&simulated=true`
                  })
                }, 500)
                break
              case 1:
                // 复制页面路径
                const path = `pages/singing-list/singing-list?playlistId=${playlistId}`
                wx.setClipboardData({
                  data: path,
                  success: () => {
                    wx.showToast({ title: '路径已复制', icon: 'success' })
                  }
                })
                break
              case 2:
                // 显示歌单ID
                wx.showModal({
                  title: '歌单信息',
                  content: `歌单ID: ${playlistId}\n歌单名: ${this.data.playlistName}`,
                  showCancel: false
                })
                break
            }
          }
        })
      }, 500)
    }
  }
})
