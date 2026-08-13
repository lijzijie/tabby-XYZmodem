import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from 'tabby-core'

@Injectable()
export class XYZModemHotkeyProvider extends HotkeyProvider {
    async provide (): Promise<HotkeyDescription[]> {
        return [
            {
                id: 'xyzmodem-send',
                name: 'Send file via XMODEM/YMODEM',
            },
            {
                id: 'xyzmodem-receive',
                name: 'Receive file via XMODEM/YMODEM',
            }
        ]
    }
}
