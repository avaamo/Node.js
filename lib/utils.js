'use strict'
var http = require('https');
var fs = require('fs');
var UUID = require('uuid');
var FormData = require('form-data');

const Credentials = {
  access_token: "",
  bot_uuid: ""
};

const Logger = {
  debug: false,
  log() {
    if(this.debug === true) {
      for(let x = 0; x < arguments.length; x++) {
        console.log(arguments[x], "\n");
      }
    }
    return this;
  }
};

const Helper = {
  message_types: {
    MESSAGE_CONTENT_TYPE_IMAGE: "image",
    MESSAGE_CONTENT_TYPE_FILE: "file",
    MESSAGE_CONTENT_TYPE_PHOTO: "photo",
    MESSAGE_CONTENT_TYPE_AUDIO: "audio",
    MESSAGE_CONTENT_TYPE_VIDEO: "video",
    MESSAGE_CONTENT_TYPE_DEFAULT_CARD: "default_card",
    MESSAGE_CONTENT_TYPE_SMART_CARD: "smart_card",
    MESSAGE_CONTENT_TYPE_LINK: "link",
    MESSAGE_CONTENT_TYPE_RICHTEXT: "richtext",
    MESSAGE_CONTENT_TYPE_TEXT: "text",
    MESSAGE_CONTENT_TYPE_FORM_RESPONSE: "form_response"
  },
  DS_HOST: "wss://ds.avaamo.com",
  DS_URI: (access_token) => `/socket/websocket?access_token=${access_token}&user_agent=bot_server`,
  APP_SERVER_HOST: "prod.avaamo.com",
  APP_SERVER_URI: "/s/v1/messages.json",
  APP_SERVER_FILES_URI: "/s/files.json",
  APP_SERVER_READ_ACK: "/s/messages/read_ack.json",
  APP_SERVER_PORT: 443,
  getFileAPI: (uuid) => `/s/files/${uuid}.json`,
  getFormResponseAPI: (uuid) => `/s/form/responses/${uuid}.json`,

  isObject(item) {
    return (typeof item === "object" && !Array.isArray(item) && item !== null);
  },
  GET(url) {
    let option = {
      hostname: this.APP_SERVER_HOST,
      port: this.APP_SERVER_PORT,
      path: url,
      method: 'GET',
      headers: {
        'Access-Token': Credentials.access_token,
      }
    };
    return new Promise(function(resolve, reject) {
      var req = http.request(option, function(res) {
        if (res.statusCode === 200) {
          res.setEncoding('utf8');
          let output = "";
          res.on('data', function (data) {
            output += data;
          });
          res.on('end', function (data) {
            resolve(JSON.parse(output));
          });
        } else {
          if (res.statusCode === 302 && res.headers.location) {
            Helper.GET(res.headers.location);
          } else {
            reject(res.statusCode);
          }
        }
      })
      .on('error', function(e) {
        reject(e);
      }).end();
    });
  },
  download(url, path, permission, name) {
    path = path || __dirname;
    permission = permission || 466;
    name = (name || UUID.v4())
    let option = {
      hostname: this.APP_SERVER_HOST,
      port: this.APP_SERVER_PORT,
      path: url,
      method: 'GET',
      headers: {
        'Access-Token': Credentials.access_token,
      }
    }, fileWrite = (path, permission, res, resolve) => {
      try {
        if (!fs.existsSync(path)){
          fs.mkdirSync(path, permission);
        }
        res.pipe(fs.createWriteStream(path+"/"+name));
      } catch(e) {
        console.error(e);
      }
      resolve(name);
    };
    return new Promise(function(resolve, reject) {
      var req = http.request(option, function(res) {
          if (res.statusCode == 200) {
            fileWrite(path, permission, res, resolve);
          } else {
              if (res.statusCode === 302 && res.headers.location) {
                http.get(res.headers.location, (file) => {
                  fileWrite(path, permission, file, resolve);
                });
              } else {
                reject(res.statusCode);
              }
          }
      })
      .on('error', function(e) {
          reject(e);
      }).end();
    });
  }
};

const sendJSON = function sendJSON(data, access_token, url) {
  let promise = new Promise(function(resolve, reject) {
    let postData = JSON.stringify(data),
      postOptions = {
        host: Helper.APP_SERVER_HOST,
        path: (url || Helper.APP_SERVER_URI),
        port: Helper.APP_SERVER_PORT,
        method: 'POST',
        headers: {
          'Access-Token': access_token,
          'Content-Type': 'application/json'
        }
      },
      postReq = http.request(postOptions, function(res) {
        Logger.log("Request sent to the server", res.statusCode);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          Logger.log(chunk);
        });
        res.on('end', function (chunk) {
          resolve(chunk);
        });
      });
    postReq.on("error", function(error) {
      Logger.log("Error", error);
      reject(error);
    });
    postReq.write(postData);
    postReq.end();
  });
  promise.catch(function(e) {
    console.error("Error", e);
  });
  return promise;
};

const sendAttachment = function sendAttachment(data, access_token, url) {
  return new Promise(function(resolve, reject) {
    let form = new FormData();
    for(let field in data) {
      form.append(field, data[field]);
    }
    form.submit({
      host: Helper.APP_SERVER_HOST,
      path: (url || Helper.APP_SERVER_URI),
      port: Helper.APP_SERVER_PORT,
      protocol: "https:",
      method: 'POST',
      headers: {
        'Access-Token': access_token
      }
    }, function(err, res) {
      if(!err) {
        if(res.statusCode === 201) {
          res.setEncoding('utf8');
          var output = "";
          res.on('data', function(data) {
            output += data;
          });
          res.on('end', function(data) {
            Logger.log("Attachment posted successfully");
            resolve(JSON.parse(output));
          });
        } else {
          Logger.log("Status code is not 201", res.statusCode);
        }
      } else {
        Logger.log(err);
        reject(err);
      }
    });
  });
};

module.exports = {
  Logger,
  Helper,
  sendJSON,
  sendAttachment,
  Credentials
};
