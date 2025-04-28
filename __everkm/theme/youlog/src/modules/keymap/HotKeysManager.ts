import {
  EventBindings,
  EventHandler,
  modifiers,
  normalizeEventBindings,
} from './keymap'
import {keyName} from 'w3c-keyname'

export interface IBindingOpts {
  captureInput?: boolean // 允许input时间捕获
}

export class HotKeysSession {
  private bindings: EventBindings
  private removeFn: (() => void) | null = null
  private opts: IBindingOpts | null = null

  constructor(bindings: EventBindings, opts?: IBindingOpts) {
    this.bindings = normalizeEventBindings(bindings)
    opts && (this.opts = opts)
  }

  public get getEventBindings() {
    return this.bindings
  }

  public get options() {
    return this.opts
  }

  public registerRemove(removeFn: () => void) {
    this.removeFn = removeFn
  }

  public addBindings(bindings: EventBindings) {
    const newBindings = normalizeEventBindings(bindings)
    this.bindings = {...this.bindings, ...newBindings}
  }

  public findHandler(evt: Event): EventHandler | null {
    const event = evt as KeyboardEvent
    const name = keyName(event)
    const isChar = name.length === 1 && name !== ' '
    const keyInfo = modifiers(name, event, !isChar)
    // console.log('keyInfo', keyInfo)
    return this.bindings[keyInfo] ?? null
  }

  public destroy() {
    console.log('remove hot keys session')
    this.removeFn?.()
    this.removeFn = null
  }
}

export class HotKeysManager {
  private target: Document | HTMLElement = globalThis.window.document
  private sessions: HotKeysSession[] = []

  constructor(target?: HTMLElement) {
    if (target) {
      this.target = target
    }

    this.bindEvent()
  }

  private isEditableTarget(event: Event) {
    // @Ref https://www.npmjs.com/package/hotkeys-js
    const target = (event.target || event.srcElement) as HTMLElement
    if (!target) {
      return false
    }

    const tagName = target.tagName
    return (
      target.isContentEditable ||
      tagName === 'INPUT' ||
      tagName === 'SELECT' ||
      tagName === 'TEXTAREA'
    )
  }

  private keyHandler = (e: Event) => {
    const isInput = this.isEditableTarget(e)

    this.sessions.reverse().some((session) => {
      // 如果没有明确允许输入类组件，默认忽略事件捕获
      if (isInput && !session.options?.captureInput) {
        return false
      }

      const handler = session.findHandler(e)
      return !!handler?.(e as KeyboardEvent)
    })
    return false
  }

  public newSession(bindings?: EventBindings, opts?: IBindingOpts) {
    const session = new HotKeysSession(bindings ?? {}, opts)
    this.sessions.push(session)
    session.registerRemove(() => {
      this.sessions = this.sessions.filter((s) => s !== session)
    })
    return session
  }

  private bindEvent() {
    this.target.addEventListener('keydown', this.keyHandler)
  }

  private unbindEvent() {
    this.target.removeEventListener('keydown', this.keyHandler)
  }

  public destroy() {
    this.unbindEvent()
    this.sessions.forEach((session) => session.destroy())
    this.sessions = []
  }

  // end class
}
