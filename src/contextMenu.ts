import { Injectable } from '@angular/core'
import { MenuItemOptions } from 'tabby-core'
import { BaseTerminalTabComponent, TerminalContextMenuItemProvider } from 'tabby-terminal'
import { XYZModemService } from './xyzmodem.service'

@Injectable()
export class XYZModemContextMenuProvider extends TerminalContextMenuItemProvider {
    weight = 10

    constructor (
        private xyzmodem: XYZModemService,
    ) {
        super()
    }

    async getItems (tab: BaseTerminalTabComponent): Promise<MenuItemOptions[]> {
        return [
            {
                label: 'Send file (XMODEM)',
                click: () => {
                    this.xyzmodem.sendFile(tab, 'xmodem')
                },
            },
            {
                label: 'Receive file (XMODEM)',
                click: () => {
                    this.xyzmodem.receiveFile(tab, 'xmodem')
                },
            },
            {
                label: 'Send file (YMODEM)',
                click: () => {
                    this.xyzmodem.sendFile(tab, 'ymodem')
                },
            },
            {
                label: 'Receive file (YMODEM)',
                click: () => {
                    this.xyzmodem.receiveFile(tab, 'ymodem')
                },
            }
        ]
    }
}
