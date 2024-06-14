const Version = "v2.4.8";


// There are various possible states and need to keep track of them.
// State 1 is active, in which case nothing is to be suggested and
// the user is free to type.
// State 2 is inactive-before-suggestion which happens when there
// is no activity for 2000ms.  In this state the script needs to 
// get the current paragraph text and decide if it needs to be extended.
// If the answer is yes then a suggestion request is sent and the state
// becomes:
// State 3 which is inactive-asked-for-suggestion. During this time 
// if any typing happens then it goes back to State 1 naturally due to
// the resetIdle() call and the promise for the suggestion api will be
// abandonded.
// When the request for suggestion comes back from the server then we
// display it as grey suggested text and are then in 
// State 4 which is inactive-got-suggestion. In this state we are looking
// for either a tab to accept or any other typing or clicking away to
// clear the suggestion.
// If tab happens during this state then the block is replaced with
// a block that has the new suggested text appended to it and the state
// becomes State 1.
// If any other typing or clicking happens during this state then the
// suggested text is removed and the
// state becomes State 1.

// get the API key after a 10 second delay
let aiApiKey;
let AIDelay = 5;
let aiInternalProxy = false;
let aidebug = false;
let aiRestUrl = 'https://api.mistral.ai/v1/chat/completions';
let aimodel = 'open-mistral-7b'; // default cheapest model
let nearestPTag;
let originalNearestPTag; // this is a clone of the tag with the suggestion, prior to the suggestion being added.
let oldContent;
let thinkingDiv;
let actionBox
let suggestedBlockIDs = [];

// custom logging function that only logs if the aidebug is true
function aisuggestlog(msg) {
    if (aidebug) {
        console.log(msg)
    }
}

// different kinds of blocks and different wp versions may expose their text content in 
// different ways. this helper function just gets any text from any block, regardless of the type
// of block.
function getBlockText(block) {
    // check what the name of the block is, what type it is.  common types are 'core/paragraph' but others
    // exist. then try the various ways to get the text from the attributes.content or attributes.content.txt
    // or attributes.content.raw or attributes.content.value or attributes.content.rendered.
    textContent = '' // maybe there is nothing here

    if (block.innerBlocks.length > 0) {
        block.innerBlocks.forEach(innerBlock => {
            if (innerBlock.name === 'core/list-item') {
                textContent += '* ' + innerBlock.attributes.content + '\n';
            } else {
                if (typeof innerBlock.attributes.content == 'string') {
                    textContent += innerBlock.attributes.content + '\n';
                }
                else if (typeof innerBlock.attributes.content.text == 'string') { textContent += innerBlock.attributes.content.text + '\n'; }
            }
        });
    } else if (block.name === 'core/paragraph') {
        // try this, but if it fails, look at the content.text instead
        // first check if block.attributes.content is a string
        if (typeof block.attributes.content == 'string') {
            textContent += block.attributes.content;
        }
        else { textContent += block.attributes.content.text; }

    } else if (block.name === 'core/heading') {
        textContent += '# ' + block.attributes.content + '\n';
    } else if (block.name === 'core/image') {
        let imageText = '';
        if (block.attributes.alt) {
            textContent += block.attributes.alt;
        }
        if (block.attributes.caption) {
            textContent += ' ' + block.attributes.caption;
        }
        textContent += imageText;
    } else if (block.name === 'maxbuttons/maxbuttons-block') {
        textContent += block.attributes.text;
    } else if (block.name === 'core/quote') {
        textContent += '> ' + block.attributes.content;
    } else if (block.name !== 'core/post-title') {
        textContent += block.attributes.content;
    }
    return textContent;
}



