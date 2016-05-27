# Avaamo Node.js Bot SDK

This is Avaamo Bot SDK written in JavaScript targeting Node.js for implementing custom Bots using Avaamo Messaging Platform.

To implement a custom bots, you need to have [Avaamo Premium] account.

Once you are familiar with Avaamo Premium Dashboard, create a bot from the dashboard and grab the bot-uuid and access-token.

This repository will help you to implement a custom bot with samples written in JavaScript.

The repository has `lib` and `assets` directory which you need not worry about. It contains the SDK code implementation and supporting assets for the sample we had built.

The `bot_app.js` file is the sample bot application which has the example code.

## Pre-requisite
Node.js version >= 5.2.0
NPM version >= 3.3.0
Novice level Server-Side JavaScript knowledge would be good enough.

To give a bit of an overview about the bot implementation, bots are treated as another user in the Avaamo platform. Once you create a bot from the dashboard, it will appear in the Avaamo messaging application for your group of users or your company members. Any user from your group/company can send message to the bot. How will the bot respond to the messages sent to it? This repository is built to answer this question.

Any messages sent to the bot can be intercepted and replied more sensibly to solve your business needs. The implementation is a 4 step process:

## Step 1: Including the SDK file
To use the SDK, you have to copy the files in the `lib` directory into one of your implementation directories and require the SDK file `avaamo.js` as given below:

```
require('./lib/avaamo').Avaamo
```

**NOTE: The SDK has few NPM dependencies. Run `npm install` at the where `package.json` file is present.**

## Step 2: Instantiating `Avaamo` class
The Avaamo SDK exports the primary class `Avaamo` which takes 4 arguments: bot-uuid, bot-access-token, message callback and acknowledgement callback as given below:

```
(function myBot() {
  let bot_uuid = "<bot-uuid>",
    access_token = "<bot-access-token>";

  new Avaamo(bot_uuid, access_token, printMessage, printAck, false);
})();
```

## Step 3: Implementing Message Callbacks
This step involves two sub-steps.

### 3.1 Understanding the message
The callback should take two parameters: the message object and the Avaamo object(object instantiated in the previous step).

The message object contains the message sent by the users of your bot. It has other supporting information also. Feel free to print and check the fields inside the object. The structure of a typical message with file attachment is given below:

```
  {
    "uuid": "cd77d610-225b-11e6-b798-e7a357b7aece",
    "content": "",
    "content_type": "file",
    "created_at": 1464168836.769,
    "user": {
      "first_name": "Jebin",
      "last_name": "B V",
      "layer_id": "ce78d710-225b-22e6-b798-e7a357b7a123",
      "email": "xyxy@yahooya.com"
    },
    "attachments": {
      "files": [
        {
          "name": "ExBoxes.js",
          "type": "unknown",
          "size": 3713,
          "content_type": "text/javascript",
          "uid": 4212,
          "uuid": 4212,
          "preview": false,
          "meta": null
        }
      ]
    },
    "conversation": {
      "uuid": "1c76c16d6f5e5b2647d4adb180ef156d",
      "mode": false
    }
  }
```

To give you a fair idea of what is in the object, it has the following properties:

`content` - The actual message content sent by the user (hi, hello, whatever). This will be can be empty for few content types.

`content_type` - The `content_type` will have one of the following values (text, file, richtext, image, photo, video, audio, contact, location, form_response)
    Based on the `content_type` will help you to identify the type of the message and act accordingly. Other than text and richtext, all the content_type indicates there is an attachment sent.

`attachments` - This field will be empty for text and richtext. In case of non text `content_type`, this field will have a corresponding object.

`user` - This field helps to capture the message sender details like name, email, user_uuid, and phone.

`conversation` - This field gives the conversation uuid. This uuid can be used to post messages back to the same conversation.

`created_at` - Message created time in timestamp(seconds)

`uuid` - unique identifier for the message

You can use these fields to keep track of the messages and extract information out of them to help the bot respond sensibly.

### Step 3.2 Responding back to the message
Next critical part of the callback is to respond to the incoming messages. Once you extract the information from the message, you want to reply back with messages which can be text, file, image or card. The sample code in `bot_app.js` has example for each case.

Inside the callback, the Avaamo object is provided to send message back to the conversation. The object has methods to send text, file, image and card type messages to the conversation.

