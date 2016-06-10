'use strict'
var stampit = require('stampit');
var Helper = require('./utils').Helper;
var Logger = require('./utils').Logger;
var AttachmentNS = {
  Attachments: function(attachments) {
    let locAttachments = attachments;
    let attachmentsFactory = stampit
      .methods({
        downloadAll(path, permission) {
          permission = (permission || 466);
          let promises = locAttachments.map((attachment) => {
            return attachment.download(path, permission);
          });
          return Promise.all(promises);
        },
        getAll() {
          return locAttachments;
        },
        getAllFileNames() {
          return locAttachments.map((attachment) => {
            return attachment.getFileName();
          });
        }
      });

    return attachmentsFactory();
  },
  FileAttachment: function(attachment) {
    let fileAttachmentFactory = stampit
      .props(attachment)
      .methods({
        download(path, permission, name) {
          Logger.log("Downloading attachment...");
          let downloadPromise = Helper.download(Helper.getFileAPI(this.uuid), path, permission, (name || this.name));
          downloadPromise.then(function() {
            Logger.log("Attachment downloaded");
          }).catch(function(e) {
            Logger.log("Attachment download failed", e);
          });
          return downloadPromise;
        },
        getDownloadURI() {
          return Helper.getFileAPI(this.uuid);
        },
        getFileName() {
          return this.name;
        }
      });

    return fileAttachmentFactory();
  },
  FormResponseAttachment: function(attachment) {
    let has_downloaded = false;
    let promisifyForm = function(resolveWith, rejectWith) {
      return new Promise(function(resolve, reject) {
        this.getForm().then(function(res) {
          resolveWith && typeof resolveWith === "function" && resolveWith(res, resolve);
        }.bind(this), function(res) {
          rejectWith && typeof rejectWith === "function" && rejectWith(res, reject);
        }).catch(function(e) {
          console.log("Error in form response promise", e);
        });
      }.bind(this));
    };
    let formResponseAttachmentFactory = stampit
      .props({form: null, response: null})
      .methods({
        getReplies() {
          return promisifyForm.call(this, function getReplies(form, resolve) {
            resolve(form.replies);
          });
        },
        getQuestions() {
          return promisifyForm.call(this, function getQuestions(form, resolve) {
            resolve(form.questions);
          });
        },
        download(path, permission) {
          return this.downloadAll(path, permission);
        },
        getForm() {
          if(has_downloaded !== true) {
            return new Promise(function(resolve, reject) {
              let url = Helper.getFormResponseAPI(attachment.uuid);
              Logger.log("Form Response fetching..");
              Helper.GET(url).then(function(response) {
                Logger.log("Form Response Received");
                this.response = response;
                this.response.response.form.replies = response.response.replies;
                this.response.response.form.user = response.response.user;
                this.form = FormResponse(response.response.form);
                has_downloaded = true;
                resolve(this.form);
              }.bind(this)).catch(function(e) {
                console.log("Unable to fetch form response", e);
              });
            }.bind(this));
          } else {
            return new Promise(function(resolve, reject) {
              resolve(this.form);
            }.bind(this));
          }
        },
        getQuestionsReplies() {
          return promisifyForm.call(this, function getQuestionsReplies(form, resolve) {
            let form_response = [];
            form.questions.forEach(function(value, key) {
              let obj_merged = stampit.compose(form.questions[key], form.replies[key]);
              form_response.push(obj_merged);
            });
            Logger.log("Final Merged Form Response", form_response);
            resolve(form_response);
          });
        },
        getFormResponse() {
          Logger.log("Getting form Response");
          return promisifyForm.call(this, function getFormResponse(form, resolve) {
            resolve(form.getAllResponses());
          });
        },
        downloadAll(path, permission) {
          return promisifyForm.call(this, function downloadAll(form, resolve) {
            form.downloadAllResponseAttachments(path, permission).then(function(values) {
              resolve(values);
            }).catch(function(e) {
              console.log("Unable to dowload", e);
            });
          });
        }
      });
    return formResponseAttachmentFactory();
  }
};

function FormResponse(form) {
  let formResponseFactory = stampit
    .init(function(stamp) {
      let instance = stamp.instance;
      instance.form.replies.forEach(function(value, key) {
        instance.form.replies[key] = Reply(value, instance.form.questions[key]);
      });
    })
    .refs({form})
    .methods({
      getTitle() {
        return this.form.title;
      },
      getDescription() {
        return this.form.description;
      },
      getUuid() {
        return this.form.uuid;
      },
      getReplies() {
        return this.getAllResponses();
      },
      getQuestions() {
        return this.form.questions;
      },
      getSender() {
        return this.form.user;
      },
      getAllResponses() {
        return this.form.replies;
      },
      downloadAllResponseAttachments(path, permission) {
        Logger.log("Downloading all form attachments..");
        let promises = [];
        this.form.replies.forEach((reply, key) => {
          promises.push.apply(promises, this.form.replies[key].downloadAttachments(path, permission));
        });
        return Promise.all(promises);
      },
      getQuestionAtPosition(position) {
        if(this.form.replies[position]) {
          return this.form.replies[position].getQuestion();
        } else {
          return null;
        }
      },
      getReplyAtPosition(position) {
        if(this.form.replies[position]) {
          return this.form.replies[position].getReply();
        } else {
          return null;
        }
      },
      downloadAttachmentsAtPosition(position, path, permission) {
        if(this.form.replies[position]) {
          return this.form.replies[position].downloadAttachments(path, permission);
        } else {
          return null;
        }
      },
      getResponseAtPosition(position) {
        if(this.form.replies[position]) {
          return this.form.replies[position].getResponse();
        } else {
          return null;
        }
      }
    });
  return formResponseFactory();
}

