/*
 * Filename: avaamo.js
 * Author: Jebin B V
 * Created Date: 26 May 2016
 * Description: Bot SDK main class
 */
'use strict'
var Logger = require("./utils").Logger;
var Helper = require("./utils").Helper;
var WebSocket = require('ws');
var http = require('https');
var fs = require('fs');
var mime = require('mime-types');
var UUID = require('uuid');
var path = require('path');
var Promise = require('promise');
var sendJSON = require("./utils").sendJSON;
var sendAttachment = require("./utils").sendAttachment;
var credentials = require("./utils").Credentials;
var Message = require("./message");

function Avaamo(bot_uuid, access_token, onMessageCallback, onAckCallback, onActivityCallback, logger) {

  if(!bot_uuid) {
    throw "Bot UUID cannot be empty";
  }

  if(!access_token) {
    throw "Access Token cannot be empty";
  }

  credentials.bot_uuid = this.bot_uuid = bot_uuid;
  credentials.access_token = this.access_token = access_token;
  this.logger = logger = logger === undefined ? true : logger;
  this.onMessageCallback = onMessageCallback;
  this.onAckCallback = onAckCallback;
  this.onActivityCallback = onActivityCallback;

  this.ref = 1;

  this.messages_channel = "messages."+bot_uuid;
  this.activity_channel = "activity."+bot_uuid;
  this.channels = [this.messages_channel, this.activity_channel];

  this.url = Helper.DS_HOST+Helper.DS_URI(this.access_token);

  this.init(logger);
  return this;
};

Avaamo.prototype.init = function init(logger) {
  Logger.debug = logger;
  console.log("Bot listening...");
  this.socket = new WebSocket(this.url);
  this.join();
}

Avaamo.prototype.join = function join(logger) {
  let joinRef = this.ref;
  this.socket.on("open", (function open() {
    Logger.log("Connection successfully opened");
    //join channel
    this.channels.forEach(function(channel,key) {
      Logger.log(`Joining ${key} channel`);
      let data = {topic: channel, event: "phx_join", payload: {}, ref: this.ref++}
      this.socket.send(JSON.stringify(data), function(error) {
        if(error) {
          Logger.log("Join failed", error);
        } else {
          Logger.log("Join request sent successfully");
        }
      });
    }.bind(this));
  }.bind(this)));
  this.socket.on("error", function error(error) {
    Logger.log("Error in socket", error);
  });
  this.socket.on("message", function message(event) {
    let payload = JSON.parse(event);
    if(payload.topic === this.messages_channel && payload.event === "phx_reply" && payload.ref === joinRef) {
      if(payload.payload.status === "ok") {
        Logger.log("Joined messages channel successfully");
        this.ping();
      } else {
        Logger.log("Unable to join messages channel");
      }
    }
    if(payload.topic === this.activity_channel && payload.event === "phx_reply" && payload.ref === joinRef+1) {
      if(payload.payload.status === "ok") {
        Logger.log("Joined activity channel successfully");
        this.ping();
      } else {
        Logger.log("Unable to join activity channel");
      }
    }
    if(payload.topic === this.messages_channel && payload.event === "message") {
      if(payload.payload.read_ack) {
        this.onAckCallback(payload.payload, this);
      } else {
        this.acknowledgeMessage(payload.payload.pn_native);
        payload.payload.pn_native.message = Message(payload.payload.pn_native);
        this.onMessageCallback(payload.payload.pn_native, this);
      }
    }
    if(payload.topic === this.activity_channel && payload.event === "message") {
      this.onActivityCallback(payload.payload.activity, this);
    }
  }.bind(this));
  this.socket.on("close", function close(event) {
    Logger.log("Socket closed", event);
    this.init(Logger.debug);
  }.bind(this));
};

Avaamo.prototype.ping = function ping() {
  Logger.log("Pinging server...");
  let data = {topic: "phoenix", event: "heartbeat", payload: {}, ref: this.ref++};
  this.socket.send(JSON.stringify(data));
  setTimeout(function() {
    this.ping();
  }.bind(this), 30000);
};