```
//Send text message back to the same conversation
avaamo.sendMessage("Hello user!", payload.conversation.uuid);
```
<img alt="text" src="/screenshots/text.png" width="500" />

```
//Send a file back to the same conversation
avaamo.sendFile("<path to your local file>", payload.conversation.uuid);
```
<img alt="file" src="/screenshots/file.png" width="500" />

```
//Send an image back to the same conversation
avaamo.sendImage("<path to image>", "<Caption for image or Can be left empty>", payload.conversation.uuid);
```
<img alt="image" src="/screenshots/image.png" width="500" />

```
//Send a card back to the same conversation
let card = array(
  "title" => "<card title>",
  "description" => "<card description>",
  "showcase_image_path" => "<path to asset>",
  "links" => array(
    Link.get_auto_send_message_link("Post a Message", "Sample Action"),
    Link.getWebpageLink("Web URL", "http://www.avaamo.com"),
    Link.get_go_to_forms_link("Open a Form", "63c906c3-553e-9680-c273-28d1e54da050", "Say Yes")
  )
);
avaamo.sendCard(card, "This is a sample card with rich text description, web link and deep links", payload.conversation.uuid);
```
<img alt="card" src="/screenshots/card.png" width="500" />

You might be wondering "what is a card?". The card is a structured message type. It can have a title, description, showcase image and set of links. Links make the card very special. One can avoid natural language, context based interaction with the help of these links.

#### Links
Avaamo supports two types of links: Web links and Deep links.

Web links are usual web page link and it is opened in a browser(webview in case of mobile).

Deep links are commands that can do certain actions within the Avaamo Messaging application. Lets say you want to ask an Yes/No question to the user and expecting a reply with yes or no. It is common that people reply with extra words like "Answer is Yes.". Parsing that answer(natural language, context based text) and extracting information is little tedious job (not impossible). To make it easy, reply with a card which has deep links that can post just yes or no.

Using the SDK, you can create such interesting deep links very easily. The following line of code will generate a link object.
```
Link.get_auto_send_message_link("Yes", "yes");
```
Add this link in a card and send it to the user. The user will see the title as "Yes" and when the user taps this link, it will post the text "yes" into the conversation. That message will reach the `onMessageCallback` with which you can do the next step. This way you can avoid natural language, context based interaction.

The following are the links that can be created and used in the card:
```
//Web link
Link.getWebpageLink(<title>, <url>);

//Deep link - auto send given message in the same conversation
Link.get_auto_send_message_link(<title>, <text to be posted as message>);

//Deep link - go to given conversation
Link.get_open_conversation_link(<title>, <conversation_uuid of the conversation to open>)

//Deep link - create conversation with the given user uid
Link.get_new_conversation_link(<title>, <user uid with whom the conversation should be created>)

//Deep link - open file sharing screen(mobile only)
Link.get_file_sharing_screen_link(<title>)

//Deep link - open image sharing screen(mobile only)
Link.get_image_sharing_screen_link(<title>)

//Deep link - open video sharing screen(mobile only)
Link.get_video_sharing_screen_link(<title>)

//Deep link - open gallery sharing screen(mobile only)
Link.get_gallery_open_link(<title>)

//Deep link - open forms list screen(mobile only)
Link.get_go_to_form_list_link(<title>)

//Deep link - open the given form to post in given conversation
Link.get_go_to_forms_link(<title>, <valid form uuid>, <form name>, <conversation uuid to post this form to or leave empty if post in same conversation>)
```
Use any of these link objects in the card and send it to the user. Card type messages can be very handy in times.

Ultimately, this callback is the place to parse the message and reply to the user with these type of messages.

## Step 4: Implementing Acknowledgement callback
Might not be very useful, but if in case you want to keep track if the user had read the messages sent to him, this callback will help.

This callback is also called with two arguments: the acknowledgement object and the Avaamo object.

The acknowledgement object has user field, similar to the message object, and read_ack object having which message is read(message_uuid) and when it was read(timestamp). Sample is given below:
```
let printAck = function(ack, avaamo) {
  //acknowledgement processing

  let date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  console.log(`\n==> Message read by: ${ack.user.first_name} at ${date}`);
}
```

When you combine these four steps, you have a bot ready. You can execute the sample app using the command `node bot_app.js` after filling the bot-uuid and access-token.

Full [sample source] can be found here.

[sample source]: ./bot_app.js
[Avaamo Premium]: http://www.avaamo.com/premium.html