function thinkingIndicator(action) {
    if (action === 'show') {
        // display an animated gif of gears turning
        // check if thinkingDiv exists, if not create it and move it to the bottom or the
        // screen
        // put a suitable emoji or windig or symbol in it, then attach css annimation to
        // make it rotate
        thinkingDiv = document.getElementById('thinkingDiv');
        if (!thinkingDiv) {
            thinkingDiv = document.createElement('div');
            thinkingDiv.id = 'thinkingDiv';
            thinkingDiv.style.position = 'fixed';
            thinkingDiv.style.bottom = '0';
            // make it bottom centered
            thinkingDiv.style.left = '50%';

            thinkingDiv.style.zIndex = '10000';
            thinkingDiv.style.width = '100px';
            thinkingDiv.style.height = '100px';
            // use symbols for the content, don't use any image file
            thinkingDiv.innerHTML = '🧑‍💻';
            document.body.appendChild(thinkingDiv);
            // now attach annimation using css

        }

    } else if (action === 'hide') {
        // remove the animated gif
        // hide the element
        thinkingDiv.style.display = 'none';
    }
}

function suggestionAction() {
    // show the action box
    aisuggestlog("Showing action box")
    actionBox.style.display = 'block';
}


setTimeout(() => {
    fetch('/index.php?rest_route=/autosuggestai/v1/config', {
        headers: new Headers({
            'X-WP-Nonce': autosuggestai.api_nonce
        })
    }).then(res => res.json()
    ).then(data => {        
        
        airesturl = data.airesturl;
        aiApiKey = data.aiapikey;
        // get the integer value of the delay, it will be a string in the json data, so turn to a number
        AIDelay = parseInt(data.AIDelay);
        // if data.aiInternalProxy is a text strihg "1" then set this to true, otherwise false
        aiInternalProxy = data.aiInternalProxy === "1";
        aimodel = data.aimodel;
        aidebug = data.aidebug;
        
        
        if (aidebug === true) {
            console.log('AI Debug is on');
            aisuggestlog('API rest URL is ' + airesturl);
            aisuggestlog('API key is ' + aiApiKey);
            aisuggestlog('AI Internal Proxy is' + aiInternalProxy);
            aisuggestlog('AI Delay is ' + AIDelay);
            aisuggestlog('AI Model is ' + aimodel);

        } else {
            console.log('AI Debug is off');
        }

    });
}, 5000);


const promptTemplate = `[INST] {prompt} [/INST]`; // <s> only needed for multi turn

const thePrompt = `
You are an automated writing assistant who will suggest the next piece of text to write after an example given to you. The suggested text you provide will always be brief, meaningful, sensible, in keeping with the style of the example. You will be given the title of the piece of writing, one or more preceding paragraphs, and the incomplete paragraph that needs extending. The place to add text will be marked with three dots like this ...


Examples:

If you are given the text "The cat sat on the ... " then you will reply "mat."
If you are given the text "The rain in Spain falls ... " then you will reply with "mainly on the plain. In Hertford, Hereford, and Hampshire, hurricanes hardly ever happen.".
If you are given the text "The sun rises in the east ... " then you will reply with "and sets in the west".
If you are given the text "The dog ... " then you will reply with "barks, and the cat meows".
If you are given the text "Four score and seven years ago ... " then you will reply with "our fathers brought forth, upon this continent, a new nation".


You will return only the suggested extention of the text, without including the original incomplete paragraph.


Here is the title of the piece of writing:

{title}


Here are the preceding paragraphs for context:

{context}


Here is the text to be extended:

{text}`;

// const mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions';


