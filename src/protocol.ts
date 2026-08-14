import { Observable, Subscription } from 'rxjs'

const SOH = 0x01
const EOT = 0x04
const ACK = 0x06
const NAK = 0x15
const CAN = 0x18
const CRC_C = 0x43 // 'C'

// Simple CRC16 CCITT
export function crc16(buffer: Buffer): number {
    let crc = 0;
    for (let i = 0; i < buffer.length; i++) {
        crc ^= buffer[i] << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
    }
    return crc & 0xFFFF;
}

export interface TransferProgress {
    filename: string;
    sentBytes: number;
    totalBytes: number;
    blocksTotal: number;
    blocksSent: number;
    speedBps: number;  // bytes per second
}

export class XModemTransfer {
    private isYmodem: boolean;
    private fileBuffer: Buffer;
    private filename: string;
    private input$: Observable<Buffer>;
    private write: (data: Buffer) => void;
    private log: (msg: string) => void;
    private onProgress?: (p: TransferProgress) => void;

    private rxSub?: Subscription;
    private dataQueue: number[] = [];
    private waiter?: (val: number) => void;

    constructor(
        isYmodem: boolean,
        fileBuffer: Buffer,
        filename: string,
        input$: Observable<Buffer>,
        write: (data: Buffer) => void,
        log: (msg: string) => void,
        onProgress?: (p: TransferProgress) => void
    ) {
        this.isYmodem = isYmodem
        this.fileBuffer = Buffer.from(fileBuffer)  // ensure real Node.js Buffer with .copy()
        this.filename = filename
        this.input$ = input$
        this.write = write
        this.log = log
        this.onProgress = onProgress
    }

    private async readByte(timeoutMs = 10000): Promise<number | null> {
        if (this.dataQueue.length > 0) {
            return this.dataQueue.shift()!
        }
        return new Promise((resolve) => {
            let timer = setTimeout(() => {
                this.waiter = undefined;
                resolve(null)
            }, timeoutMs);
            
            this.waiter = (val: number) => {
                clearTimeout(timer)
                this.waiter = undefined
                resolve(val)
            }
        })
    }

    private async waitChar(chars: number[], timeoutMs = 10000): Promise<number | null> {
        while (true) {
            const b = await this.readByte(timeoutMs)
            if (b === null) return null // timeout
            if (chars.includes(b)) {
                return b
            }
        }
    }

    private sendBlock(blockNum: number, data: Uint8Array, useCrc: boolean) {
        const header = Buffer.from([SOH, blockNum & 0xFF, (0xFF - (blockNum & 0xFF)) & 0xFF])
        const block = Buffer.alloc(128, 0x1A) // Fill with SUB (padding)
        const dataBuf = Buffer.from(data)     // ensure real Buffer
        dataBuf.copy(block, 0)
        
        let tail: Buffer
        if (useCrc) {
            const crc = crc16(block)
            tail = Buffer.from([(crc >> 8) & 0xFF, crc & 0xFF])
        } else {
            let sum = 0
            for (let i = 0; i < block.length; i++) sum = (sum + block[i]) % 256
            tail = Buffer.from([sum])
        }
        
        const packet = Buffer.concat([header, block, tail])
        this.write(packet)
    }

    public async start() {
        console.log('[XYZMODEM] start() called, subscribing to binaryOutput$')
        this.rxSub = this.input$.subscribe(buf => {
            console.log('[XYZMODEM] RX bytes:', Array.from(buf).map(b => '0x' + b.toString(16)).join(' '))
            for (let i = 0; i < buf.length; i++) {
                if (this.waiter) {
                    this.waiter(buf[i])
                } else {
                    this.dataQueue.push(buf[i])
                }
            }
        })

        try {
            await this.runProtocol()
        } catch (err: any) {
            this.log('Transfer failed: ' + err.message)
            console.log('[XYZMODEM] Transfer failed:', err.message)
            // send cancel
            this.write(Buffer.from([CAN, CAN]))
            throw err
        } finally {
            this.rxSub.unsubscribe()
        }
    }

    private async runProtocol() {
        console.log('[XYZMODEM] runProtocol() start')
        this.log('Waiting for initial C or NAK...')
        const startChar = await this.waitChar([CRC_C, NAK], 15000)
        if (startChar === null) throw new Error('Timeout waiting for receiver to initiate')
        
        const useCrc = startChar === CRC_C
        this.log('Protocol start char received: ' + startChar + (useCrc ? ' (CRC)' : ' (CSUM)'))

        if (this.isYmodem) {
            // Ymodem Block 0
            const nameBuf = Buffer.from(this.filename + '\0', 'utf8')
            const sizeBuf = Buffer.from(this.fileBuffer.length.toString() + '\0', 'utf8')
            const b0 = Buffer.concat([nameBuf, sizeBuf])
            if (b0.length > 128) throw new Error('Filename too long')
            
            this.sendBlock(0, b0, useCrc)
            const ack1 = await this.waitChar([ACK, NAK, CAN])
            if (ack1 !== ACK) throw new Error('Failed to send Block 0 (YMODEM)')
            
            const startChar2 = await this.waitChar([CRC_C, NAK])
            if (startChar2 === null) throw new Error('Timeout waiting for C after Block 0')
        }

        // Send file blocks
        let offset = 0
        let blockNum = 1
        let retries = 0
        const totalBlocks = Math.ceil(this.fileBuffer.length / 128)
        const startTime = Date.now()

        while (offset < this.fileBuffer.length) {
            const chunk = this.fileBuffer.slice(offset, offset + 128)
            this.sendBlock(blockNum, chunk, useCrc)

            const resp = await this.waitChar([ACK, NAK, CAN], 5000)
            if (resp === ACK) {
                offset += 128
                blockNum++
                retries = 0

                // Report progress on every block for real-time display
                if (this.onProgress) {
                    const elapsed = (Date.now() - startTime) / 1000
                    const sentBytes = Math.min(offset, this.fileBuffer.length)
                    this.onProgress({
                        filename: this.filename,
                        sentBytes,
                        totalBytes: this.fileBuffer.length,
                        blocksTotal: totalBlocks,
                        blocksSent: blockNum - 1,
                        speedBps: elapsed > 0 ? sentBytes / elapsed : 0,
                    })
                }
            } else if (resp === NAK || resp === null) {
                retries++
                this.log('Block ' + blockNum + ' NAK/Timeout. Retry ' + retries)
                if (retries > 5) throw new Error('Too many retries')
            } else if (resp === CAN) {
                throw new Error('Cancelled by receiver')
            }
        }

        // Send EOT
        let eotRetries = 0
        while (eotRetries < 5) {
            this.write(Buffer.from([EOT]))
            const resp = await this.waitChar([ACK, NAK, CAN], 5000)
            if (resp === ACK) break
            eotRetries++
        }

        if (this.isYmodem) {
            // YMODEM end of session: wait for 'C', then send null Block 0 (all zeros = no more files)
            const c = await this.waitChar([CRC_C, NAK], 5000)
            if (c !== null) {
                this.sendBlock(0, Buffer.alloc(128, 0x00), useCrc)  // all-zero null block signals end
                await this.waitChar([ACK], 5000)
            }
        }

        this.log('Transfer complete.')
    }
}
