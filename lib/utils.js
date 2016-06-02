'use strict'
module.exports = {
  Logger: {
    debug: false,
    log: function() {
      if(this.debug === true) {
        for(let x = 0; x < arguments.length; x++) {
          console.log(arguments[x], "\n");
        }
      }
    }
  },
  Helper: {
    DS_HOST: "wss://ds.avaamo.com",
    DS_URI: function(access_token) {
      return `/socket/websocket?access_token=${access_token}&user_agent=bot_server`;
    },
    APP_SERVER_HOST: "prod.avaamo.com",
    APP_SERVER_URI: "/s/v1/messages.json",
    APP_SERVER_FILES_URI: "/s/files.json",
    APP_SERVER_PORT: 443
  }
};
