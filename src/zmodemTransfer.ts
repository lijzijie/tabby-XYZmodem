import * as Zmodem from 'zmodem.js'

export interface ZmodemTransferOptions {
    input$: { subscribe: (next: (data: Buffer) => void) => { unsubscribe: () => void } }
    write: (data: Buffer) => void
    toTerminal?: (data: Buffer) => void
    log: (message: string) => void
    onProgress?: (sent: number, total: number, name: string) => void
    onReceive?: (name: string, size: number, data: Buffer) => Promise<void>
}

/** Adapter around zmodem.js for Taby's binary serial streams. */
export class ZmodemTransfer {
    private sentry: any
    private subscription: { unsubscribe: () => void } | undefined

    constructor (private readonly options: ZmodemTransferOptions) { }

    async send (buffer: Buffer, filename: string): Promise<void> {
        const session = await this.openSession('send')
        try {
            const transfer = await session.send_offer({
                name: filename,
                size: buffer.length,
                mode: 0o100644,
            })
            if (!transfer) throw new Error('ZMODEM peer rejected the file')

            const chunkSize = 8192
            let offset = 0
            while (offset < buffer.length) {
                const end = Math.min(offset + chunkSize, buffer.length)
                transfer.send(buffer.subarray(offset, end))
                offset = end
                this.options.onProgress?.(offset, buffer.length, filename)
            }
            await transfer.end()
            await session.close()
        } finally {
            this.stop()
        }
    }

    async receive (): Promise<void> {
        const session = await this.openSession('receive')
        await new Promise<void>((resolve, reject) => {
            session.on('offer', (offer: any) => {
                const details = offer.get_details()
                const chunks: Buffer[] = []
                offer.on('input', (data: Buffer) => chunks.push(Buffer.from(data)))
                offer.accept().then(async () => {
                    await this.options.onReceive?.(details.name, Number(details.size) || 0, Buffer.concat(chunks))
                }).catch(reject)
            })
            session.on('session_end', () => resolve())
            session.start()
        }).finally(() => this.stop())
    }

    private openSession (expectedType: 'send' | 'receive'): Promise<any> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.stop()
                reject(new Error('Timed out waiting for the ZMODEM peer'))
            }, 30000)
            this.sentry = new Zmodem.Sentry({
                to_terminal: (data: Uint8Array) => this.options.toTerminal?.(Buffer.from(data)),
                sender: (data: Uint8Array) => this.options.write(Buffer.from(data)),
                on_detect: (detection: any) => {
                    const session = detection.confirm()
                    if (session.type !== expectedType) {
                        clearTimeout(timer)
                        session.abort?.()
                        reject(new Error(`Unexpected ZMODEM session type: ${session.type}`))
                        return
                    }
                    clearTimeout(timer)
                    resolve(session)
                },
                on_retract: () => undefined,
            })
            this.subscription = this.options.input$.subscribe((data: Buffer) => this.sentry.consume(data))
        })
    }

    private stop (): void {
        this.subscription?.unsubscribe()
        this.subscription = undefined
        this.sentry = undefined
    }
}