function getSuggestionPromise(title, context, existingText) {
    if (!aiInternalProxy) { // use the internal proxy by passing it the fields directly
        aisuggestlog('Construct prompt and directly send to AI');
        // return a promise to a fetch to the mistral api
        return new Promise((resolve) => {
            // create the total prompt using the template, the prompt, and the existing text.
            instruction = thePrompt.replace('{title}', title).replace('{context}', context).replace('{text}', existingText.trim() + " ... ");
            messageContent = promptTemplate.replace('{prompt}', instruction)
            aisuggestlog('messageContent is' + messageContent);
            const data = {
                model: aimodel,
                messages: [
                    {
                        role: 'user',
                        content: messageContent
                    }
                ],
                temperature: 0.6,
                max_tokens: 100,
                top_p: 0.9,
                // top_k: 50,
                stream: false,
                // unsafe_prompt: false,
                // random_seed: null // openai doesn't support this field
            };
            // Make the API request
            return fetch(airesturl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${aiApiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            })
                .then(res => {
                    if (!res.ok) {
                        // the show what the problem is return the entire res object as a string
                        // resolve(" API return error : " + JSON.stringify(res));
                        // console.log(res);
                        // return res.status into a string, then append statusText and Error it
                        throw new Error("Error status: " + res.status +": " +  res.statusText);
                        
                    }
                    return res.json();
                })
                .then(data => {
                    thinkingIndicator('hide');
                    responseText = data.choices[0].message.content.trim();
                    // sometimes the response text starts with the existingText, if that is
                    // true then we should trim it off before returning it.
                    if (responseText.startsWith(existingText.trim())) {
                        responseText = responseText.substr(existingText.trim().length);
                    }
                    resolve(responseText);
                })
                .catch(error => {
                    console.log(error);
                    resolve(" API return error : check your api key and model name : " + error.message);
                    thinkingIndicator('hide');
                    aisuggestlog(error);
                })
        }
        );
    }
    else {
        aisuggestlog('Passing title, context, and existing text to the internal proxy');
        // use the WPproxy, pass the title, context, and existing text to the proxy
        // and get the response from the proxy
        return new Promise((resolve, reject) => {
            thinkingIndicator('show');
            // pass the text fields directly to our internal wp proxy
            return fetch('/index.php?rest_route=/autosuggestai/v1/getsuggestion', {
                method: 'POST',
                headers: {
                    'X-WP-Nonce': autosuggestai.api_nonce
                },
                body: JSON.stringify({
                    title: title,
                    context: context,
                    existingText: existingText
                })
            })
                .then(res => {
                    aisuggestlog(res);
                    if (!res.ok) {
                        return res.text();
                    }
                    try {
                        return res.json();
                    } catch (error) {
                        return res.text();
                    }
                })

                .then(data => {
                    thinkingIndicator('hide');
                    if (typeof data === 'string') {
                        resolve(data);
                    } else {
                        responseText = data['suggestion'];
                        // check if the responseText starts with the existingText, and if so trim it off
                        if (responseText.startsWith(existingText.trim())) {
                            responseText = responseText.substr(existingText.trim().length);
                        }
                        resolve(responseText);
                    }
                })
                .catch(err => {
                    thinkingIndicator('hide');
                    resolve(err.message);
                });
        });
    }
}




let idle = false;
let idleTimeout;
let suggestionState = 'active';
let suggestionText;


/**
 * Moves the cursor position in the block editor.
 *
 * @param {number} cursorPosition - The new cursor position.
 * @returns {void}
 */
function moveCursorTo(cursorPosition) {
    aisuggestlog("Move cursor to " + cursorPosition)
    wp.data.dispatch('core/block-editor').selectionChange(wp.data.select('core/block-editor').getSelectedBlock().clientId, "content", cursorPosition, cursorPosition);
}





