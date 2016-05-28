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
    DS_HOST: "ws://ds.avaamo.com",
    DS_URI: function(access_token) {
      return `/socket/websocket?access_token=${access_token}&user_agent=bot_server`;
    },
    APP_SERVER_HOST: "prod.avaamo.com/s",
    APP_SERVER_URI: "/v1/messages.json",
    APP_SERVER_FILES_URI: "/files.json",
    APP_SERVER_PORT: 3000
  }
};
