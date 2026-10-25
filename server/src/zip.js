const zlib = require('node:zlib')

/**
 * Amin #5197: a small zip writer for the admin export and the nightly backup (no extra package on the server).
 * Entries are deflated; names are UTF-8 (flag bit 11), so Persian folder and file names open correctly.
 * add(name, Buffer|string) then toBuffer().
 */
class Zip {
  constructor() {
    this.parts = []
    this.central = []
    this.offset = 0
  }

  add(name, content) {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8')
    const nameBuf = Buffer.from(name, 'utf8')
    const deflated = zlib.deflateRawSync(data)
    const crc = zlib.crc32(data) >>> 0
    const { time, date } = dosTime(new Date())

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // UTF-8 names
    local.writeUInt16LE(8, 8) // deflate
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(deflated.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28)

    const entry = Buffer.alloc(46)
    entry.writeUInt32LE(0x02014b50, 0)
    entry.writeUInt16LE(20, 4) // made by
    entry.writeUInt16LE(20, 6)
    entry.writeUInt16LE(0x0800, 8)
    entry.writeUInt16LE(8, 10)
    entry.writeUInt16LE(time, 12)
    entry.writeUInt16LE(date, 14)
    entry.writeUInt32LE(crc, 16)
    entry.writeUInt32LE(deflated.length, 20)
    entry.writeUInt32LE(data.length, 24)
    entry.writeUInt16LE(nameBuf.length, 28)
    entry.writeUInt32LE(this.offset, 42)

    this.parts.push(local, nameBuf, deflated)
    this.central.push(entry, nameBuf)
    this.offset += local.length + nameBuf.length + deflated.length
  }

  toBuffer() {
    const central = Buffer.concat(this.central)
    const end = Buffer.alloc(22)
    end.writeUInt32LE(0x06054b50, 0)
    const count = this.central.length / 2
    end.writeUInt16LE(count, 8)
    end.writeUInt16LE(count, 10)
    end.writeUInt32LE(central.length, 12)
    end.writeUInt32LE(this.offset, 16)
    return Buffer.concat([...this.parts, central, end])
  }
}

function dosTime(d) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  }
}

module.exports = { Zip }
