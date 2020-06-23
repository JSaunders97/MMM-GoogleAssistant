//
// Module : MMM-GoogleAssistant

var _log = function() {
  var context = "[ASSISTANT]";
  return Function.prototype.bind.call(console.log, console, context);
}()

var log = function() {
  //do nothing
}

Module.register("MMM-GoogleAssistant", {
  defaults: {
    debug:false,
    assistantConfig: {
      lang: "en-US",
      credentialPath: "credentials.json",
      tokenPath: "token.json",
      projectId: "",
      modelId: "",
      instanceId: "",
      latitude: 51.508530,
      longitude: -0.076132,
    },
    responseConfig: {
      useScreenOutput: true,
      screenOutputCSS: "screen_output.css",
      screenOutputTimer: 5000,
      activateDelay: 250,
      useAudioOutput: true,
      useChime: true
    },
    micConfig: {
      recorder: "arecord",
      device: null,
    },
    snowboy: {
      audioGain: 2.0,
      Frontend: true,
      Model: "jarvis",
      Sensitivity: null
    }
  },

  getScripts: function() {
    return [
       "/modules/MMM-GoogleAssistant/components/response.js"
    ]
  },

  getStyles: function () {
    return ["/modules/MMM-GoogleAssistant/MMM-GoogleAssistant.css"]
  },

  getTranslations: function() {
    return {
      en: "translations/en.json",
      fr: "translations/fr.json"
    }
  },

  start: function () {
    const helperConfig = [
      "debug", "assistantConfig", "micConfig",
      "responseConfig", "snowboy"
    ]
    this.helperConfig = {}
    if (this.config.debug) log = _log
    this.config = this.configAssignment({}, this.defaults, this.config)
    for(var i = 0; i < helperConfig.length; i++) {
      this.helperConfig[helperConfig[i]] = this.config[helperConfig[i]]
    }
    this.myStatus = {
      actual: "standby",
      old : "standby"
    }
    var callbacks = {
      assistantActivate: (payload)=>{
        this.assistantActivate(payload)
      },
      endResponse: ()=>{
        this.endResponse()
      },
      sendNotification: (noti, payload=null) => {
        this.sendNotification(noti, payload)
      },
      translate: (text) => {
        return this.translate(text)
      },
      myStatus: (status) => {
        this.myStatus = status
      }
    }
    this.assistantResponse = new AssistantResponse(this.helperConfig["responseConfig"], callbacks)
  },

  configAssignment : function (result) {
    var stack = Array.prototype.slice.call(arguments, 1)
    var item
    var key
    while (stack.length) {
      item = stack.shift()
      for (key in item) {
        if (item.hasOwnProperty(key)) {
          if (
            typeof result[key] === "object" && result[key]
            && Object.prototype.toString.call(result[key]) !== "[object Array]"
          ) {
            if (typeof item[key] === "object" && item[key] !== null) {
              result[key] = this.configAssignment({}, result[key], item[key])
            } else {
              result[key] = item[key]
            }
          } else {
            result[key] = item[key]
          }
        }
      }
    }
    return result
  },

  getDom: function() {
    this.assistantResponse.modulePosition()
    var dom = document.createElement("div")
    dom.id = "GA_DOM"
    return dom
  },

  notificationReceived: function(noti, payload=null, sender=null) {
    switch (noti) {
      case "DOM_OBJECTS_CREATED":
        this.sendSocketNotification("INIT", this.helperConfig)
        this.assistantResponse.prepare()
        break
    }
  },

  socketNotificationReceived: function(noti, payload) {
    switch(noti) {
      case "LOAD_RECIPE":
        this.parseLoadedRecipe(payload)
        break
      case "NOT_INITIALIZED":
        this.assistantResponse.fullscreen(true)
        this.assistantResponse.showError(payload)
        break
      case "INITIALIZED":
        log("Initialized.")
        this.assistantResponse.status("standby")
        this.sendSocketNotification("ASSISTANT_READY")
        break
      case "ASSISTANT_RESULT":
        this.assistantResponse.start(payload)
        break
      case "TUNNEL":
        this.assistantResponse.tunnel(payload)
        break
      case "ASSISTANT_ACTIVATE":
        this.assistantActivate(payload)
        break
    }
  },

  assistantActivate: function(payload) {
    if (this.myStatus.actual != "standby" && !payload.force) return log("Assistant is busy.")
    this.assistantResponse.fullscreen(true)
    this.sendSocketNotification("ASSISTANT_BUSY")
    this.lastQuery = null
    var options = {
      type: "TEXT",
      key: null,
      lang: this.config.assistantConfig.lang,
      useScreenOutput: this.config.responseConfig.useScreenOutput,
      useAudioOutput: this.config.responseConfig.useAudioOutput,
      status: this.myStatus.old,
      chime: true
    }
    var options = Object.assign({}, options, payload)
    setTimeout(() => {
      this.assistantResponse.status(options.type, (options.chime) ? true : false)
      this.sendSocketNotification("ACTIVATE_ASSISTANT", options)
    }, this.config.responseConfig.activateDelay)
  },

  endResponse: function() {
    this.sendSocketNotification("ASSISTANT_READY")
  }
})
