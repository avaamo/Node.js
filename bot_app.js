(function myBot() {
  'use strict'

  let Avaamo = require('./lib/avaamo').Avaamo,
    Link = require('./lib/avaamo').Link,
    printMessage = function(payload, avaamo) {
      //message is received here
      //Do any processing here
      let name = payload.message.getSenderName("User"),
        content = payload.message.hasAttachments() ? payload.message.whichAttachment() : payload.message.getContent(),
        conversation_uuid = payload.message.getConversationUuid();

      console.log(`\n==> ${name}: ${content}`);

      switch ((content || "").trim().toUpperCase()) {
        case "HI":
          avaamo.sendMessage(`Hello ${name}`, conversation_uuid);
          break;
        case "IMAGE":
          avaamo.sendImage("assets/superman.jpg", "I am Clark Kent. I have another name - Kal. I am the SUPERMAN.", conversation_uuid);
          // avaamo.sendImage("assets/dance.gif", "Hilarious dance gif", conversation_uuid);
          // avaamo.sendImage("assets/broadcast.png", "Broadcast screenshot", conversation_uuid);
          break;
        case "FILE":
          avaamo.sendFile("assets/relativity.pdf", conversation_uuid);
          break;
        case "CARD":
          let card = {
            title: "Card Title",
            description: "Card Description. This has minimal rich text capabilities as well. For example <b>Bold</b> <i>Italics</i>",
            showcase_image_path: "assets/welcome.jpg",
            links: [
              Link.get_auto_send_message_link("Post a Message", "Sample Action"),
              Link.getWebpageLink("Web URL", "http://www.avaamo.com"),
              Link.get_go_to_forms_link("Open a Form", "8e893b85-f206-4156-ae49-e917d584bcf3", "Rate Me")
            ]
          };
          avaamo.sendCard(card, "This is a sample card with rich text description, web link and deep links", conversation_uuid);
          break;
        case "SAMPLE ACTION":
          avaamo.sendMessage("Lopadotemachoselachogaleokranioleipsanodrimhypotrimmatosilphioparaomelitokatakechymenokichlepikossyphophattoperisteralektryonoptekephalliokigklopeleiolagoiosiraiobaphetraganopterygon", conversation_uuid);
          avaamo.sendMessage("No. I am not scolding you in my language. This is longest word ever to appear in literature.", conversation_uuid);
          break;
        default:
          if(payload.message.hasAttachments() === true) {
            avaamo.sendMessage(`I have got ${payload.message.whichAttachment()} attachment`, conversation_uuid);
            payload.message.getAttachments().downloadAll("./assets/downloads").then(function(values) {
              //values are file names that are downloaded
              let names = Array.isArray(values) ? values.join(", "): values;
              avaamo.sendMessage(`I have downloaded **${names}** from ${payload.message.whichAttachment()} attachment`, conversation_uuid);
            });
            if(payload.message.hasForm() === true) {
              console.log(`\n==> Form attachment!`);
              payload.message.getAttachments().getFormResponse().then(function(replies) {
                let msg = "";
                replies.forEach(function(response) {
                  let answer = response.getResponse();
                  if(Array.isArray(answer)) {
                    answer = answer.join(", ");
                  }
                  msg += `${response.getQuestion().title} :: ${answer}\n`;
                });
                console.log(`\n==> Form attachment ends!`);
                avaamo.sendMessage(`Confirm your replies: \n${msg}`, conversation_uuid);
              }).catch(function(e) {
                console.log("Catch", e);
              });
            }
          } else {
            avaamo.sendMessage("Awesome. It works!. \nType one of the following to see them in action. \nimage \nfile \ncard", conversation_uuid);
          }
          break;
      }
    },
    printAck = function(ack, avaamo) {
      //acknowledgement processing
      let date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
      console.log(`\n==> Message read by: ${ack.user.first_name} at ${date}`);
    },
    printActivity = function(activity) {
      let name = "User", event = null;
      if(activity.user) {
        name = `${activity.user.first_name} ${activity.user.last_name}`;
      }
      if(activity.type === "user_visit") {
        event = "visited";
      }
      const date = new Date(activity.created_at*1000);
      console.log(`\n==> ${name} ${event} me at ${date}\n`);
    },
    //bot uuid goes here
    bot_uuid = "",
    //bot access token goes here
    access_token = "";

  new Avaamo(bot_uuid, access_token, printMessage, printAck, printActivity);

})();
