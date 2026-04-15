// 数据库管理模块
const util = require('./util.js')

// 模拟数据库
const DB = {
  // 用户集合
  users: [
    {
      id: '1',
      openid: 'o123456',
      nickname: '周杰伦',
      avatar: '/images/avatar.png',
      isSinger: true,
      phone: '',
      wechat: '',
      createdAt: new Date()
    }
  ],

  // 用户曲库集合
  userLibraries: [
    {
      id: '1',
      userId: '1',
      songs: []
    }
  ],

  // 用户歌单集合
  userPlaylists: [
    {
      id: '1',
      userId: '1',
      name: '周杰伦精选',
      songs: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  // 演出（演唱）集合
  performances: [
    {
      id: '1',
      singerId: '1',
      title: '周杰伦演唱会',
      startTime: new Date(),
      endTime: null,
      status: 'ongoing', // ongoing | ended
      playlistId: '1',
      playlist: null,
      singingList: [],
      audienceCount: 0,
      createdAt: new Date()
    }
  ],

  // 点歌记录集合
  pointRecords: [
    {
      id: '1',
      performanceId: '1',
      userId: '2',
      songId: '1',
      songName: '七里香',
      songArtist: '周杰伦',
      message: '周杰伦加油！',
      priority: 1,
      status: 'pending', // pending | sung | canceled
      createdAt: new Date()
    }
  ]
}

// 用户数据操作
const UserDB = {
  // 获取用户
  getUserById(id) {
    return DB.users.find(user => user.id === id) || null
  },

  getUserByOpenid(openid) {
    return DB.users.find(user => user.openid === openid) || null
  },

  // 创建用户
  createUser(userData) {
    const user = {
      id: util.generateId(),
      openid: userData.openid,
      nickname: userData.nickname,
      avatar: userData.avatar,
      isSinger: userData.isSinger || false,
      phone: '',
      wechat: '',
      createdAt: new Date()
    }
    DB.users.push(user)

    // 为新用户创建曲库和歌单
    UserLibraryDB.createUserLibrary(user.id)
    UserPlaylistDB.createUserPlaylist(user.id)

    return user
  },

  // 更新用户
  updateUser(id, updates) {
    const userIndex = DB.users.findIndex(user => user.id === id)
    if (userIndex !== -1) {
      DB.users[userIndex] = {
        ...DB.users[userIndex],
        ...updates,
        updatedAt: new Date()
      }
      return DB.users[userIndex]
    }
    return null
  },

  // 删除用户
  deleteUser(id) {
    // 删除用户相关数据
    UserLibraryDB.deleteUserLibrary(id)
    UserPlaylistDB.deleteUserPlaylists(id)
    PointRecordDB.deleteUserPointRecords(id)

    DB.users = DB.users.filter(user => user.id !== id)
  }
}

// 用户曲库操作
const UserLibraryDB = {
  getUserLibrary(userId) {
    return DB.userLibraries.find(library => library.userId === userId) || null
  },

  createUserLibrary(userId) {
    const library = {
      id: util.generateId(),
      userId: userId,
      songs: []
    }
    DB.userLibraries.push(library)
    return library
  },

  deleteUserLibrary(userId) {
    DB.userLibraries = DB.userLibraries.filter(library => library.userId !== userId)
  },

  addSongToLibrary(userId, songData) {
    const library = this.getUserLibrary(userId)
    if (library) {
      const song = {
        id: util.generateId(),
        ...songData
      }
      library.songs.push(song)
      return song
    }
    return null
  },

  removeSongFromLibrary(userId, songId) {
    const library = this.getUserLibrary(userId)
    if (library) {
      library.songs = library.songs.filter(song => song.id !== songId)
    }
  },

  getLibrarySongs(userId) {
    const library = this.getUserLibrary(userId)
    return library ? library.songs : []
  },

  // 更新曲库歌曲顺序
  updateLibrarySongs(userId, songs) {
    const library = this.getUserLibrary(userId)
    if (library) {
      library.songs = songs
      return true
    }
    return false
  },

  // 更新歌曲信息
  updateSong(userId, songId, updates) {
    const library = this.getUserLibrary(userId)
    if (library) {
      const song = library.songs.find(s => s.id === songId)
      if (song) {
        Object.assign(song, updates)
        return true
      }
    }
    return false
  }
}

// 用户歌单操作
const UserPlaylistDB = {
  getUserPlaylists(userId) {
    return DB.userPlaylists.filter(playlist => playlist.userId === userId)
  },

  getUserPlaylistById(id) {
    return DB.userPlaylists.find(playlist => playlist.id === id) || null
  },

  createUserPlaylist(userId, name = '新歌单') {
    const playlist = {
      id: util.generateId(),
      userId: userId,
      name: name,
      songs: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    DB.userPlaylists.push(playlist)
    return playlist
  },

  deleteUserPlaylists(userId) {
    DB.userPlaylists = DB.userPlaylists.filter(playlist => playlist.userId !== userId)
  },

  updateUserPlaylist(id, updates) {
    const playlistIndex = DB.userPlaylists.findIndex(playlist => playlist.id === id)
    if (playlistIndex !== -1) {
      DB.userPlaylists[playlistIndex] = {
        ...DB.userPlaylists[playlistIndex],
        ...updates,
        updatedAt: new Date()
      }
      return DB.userPlaylists[playlistIndex]
    }
    return null
  },

  addSongToPlaylist(id, songData) {
    const playlist = this.getUserPlaylistById(id)
    if (playlist) {
      const song = {
        id: util.generateId(),
        ...songData
      }
      playlist.songs.push(song)
      playlist.updatedAt = new Date()
      return song
    }
    return null
  },

  removeSongFromPlaylist(id, songId) {
    const playlist = this.getUserPlaylistById(id)
    if (playlist) {
      playlist.songs = playlist.songs.filter(song => song.id !== songId)
      playlist.updatedAt = new Date()
    }
  },

  getPlaylistSongs(id) {
    const playlist = this.getUserPlaylistById(id)
    return playlist ? playlist.songs : []
  }
}

// 演出操作
const PerformanceDB = {
  getPerformanceById(id) {
    return DB.performances.find(perf => perf.id === id) || null
  },

  getPerformancesBySingerId(singerId) {
    return DB.performances.filter(perf => perf.singerId === singerId)
  },

  getOngoingPerformances() {
    return DB.performances.filter(perf => perf.status === 'ongoing')
  },

  createPerformance(performanceData) {
    const performance = {
      id: util.generateId(),
      singerId: performanceData.singerId,
      title: performanceData.title || '新演出',
      startTime: new Date(),
      endTime: null,
      status: 'ongoing',
      playlistId: performanceData.playlistId,
      playlist: null,
      singingList: performanceData.singingList || [],
      audienceCount: 0,
      createdAt: new Date()
    }
    DB.performances.push(performance)
    return performance
  },

  updatePerformance(id, updates) {
    const performanceIndex = DB.performances.findIndex(perf => perf.id === id)
    if (performanceIndex !== -1) {
      DB.performances[performanceIndex] = {
        ...DB.performances[performanceIndex],
        ...updates
      }
      return DB.performances[performanceIndex]
    }
    return null
  },

  endPerformance(id) {
    return this.updatePerformance(id, {
      status: 'ended',
      endTime: new Date()
    })
  },

  incrementAudienceCount(id) {
    const performance = this.getPerformanceById(id)
    if (performance) {
      performance.audienceCount++
    }
  },

  decrementAudienceCount(id) {
    const performance = this.getPerformanceById(id)
    if (performance && performance.audienceCount > 0) {
      performance.audienceCount--
    }
  },

  updateSingingList(id, singingList) {
    return this.updatePerformance(id, {
      singingList: singingList
    })
  }
}

// 点歌记录操作
const PointRecordDB = {
  getPointRecordsByPerformanceId(performanceId) {
    return DB.pointRecords.filter(record => record.performanceId === performanceId)
  },

  getPointRecordsByUserId(userId) {
    return DB.pointRecords.filter(record => record.userId === userId)
  },

  createPointRecord(recordData) {
    const record = {
      id: util.generateId(),
      performanceId: recordData.performanceId,
      userId: recordData.userId,
      songId: recordData.songId,
      songName: recordData.songName,
      songArtist: recordData.songArtist,
      message: recordData.message || '',
      priority: recordData.priority || 1,
      status: 'pending',
      createdAt: new Date()
    }
    DB.pointRecords.push(record)
    return record
  },

  updatePointRecord(id, updates) {
    const recordIndex = DB.pointRecords.findIndex(record => record.id === id)
    if (recordIndex !== -1) {
      DB.pointRecords[recordIndex] = {
        ...DB.pointRecords[recordIndex],
        ...updates
      }
      return DB.pointRecords[recordIndex]
    }
    return null
  },

  deleteUserPointRecords(userId) {
    DB.pointRecords = DB.pointRecords.filter(record => record.userId !== userId)
  }
}

module.exports = {
  UserDB,
  UserLibraryDB,
  UserPlaylistDB,
  PerformanceDB,
  PointRecordDB
}
