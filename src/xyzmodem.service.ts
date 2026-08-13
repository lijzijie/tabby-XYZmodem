import { Injectable } from '@angular/core'
import { Logger, LogService, PlatformService } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { BaseSession } from 'tabby-terminal'
import { XModemTransfer, TransferProgress } from './protocol'
import { ReplaySubject, firstValueFrom } from 'rxjs'
import { filter } from 'rxjs/operators'

@Injectable({ providedIn: 'root' })
export class XYZModemService {
    private logger: Logger

    constructor (
        private platform: PlatformService,
        log: LogService
    ) {
        this.logger = log.create('xyzmodem')
    }

    async sendFile (tab: BaseTerminalTabComponent, protocol: 'xmodem' | 'ymodem' | 'zmodem') {
        this.logger.info(`Sending file via ${protocol}`)

        // 1. Resolve actual terminal tab (may be wrapped in SplitTabComponent)
        const realTab = this.resolveTerminalTab(tab)
        if (!realTab) {
            this.platform.showMessageBox({ type: 'error', message: 'Could not find an active terminal tab.', buttons: ['OK'] })
            return
        }

        // 2. Get session
        const session = await this.getSession(realTab)
        if (!session) {
            this.platform.showMessageBox({ type: 'error', message: 'No active serial session. Please connect first.', buttons: ['OK'] })
            return
        }

        // 3. Subscribe BEFORE file dialog to buffer incoming handshake bytes
        const rxReplay = new ReplaySubject<Buffer>(65536)
        const preSub = session.binaryOutput$.subscribe(buf => rxReplay.next(buf))

        try {
            const transfers = await this.platform.startUpload({ multiple: false })
            if (!transfers || transfers.length === 0) {
                return
            }
            const file = transfers[0]
            const buffer = await file.readAll()
            const filename = file.getName()

            // Write start message to terminal display (not to serial port)
            realTab.write(`\r\n\x1b[32m📤 Starting ${protocol.toUpperCase()} transfer: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)\x1b[0m\r\n`)

            const onProgress = (p: TransferProgress) => {
                const pct = Math.round(p.sentBytes / p.totalBytes * 100)
                const kbSent = (p.sentBytes / 1024).toFixed(1)
                const kbTotal = (p.totalBytes / 1024).toFixed(1)
                const kbps = (p.speedBps / 1024).toFixed(1)
                // ASCII progress bar
                const barWidth = 24
                const filled = Math.round(barWidth * p.sentBytes / p.totalBytes)
                const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled)
                // \r goes to start of line, \x1b[K clears to end, then write fresh progress
                const line = `\r\x1b[K\x1b[36m ${protocol.toUpperCase()} │${bar}│ ${String(pct).padStart(3)}%  ${kbSent}/${kbTotal} KB  ${kbps} KB/s  ${p.blocksSent}/${p.blocksTotal} blocks\x1b[0m`
                realTab.write(line)
            }

            const xfer = new XModemTransfer(
                protocol === 'ymodem',
                buffer,
                filename,
                rxReplay,
                (data: Buffer) => session.write(data),
                (msg: string) => this.logger.info(msg),
                onProgress
            )

            await xfer.start()

            realTab.write(`\r\n\x1b[32m✅ ${protocol.toUpperCase()} transfer complete: ${filename}\x1b[0m\r\n`)

        } catch (e: any) {
            realTab.write(`\r\n\x1b[31m❌ ${protocol.toUpperCase()} transfer failed: ${e.message}\x1b[0m\r\n`)
            this.platform.showMessageBox({ type: 'error', message: 'Transfer failed: ' + e.message, buttons: ['OK'] })
        } finally {
            preSub.unsubscribe()
            rxReplay.complete()
        }
    }

    async receiveFile (_tab: BaseTerminalTabComponent, protocol: 'xmodem' | 'ymodem' | 'zmodem') {
        this.logger.info(`Receiving file via ${protocol}`)
        this.logger.warn(`${protocol} receive not fully implemented yet`)
    }

    /**
     * Tabby wraps terminal tabs inside a SplitTabComponent.
     * Walk down to find the focused BaseTerminalTabComponent.
     */
    private resolveTerminalTab (tab: any): BaseTerminalTabComponent | null {
        if (typeof tab.getFocusedTab === 'function') {
            const focused = tab.getFocusedTab()
            if (focused) return this.resolveTerminalTab(focused)
            const all: any[] = typeof tab.getAllTabs === 'function' ? tab.getAllTabs() : []
            for (const child of all) {
                const resolved = this.resolveTerminalTab(child)
                if (resolved) return resolved
            }
            return null
        }
        if ('session' in tab) {
            return tab as BaseTerminalTabComponent
        }
        return null
    }

    private async getSession (tab: BaseTerminalTabComponent): Promise<BaseSession | null> {
        if (tab.session) return tab.session
        try {
            return await firstValueFrom(
                tab.sessionChanged$.pipe(filter((s): s is BaseSession => s !== null)),
                { defaultValue: null }
            )
        } catch (_e) {
            return null
        }
    }
}
