'use babel'

import {CompositeDisposable} from 'atom'

class GoPostfixProvider {
  constructor (postfix) {
    this.subscriptions = new CompositeDisposable()
    this.subscribers = []
    this.postfix = postfix
    this.selector = '.source.go'
    this.inclusionPriority = 10
    this.suggestionPriority = 10
    this.excludeLowerPriority = false
    this.suppressForCharacters = []
    //this.subscriptions.add(suppressSubscription)
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.subscribers = null
    this.selector = null
    this.inclusionPriority = null
    this.excludeLowerPriority = null
    this.suppressForCharacters = null
    this.disableForSelector = null
  }


  ready () {
    return true
  }

  isValidEditor (editor) {
    if (!editor || !editor.getGrammar) {
      return false
    }
    let grammar = editor.getGrammar()
    if (!grammar) {
      return false
    }
    if (grammar.scopeName === 'source.go') {
      return true
    }
    return false
  }

  getSuggestions ({editor, bufferPosition, scopeDescriptor, prefix}) {
    if (prefix == ""){
      return []
    }
    var line = editor.lineTextForBufferRow(bufferPosition.row)
    var suggestions = []
    if (line.indexOf(".") < 0 && line.indexOf("?") < 0){
      return []
    }
    var pf = this.postfix
    this.postfix.exposedKeywords.forEach(function(k){
      var ind = k.indexOf(prefix)
      var lineInd = line.indexOf(`.${k}(`) + 1
      if (k.startsWith(prefix)){
        suggestions.push({
          text: k.slice(ind),
          displayText: pf.descriptions[k] && pf.descriptions[k].args || k,
          description: pf.usageFor(prefix,k,line),
          type: 'builtin'
        })
      } else {
          var isTern = (line.indexOf("?") > -1 && line.indexOf(":") > -1)
          if (lineInd > 0 || isTern){
          kk = (isTern) ? "?" : k
          suggestions.push({
            text: prefix,
            displayText: pf.descriptions[kk] && pf.descriptions[kk].args || kk,
            description: pf.usageFor(prefix,kk,line,true),
            type: 'builtin'
          })
        }
      }
    })
    return suggestions
  }
  onDidInsertSuggestion({editor, triggerPosition, suggestion}){
    this.postfix.expand()
  }
}

export {GoPostfixProvider}
