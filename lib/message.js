'use strict'
var stampit = require('stampit');
var Helper = require('./utils').Helper;
var Logger = require('./utils').Logger;
var Attachments = require('./attachment').Attachments;

function Message(msg) {
  msg.message.user = msg.user;
  msg.message.conversation = msg.conversation;
  var message = stampit
    .init(function(stamp) {
      let instance = stamp.instance;
      Logger.log("Message initialized");
      if(instance.hasAttachments()) {
        instance.attachments = Attachments(msg.message.attachments, instance.content_type).getAttachments();
      }
    })
    .props(msg.message)
    .methods({
      getUuid() {
        return this.uuid;
      },
      getContent() {
        return this.content;
      },
      getCreatedAt() {
        return this.created_at;
      },
      getConversationUuid() {
        return this.conversation_uuid;
      },
      getContentType() {
        return this.content_type;
      },
      getSender() {
        return this.user;
      },
      getSenderName(default_name) {
        let name = (default_name || "");
        if(this.user) {
          name = `${this.user.first_name} ${this.user.last_name}`;
        }
        return name;
      },
      getAttachments() {
        return this.attachments;
      },
      hasAttachments() {
        return this.attachments && Helper.isObject(this.attachments) && Object.keys(this.attachments).length > 0;
      },
      /*
        Returns one of the values from Helper.message_types if message has attachment
        Returns null if message has no valid attachment
      */
      whichAttachment() {
        if(this.hasAttachments()) {
          return this.content_type;
        } else {
          return null;
        }
      },
      hasImage() {
        return this.content_type === Helper.message_types.MESSAGE_CONTENT_TYPE_IMAGE;
      },
      hasFile() {
        return this.content_type === Helper.message_types.MESSAGE_CONTENT_TYPE_FILE;
      },
      hasPhoto() {
        return this.content_type === Helper.message_types.MESSAGE_CONTENT_TYPE_PHOTO;
      },
      hasAudio() {
        return this.content_type === Helper.message_types.MESSAGE_CONTENT_TYPE_AUDIO;
      },
      hasVideo() {
        return this.content_type === Helper.message_types.MESSAGE_CONTENT_TYPE_VIDEO;
      },
      hasDefaultCard() {
        return this.content_type === Helper.message_types.MESSAGE_CONTENT_TYPE_DEFAULT_CARD;
      },
      hasSmartCard() {
        return this.content_type === Helper.message_types.MESSAGE_CONTENT_TYPE_SMART_CARD;
      },
      hasLink() {
        return this.content_type === Helper.message_types.MESSAGE_CONTENT_TYPE_LINK;
      },
      isRichText() {
        return this.content_type === Helper.message_types.MESSAGE_CONTENT_TYPE_RICHTEXT;
      },
      isText() {
        return this.content_type === Helper.message_types.MESSAGE_CONTENT_TYPE_TEXT;
      },
      hasForm() {
        return this.content_type === Helper.message_types.MESSAGE_CONTENT_TYPE_FORM_RESPONSE;
      }
    });

  return message();
}

module.exports = Message;
