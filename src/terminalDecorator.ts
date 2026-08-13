import { Injectable } from '@angular/core'
import { TerminalDecorator, BaseTerminalTabComponent } from 'tabby-terminal'
import { XYZModemService } from './xyzmodem.service'

@Injectable()
export class XYZModemDecorator extends TerminalDecorator {
    constructor (
        public xyzmodem: XYZModemService,
    ) {
        super()
    }

    attach (_tab: BaseTerminalTabComponent): void {
        // Here we could intercept auto-detect sequences (like Zmodem does)
        // For X/Ymodem we just rely on context menu buttons for now.
    }
}
