//
// Module : MMM-GoogleAssistant
//


const exec = require("child_process").exec
const fs = require("fs")
const Assistant = require("./components/assistant.js")
const ScreenParser = require("./components/screenParser.js")
const Snowboy = require("@bugsounet/snowboy").Snowboy

var _log = function() {
  var context = "[ASSISTANT]"
  return Function.prototype.bind.call(console.log, console, context)
}()

var log = function() {
  //do nothing
}

var NodeHelper = require("node_helper")

module.exports = NodeHelper.create({
  start: function () {
    this.config = {}
  },

  socketNotificationReceived: function (noti, payload) {
    switch (noti) {
      case "INIT":
        this.initialize(payload)
        break
      case "ACTIVATE_ASSISTANT":
        this.activateAssistant(payload)
        break
      case "ASSISTANT_BUSY":
        this.snowboy.stop()
        break
      case "ASSISTANT_READY":
        this.snowboy.start()
        break
    }
  },

  tunnel: function(payload) {
    this.sendSocketNotification("TUNNEL", payload)
  },

  activateAssistant: function(payload) {
    log("QUERY:", payload)
    var assistantConfig = Object.assign({}, this.config.assistantConfig)
    assistantConfig.debug = this.config.debug
    assistantConfig.lang = payload.lang
    assistantConfig.useScreenOutput = payload.useScreenOutput
    assistantConfig.useAudioOutput = payload.useAudioOutput
    assistantConfig.micConfig = this.config.micConfig
    this.assistant = new Assistant(assistantConfig, (obj)=>{this.tunnel(obj)})

    var parserConfig = {
      screenOutputCSS: this.config.responseConfig.screenOutputCSS,
      screenOutputURI: "tmp/lastScreenOutput.html"
    }
    var parser = new ScreenParser(parserConfig, this.config.debug)
    var result = null
    this.assistant.activate(payload, (response)=> {
      if (!(response.screen || response.audio)) {
        response.error = "NO_RESPONSE"
      }
      if (response.error == "TOO_SHORT" && response) response.error = null
      if (response.screen) {
        parser.parse(response, (result)=>{
          delete result.screen.originalContent
          log("ASSISTANT_RESULT", result)
          this.sendSocketNotification("ASSISTANT_RESULT", result)
        })
      } else {
        log ("ASSISTANT_RESULT", response)
        this.sendSocketNotification("ASSISTANT_RESULT", response)
      }
    })
  },

  initialize: function (config) {
    console.log("[ASSISTANT] MMM-GoogleAssistant Version:", require('./package.json').version)
    this.config = config
    this.config.assistantConfig["modulePath"] = __dirname
    var error = null
    if (this.config.debug) log = _log
    if (!fs.existsSync(this.config.assistantConfig["modulePath"] + "/" + this.config.assistantConfig.credentialPath)) {
      error = "[ERROR] credentials.json file not found !"
    }
    else if (!fs.existsSync(this.config.assistantConfig["modulePath"] + "/" + this.config.assistantConfig.tokenPath)) {
      error = "[ERROR] token.json file not found !"
    }
    if (error) {
      console.log("[ASSISTANT]" + error)
      return this.sendSocketNotification("NOT_INITIALIZED", error)
    }
    log("Activate delay is set to " + this.config.responseConfig.activateDelay + " ms")

    this.snowboy = new Snowboy(this.config.snowboy, this.config.micConfig, (detected) => { this.hotwordDetect(detected) } , this.config.debug )
    this.snowboy.init()

    console.log ("[ASSISTANT] Google Assistant is initialized.")
    this.sendSocketNotification("INITIALIZED")
  },

  /** Snowboy Callback **/
  hotwordDetect: function(detected) {
    if (detected) this.sendSocketNotification("ASSISTANT_ACTIVATE", { type:"MIC" })
  },
})