function insertTextIntoCurrentBlock(text) {
    if (suggestionState == 'inactive-got-suggestion') { // suggestion italic mode
        // Show the action box
        suggestionAction();

        aisuggestlog("Inserting text in suggestion mode")
        suggestedBlockIDs = [];

        // Get the selected block
        const selectedBlock = wp.data.select('core/block-editor').getSelectedBlock();

        if (!selectedBlock) {
            console.error('No block selected!');
            return;
        }

        // Check if the block is a paragraph block. Adapt this check for other block types.
        if (selectedBlock.name !== 'core/paragraph') {
            console.error('Selected block is not a paragraph block.');
            return;
        }

        // Get current content from block attributes
        const currentAttributes = selectedBlock.attributes;
        const currentContent = currentAttributes.content;

        // Split text into parts based on line breaks
        const parts = text.split(/\r?\n/);
        const firstPart = parts[0].trim();

        // Combine current content with the new text
        const newContent = `${oldContent}<i>${firstPart}</i>`;

        // Update the block's content with the first part
        wp.data.dispatch('core/block-editor').updateBlockAttributes(selectedBlock.clientId, {
            content: newContent,
        });


        // Place the selection at the end of the inserted text
        const blockClientId = selectedBlock.clientId;
        suggestedBlockIDs.push(blockClientId);
        // if (selectedBlock.name === 'core/paragraph') {
        //     cursorPosition = newContent.length + 1; // Adjust cursor position to exclude the space
        //     wp.data.dispatch('core/block-editor').selectionChange(blockClientId, "content", cursorPosition, cursorPosition);

        // } else {
        //     console.warn('Cursor adjustment is not supported for this block type.');
        // }

        // if and only if there are more parts of text
        if (parts.length > 1) {

            // Get the position of the current block
            const currentBlockIndex = wp.data.select('core/block-editor').getBlockIndex(selectedBlock.clientId);

            // Insert remaining parts as new blocks after the current block
            let prevBlockId = selectedBlock.clientId;
            for (let i = 1; i < parts.length; i++) {
                if (parts[i].trim() !== '') {
                    const newBlock = wp.blocks.createBlock('core/paragraph', {
                        content: "<i>" + parts[i].trim() + "</i>"
                    });
                    wp.data.dispatch('core/block-editor').insertBlock(newBlock, currentBlockIndex + i);
                    prevBlockId = newBlock.clientId;
                    suggestedBlockIDs.push(prevBlockId);
                }
            }

            // Move cursor to end of last inserted block
            // const lastBlockId = prevBlockId;
            // wp.data.dispatch('core/block-editor').selectionChange(lastBlockId, "content", parts[parts.length - 1].length, parts[parts.length - 1].length);
            // moveCursorToEnd();

            // Move cursor to original block and end of the original text
            setTimeout(() => { wp.data.dispatch('core/block-editor').selectionChange(blockClientId, "content", oldContent.length, oldContent.length) }, 1000);

        }
    } else {
        // user accepted the suggestion
        aisuggestlog("Inserting text in active mode")

        // Remove italic tags from suggested blocks
        suggestedBlockIDs.forEach(blockId => {
            const block = wp.data.select('core/block-editor').getBlock(blockId);
            if (block) {
                const currentAttributes = block.attributes;
                const currentContent = currentAttributes.content;
                const newContent = currentContent.replace(/<i>/g, '').replace(/<\/i>/g, '');
                wp.data.dispatch('core/block-editor').updateBlockAttributes(blockId, {
                    content: newContent,
                });
            }
        });

        // Move cursor to the end of the last block
        const lastBlockId = suggestedBlockIDs[suggestedBlockIDs.length - 1];
        const lastBlockLength = wp.data.select('core/block-editor').getBlock(lastBlockId).attributes.content.length;
        setTimeout(() => { wp.data.dispatch('core/block-editor').selectionChange(lastBlockId, "content", lastBlockLength, lastBlockLength) }, 1000);
    }
}

const tabHandler = (event) => {
    if (suggestionState === 'inactive-got-suggestion') {
        if (event.key === 'Tab') {
            // do not do the default tab behaviour
            event.preventDefault();

            // replace the current block with the suggestion
            // and set the state to active
            suggestionState = 'active';

            insertTextIntoCurrentBlock(suggestionText);
        }
    }
    document.removeEventListener('keydown', tabHandler);
}


// The getcurrentElementFromCanvas function is used to get the selected DOM element from within the iframe canvas 
// where the code editor is rendered. 
//
// This is necessary because the code editor exists within an iframe, which creates a separate DOM from the
// main page.So code running on the main page cannot directly access the DOM within the iframe.
// The getcurrentElementFromCanvas function provides a way to reach into the iframe DOM and get the currently 
// selected element.This allows the autosuggest feature to inspect the selected code and provide relevant suggestions.
//
// Without this function, the autosuggest feature would not be able to determine what code the user has selected in
//  the editor, since that code exists in a separate DOM context within the iframe.

