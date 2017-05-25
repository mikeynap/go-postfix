'use babel';

import { CompositeDisposable } from 'atom';
import { GoPostfixProvider } from './go-postfix-autocomplete-provider';

export default {
  config: {
    logger: {
      type: "string",
      default: "fmt.Print"
    }
  },
  subscriptions: null,
  keywords: ["apply","map","reduce","print","printf","try","catch","tryPrint","catchPrint","map","error","for","tern","ternary","?","if","must","ife","nn","nil","nnil","nilr","nr","ifne","len"],
  exposedKeywords: ["apply","print","printf","map","must","reduce","try","catch","tryPrint","catchPrint","for","tern","?","ife","if","nil","nnil","nilr","ifne","len"],
  provider: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();
    // Register command that expands this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'go-postfix:expand': () => this.expand()
    }));
  },

  expand() {
    var editor = atom.workspace.getActiveTextEditor()
    if (!editor) {
      return
    }

    var checkpoint = editor.createCheckpoint()
    editor.moveToEndOfLine() // maybnot?
    editor.selectToFirstCharacterOfLine()
    var lineN = editor.getSelectedBufferRange()
    var indentLevel = editor.indentationForBufferRow(lineN.start.row)
    var line = editor.getSelectedText()
    var logger = atom.config.get("go-postfix.logger")
    if (logger.endsWith("ln")){
      logger = logger.slice(0,-2)
    } else if (logger.endsWith("f")){
      logger = logger.slice(0,-1)
    }
    var assign = ""
    {
      var lineChunks = line.split(":=")
      if (lineChunks.length > 1){
        assign = lineChunks[0].trim()
      }
    }

    var parens = 0
    var quotes = 0
    var i = line.length - 1
    for (; i >= 0; i--){
      if (line[i] == ' ' && parens <= 0 && quotes % 2 == 0 ){
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

    var selection = editor.getSelectedText().trim()
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
      editor.groupChangesSinceCheckpoint(checkpoint)
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
    if (argv[0] == ""){
      argv = []
      args = ident
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
        writeIndent(`if ${ident}`)
        break;

      case "ifne":
      case "ife":
        var notOrEquals = (keyword == "ife") ? "=" : "!"
        if (argv.length == 0) {
          editor.insertText(`if ${ident} ${notOrEquals}= `)
          break
        }
        writeIndent(`if ${ident} ${notOrEquals}= ${args}`)
        break;

      case "nil":
        writeIndent(`if ${ident} == nil`)
        break;
      case "nnil":
        writeIndent(`if ${ident} != nil`)
        break;
      case "nilr":
        if (argv.length == 0){
          args = ""
        }
        writeIndent(`if ${ident} == nil`, `return ${args}`)
        break;

      case "nnilr":
      case "must":
        if (assign != ""){
          editor.selectToFirstCharacterOfLine()
          var assignerror = this.assignError(assign)
          writeLine(`${assign} := ${ident}`)
          args = args + ", " + assignerror
          if (argv.length == 0){
            args = assignerror
          }
          writeIndent(`if ${assignerror} != nil`, `return ${args}`)
          break
        }
        if (ident.indexOf("(") > -1){
          var err = "err"
          if (argv.length != 0){
            err = args + ", err"
          }
          writeIndent(`if err := ${ident}; err != nil`, `return ${err}`)
          break
        }
        if (argv.length == 0){
          args = ident
        } else {
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

      case "tryPrint":
      case "catchPrint":
      case "try":
      case "catch":
        var notOrEquals = (keyword.startsWith("try")) ? "=" : "!"
        args = this.tryCatchArgs(args,argv)
        var printArgs = ""
        if (assign != ""){
          argv = assign.split(",")
        } else {
          argv.push("err")
        }
        if (keyword.endsWith("Print")){
          printArgs = this.printf(logger, argv)
        }
        if (assign != ""){
          editor.selectToFirstCharacterOfLine()
          var assignerror = this.assignError(assign)
          writeLine(`${assign} := ${ident}`)
          writeIndent(`if ${assignerror} ${notOrEquals}= nil`, printArgs)
          break;
        }
        if (ident.indexOf("(") < 0){
          var p = (printArgs == "") ? "" : `${logger}f("${ident}: %v\\n", ${ident})`
          writeIndent(`if ${ident} ${notOrEquals}= nil`, p)
          break;
        }
        writeIndent(`if ${args}err := ${ident}; err ${notOrEquals}= nil`, printArgs)
        break;

      case "reduce":
        if ( argv.length <2 ){
          break
        }
        if (assign == ""){
          assign = "res"
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
        editor.insertText(`errors.New(${ident})`)
        break;

      case "len":
        editor.insertText(`len(${ident})`)
        break;

      case "print":
        if (assign != ""){
          writeLine(`${ident}`)
          argv = assign.split(",")
          var pargs = this.printf(logger, argv)
          writeLine(pargs)
          break
        }
        writeLine(`${logger}ln(${ident})`)
        break;

      case "printf":
        if (argv.length == 0) {
          writeLine(`${logger}f("%+v\\n", ${ident})`)
          break
        }
        if (args.indexOf("%") < 0){
          args = args.slice(0,-1) + " %v\""
        }
        if (args.indexOf("\n") < 0){
          args = args.slice(0,-1) + "\\n\""
        }
        writeLine(`${logger}f(${args}, ${ident})`)
        break;


      case "apply":
        if (argv.length < 1) {
          break;
        }
        writeIndent(`for i := range ${ident}`, `${argv[0]}(${ident}[i])`)
        break;


      case "map":
        if (argv.length < 1) {
          break;
        }
        writeIndent(`for i := range ${ident}`, `${ident}[i] = ${argv[0]}(${ident}[i])`)
        break;

      default:
    }
    editor.groupChangesSinceCheckpoint(checkpoint)
  },

  tryCatchArgs(fargs,fargv){
    if (fargv.length == 0) {
      fargs = ""
    } else {
      fargs += ", "
    }
    return fargs
  },

  assignError(assigns){
    var assignees = assigns.split(",")
    return assignees[assignees.length - 1].trim()
  },

  printf(logger,argv){
    printArgs = `${logger}f("`
    for (k in argv){
      if (argv[k].trim() == "_"){
        continue
      }
      printArgs += `${argv[k].trim()}: %v, `
    }
    printArgs = printArgs.slice(0,-2)
    printArgs += `\\n", `
    for (k in argv ){
      if (argv[k].trim() == "_"){
        continue
      }
      printArgs += `${argv[k].trim()}, `
    }
    printArgs = printArgs.slice(0,-2)
    printArgs += ")"
    return printArgs
  },
  descriptions: {
    "print": {
      "args": "print",
      "usage": "fmt.Println(%id)"
    },
    "printf": {
      "args": "printf('..%v')",
      "usage": "fmt.Printf('%args', %id)"
    },
    "len":{
      "args": "len",
      "usage": "len(%id)"
    },
    "apply": {
      "altArgs": "apply(f)",
      "altUsage": "for i := range %id{ f(%id[i]) }"
    },
    "map": {
      "altArgs": "map(f)",
      "altUsage": "for i := range %id{ %id = f(%id[i]) }"
    },
    "must": {
      "args": "must",
      "usage": "if %id != nil { return err }",
      "altArgs": "must(...returnVals)",
      "altUsage": "if %id != nil { return %args, err }",
      "altDefault": "nil"
    },
    "reduce": {
      "altArgs": "reduce(start, f func(v, acc))",
      "altUsage": "res := start; for i := range %id { res = f(%id[i])}"
    },

    "for": {
      "args": "for",
      "usage": "for i := range %id {}",
      "altArgs": "for(iterator, value)",
      "altUsage": "for %args := range %id {}",
      "altDefault": "k,v"
    },
    "try": {
      "args": "try",
      "usage": "if err := %id.try(); err == nil {}",
      "altArgs": "try(...rval1)",
      "altUsage": "if %args,err := %id.try(); err == nil{}",
      "altDefault": "v",
      "assignUsage": "v,err := %id.try(); v == nil {}",
    },
    "catch": {
      "args": "catch",
      "usage": "if err := %id.catch(); err != nil {}",
      "altArgs": "catch(...rvals)",
      "altUsage": "if %args,err := %id.catch(); err != nil{}",
      "altDefault": "v"
    },
    "tern": {
      "args": "tern(cond,tVal,fVal)",
      "usage": "%id := tVal; if cond{ %id = fVal }",
    },
    "?": {
      "args": "(cond ? tVal : fVal)",
      "usage": "%id := tVal; if cond{ %id = fVal }"
    },
    "if": {
      "args": "if",
      "usage": "if %id "
    },
    "ife": {
      "args": "ife",
      "usage": "if %id ==",
      "altArgs": "ife(v)",
      "altUsage": "if %id == %args {}"
    },
    "ifne": {
      "args": "ifne",
      "usage": "if %id !=",
      "altArgs": "ifne(v)",
      "altUsage": "if %id != %args {}"
    },
    "nil": {
      "args": "nil",
      "usage": "if %id == nil {}"
    },
    "nnil": {
      "args": "nnil",
      "usage": "if %id != nil {}"
    },
    "nilr": {
      "args": "nilr",
      "usage": "if %id == nil { return }",
      "altArgs": "nilr(...rVal)",
      "altUsage": "if %id == nil { return %args }"
    }
  },
  deactivate() {
    this.subscriptions.dispose();
  },

  getProvider(){
    if (this.provider) {
      return this.provider
    }
    this.provider = new GoPostfixProvider(this)
    this.subscriptions.add(this.provider)
    return this.provider
  },

  provide(){
    return this.getProvider()
  },

  usageFor(prefix, keyword, line, args=false){
    kDisp = this.descriptions[keyword]
    if (!kDisp){
      return ""
    }
    var ind = line.split(`.${prefix}`)[0].trim()
    if (!args){
      if (kDisp.usage){
        return kDisp.usage.replace(/%id/g, ind)
      }
      return kDisp.altUsage.replace(/%id/g, ind)
    }
    var aUsage = kDisp.altUsage
    if (!aUsage){
      return ""
    }

    var idArgs = line.split(`.${keyword}(`)
    aUsage = aUsage.replace(/%id/g, idArgs[0])
    if (idArgs.length == 1){
      return aUsage
    }
    args = idArgs[1]
    if (args[args.length-1] == ")"){
      args = args.slice(0,-1)
    }
    return aUsage.replace(/%args/g, args)
  }


};
