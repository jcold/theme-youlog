import {base, keyName} from 'w3c-keyname'

export type EventHandler = (e: KeyboardEvent) => boolean
export type EventBindings = Record<string, EventHandler>

const isMacPlatform =
  typeof navigator !== 'undefined' &&
  navigator.platform?.toLowerCase().includes('mac')

// 对组合键规范化处理。生成具体平台的组合键
export function normalizeKeyName(name: string): string {
  const parts = name.split(/-(?!$)/)
  let result = parts[parts.length - 1]
  if (result === 'Space') result = ' '
  let alt = false
  let ctrl = false
  let shift = false
  let meta = false
  for (let i = 0; i < parts.length - 1; i++) {
    const mod = parts[i]
    if (/^(cmd|meta|m)$/i.test(mod)) meta = true
    else if (/^a(lt)?$/i.test(mod)) alt = true
    else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true
    else if (/^s(hift)?$/i.test(mod)) shift = true
    else if (/^mod$/i.test(mod)) {
      if (isMacPlatform) meta = true
      else ctrl = true
    } else throw new Error('Unrecognized modifier name: ' + mod)
  }
  if (alt) result = 'Alt-' + result
  if (ctrl) result = 'Ctrl-' + result
  if (meta) result = 'Meta-' + result
  if (shift) result = 'Shift-' + result
  return result
}

// 规范快捷建组合
export function normalizeEventBindings(bindings: EventBindings): EventBindings {
  const result: EventBindings = {}
  for (const key in bindings) {
    result[normalizeKeyName(key)] = bindings[key]
  }
  return result
}

// 根据具体事件生成快捷键
export function modifiers(name: string, event: KeyboardEvent, shift: boolean): string {
  if (event.altKey) name = 'Alt-' + name
  if (event.ctrlKey) name = 'Ctrl-' + name
  if (event.metaKey) name = 'Meta-' + name
  if (shift !== false && event.shiftKey) name = 'Shift-' + name
  return name
}

// :: (Object) → Plugin
// Create a keymap plugin for the given set of bindings.
//
// Bindings should map key names to [command](#commands)-style
// functions, which will be called with `(EditorState, dispatch,
// EditorView)` arguments, and should return true when they've handled
// the key. Note that the view argument isn't part of the command
// protocol, but can be used as an escape hatch if a binding needs to
// directly interact with the UI.
//
// Key names may be strings like `"Shift-Ctrl-Enter"`—a key
// identifier prefixed with zero or more modifiers. Key identifiers
// are based on the strings that can appear in
// [`KeyEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key).
// Use lowercase letters to refer to letter keys (or uppercase letters
// if you want shift to be held). You may use `"Space"` as an alias
// for the `" "` name.
//
// Modifiers can be given in any order. `Shift-` (or `s-`), `Alt-` (or
// `a-`), `Ctrl-` (or `c-` or `Control-`) and `Cmd-` (or `m-` or
// `Meta-`) are recognized. For characters that are created by holding
// shift, the `Shift-` prefix is implied, and should not be added
// explicitly.
//
// You can use `Mod-` as a shorthand for `Cmd-` on Mac and `Ctrl-` on
// other platforms.
//
// You can add multiple keymap plugins to an editor. The order in
// which they appear determines their precedence (the ones early in
// the array get to dispatch first).
// export function keymap(bindings) {
//   return new Plugin({props: {handleKeyDown: keydownHandler(bindings)}})
// }

// :: (Object) → (view: EditorView, event: dom.Event) → bool
// Given a set of bindings (using the same format as
// [`keymap`](#keymap.keymap), return a [keydown
// handler](#view.EditorProps.handleKeyDown) that handles them.
// 测试快捷键是否执行。
export function keydownHandler(bindings: EventBindings): EventHandler {
  const map = normalizeEventBindings(bindings)
  return function (event) {
    if (!event) {
      return false
    }

    // debugger
    const name = keyName(event)
    const isChar = name.length === 1 && name !== ' '
    let baseName: string
    const keyInfo = modifiers(name, event, !isChar)
    // console.log('keyInfo', keyInfo)

    // 查找指定的快捷键并执行
    const direct = map[keyInfo]
    if (direct && direct(event)) {
      return true
    }

    // 针对组合键带有keyCode数字的按键测试
    if (
      isChar &&
      (event.shiftKey || event.altKey || event.metaKey) &&
      (baseName = base[event.keyCode]) &&
      baseName !== name
    ) {
      const fromCode = map[modifiers(baseName, event, true)]
      if (fromCode && fromCode(event)) {
        return true
      }
    }

    return false
  }
}