function Reply(response, question) {
  let replyFactory = stampit
    .init(function(stamp) {
      let instance = stamp.instance;
      instance.question = question;
    })
    .props(response)
    .methods({
      hasAttachments() {
        return this.answerable === true && this.asset_info != null;
      },
      downloadAttachments(path, permission) {
        if(this.hasAttachments()) {
          return this.asset_info.map((value, key) => {
            return Helper.download(Helper.getFileAPI(this.asset_info[key].asset_id), path, permission, this.asset_info[key].file_name);
          });
        } else {
          return [];
        }
      },
      getQuestion() {
        return this.question;
      },
      getResponse() {
        return this.answer;
      },
      getReply() {
        return this.reply;
      }
    });
  return replyFactory();
}

function Attachments(attachments, content_type) {
  let content_type_attachment_class_map = {},
    content_type_attachment_key_map = {};

  content_type_attachment_class_map[Helper.message_types.MESSAGE_CONTENT_TYPE_FILE] = 'FileAttachment';
  content_type_attachment_class_map[Helper.message_types.MESSAGE_CONTENT_TYPE_AUDIO] = 'FileAttachment';
  content_type_attachment_class_map[Helper.message_types.MESSAGE_CONTENT_TYPE_VIDEO] = 'FileAttachment';
  content_type_attachment_class_map[Helper.message_types.MESSAGE_CONTENT_TYPE_PHOTO] = 'FileAttachment';
  content_type_attachment_class_map[Helper.message_types.MESSAGE_CONTENT_TYPE_IMAGE] = 'FileAttachment';
  content_type_attachment_class_map[Helper.message_types.MESSAGE_CONTENT_TYPE_FORM_RESPONSE] = 'FormResponseAttachment';
  content_type_attachment_class_map[Helper.message_types.MESSAGE_CONTENT_TYPE_DEFAULT_CARD] = 'DefaultCardAttachment';
  content_type_attachment_class_map[Helper.message_types.MESSAGE_CONTENT_TYPE_SMART_CARD] = 'SmartCardAttachment';
  content_type_attachment_class_map[Helper.message_types.MESSAGE_CONTENT_TYPE_LINK] = 'LinkAttachment';

  content_type_attachment_key_map[Helper.message_types.MESSAGE_CONTENT_TYPE_FILE] = 'files';
  content_type_attachment_key_map[Helper.message_types.MESSAGE_CONTENT_TYPE_AUDIO] = 'files';
  content_type_attachment_key_map[Helper.message_types.MESSAGE_CONTENT_TYPE_VIDEO] = 'files';
  content_type_attachment_key_map[Helper.message_types.MESSAGE_CONTENT_TYPE_PHOTO] = 'files';
  content_type_attachment_key_map[Helper.message_types.MESSAGE_CONTENT_TYPE_IMAGE] = 'files';
  content_type_attachment_key_map[Helper.message_types.MESSAGE_CONTENT_TYPE_FORM_RESPONSE] = 'form_response';
  content_type_attachment_key_map[Helper.message_types.MESSAGE_CONTENT_TYPE_DEFAULT_CARD] = 'default_card';
  content_type_attachment_key_map[Helper.message_types.MESSAGE_CONTENT_TYPE_SMART_CARD] = 'smart_card';
  content_type_attachment_key_map[Helper.message_types.MESSAGE_CONTENT_TYPE_LINK] = 'link';

  let attachmentsFactory = stampit
    .init(function(stamp) {
      let instance = stamp.instance,
        attachment_class = content_type_attachment_class_map[content_type],
        attachment_key = instance.attachments[content_type_attachment_key_map[content_type]];
      Logger.log(`Attachment Class: ${attachment_class}`);
      if(Helper.isObject(attachment_key)) {
        instance.attachments = AttachmentNS[attachment_class](attachment_key);
      } else {
        let attachmentsArr = [];
        attachment_key.forEach(function(attachment) {
          attachmentsArr.push(AttachmentNS[attachment_class](attachment));
        });
        instance.attachments = AttachmentNS.Attachments(attachmentsArr);
      }
      instance.attachments[content_type_attachment_key_map[content_type]] = attachment_key;
    })
    .props({attachments})
    .methods({
      getAttachments() {
        return this.attachments;
      }
    });

  return attachmentsFactory();
}

module.exports = {
  Attachments
};
