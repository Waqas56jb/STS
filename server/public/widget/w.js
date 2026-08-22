(function () {
  'use strict'

  var script = document.currentScript
  if (!script) return
  var bizKey = script.getAttribute('data-business') || ''
  if (!bizKey) return

  var apiBase = (function () {
    try {
      var u = new URL(script.src)
      return u.origin
    } catch (e) {
      return ''
    }
  })()
  if (!apiBase) return

  var API = apiBase + '/api/widget/' + encodeURIComponent(bizKey)
  var STORE_VISITOR = 'sts_v_' + bizKey
  var STORE_MSGS = 'sts_msgs_' + bizKey
  var STORE_OPEN = 'sts_open_' + bizKey

  function uid() {
    return 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  }

  function getVisitorId() {
    try {
      var id = localStorage.getItem(STORE_VISITOR)
      if (!id) { id = uid(); localStorage.setItem(STORE_VISITOR, id) }
      return id
    } catch (e) {
      return uid()
    }
  }

  function loadMsgs() {
    try {
      var raw = localStorage.getItem(STORE_MSGS)
      return raw ? JSON.parse(raw) : []
    } catch (e) { return [] }
  }

  function saveMsgs(msgs) {
    try { localStorage.setItem(STORE_MSGS, JSON.stringify(msgs.slice(-80))) } catch (e) { /* ignore */ }
  }

  function isOpen() {
    try { return sessionStorage.getItem(STORE_OPEN) === '1' } catch (e) { return false }
  }

  function setOpen(v) {
    try { sessionStorage.setItem(STORE_OPEN, v ? '1' : '0') } catch (e) { /* ignore */ }
  }

  var visitorId = getVisitorId()
  var config = { business_name: 'Chat', greeting: 'Hi! How can we help?', color: '#0FBE8F', position: 'bottom_right' }
  var messages = loadMsgs()
  var open = isOpen()
  var busy = false

  var root = document.createElement('div')
  root.id = 'sts-widget-root'
  root.style.cssText = 'position:fixed;z-index:2147483646;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.45;'
  document.body.appendChild(root)

  function pos() {
    var br = config.position === 'bottom_left'
    root.style.bottom = '20px'
    root.style[br ? 'left' : 'right'] = '20px'
    root.style[br ? 'right' : 'left'] = 'auto'
  }

  function esc(s) {
    var d = document.createElement('div')
    d.textContent = s
    return d.innerHTML
  }

  function render() {
    pos()
    var color = config.color || '#0FBE8F'
    if (!open) {
      root.innerHTML = '<button id="sts-fab" style="width:56px;height:56px;border-radius:50%;border:none;background:' + color + ';color:#03271b;font-size:24px;cursor:pointer;box-shadow:0 8px 28px rgba(0,0,0,.22)">💬</button>'
      root.querySelector('#sts-fab').onclick = function () { open = true; setOpen(true); render() }
      return
    }

    var html = '<div style="width:min(340px,calc(100vw - 32px));height:min(480px,calc(100dvh - 100px));background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden">'
    html += '<div style="background:' + color + ';padding:14px 16px;color:#03271b;font-weight:800;display:flex;align-items:center;justify-content:space-between">'
    html += '<span>' + esc(config.business_name || 'Chat') + '</span>'
    html += '<button id="sts-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:#03271b">×</button></div>'
    html += '<div id="sts-msgs" style="flex:1;overflow-y:auto;padding:12px;background:#fafbfc">'
    if (!messages.length) {
      html += '<div style="background:#f0f3f6;border-radius:10px;padding:10px 12px;font-size:13px;color:#333">' + esc(config.greeting) + '</div>'
    } else {
      messages.forEach(function (m) {
        var out = m.role === 'user'
        html += '<div style="margin:6px 0;text-align:' + (out ? 'right' : 'left') + '">'
        html += '<div style="display:inline-block;max-width:85%;padding:9px 12px;border-radius:12px;font-size:13px;background:' + (out ? color : '#fff') + ';color:' + (out ? '#03271b' : '#071a2b') + ';border:1px solid ' + (out ? 'transparent' : '#e5e9ef') + '">' + esc(m.text) + '</div></div>'
      })
    }
    html += '</div>'
    html += '<div style="border-top:1px solid #e5e9ef;padding:10px;display:flex;gap:8px">'
    html += '<input id="sts-inp" placeholder="Type a message…" style="flex:1;border:1px solid #e5e9ef;border-radius:10px;padding:10px 12px;font-size:14px" />'
    html += '<button id="sts-send" style="background:' + color + ';border:none;border-radius:10px;padding:0 14px;font-weight:700;cursor:pointer;color:#03271b"' + (busy ? ' disabled' : '') + '>→</button>'
    html += '</div></div>'
    root.innerHTML = html

    root.querySelector('#sts-close').onclick = function () { open = false; setOpen(false); render() }
    var inp = root.querySelector('#sts-inp')
    var send = root.querySelector('#sts-send')
    var box = root.querySelector('#sts-msgs')
    if (box) box.scrollTop = box.scrollHeight

    function submit() {
      var text = (inp.value || '').trim()
      if (!text || busy) return
      busy = true
      inp.value = ''
      messages.push({ role: 'user', text: text })
      saveMsgs(messages)
      render()
      fetch(API + '/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId, text: text }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d } }) })
        .then(function (res) {
          if (res.ok && res.d.reply) messages.push({ role: 'assistant', text: res.d.reply })
          saveMsgs(messages)
        })
        .catch(function () {
          messages.push({ role: 'assistant', text: 'Sorry, please try again in a moment.' })
          saveMsgs(messages)
        })
        .finally(function () { busy = false; render() })
    }
    send.onclick = submit
    inp.onkeydown = function (e) { if (e.key === 'Enter') submit() }
  }

  fetch(API + '/config')
    .then(function (r) { return r.ok ? r.json() : config })
    .then(function (c) { if (c) config = Object.assign(config, c); render() })
    .catch(function () { render() })

  fetch(API + '/history?visitor_id=' + encodeURIComponent(visitorId))
    .then(function (r) { return r.ok ? r.json() : { messages: [] } })
    .then(function (data) {
      var server = (data.messages || []).map(function (m) { return { role: m.role, text: m.text } })
      if (server.length) {
        if (!messages.length || server.length >= messages.length) {
          messages = server
          saveMsgs(messages)
          render()
        }
      }
    })
    .catch(function () { /* keep local */ })

  window.addEventListener('beforeunload', function () { saveMsgs(messages) })
})()
