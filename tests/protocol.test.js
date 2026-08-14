const test = require('node:test')
const assert = require('node:assert/strict')
const { Subject } = require('rxjs')
const { XModemTransfer, crc16 } = require('../.test-dist/protocol')

test('CRC-16/CCITT matches the standard vector', () => {
    assert.equal(crc16(Buffer.from('123456789')), 0x31c3)
})

test('XMODEM sends binary data and completes after ACK/EOT', async () => {
    const input = new Subject()
    const packets = []
    const transfer = new XModemTransfer(
        false,
        Buffer.from([0x00, 0xff, 0x5a]),
        'firmware.bin',
        input,
        data => {
            packets.push(Buffer.from(data))
            setImmediate(() => input.next(Buffer.from([0x06])))
        },
        () => undefined,
    )
    const running = transfer.start()
    input.next(Buffer.from([0x43]))
    await running
    assert.equal(packets[0][0], 0x01)
    assert.deepEqual([...packets[0].subarray(3, 6)], [0x00, 0xff, 0x5a])
    assert.equal(packets.at(-1)[0], 0x04)
})