function getcurrentElementFromCanvas() {
    let currentElement;
    // try the simple way first:
    currentElement = document.getElementsByClassName('is-selected')[0]
    // if it failed try the canvas method
    if (currentElement === undefined) {
        const editorCanvasIiframe = document.getElementsByName('editor-canvas')[0];
        const editorCanvasDoc = editorCanvasIiframe.contentDocument;
        const paragraphs = editorCanvasDoc.getElementsByTagName('p');

        // Access the paragraphs within the iframe
        for (let i = 0; i < paragraphs.length; i++) {
            aisuggestlog(paragraphs[i].textContent);
            // check if the paragraph has the class '.is-selected'
            if (paragraphs[i].classList.contains('is-selected')) {
                currentElement = paragraphs[i];
                break;
            }

        };
    }
    return currentElement
}

async function moveCursorToEnd() {
    // Wait for the selection change to complete
    await wp.data.dispatch('core/block-editor').selectionChange(wp.data.select('core/block-editor').getSelectedBlock().clientId, "content", wp.data.select('core/block-editor').getSelectedBlock().attributes.content.length, wp.data.select('core/block-editor').getSelectedBlock().attributes.content.length);


}


function handleSuggestion(text) {
    aisuggestlog("Got some suggestion: " + text)
    // check if the state is still inactive asked for suggestion, as the user may have typed and so it will be active now. if it is the wrong status then we need to exit/return and give up on the suggestion.
    if (suggestionState !== 'inactive-asked-for-suggestion') {
        aisuggestlog("Suggestion state is wrong, so we are giving up on the suggestion")
        return;
    }
    suggestionText = text
    suggestionState = 'inactive-got-suggestion'


    // should show the suggestion now and then 
    // add a keyboard handler to look basically any key
    // and it will do tab or non tab

    currentElement = getcurrentElementFromCanvas();
    // Find the nearest parent paragraph tag
    nearestPTag = currentElement.closest('p');

    // only proceed if cursor is not doing a selection
    if (window.getSelection().isCollapsed !== true) {
        return;
    }

    // // make a duplicate copy of the nearestPTag so we can restore it later if suggestion is dismissed
    // originalNearestPTag = nearestPTag.cloneNode(true);

    // // add the suggestion text to the nearestPTag
    // nearestPTag.innerHTML += "<span style='color:grey'><i>" + suggestionText + "</i></span>";

    // before changing, save the old content
    oldContent = wp.data.select('core/block-editor').getSelectedBlock().attributes.content

    currentBlockId = wp.data.select('core/block-editor').getSelectedBlock().clientId;
    insertTextIntoCurrentBlock(suggestionText)

    setTimeout(function () {
        moveCursorTo(oldContent.length);
    }, 1000);
    // wait for a tab
    document.addEventListener('keydown', tabHandler);

}

function idleNow() {

    aisuggestlog("idle")
    idle = true;
    if (suggestionState === 'active') {
        suggestionState = 'inactive-before-suggestion'
    }
    else { aisuggestlog("idle but not active, so must be inside the suggestion process") }
    aisuggestlog("suggestionState = " + suggestionState)

    if (suggestionState = 'inactive-before-suggestion') { // the user has stopped typing, and we haven't got a suggestion yet
        // get the text of the current wp editor block.

        thinkingIndicator('show');

        const currentBlock = wp.data.select('core/block-editor').getSelectedBlock();
        // if the currentBlock is nul; or doesn't exist, the cursor must be on the title or 
        // somewhere else on the screen.
        if (currentBlock === undefined || currentBlock === null) {
            suggestionState = 'active'
            aisuggestlog("Cursor is on title or somewhere else")
            return;
        }

        // if the current block is not a paragraph then exit.
        if (currentBlock.name !== 'core/paragraph') {
            console.error('Selected block is not a paragraph block.');
            return;
        }

        // check if the last character of the current block is a whitespace, if it is not then
        // exit as we only suggest when the user is pausing after a word. 
        if (currentBlock.name != 'core/paragraph') {
            aisuggestlog("Selected block is not a paragraph block.");
            return;
        }
        // only proceed if we are either on a block with a space at the end, or on an empty block
        currentblockText = getBlockText(currentBlock)
        if (currentblockText.length > 0 && currentblockText[currentblockText.length - 1] !== " ") {
            aisuggestlog("Last character is not a whitespace, so we are not suggesting")
            return;
        }

        // get the text from the top of the post to the current block
        let contextText = getContextText();

        aisuggestlog("contextText: " + contextText)

        let currentBlockText = getBlockText(currentBlock)

        const title = wp.data.select("core/editor").getEditedPostAttribute('title');

        const suggestionTextPromise = getSuggestionPromise(title, contextText, currentBlockText)

        suggestionState = 'inactive-asked-for-suggestion'
        suggestionTextPromise.then(handleSuggestion)
    }
}