Avaamo.prototype.sendMessage = function sendMessage(content, conversation_uuid) {
  Logger.log("Sending message..");
  let data = {
    message: {
      uuid: UUID.v4(),
      content: content,
      content_type: "text",
      user: {
        layer_id: this.bot_uuid
      },
      conversation: {
        uuid: conversation_uuid
      }
    }
  };
  return sendJSON(data, this.access_token);
};

Avaamo.prototype.acknowledgeMessage = function acknowledgeMessage(payload) {
  Logger.log("Sending ack...");
  let data = {
    read_acks: [{
      read_at: Date.now()/1000,
      message: {
        uuid: payload.message.uuid,
        user: {
          layer_id: payload.user.layer_id
        },
        conversation_uuid: payload.conversation.uuid
      }
    }]
  }, sendPromise = sendJSON(data, this.access_token, Helper.APP_SERVER_READ_ACK);
  sendPromise.then(function() {
    Logger.log("Acknowledgement posted successfully.");
  }).catch(function() {
    Logger.log("Unable to post acknowledgement.");
  })
  return sendPromise;
};

Avaamo.prototype.sendImage = function sendImage(img, caption, conversation_uuid) {
  let data = {
      "[message][conversation][uuid]": conversation_uuid,
      "[message][user][layer_id]": this.bot_uuid,
      "[message][content]": caption,
      "[message][content_type]": "photo",
      "[message][uuid]": UUID.v4(),
      "[message][created_at]": Date.now(),
      "[message][attachments][files][][uid]": UUID.v4(),
      "[message][attachments][files][][type]": mime.lookup(img) || "image/png",
      "[message][attachments][files][][name]": path.basename(img),
      "[message][attachments][files][][size]": fs.statSync(img)["size"],
      "[message][attachments][files][][data]": fs.createReadStream(img)
    };
  return sendAttachment(data, this.access_token).catch(function (e) {
    console.log("Unable to send image", e);
  });
};

Avaamo.prototype.sendFile = function sendFile(file, conversation_uuid) {
  let data = {
      "[message][conversation][uuid]": conversation_uuid,
      "[message][user][layer_id]": this.bot_uuid,
      "[message][content]": "",
      "[message][content_type]": "file",
      "[message][uuid]": UUID.v4(),
      "[message][created_at]": Date.now(),
      "[message][attachments][files][][uid]": UUID.v4(),
      "[message][attachments][files][][type]": mime.lookup(file) || "application/octect-stream",
      "[message][attachments][files][][name]": path.basename(file),
      "[message][attachments][files][][size]": fs.statSync(file)["size"],
      "[message][attachments][files][][data]": fs.createReadStream(file)
    };
  return sendAttachment(data, this.access_token);
};

Avaamo.prototype.sendCard = function sendCard(card, content, conversation_uuid) {
  var bot_uuid = this.bot_uuid;
  var access_token = this.access_token;

  if(!card.title && !card.description && !card.showcase_image_path && !card.links) {
    throw "Atleast title is required";
  }

  if((card.links || []).length) {
    card.links.forEach(function(link, index) {
      link.position = index;
    });
  }

  function sendCard(access_token) {
    let data = {
      message: {
        uuid: UUID.v4(),
        content: content,
        content_type: "default_card",
        attachments: {
          default_card: card
        },
        user: {
          layer_id: bot_uuid
        },
        conversation: {
          uuid: conversation_uuid
        }
      }
    };
    return sendJSON(data, access_token);
  }

  function sendCardJSON(resolve, reject) {
    sendCard(access_token).then(function(res) {
      Logger.log("Card sent successfully");
      resolve(res);
    }, function(err) {
      Logger.log("Card Sending failed", err);
      reject(err);
    });
  }

  return new Promise(function(resolve, reject) {
    if(card.showcase_image_path) {
      let data = {"data": fs.createReadStream(card.showcase_image_path)};
      Logger.log("Sending card...");
      sendAttachment(data, access_token, Helper.APP_SERVER_FILES_URI).then(function(res) {
        card.showcase_image_uuid = res.file.uuid;
        sendCardJSON(resolve, reject);
      }, function(err) {
        Logger.log("Failed to upload the Showcase Image", err);
      });
    } else {
      sendCardJSON(resolve, reject);
    }
  });
};


