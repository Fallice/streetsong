// 点歌页面 point-song.js
const util = require('../../utils/util.js')
const data = require('../../utils/data.js')
const db = require('../../utils/database.js')
const app = getApp()

Page({
  data: {
    playlistId: '',
    searchText: '',
    songLibrary: [],
    filteredSongs: [],
    displaySongs: [],
    showPointModal: false,
    selectedSong: {},
    pointMessage: '',
    hasOrderedSong: false,
    currentUser: null,
    performanceId: null
  },

  onLoad(options) {
    if (options.playlistId) {
      this.setData({
        playlistId: options.playlistId,
        hasOrderedSong: options.hasOrderedSong === 'true'
      })
    }

    // 获取用户信息
    app.getUserInfo().then(userInfo => {
      this.setData({
        currentUser: userInfo
      })

      // 获取演出ID
      const ongoingPerformances = db.PerformanceDB.getOngoingPerformances()
      if (ongoingPerformances.length > 0) {
        this.setData({
          performanceId: ongoingPerformances[0].id
        })
      }
    })

    this.initSongLibrary()
  },

  // 初始化曲库
  initSongLibrary() {
    // 模拟歌手曲库数据
    const songLibrary = [
      { id: '1', name: '七里香', artist: '周杰伦' },
      { id: '2', name: '晴天', artist: '周杰伦' },
      { id: '3', name: '回到过去', artist: '周杰伦' },
      { id: '4', name: '我不配', artist: '周杰伦' },
      { id: '5', name: '稻香', artist: '周杰伦' },
      { id: '6', name: '告白气球', artist: '周杰伦' },
      { id: '7', name: '青花瓷', artist: '周杰伦' },
      { id: '8', name: '夜曲', artist: '周杰伦' },
      { id: '9', name: '以父之名', artist: '周杰伦' },
      { id: '10', name: '双截棍', artist: '周杰伦' },
      { id: '11', name: '东风破', artist: '周杰伦' },
      { id: '12', name: '发如雪', artist: '周杰伦' },
      { id: '13', name: '千里之外', artist: '周杰伦' },
      { id: '14', name: '菊花台', artist: '周杰伦' },
      { id: '15', name: '霍元甲', artist: '周杰伦' },
      { id: '16', name: '本草纲目', artist: '周杰伦' },
      { id: '17', name: '听妈妈的话', artist: '周杰伦' },
      { id: '18', name: '夜的第七章', artist: '周杰伦' },
      { id: '19', name: '红尘客栈', artist: '周杰伦' },
      { id: '20', name: '明明就', artist: '周杰伦' },
      { id: '21', name: '手写的从前', artist: '周杰伦' },
      { id: '22', name: '说好的幸福呢', artist: '周杰伦' },
      { id: '23', name: '烟花易冷', artist: '周杰伦' },
      { id: '24', name: '兰亭序', artist: '周杰伦' },
      { id: '25', name: '魔术先生', artist: '周杰伦' },
      { id: '26', name: '乔克叔叔', artist: '周杰伦' },
      { id: '27', name: '时光机', artist: '周杰伦' },
      { id: '28', name: '龙战骑士', artist: '周杰伦' },
      { id: '29', name: '给我一首歌的时间', artist: '周杰伦' },
      { id: '30', name: '蛇舞', artist: '周杰伦' },
      { id: '31', name: '花海', artist: '周杰伦' },
      { id: '32', name: '说好不哭', artist: '周杰伦' },
      { id: '33', name: 'Mojito', artist: '周杰伦' },
      { id: '34', name: '最伟大的作品', artist: '周杰伦' },
      { id: '35', name: '等你下课', artist: '周杰伦' },
      { id: '36', name: '不爱我就拉倒', artist: '周杰伦' },
      { id: '37', name: '说好的幸福呢', artist: '周杰伦' },
      { id: '38', name: '稻香', artist: '周杰伦' },
      { id: '39', name: '青花瓷', artist: '周杰伦' },
      { id: '40', name: '告白气球', artist: '周杰伦' },
      { id: '41', name: '七里香', artist: '周杰伦' },
      { id: '42', name: '晴天', artist: '周杰伦' },
      { id: '43', name: '回到过去', artist: '周杰伦' },
      { id: '44', name: '我不配', artist: '周杰伦' },
      { id: '45', name: '夜曲', artist: '周杰伦' },
      { id: '46', name: '以父之名', artist: '周杰伦' },
      { id: '47', name: '双截棍', artist: '周杰伦' },
      { id: '48', name: '东风破', artist: '周杰伦' },
      { id: '49', name: '发如雪', artist: '周杰伦' },
      { id: '50', name: '千里之外', artist: '周杰伦' },
      { id: '51', name: '菊花台', artist: '周杰伦' },
      { id: '52', name: '霍元甲', artist: '周杰伦' },
      { id: '53', name: '本草纲目', artist: '周杰伦' },
      { id: '54', name: '听妈妈的话', artist: '周杰伦' },
      { id: '55', name: '夜的第七章', artist: '周杰伦' },
      { id: '56', name: '红尘客栈', artist: '周杰伦' },
      { id: '57', name: '明明就', artist: '周杰伦' },
      { id: '58', name: '手写的从前', artist: '周杰伦' },
      { id: '59', name: '烟花易冷', artist: '周杰伦' },
      { id: '60', name: '兰亭序', artist: '周杰伦' },
      { id: '61', name: '魔术先生', artist: '周杰伦' },
      { id: '62', name: '乔克叔叔', artist: '周杰伦' },
      { id: '63', name: '时光机', artist: '周杰伦' },
      { id: '64', name: '龙战骑士', artist: '周杰伦' },
      { id: '65', name: '给我一首歌的时间', artist: '周杰伦' },
      { id: '66', name: '蛇舞', artist: '周杰伦' },
      { id: '67', name: '花海', artist: '周杰伦' },
      { id: '68', name: '说好不哭', artist: '周杰伦' },
      { id: '69', name: 'Mojito', artist: '周杰伦' },
      { id: '70', name: '最伟大的作品', artist: '周杰伦' },
      { id: '71', name: '等你下课', artist: '周杰伦' },
      { id: '72', name: '不爱我就拉倒', artist: '周杰伦' },
      { id: '73', name: '说好的幸福呢', artist: '周杰伦' },
      { id: '74', name: '稻香', artist: '周杰伦' },
      { id: '75', name: '青花瓷', artist: '周杰伦' },
      { id: '76', name: '告白气球', artist: '周杰伦' },
      { id: '77', name: '七里香', artist: '周杰伦' },
      { id: '78', name: '晴天', artist: '周杰伦' },
      { id: '79', name: '回到过去', artist: '周杰伦' },
      { id: '80', name: '我不配', artist: '周杰伦' },
      { id: '81', name: '夜曲', artist: '周杰伦' },
      { id: '82', name: '以父之名', artist: '周杰伦' },
      { id: '83', name: '双截棍', artist: '周杰伦' },
      { id: '84', name: '东风破', artist: '周杰伦' },
      { id: '85', name: '发如雪', artist: '周杰伦' },
      { id: '86', name: '千里之外', artist: '周杰伦' },
      { id: '87', name: '菊花台', artist: '周杰伦' },
      { id: '88', name: '霍元甲', artist: '周杰伦' },
      { id: '89', name: '本草纲目', artist: '周杰伦' },
      { id: '90', name: '听妈妈的话', artist: '周杰伦' },
      { id: '91', name: '夜的第七章', artist: '周杰伦' },
      { id: '92', name: '红尘客栈', artist: '周杰伦' },
      { id: '93', name: '明明就', artist: '周杰伦' },
      { id: '94', name: '手写的从前', artist: '周杰伦' },
      { id: '95', name: '烟花易冷', artist: '周杰伦' },
      { id: '96', name: '兰亭序', artist: '周杰伦' },
      { id: '97', name: '魔术先生', artist: '周杰伦' },
      { id: '98', name: '乔克叔叔', artist: '周杰伦' },
      { id: '99', name: '时光机', artist: '周杰伦' },
      { id: '100', name: '龙战骑士', artist: '周杰伦' },
      { id: '101', name: '给我一首歌的时间', artist: '周杰伦' },
      { id: '102', name: '蛇舞', artist: '周杰伦' },
      { id: '103', name: '花海', artist: '周杰伦' },
      { id: '104', name: '说好不哭', artist: '周杰伦' },
      { id: '105', name: 'Mojito', artist: '周杰伦' },
      { id: '106', name: '最伟大的作品', artist: '周杰伦' },
      { id: '107', name: '等你下课', artist: '周杰伦' },
      { id: '108', name: '不爱我就拉倒', artist: '周杰伦' },
      { id: '109', name: '说好的幸福呢', artist: '周杰伦' },
      { id: '110', name: '稻香', artist: '周杰伦' },
      { id: '111', name: '青花瓷', artist: '周杰伦' },
      { id: '112', name: '告白气球', artist: '周杰伦' },
      { id: '113', name: '七里香', artist: '周杰伦' },
      { id: '114', name: '晴天', artist: '周杰伦' },
      { id: '115', name: '回到过去', artist: '周杰伦' },
      { id: '116', name: '我不配', artist: '周杰伦' },
      { id: '117', name: '夜曲', artist: '周杰伦' },
      { id: '118', name: '以父之名', artist: '周杰伦' },
      { id: '119', name: '双截棍', artist: '周杰伦' },
      { id: '120', name: '东风破', artist: '周杰伦' },
      { id: '121', name: '发如雪', artist: '周杰伦' },
      { id: '122', name: '千里之外', artist: '周杰伦' },
      { id: '123', name: '菊花台', artist: '周杰伦' },
      { id: '124', name: '霍元甲', artist: '周杰伦' },
      { id: '125', name: '本草纲目', artist: '周杰伦' },
      { id: '126', name: '听妈妈的话', artist: '周杰伦' },
      { id: '127', name: '夜的第七章', artist: '周杰伦' },
      { id: '128', name: '红尘客栈', artist: '周杰伦' },
      { id: '129', name: '明明就', artist: '周杰伦' },
      { id: '130', name: '手写的从前', artist: '周杰伦' },
      { id: '131', name: '烟花易冷', artist: '周杰伦' },
      { id: '132', name: '兰亭序', artist: '周杰伦' },
      { id: '133', name: '魔术先生', artist: '周杰伦' },
      { id: '134', name: '乔克叔叔', artist: '周杰伦' },
      { id: '135', name: '时光机', artist: '周杰伦' },
      { id: '136', name: '龙战骑士', artist: '周杰伦' },
      { id: '137', name: '给我一首歌的时间', artist: '周杰伦' },
      { id: '138', name: '蛇舞', artist: '周杰伦' },
      { id: '139', name: '花海', artist: '周杰伦' },
      { id: '140', name: '说好不哭', artist: '周杰伦' },
      { id: '141', name: 'Mojito', artist: '周杰伦' },
      { id: '142', name: '最伟大的作品', artist: '周杰伦' },
      { id: '143', name: '等你下课', artist: '周杰伦' },
      { id: '144', name: '不爱我就拉倒', artist: '周杰伦' },
      { id: '145', name: '说好的幸福呢', artist: '周杰伦' },
      { id: '146', name: '稻香', artist: '周杰伦' },
      { id: '147', name: '青花瓷', artist: '周杰伦' },
      { id: '148', name: '告白气球', artist: '周杰伦' },
      { id: '149', name: '七里香', artist: '周杰伦' },
      { id: '150', name: '晴天', artist: '周杰伦' },
      { id: '151', name: '回到过去', artist: '周杰伦' },
      { id: '152', name: '我不配', artist: '周杰伦' },
      { id: '153', name: '夜曲', artist: '周杰伦' },
      { id: '154', name: '以父之名', artist: '周杰伦' },
      { id: '155', name: '双截棍', artist: '周杰伦' },
      { id: '156', name: '东风破', artist: '周杰伦' },
      { id: '157', name: '发如雪', artist: '周杰伦' },
      { id: '158', name: '千里之外', artist: '周杰伦' },
      { id: '159', name: '菊花台', artist: '周杰伦' },
      { id: '160', name: '霍元甲', artist: '周杰伦' },
      { id: '161', name: '本草纲目', artist: '周杰伦' },
      { id: '162', name: '听妈妈的话', artist: '周杰伦' },
      { id: '163', name: '夜的第七章', artist: '周杰伦' },
      { id: '164', name: '红尘客栈', artist: '周杰伦' },
      { id: '165', name: '明明就', artist: '周杰伦' },
      { id: '166', name: '手写的从前', artist: '周杰伦' },
      { id: '167', name: '烟花易冷', artist: '周杰伦' },
      { id: '168', name: '兰亭序', artist: '周杰伦' },
      { id: '169', name: '魔术先生', artist: '周杰伦' },
      { id: '170', name: '乔克叔叔', artist: '周杰伦' },
      { id: '171', name: '时光机', artist: '周杰伦' },
      { id: '172', name: '龙战骑士', artist: '周杰伦' },
      { id: '173', name: '给我一首歌的时间', artist: '周杰伦' },
      { id: '174', name: '蛇舞', artist: '周杰伦' },
      { id: '175', name: '花海', artist: '周杰伦' },
      { id: '176', name: '说好不哭', artist: '周杰伦' },
      { id: '177', name: 'Mojito', artist: '周杰伦' },
      { id: '178', name: '最伟大的作品', artist: '周杰伦' },
      { id: '179', name: '等你下课', artist: '周杰伦' },
      { id: '180', name: '不爱我就拉倒', artist: '周杰伦' },
      { id: '181', name: '说好的幸福呢', artist: '周杰伦' },
      { id: '182', name: '稻香', artist: '周杰伦' },
      { id: '183', name: '青花瓷', artist: '周杰伦' },
      { id: '184', name: '告白气球', artist: '周杰伦' },
      { id: '185', name: '七里香', artist: '周杰伦' },
      { id: '186', name: '晴天', artist: '周杰伦' },
      { id: '187', name: '回到过去', artist: '周杰伦' },
      { id: '188', name: '我不配', artist: '周杰伦' },
      { id: '189', name: '夜曲', artist: '周杰伦' },
      { id: '190', name: '以父之名', artist: '周杰伦' },
      { id: '191', name: '双截棍', artist: '周杰伦' },
      { id: '192', name: '东风破', artist: '周杰伦' },
      { id: '193', name: '发如雪', artist: '周杰伦' },
      { id: '194', name: '千里之外', artist: '周杰伦' },
      { id: '195', name: '菊花台', artist: '周杰伦' },
      { id: '196', name: '霍元甲', artist: '周杰伦' },
      { id: '197', name: '本草纲目', artist: '周杰伦' },
      { id: '198', name: '听妈妈的话', artist: '周杰伦' },
      { id: '199', name: '夜的第七章', artist: '周杰伦' },
      { id: '200', name: '红尘客栈', artist: '周杰伦' },
      { id: '201', name: '明明就', artist: '周杰伦' },
      { id: '202', name: '手写的从前', artist: '周杰伦' },
      { id: '203', name: '烟花易冷', artist: '周杰伦' },
      { id: '204', name: '兰亭序', artist: '周杰伦' },
      { id: '205', name: '魔术先生', artist: '周杰伦' },
      { id: '206', name: '乔克叔叔', artist: '周杰伦' },
      { id: '207', name: '时光机', artist: '周杰伦' },
      { id: '208', name: '龙战骑士', artist: '周杰伦' },
      { id: '209', name: '给我一首歌的时间', artist: '周杰伦' },
      { id: '210', name: '蛇舞', artist: '周杰伦' },
      { id: '211', name: '花海', artist: '周杰伦' },
      { id: '212', name: '说好不哭', artist: '周杰伦' },
      { id: '213', name: 'Mojito', artist: '周杰伦' },
      { id: '214', name: '最伟大的作品', artist: '周杰伦' },
      { id: '215', name: '等你下课', artist: '周杰伦' },
      { id: '216', name: '不爱我就拉倒', artist: '周杰伦' },
      { id: '217', name: '说好的幸福呢', artist: '周杰伦' },
      { id: '218', name: '稻香', artist: '周杰伦' },
      { id: '219', name: '青花瓷', artist: '周杰伦' },
      { id: '220', name: '告白气球', artist: '周杰伦' },
      { id: '221', name: '七里香', artist: '周杰伦' },
      { id: '222', name: '晴天', artist: '周杰伦' },
      { id: '223', name: '回到过去', artist: '周杰伦' },
      { id: '224', name: '我不配', artist: '周杰伦' },
      { id: '225', name: '夜曲', artist: '周杰伦' },
      { id: '226', name: '以父之名', artist: '周杰伦' },
      { id: '227', name: '双截棍', artist: '周杰伦' },
      { id: '228', name: '东风破', artist: '周杰伦' },
      { id: '229', name: '发如雪', artist: '周杰伦' },
      { id: '230', name: '千里之外', artist: '周杰伦' },
      { id: '231', name: '菊花台', artist: '周杰伦' },
      { id: '232', name: '霍元甲', artist: '周杰伦' },
      { id: '233', name: '本草纲目', artist: '周杰伦' },
      { id: '234', name: '听妈妈的话', artist: '周杰伦' },
      { id: '235', name: '夜的第七章', artist: '周杰伦' },
      { id: '236', name: '红尘客栈', artist: '周杰伦' },
      { id: '237', name: '明明就', artist: '周杰伦' },
      { id: '238', name: '手写的从前', artist: '周杰伦' }
    ]

    this.setData({
      songLibrary: songLibrary,
      filteredSongs: songLibrary,
      displaySongs: songLibrary
    })
  },

  // 搜索输入
  onSearchInput(e) {
    const searchText = e.detail.value
    this.setData({
      searchText: searchText
    })
    this.filterSongs(searchText)
  },

  // 搜索确认
  onSearchConfirm() {
    this.filterSongs(this.data.searchText)
  },

  // 过滤歌曲
  filterSongs(searchText) {
    if (!searchText || searchText.trim() === '') {
      this.setData({
        filteredSongs: this.data.songLibrary,
        displaySongs: this.data.songLibrary
      })
      return
    }

    const search = searchText.toLowerCase()
    const filtered = this.data.songLibrary.filter(song =>
      song.name.toLowerCase().includes(search) ||
      song.artist.toLowerCase().includes(search)
    )

    this.setData({
      filteredSongs: filtered,
      displaySongs: filtered
    })
  },

  // 显示点歌弹窗
  showPointModal(e) {
    const { song } = e.currentTarget.dataset

    if (this.data.hasOrderedSong) {
      util.showToast('本场演出您已经点过歌了')
      return
    }

    this.setData({
      showPointModal: true,
      selectedSong: song,
      pointMessage: ''
    })
  },

  // 隐藏点歌弹窗
  hidePointModal() {
    this.setData({
      showPointModal: false,
      selectedSong: {},
      pointMessage: ''
    })
  },

  // 寄语输入
  onMessageInput(e) {
    this.setData({
      pointMessage: e.detail.value
    })
  },

  // 确认点歌
  confirmPointSong() {
    const { playlistId, selectedSong, pointMessage, currentUser, performanceId } = this.data

    if (!playlistId) {
      util.showToast('参数错误')
      return
    }

    if (!currentUser) {
      util.showToast('请先登录')
      return
    }

    if (!performanceId) {
      util.showToast('当前没有正在进行的演出')
      return
    }

    // 创建点歌记录
    db.PointRecordDB.createPointRecord({
      performanceId: performanceId,
      userId: currentUser.id,
      songId: selectedSong.id,
      songName: selectedSong.name,
      songArtist: selectedSong.artist,
      message: pointMessage,
      priority: 1,
      status: 'pending'
    })

    // 获取演唱列表
    let singingList = data.getSingingList()

    // 创建新点歌
    const newSong = {
      id: util.generateId(),
      name: selectedSong.name,
      artist: selectedSong.artist,
      message: pointMessage,
      priority: 1,
      addTime: Date.now()
    }

    // 添加到列表
    singingList.push(newSong)
    data.setSingingList(singingList)

    // 更新演出的演唱列表
    db.PerformanceDB.updatePerformance(performanceId, {
      singingList: singingList
    })

    util.showToast('点歌成功！')
    this.hidePointModal()

    // 标记已点歌，返回上一页
    const pages = getCurrentPages()
    if (pages.length > 1) {
      const prevPage = pages[pages.length - 2]
      if (prevPage) {
        prevPage.setData({
          hasOrderedSong: true
        })
      }
      wx.navigateBack()
    }
  }
})
