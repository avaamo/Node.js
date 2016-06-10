# Avaamo Node.js Bot SDK

This is Avaamo Bot SDK written in JavaScript targeting Node.js for implementing custom Bots using Avaamo Messaging Platform.

To implement a custom bots, you need to have [Avaamo Premium] account.

Once you are familiar with Avaamo Premium Dashboard, [create a bot from the dashboard and grab the bot-uuid and access-token by following the steps mentioned in the wiki].

This repository will help you to implement a custom bot with samples written in JavaScript.

The repository has `lib` and `assets` directory which you need not worry about. It contains the SDK code implementation and supporting assets for the sample we had built.

The `bot_app.js` file is the sample bot application which has the example code.

## Pre-requisite
Node.js version >= 4.2.4
NPM version >= 2.14.12
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
The Avaamo SDK exports the primary class `Avaamo` which takes 5 arguments: bot-uuid, bot-access-token, message callback, acknowledgement callback, activity callback as given below:

```
(function myBot() {
  let bot_uuid = "<bot-uuid>",
    access_token = "<bot-access-token>";

  new Avaamo(bot_uuid, access_token, printMessage, printAck, printActivity, false);
})();
```

## Step 3: Implementing Message Callbacks
This step involves two sub-steps.

### 3.1 Understanding the message object
The callback should take two parameters: the message object and the Avaamo object(object instantiated in the previous step).

```
function printMessage(payload, avaamo) {
  //Process incoming message
  //Reply back to the conversation
}
```

The first argument which is the message object has 3 properties: `message`, `user` and `conversation`. We will focus only on the `message` property which has all required information.

The `message` property is of type `Message` which has the following properties and methods:

```
//Get the message object
let message = payload.message;

//properties of message
message.content
message.content_type
message.attachments
message.conversation_uuid
message.uuid
message.created_at

//METHODS

//returns the message content
message.getContent()

//returns the message content type which could be one of these strings:
//"text","file","video","audio","photo""image","form_response"
message.getContentType()

//returns the message sender object
//This object has the first_name, last_name, email, phone
message.getSender()

//returns the sender name in string
//It takes a default name as argument which is a fallback if user object has no first or last names
message.getSenderName(default_name = "")

//returns message uuid; a unique identifier for message
message.getUuid()

//returns the conversation uuid of the message; a unique identifier for conversation
message.getConversationUuid()

//returns the message created time in timestamp format with seconds precision
message.getCreatedAt()

//returns boolean indicating if there is attachment with the message
message.hasAttachment()

//returns the `content_type` of the message if the message has any of the attachment types.
//If the message is of `content_type` text, this method will return null
message.whichAttachment()

//returns boolean if message has attachment of type image
message.hasImage()

//returns boolean if message has attachment of type file
message.hasFile()

//returns boolean if message has attachment of type photo
message.hasPhoto()

//returns boolean if message has attachment of type audio
message.hasAudio()

//returns boolean if message has attachment of type video
message.hasVideo()

//returns boolean if message has attachment of type form_response
message.hasForm()

//returns boolean if message has attachment of type text
message.isText()
```

#### Attachments
You might want the bot to handle attachments in a sensible manner. The attachment property of the message object has convenient methods to access the attachments. Every message with attachment has `downloadAll` method to download the attachments to specified location.

```
if(message.hasAttachments()) {
  //download all downloadable attachments to the specified path including form response.
  //if form response has downloadable attachment like file or image, they are downloaded too with this method.
  //The `downloadAll` method returns promise and so you can use `then` method to know if the download is completed.
  //The resolving argument has the file names of the files downloaded
  payload.message.getAttachments().downloadAll("./assets/downloads").then(function(values) {
    //values are file names that are downloaded
    let names = Array.isArray(values) ? values.join(", "): values;
    avaamo.sendMessage(`I have downloaded **${names}** from ${payload.message.whichAttachment()} attachment`, conversation_uuid);
  });
}
```
Note: The path given will be created with 0777 permission if the path doesn't exist.

#### Form Response Attachment
Attachment type `form_response` is little different as they have both text and downloadable content. Moreover, the form response has multiple questions and corresponding responses. You can access them as given below:

```
if(message.hasForm()) {
  /* calling `getFormResponse` on attachments in case of form response attachment will return a promise which resolves with all replies of the form.

  Each element of this array is of type Reply. The object of type Reply has the following methods to access the reply values:

  Returns boolean checking if the reply for this question has any downloadable asset.
  reply.hasAttachments()

  Returns boolean after downloading the downloadable attachments if present
  reply.downloadAttachments(path, permission = 0777)

  Returns the question object of the reply which has title of the question
  reply.getQuestion()

  Returns the actual answer entered by the user in the form for this question.
  This might return string or array based on the question type.
  reply.getResponse()
  */

  message.getAttachments().getFormResponse().then(function(replies) {
    let msg = "";
    replies.forEach(function(reply) {
      let answer = reply.getResponse();
      if(Array.isArray(answer)) {
        answer = answer.join(", ");
      }
      msg += `${reply.getQuestion().title} :: ${answer}\n`;
    });
    console.log(`\n==> Form attachment ends!`);
    avaamo.sendMessage(`Confirm your replies: \n${msg}`, conversation_uuid);
  }).catch(function(e) {
    console.log("Catch", e);
  });
}
```

On the attachments property, you can call methods like getForm, getReplies, getQuestions, getQuestionsReplies and download. All of them return promise with respective objects.

If you want to know more about the forms itself(not form just response), call `getForm` method on the attachments property and it will return a promise which resolves with an object of type FormResponse which has the following methods to access the form:

```
//Returns form title
message.attachments.getForm().then(function(form) {
  //Return form title
  form.getTitle();

  //Returns form description
  form.getDescription();

  //Returns form uuid
  form.getUuid()

  //Returns form replies only which is array of stdClass objects
  form.getReplies()

  //Returns form questions only which is array of stdClass objects
  form.getQuestions()

  //Returns sender object which is a stdClass objects having properties first_name, last_name, email, phone
  form.getSender()

  //alias for getReplies
  form.getAllResponses()

  //Returns promise resolving with file name
  form.downloadAllResponseAttachments(path, permission = 0777)

  //Returns question object at given positions. Returns null if position is beyond number of questions
  form.getQuestionAtPosition(position)

  //Returns reply object at given positions. Returns null if position is beyond number of questions
  //Starts with 0 index
  form.getReplyAtPosition(position)

  //Returns promise resolving with file names
  //Starts with 0 index
  //Downloads only the attachments at given question position.
  form.downloadAttachmentsAtPosition(position, path, permission = 0777)

  //Returns the answer entered by the user if the given position exists. Returns null if position is beyond number of questions
  //Starts with 0 index
  form.getResponseAtPosition(position)
});
```

All these methods are of highly useful to read the form responses within the bot and response accordingly.

### Step 3.2 Responding back to the message
Next critical part of the callback is to respond to the incoming messages. Once you extract the information from the message, you want to reply back with messages which can be text, file, image or card. The sample code in `bot_app.php` has example for each case.

Inside the callback, the Avaamo object is provided to send message back to the conversation. The object has methods to send text, file, image and card type messages to the conversation.

```
//Send text message back to the same conversation
avaamo.sendMessage("Hello user!", message.getConversationUuid());
```
<img alt="text" src="/screenshots/text.png" width="500" />

```
//Send a file back to the same conversation
avaamo.sendFile("<path to your local file>", message.getConversationUuid());
```
<img alt="file" src="/screenshots/file.png" width="500" />

```
//Send an image back to the same conversation
avaamo.sendImage("<path to image>", "<Caption for image or Can be left empty>", message.getConversationUuid());
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
avaamo.sendCard(card, "This is a sample card with rich text description, web link and deep links", message.getConversationUuid());
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

## Step 5: Implementing Activity callback
Might not be very useful, but if in case you want to do something as soon the user launches the bot, like sending a welcome note, this callback will help a lot.

This callback is also called with two arguments: the activity object and the Avaamo object.

The activity object has `user` field, similar to the message object which has the information about the user who has launched the bot. It also has what time he/she has launched the bot and what activity type it is. The activity type will be "user_visit" as of now. It could change later. The following callback prints a message whenever the user visits the bot:

```
function printAcitivity(activity, avaamo) {
  let name = "User", event = null;
  if(activity.user) {
    name = `${activity.user.first_name} ${activity.user.last_name}`;
  }
  if(activity.type === "user_visit") {
    event = "visited";
  }
  const date = new Date(activity.created_at*1000);
  console.log(`\n==> ${name} ${event} me at ${date}\n`);
}
```

Note: All these callbacks are mandatory and are called with injecting the corresponding object and the avaamo instance.

Note: The bot will acknowledge any message as soon as it receives one without any additional code.

When you combine these five steps, you have a bot ready. You can execute the sample app using the command `php bot_app.php` after filling the bot-uuid and access-token. [Click here to see the full code sample].

[Click here to see the full code sample]: ./bot_app.js
[Avaamo Premium]: http://www.avaamo.com/premium.html
[create a bot from the dashboard and grab the bot-uuid and access-token by following the steps mentioned in the wiki]: https://github.com/avaamo/java/wiki