let Link = {
  LINK_TYPE_WEBPAGE: "web_page",
  LINK_TYPE_DEEPLINK: "deeplink",
  getWebpageLink: function(title, url) {
    if(!title) {
      throw new Exception("Title cannot be empty");
    }
    if(!url) {
      throw new Exception("URL cannot be empty");
    }
    return {
      title: title,
      type: this.LINK_TYPE_WEBPAGE,
      url: url,
      position: 0
    };
  },

  getDeeplinkObject: function(title, url) {
    return {
      title: title,
      type: this.LINK_TYPE_DEEPLINK,
      url: url,
      position: 0
    };
  },

  get_auto_send_message_link: function(title, message, conversation_uuid) {
    if(!message) {
      throw new Exception("Message cannot be empty");
    }
    if(!title) {
      throw new Exception("Title cannot be empty");
    }
    return this.getDeeplinkObject(title, `https://web.avaamo.com#messages/new/${encodeURIComponent(message)}`);
  },

  get_open_conversation_link: function(title, conversation_uuid) {
    if(!conversation_uuid) {
      throw new Exception("Conversation uuid cannot be empty");
    }
    if(!title) {
      throw new Exception("Title cannot be empty");
    }
    return this.getDeeplinkObject(title, `https://web.avaamo.com#conversations/${conversation_uuid}`);
  },

  get_new_conversation_link: function(title, user_uuid) {
    if(!user_uuid) {
      throw new Exception("User uuid cannot be empty");
    }
    if(!title) {
      throw new Exception("Title cannot be empty");
    }
    return this.getDeeplinkObject(title, `https://web.avaamo.com#create_conversation/${user_uuid}`);
  },

  // Open File sharing screen
  get_file_sharing_screen_link: function(title) {
    if(!title) {
      throw new Exception("Title cannot be empty");
    }
    return this.getDeeplinkObject(title, "https://web.avaamo.com#share/attachment/file");
  },

  // Open Image sharing screen
  get_image_sharing_screen_link: function(title) {
    if(!title) {
      throw new Exception("Title cannot be empty");
    }
    return this.getDeeplinkObject(title, "https://web.avaamo.com#share/attachment/image");
  },

  // Open Video sharing screen
  get_video_sharing_screen_link: function(title) {
    if(!title) {
      throw new Exception("Title cannot be empty");
    }
    return this.getDeeplinkObject(title, "https://web.avaamo.com#share/attachment/video");
  },

  // Open Gallery
  get_gallery_open_link: function(title) {
    if(!title) {
      throw new Exception("Title cannot be empty");
    }
    return this.getDeeplinkObject(title, "https://web.avaamo.com#share/attachment/gallery");
  },

  // Open Contact sharing screen
  get_contact_sharing_screen_link: function(title) {
    if(!title) {
      throw new Exception("Title cannot be empty");
    }
    return this.getDeeplinkObject(title, "https://web.avaamo.com#share/attachment/contact");
  },

  //go to forms
  get_go_to_form_list_link: function(title) {
    if(!title) {
      throw new Exception("Title cannot be empty");
    }
    return this.getDeeplinkObject(title, "https://web.avaamo.com#share/attachment/form");
  },

  //go to specific form
  get_go_to_forms_link: function(title, form_uuid, form_name, conversation_uuid) {
    if(!title) {
      throw new Exception("Title cannot be empty");
    }
    if(!form_uuid) {
      throw new Exception("Form uuid cannot be empty");
    }
    if(!form_name) {
      throw new Exception("Form name cannot be empty");
    }
    conversation_uuid = !conversation_uuid ? "{self}" : conversation_uuid;
    return this.getDeeplinkObject(title, `https://web.avaamo.com#forms/${form_uuid}?form_name=${form_name}&conversation_uuid=${conversation_uuid}`);
  }
}



module.exports = {
  Avaamo: Avaamo,
  Link: Link
};
