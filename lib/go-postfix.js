'use babel';

import { CompositeDisposable } from 'atom';

export default {
  subscriptions: null,
  keywords: ["tern", "ternary","?","if","must","ife","nn","nil","nnil","nr","ifne","must2"],

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();
    // Register command that expands this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'go-postfix:expand': () => this.expand()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },


  expand() {
    var editor = atom.workspace.getActiveTextEditor()
    if (!editor) {
      return
    }
    editor.moveRight() // maybnot?
    editor.selectToFirstCharacterOfLine()
    var lineN = editor.getSelectedBufferRange()
    var indentLevel = editor.indentationForBufferRow(lineN.start.row)
    var line = editor.getSelectedText()

    var parens = 0
    var i = line.length - 1
    for (; i >= 0; i--){
      if (line[i] == ' ' && parens == 0){
        break
      }
      if (line[i] == ')') {
        parens++
      } else if (line[i] == '('){
        parens--
      }
    }
    editor.selectRight(i+1)

    var selection = editor.getSelectedText()
    var dots = selection.split('.')
    if (dots.length == 1) {
      return
    }
    let keyword
    let ident
    var i = 1
    for (; i < dots.length; i++) {
      var thisDot = dots[i].split("(")[0]
      if (this.keywords.indexOf(thisDot) < 0){
        continue
      }
      ident = dots.slice(0, i).join(".")
      keyword = thisDot
      break
    }
    if (i == dots.length){
      return
    }
    dots[i] = dots[i].slice(keyword.length + 1) // keyword(arg1,arg2)  -> arg1,arg2

    var args = dots.slice(i).join(".") // TODO: support quotes.
    if (args[args.length - 1] == ")"){
      args = args.slice(0,-1)
    }
    var argv = args.split(",")
    for (var i = 0; i < argv.length; i++) {
      argv[i] = argv[i].trim()
    }


    function writeIndent(exp, body) {
      editor.insertText(exp)
      editor.insertNewlineBelow()
      var bodyRange = editor.getSelectedBufferRange()
      if (body) {
        editor.insertText(body)
      } else {
        editor.setIndentationForBufferRow(lineN.start.row + 1, indentLevel + 1)
      }
      editor.insertNewlineBelow()
      editor.insertText("}")

      if (body){
        editor.insertNewlineBelow()
      } else {
        editor.setSelectedBufferRange(bodyRange)
        editor.autoIndentSelectedRows()
        var r = editor.getSelectedBufferRange()
        r.start = r.end
        editor.setSelectedBufferRange(r)
      }
    }

    switch (keyword) {
      case "if":
        writeIndent(`if ${ident} {`)
        break;
      case "ife":
        editor.insertText(`if ${ident} == `)
        break;
      case "ifne":
        editor.insertText(`if ${ident} != `)
        break;
      case "nil","n":
        writeIndent(`if ${ident} == nil {`)
        break;
      case "nnil", "nn":
        writeIndent(`if ${ident} != nil {`)
        break;
      case "nilr","nr":
        if (argv[0] == "") {
          args = ident
        }
        writeIndent(`if ${ident} == nil {`, `return ${args}`)
        break;
      case "nnilr2", "nnr2","must2":
        if (argv[0] == "") {
          args = ident
        }
        writeIndent(`if ${ident} != nil {`, `return ${args}`)
        break;

      case "nnilr", "nnr","must":
        if (argv[0] == "") {
          args = ident
        } else {
          args = args + ", " + ident
        }
        writeIndent(`if ${ident} != nil {`, `return ${args}`)
        break;

      case "tern","ternary","?":
      // b.tern(condition == true, "asf","fdfdf")
        if (argv.length != 3) {
          return
        }
        editor.insertText(`${ident} := ${argv[1]}`)
        editor.insertNewlineBelow()
        writeIndent(`if ${argv[0]} {`, `${ident} = ${argv[2]}`)

      default:
    }
  }
};
