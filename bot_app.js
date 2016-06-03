(function myBot() {
  'use strict'

  let Avaamo = require('./lib/avaamo').Avaamo,
    Link = require('./lib/avaamo').Link,
    printMessage = function(payload, avaamo) {
      //message is received here
      //Do any processing here
      let name = "user";
      if(payload.user && payload.user.first_name) {
        name = `${payload.user.first_name} ${payload.user.last_name}`;
      }
      console.log(`\n==> ${name}: ${payload.message.content}`);

      switch ((payload.message.content || "").trim().toUpperCase()) {
        case "HI":
          avaamo.sendMessage(`Hello ${name}`, payload.conversation.uuid);
          break;
        case "IMAGE":
          avaamo.sendImage("assets/superman.jpg", "I am Clark Kent. I have another name - Kal. I am the SUPERMAN.", payload.conversation.uuid);
          // avaamo.sendImage("assets/dance.gif", "Hilarious dance gif", payload.conversation.uuid);
          // avaamo.sendImage("assets/broadcast.png", "Broadcast screenshot", payload.conversation.uuid);
          break;
        case "FILE":
          avaamo.sendFile("assets/relativity.pdf", payload.conversation.uuid);
          break;
        case "CARD":
          let card = {
            title: "Card Title",
            description: "Card Description. This has minimal rich text capabilities as well. For example <b>Bold</b> <i>Italics</i>",
            showcase_image_path: "assets/welcome.jpg",
            links: [
              Link.get_auto_send_message_link("Post a Message", "Sample Action"),
              Link.getWebpageLink("Web URL", "http://www.avaamo.com"),
              Link.get_go_to_forms_link("Open a Form", "63c906c3-553e-9680-c273-28d1e54da050", "Say Yes")
            ]
          };
          avaamo.sendCard(card, "This is a sample card with rich text description, web link and deep links", payload.conversation.uuid);
          break;
        case "SAMPLE ACTION":
          avaamo.sendMessage("Lopadotemachoselachogaleokranioleipsanodrimhypotrimmatosilphioparaomelitokatakechymenokichlepikossyphophattoperisteralektryonoptekephalliokigklopeleiolagoiosiraiobaphetraganopterygon", payload.conversation.uuid);
          avaamo.sendMessage("No. I am not scolding you in my language. This is longest word ever to appear in literature.", payload.conversation.uuid);
          break;
        default:
          avaamo.sendMessage("Awesome. It works!. \nType one of the following to see them in action. \nimage \nfile \ncard", payload.conversation.uuid);
          break;
      }
    },
    printAck = function(ack, avaamo) {
      //acknowledgement processing
      let date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
      console.log(`\n==> Message read by: ${ack.user.first_name} at ${date}`);
    },
    //bot uuid goes here
    bot_uuid = "",
    //bot access token goes here
    access_token = "";

  new Avaamo(bot_uuid, access_token, printMessage, printAck, false);

})();