// Gets all the text before, and not including, the current block
function getContextText() {
    let contextText = '';
    const currentBlockClientId = wp.data.select('core/block-editor').getSelectedBlock().clientId;
    let reachedCurrentBlock = false;
    const blocks = wp.data.select('core/block-editor').getBlocks();
    blocks.forEach(block => {
        if (block.clientId === currentBlockClientId) {
            reachedCurrentBlock = true;
            return; // Using return here to exit the loop is better than break, as return will exit the current function entirely, while break will only exit the loop but continue executing the rest of the function
        }
        if (!reachedCurrentBlock) {
            contextText += getBlockText(block) + '\n\n'
        }
    });
    return contextText;
}

// set the idle reset function, but if this is the first time this document has loaded
// then set the delay to double.

function resetIdle(event) {
    // check if it is a button that was clicked
    if (event && event.target) {
        aisuggestlog("Event:" + event.target.tagName);

        if (event && event.target.tagName === 'I') {
            return;
        }
    }

    clearTimeout(idleTimeout);
    idle = false;
    aisuggestlog("Start reset idle")
    // if a suggestion has been made, then reset the text of the block to the original text from the clone
    if (suggestionState === 'inactive-got-suggestion') {
        // nearestPTag.innerHTML = originalNearestPTag.innerHTML;
        aisuggestlog('should give up on suggestion')
        // take the current block and set it to the previous text, then move the cursor to the end

        wp.data.dispatch('core/block-editor').updateBlockAttributes(wp.data.select('core/block-editor').getSelectedBlock().clientId, {
            content: oldContent,
        });

        cursorPosition = oldContent.length + 1; // Adjust cursor position to exclude the space
        wp.data.dispatch('core/block-editor').selectionChange(wp.data.select('core/block-editor').getSelectedBlock().clientId, "content", cursorPosition, cursorPosition);


    }


    suggestionState = "active"

    idleTimeout = setTimeout(idleNow, AIDelay * 1000);
}



window.addEventListener('keydown', resetIdle);
window.addEventListener('scroll', resetIdle);
window.addEventListener('mousedown', resetIdle);
window.addEventListener('click', resetIdle);
window.addEventListener('blur', resetIdle);

// inject font awesome into head
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
document.head.appendChild(link);

// Creating action box
aisuggestlog("Creating action box")
actionBox = document.createElement('div');
actionBox.id = 'actionBox';
actionBox.style.backgroundColor = 'white';
actionBox.style.border = '1px solid black';
actionBox.style.padding = '10px';
actionBox.style.borderRadius = '10px';

// create the accept and reject buttons
let acceptButton = document.createElement('button');
acceptButton.id = 'acceptButton';
acceptButton.innerHTML = '<i class="fas fa-check" style="color: green;"></i>';
acceptButton.addEventListener('click', (event) => {
    event.stopPropagation();
    suggestionState = 'active';
    insertTextIntoCurrentBlock();
    actionBox.style.display = 'none';
});

let rejectButton = document.createElement('button');
rejectButton.id = 'rejectButton';
rejectButton.innerHTML = '<i class="fas fa-times" style="color: red;"></i>';
rejectButton.addEventListener('click', (event) => {
    event.stopPropagation();
    suggestionState = 'inactive-got-suggestion';
    resetIdle();
    actionBox.style.display = 'none';
});

// append the buttons to the action box
actionBox.appendChild(acceptButton);
actionBox.appendChild(rejectButton);

// position the action box
actionBox.style.position = 'fixed';
actionBox.style.bottom = '0';
actionBox.style.left = '20%';

document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(actionBox);
    actionBox.style.display = 'none';
})

resetIdle();

console.log("Autosuggest AI loaded, version: " + Version)

