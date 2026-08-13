import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import TabbyCoreModule, { HotkeyProvider, TabContextMenuItemProvider } from 'tabby-core'
import { TerminalDecorator } from 'tabby-terminal'

import { XYZModemDecorator } from './terminalDecorator'
import { XYZModemHotkeyProvider } from './hotkeyProvider'
import { XYZModemContextMenuProvider } from './contextMenu'

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TabbyCoreModule,
    ],
    providers: [
        { provide: TabContextMenuItemProvider, useClass: XYZModemContextMenuProvider, multi: true },
        { provide: HotkeyProvider, useClass: XYZModemHotkeyProvider, multi: true },
        { provide: TerminalDecorator, useClass: XYZModemDecorator, multi: true },
    ],
})
export default class XYZModemModule { }
