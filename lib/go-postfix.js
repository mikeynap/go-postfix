'use babel';

import { CompositeDisposable } from 'atom';

export default {
  subscriptions: null,
  keywords: ["imap","map","reduce","print","try","catch","map","error","for","tern","ternary","?","if","must","ife","nn","nil","nnil","nr","ifne","must2"],

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
    //    console.log("asdfasf")

    var checkpoint = editor.createCheckpoint()
    editor.moveToEndOfLine() // maybnot?
    editor.selectToFirstCharacterOfLine()
    var lineN = editor.getSelectedBufferRange()
    var indentLevel = editor.indentationForBufferRow(lineN.start.row)
    var line = editor.getSelectedText()
    var assign = ""
    {
      var lineChunks = line.split(":=")
      if (lineChunks.length > 1){
        assign = lineChunks[0].trim()
      }
    }
    //    console.log("asdfasf")

    var parens = 0
    var quotes = 0
    var i = line.length - 1
    for (; i >= 0; i--){
      if (line[i] == ' ' && parens == 0 && quotes % 2 == 0 ){
        break
      }
      if (line[i] == ')') {
        parens++
      } else if (line[i] == '('){
        parens--
      } else if (line[i] == '"'){
        quotes++
      }
    }
    editor.selectRight(i+1)
    //    console.log("asdfasf")

    var selection = editor.getSelectedText()
    // if (cond ? rv1 : rv2)
    if (assign.length > 0 && selection.length > 0 &&
        selection.indexOf("?") > -1 && selection.indexOf(":") > -1){
      var s = selection
      if (s[0] != "("){
        s = "(" + selection
      }
      if (s[s.length - 1] != ")"){
        s += ")"
      }
      var ternRegex = /\(\s*(.+)\s*\?\s*(.+)\s*\:\s*(.+)\s*\)/
      var tp = ternRegex.exec(s);
      if (tp.length == 4){
        selection = `${assign}.tern(${tp[1]},${tp[2]},${tp[3]}`
      }
    }
    var dots = selection.split('.')

    if (dots.length == 1) {
      editor.groupChangesSinceCheckpoint(checkpoint)
      return
    }
    var keyword = ""
    var ident = ""
    //    console.log("asdfasf")

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
    //    console.log("asdfasf")

    if (i == dots.length){
      editor.groupChangesSinceCheckpoint(checkpoint)
      return
    }
    dots[i] = dots[i].slice(keyword.length + 1) // keyword(arg1,arg2)  -> arg1,arg2
    //    console.log("asdfasf")
    var args = dots.slice(i).join(".") // TODO: support quotes.
    if (args[args.length - 1] == ")"){
      args = args.slice(0,-1)
    }
    var argv = args.split(",")
    for (var i = 0; i < argv.length; i++) {
      argv[i] = argv[i].trim()
    }
    if (argv[0] == ""){
      argv = []
      args = ident
    }

    function tryCatchArgs(fargs,fargv){
      if (fargv.length == 0) {
        fargs = ""
      } else {
        fargs += ", "
      }
      return fargs
    }

    function assignError(assigns){
      var assignees = assigns.split(",")
      return assignees[assignees.length - 1].trim()
    }

    function writeLine(line){
      editor.insertText(line)
      editor.insertNewlineBelow()
      lineN.start.row++
    }

    function writeIndent(exp, body) {
      editor.insertText(exp + " {")
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
        if (argv.length == 0) {
          writeIndent(`if ${ident}`)
          break;
        }
        writeIndent(`if ${ident} ${argv[0]}`)
        break;

      case "ifne":
      case "ife":
        var notOrEquals = (keyword == "ife") ? "=" : "!"
        if (argv.length == 0) {
          editor.insertText(`if ${ident} ${notOrEquals}= `)
          break
        }
        writeIndent(`if ${ident} ${notOrEquals}= ${argv[0]}`)
        break;

      case "nil":
        writeIndent(`if ${ident} == nil`)
        break;
      case "nnil":
        writeIndent(`if ${ident} != nil`)
        break;
      case "nilr":
        writeIndent(`if ${ident} == nil`, `return ${args}`)
        break;
      case "must2":
        if (argv.length == 0){
          break;
        }
        writeIndent(`if ${ident} != nil`, `return ${args}`)
        break;
      case "nnilr":
      case "must":
        if (argv.length > 0) {
          args = args + ", " + ident
        }
        writeIndent(`if ${ident} != nil`, `return ${args}`)
        break;

      case "for":
        var v = "i"
        if (argv.length > 0) {
          v = argv[0]
        }
        if (argv.length > 1){
          v += ", " + argv[1]
        }
        writeIndent(`for ${v} := range ${ident}`)
        break;


      case "tern":
      case "ternary":
      case "?":
      // b.tern(condition == true, "asf","fdfdf")
        if (argv.length != 3) {
          break;
        }
        if (assign != ""){
          writeLine(argv[1])
        } else {
          writeLine(`${ident} := ${argv[1]}`)
        }
        writeIndent(`if ${argv[0]}`, `${ident} = ${argv[2]}`)
        break;

      case "catch":
      case "try":
        var notOrEquals = (keyword == "try") ? "=" : "!"
        args = tryCatchArgs(args,argv)
        if (assign != ""){
          editor.selectToFirstCharacterOfLine()
          var assignerror = assignError(assign)
          writeLine(`${assign} := ${ident}`)
          writeIndent(`if ${assignerror} ${notOrEquals}= nil`)
          break;
        }
        writeIndent(`if ${args}err := ${ident}; err ${notOrEquals}= nil`)
        break;

      case "reduce":
        if (assign == "" || argv.length <2 ){
          break
        }
        editor.selectToFirstCharacterOfLine()
        writeLine(`${assign} := ${argv[0]}`)
        args = argv.slice(1).join(",")
        if (args.substring(0,5) == "func("){
          writeLine(`reduceFunc := ${args}`)
          args = "reduceFunc"
        }
        writeIndent(`for i := range ${ident}`, `${assign} = ${args}(${ident}[i], ${assign})`)
        break;


      case "error":
        writeLine(`errors.New(${ident})`)
        break;

      case "print":
        writeLine(`fmt.Println(${ident})`)
        break;

      case "imap":
        if (argv.length < 1) {
          break;
        }
        writeIndent(`for _, v := range ${ident}`, `${argv[0]}(v)`)
        break;

      case "map":
        if (argv.length < 1) {
          break;
        }
        writeIndent(`for i := range ${ident}`, `ident[i] = ${argv[0]}(ident[i])`)
        break;




      default:
    }
    editor.groupChangesSinceCheckpoint(checkpoint)
  }
};
