// 云数据库操作封装
const cloud = require('wx-server-sdk')

// 初始化云环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 数据库集合名称
const COLLECTIONS = {
  USERS: 'users',
  USER_LIBRARIES: 'userLibraries',
  USER_PLAYLISTS: 'userPlaylists',
  PERFORMANCES: 'performances',
  POINT_RECORDS: 'pointRecords'
}

// 用户相关操作
const UserDB = {
  // 获取用户
  async getUserById(id) {
    const res = await db.collection(COLLECTIONS.USERS).doc(id).get()
    return res.data
  },

  // 通过openid获取用户
  async getUserByOpenid(openid) {
    const res = await db.collection(COLLECTIONS.USERS)
      .where({ openid })
      .get()
    return res.data[0] || null
  },

  // 创建用户
  async createUser(userData) {
    const user = {
      openid: userData.openid,
      nickName: userData.nickName || '微信用户',
      avatarUrl: userData.avatarUrl || '',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
    const res = await db.collection(COLLECTIONS.USERS).add({ data: user })
    return { _id: res._id, ...user }
  },

  // 更新用户
  async updateUser(id, updates) {
    await db.collection(COLLECTIONS.USERS).doc(id).update({
      data: {
        ...updates,
        updatedAt: db.serverDate()
      }
    })
    return this.getUserById(id)
  }
}

// 曲库相关操作
const LibraryDB = {
  // 获取用户曲库
  async getLibrary(userId) {
    const res = await db.collection(COLLECTIONS.USER_LIBRARIES)
      .where({ userId })
      .get()
    return res.data[0] || null
  },

  // 创建曲库
  async createLibrary(userId) {
    const library = {
      userId,
      songs: [],
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
    const res = await db.collection(COLLECTIONS.USER_LIBRARIES).add({ data: library })
    return { _id: res._id, ...library }
  },

  // 添加歌曲到曲库
  async addSong(userId, songData) {
    const song = {
      _id: generateId(),
      name: songData.name,
      artist: songData.artist,
      createdAt: Date.now()
    }

    const library = await this.getLibrary(userId)
    if (library) {
      await db.collection(COLLECTIONS.USER_LIBRARIES).doc(library._id).update({
        data: {
          songs: _.push([song]),
          updatedAt: db.serverDate()
        }
      })
    } else {
      // 创建新曲库并添加歌曲
      await this.createLibrary(userId)
      const newLibrary = await this.getLibrary(userId)
      await db.collection(COLLECTIONS.USER_LIBRARIES).doc(newLibrary._id).update({
        data: {
          songs: [song],
          updatedAt: db.serverDate()
        }
      })
    }
    return song
  },

  // 删除歌曲
  async removeSong(userId, songId) {
    const library = await this.getLibrary(userId)
    if (!library) return false

    const songs = library.songs.filter(s => s._id !== songId)
    await db.collection(COLLECTIONS.USER_LIBRARIES).doc(library._id).update({
      data: {
        songs,
        updatedAt: db.serverDate()
      }
    })
    return true
  },

  // 更新歌曲
  async updateSong(userId, songId, updates) {
    const library = await this.getLibrary(userId)
    if (!library) return false

    const songs = library.songs.map(s => {
      if (s._id === songId) {
        return { ...s, ...updates }
      }
      return s
    })

    await db.collection(COLLECTIONS.USER_LIBRARIES).doc(library._id).update({
      data: {
        songs,
        updatedAt: db.serverDate()
      }
    })
    return true
  }
}

// 歌单相关操作
const PlaylistDB = {
  // 获取用户的歌单列表
  async getUserPlaylists(userId) {
    const res = await db.collection(COLLECTIONS.USER_PLAYLISTS)
      .where({ userId })
      .orderBy('createdAt', 'desc')
      .get()
    return res.data
  },

  // 获取单个歌单
  async getPlaylistById(id) {
    const res = await db.collection(COLLECTIONS.USER_PLAYLISTS).doc(id).get()
    return res.data
  },

  // 创建歌单
  async createPlaylist(userId, name) {
    const playlist = {
      userId,
      name: name || '新歌单',
      songs: [],
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
    const res = await db.collection(COLLECTIONS.USER_PLAYLISTS).add({ data: playlist })
    return { _id: res._id, ...playlist }
  },

  // 删除歌单
  async deletePlaylist(id) {
    await db.collection(COLLECTIONS.USER_PLAYLISTS).doc(id).remove()
    return true
  },

  // 添加歌曲到歌单
  async addSong(playlistId, songData) {
    const song = {
      _id: generateId(),
      name: songData.name,
      artist: songData.artist,
      createdAt: Date.now()
    }

    await db.collection(COLLECTIONS.USER_PLAYLISTS).doc(playlistId).update({
      data: {
        songs: _.push([song]),
        updatedAt: db.serverDate()
      }
    })
    return song
  },

  // 从歌单删除歌曲
  async removeSong(playlistId, songId) {
    const playlist = await this.getPlaylistById(playlistId)
    if (!playlist) return false

    const songs = playlist.songs.filter(s => s._id !== songId)
    await db.collection(COLLECTIONS.USER_PLAYLISTS).doc(playlistId).update({
      data: {
        songs,
        updatedAt: db.serverDate()
      }
    })
    return true
  }
}

// 演出相关操作
const PerformanceDB = {
  // 获取演出
  async getPerformanceById(id) {
    const res = await db.collection(COLLECTIONS.PERFORMANCES).doc(id).get()
    return res.data
  },

  // 获取用户的演出
  async getUserPerformances(userId) {
    const res = await db.collection(COLLECTIONS.PERFORMANCES)
      .where({ userId })
      .orderBy('createdAt', 'desc')
      .get()
    return res.data
  },

  // 创建演出
  async createPerformance(userId, data) {
    const performance = {
      userId,
      title: data.title || '新演出',
      playlistId: data.playlistId,
      status: 'ongoing',
      audienceCount: 0,
      singingList: [],
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
    const res = await db.collection(COLLECTIONS.PERFORMANCES).add({ data: performance })
    return { _id: res._id, ...performance }
  },

  // 结束演出
  async endPerformance(id) {
    await db.collection(COLLECTIONS.PERFORMANCES).doc(id).update({
      data: {
        status: 'ended',
        endTime: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
    return true
  },

  // 更新演唱列表
  async updateSingingList(id, singingList) {
    await db.collection(COLLECTIONS.PERFORMANCES).doc(id).update({
      data: {
        singingList,
        updatedAt: db.serverDate()
      }
    })
    return true
  }
}

// 点歌记录相关操作
const PointRecordDB = {
  // 创建点歌记录
  async createRecord(data) {
    const record = {
      performanceId: data.performanceId,
      userId: data.userId,
      songId: data.songId,
      songName: data.songName,
      songArtist: data.songArtist,
      message: data.message || '',
      priority: data.priority || 1,
      status: 'pending',
      createdAt: db.serverDate()
    }
    const res = await db.collection(COLLECTIONS.POINT_RECORDS).add({ data: record })
    return { _id: res._id, ...record }
  },

  // 获取演出的点歌记录
  async getRecordsByPerformance(performanceId) {
    const res = await db.collection(COLLECTIONS.POINT_RECORDS)
      .where({ performanceId })
      .orderBy('priority', 'desc')
      .orderBy('createdAt', 'asc')
      .get()
    return res.data
  },

  // 获取用户的点歌记录
  async getRecordsByUser(userId) {
    const res = await db.collection(COLLECTIONS.POINT_RECORDS)
      .where({ userId })
      .orderBy('createdAt', 'desc')
      .get()
    return res.data
  },

  // 更新记录状态
  async updateStatus(id, status) {
    await db.collection(COLLECTIONS.POINT_RECORDS).doc(id).update({
      data: { status, updatedAt: db.serverDate() }
    })
    return true
  }
}

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

module.exports = {
  db,
  _,
  COLLECTIONS,
  UserDB,
  LibraryDB,
  PlaylistDB,
  PerformanceDB,
  PointRecordDB
}