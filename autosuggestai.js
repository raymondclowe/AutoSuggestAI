const Version = 1.9;

console.log(Version)

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
let myApiKey;
let AIDelay = 5;
let nearestPTag;
let originalNearestPTag; // this is a clone of the tag with the suggestion, prior to the suggestion being added.
let oldContent;
let thinkingDiv;
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



setTimeout(() => {
    fetch('/index.php?rest_route=/autosuggestai/v1/apikey', {
        headers: new Headers({
            'X-WP-Nonce': autosuggestai.api_nonce
        })
    }).then(res => res.json()).then(data => {
        myApiKey = data.apikey;
        // get the integer value of the delay, it will be a string in the json data, so turn to a number
        AIDelay = parseInt(data.AIDelay);



        // let AIBackEndURL = data.AIBackEndURL;
        // let AIPromptTemplate = data.AIPromptTemplate;

        console.log('API key is ' + myApiKey);
        console.log('AI Delay is ' + AIDelay);
        // console.log('AI Backend URL is ' + AIBackEndURL);
        // console.log('AI Prompt Template is ' + AIPromptTemplate);
    });
}, 10000);


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

const mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions';


function getSuggestionPromise(title, context, existingText) {
    // return a promise to a fetch to the mistral api
    return new Promise((resolve) => {
        // create the total prompt using the template, the prompt, and the existing text.
        instruction = thePrompt.replace('{title}', title).replace('{context}', context).replace('{text}', existingText.trim() + " ... ");

        messageContent = promptTemplate.replace('{prompt}', instruction)

        // console.log('messageContent is' + messageContent);
        const data = {
            model: 'mistral-tiny',
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
            random_seed: null
        };

        // Make the API request
        return fetch(mistralApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${myApiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        })
            .then(res => res.json())
            .then(data => {
                thinkingIndicator('hide');
                responseText = data.choices[0].message.content.trim();
                // sometimes the response text starts with the existingText, if that is
                // true then we should trim it off before returning it.
                if (responseText.startsWith(existingText)) {
                    responseText = responseText.substr(existingText.length);
                }
                resolve(responseText);
            });
    });
}



let idle = false;
let idleTimeout;
let suggestionState = 'active';
let suggestionText;


function moveCursorTo(cursorPosition) {
    console.log("Move cursor to " + cursorPosition)
    wp.data.dispatch('core/block-editor').selectionChange(wp.data.select('core/block-editor').getSelectedBlock().clientId, "content", cursorPosition, cursorPosition);
}
    




function insertTextIntoCurrentBlock(text) {
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
    const firstPart = parts[0];
    
    // Combine current content with the new text
    const newContent = `${currentContent}${firstPart}`;

    // Update the block's content with the first part
    wp.data.dispatch('core/block-editor').updateBlockAttributes(selectedBlock.clientId, {
        content: newContent,
    });


    // Place the selection at the end of the inserted text
    const blockClientId = selectedBlock.clientId;
    if (selectedBlock.name === 'core/paragraph') {
        cursorPosition = newContent.length + 1; // Adjust cursor position to exclude the space
        wp.data.dispatch('core/block-editor').selectionChange(blockClientId, "content", cursorPosition, cursorPosition);
        
    } else {
        console.warn('Cursor adjustment is not supported for this block type.');
    }
    
    // if and only if there are more parts of text
    if (parts.length > 1) {

        // Get the position of the current block
        const currentBlockIndex = wp.data.select('core/block-editor').getBlockIndex(selectedBlock.clientId);

        // Insert remaining parts as new blocks after the current block
        let prevBlockId = selectedBlock.clientId;
        for (let i = 1; i < parts.length; i++) {
            const newBlock = wp.blocks.createBlock('core/paragraph', {
                content: parts[i]
            });
            wp.data.dispatch('core/block-editor').insertBlock(newBlock, currentBlockIndex + i);
            prevBlockId = newBlock.clientId;
        }

        // Move cursor to end of last inserted block
        const lastBlockId = prevBlockId;
        wp.data.dispatch('core/block-editor').selectionChange(lastBlockId, "content", parts[parts.length - 1].length, parts[parts.length - 1].length);
    }
}

const tabHandler = (event) => {
    if (suggestionState = 'inactive-got-suggestion') {
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
            console.log(paragraphs[i].textContent);
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
    await await wp.data.dispatch('core/block-editor').selectionChange(wp.data.select('core/block-editor').getSelectedBlock().clientId, "content", wp.data.select('core/block-editor').getSelectedBlock().attributes.content.length,  wp.data.select('core/block-editor').getSelectedBlock().attributes.content.length);
  

  }


function handleSuggestion(text) {
    console.log("Got some suggestion: " + text)
    // check if the state is still inactive asked for suggestion, as the user may have typed and so it will be active now. if it is the wrong status then we need to exit/return and give up on the suggestion.
    if (suggestionState !== 'inactive-asked-for-suggestion') {
        console.log("Suggestion state is wrong, so we are giving up on the suggestion")
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
    insertTextIntoCurrentBlock("<i>" + suggestionText + "</i>")
    
    setTimeout(function() {
        moveCursorTo(oldContent.length);
      }, 2000);
    // wait for a tab
    document.addEventListener('keydown', tabHandler);
    
}  

function idleNow() {
    console.log("idle")
    idle = true;
    if (suggestionState === 'active') {
        suggestionState = 'inactive-before-suggestion' 
    }
    else
    { console.log("idle but not active, so must be inside the suggestion process")}
    console.log("suggestionState = " + suggestionState)

    if (suggestionState = 'inactive-before-suggestion') { // the user has stopped typing, and we haven't got a suggestion yet
        // get the text of the current wp editor block.

        const currentBlock = wp.data.select('core/block-editor').getSelectedBlock();
        // if the currentBlock is nul; or doesn't exist, the cursor must be on the title or 
        // somewhere else on the screen.
        if (currentBlock === undefined || currentBlock === null) {
            suggestionState = 'active'
            console.log("Cursor is on title or somewhere else")
            return;
        }

        // if the current block is not a paragraph then exit.
        if (currentBlock.name !== 'core/paragraph') {
            console.error('Selected block is not a paragraph block.');
            return;
        }

        // check if the last character of the current block is a whitespace, if it is not then
        // exit as we only suggest when the user is pausing after a word. 
        if (currentBlock.attributes.content.length > 0 && currentBlock.attributes.content[currentBlock.attributes.content.length - 1] !== " ") {

            console.log("Last character is not a whitespace, so we are not suggesting")
            return;
        }

        let currentBlockText = currentBlock.attributes.content
        let precedingBlockText = ''
        
        const currentBlockIndexNumber = wp.data.select('core/block-editor').getBlocks().indexOf(currentBlock)
        console.log('currentBlockIndexNumber:' + currentBlockIndexNumber)

        // if the currentBlockText is blank, then go get the preceding block text instead, even if it is not a paragraph
        if (currentBlockText.length === 0) {
            if (currentBlockIndexNumber >= 1) {
            currentBlockText = wp.data.select('core/block-editor').getBlocks()[currentBlockIndexNumber - 1].attributes.content // actually the previous block
            }
            if (currentBlockIndexNumber >= 2) {
                precedingBlockText = wp.data.select('core/block-editor').getBlocks()[currentBlockIndexNumber - 2].attributes.content
            }
        } else {
            if (currentBlockIndexNumber >= 1) {
                precedingBlockText = wp.data.select('core/block-editor').getBlocks()[currentBlockIndexNumber - 1].attributes.content
            }
        }
        const title = wp.data.select("core/editor").getEditedPostAttribute('title');

        const suggestionTextPromise = getSuggestionPromise(title, precedingBlockText, currentBlockText)
        thinkingIndicator('show');
        suggestionState = 'inactive-asked-for-suggestion'
        suggestionTextPromise.then(handleSuggestion)
    }
}

// set the idle reset function, but if this is the first time this document has loaded
// then set the delay to double.

function resetIdle() {
    clearTimeout(idleTimeout);
    idle = false;
    console.log("Start reset idle")
    // if a suggestion has been made, then reset the text of the block to the original text from the clone
    if (suggestionState === 'inactive-got-suggestion') {
        // nearestPTag.innerHTML = originalNearestPTag.innerHTML;
        console.log('should give up on suggestion')
        // take the current block and set it to the previous text, then move the cursor to the end
        
        wp.data.dispatch('core/block-editor').updateBlockAttributes(wp.data.select('core/block-editor').getSelectedBlock().clientId, {
            content: oldContent,
        });

        cursorPosition = oldContent.length + 1; // Adjust cursor position to exclude the space
        wp.data.dispatch('core/block-editor').selectionChange( wp.data.select('core/block-editor').getSelectedBlock().clientId, "content", cursorPosition, cursorPosition);

    
    }


    suggestionState = "active"

    idleTimeout = setTimeout(idleNow, AIDelay * 1000);
}



window.addEventListener('keydown', resetIdle);
window.addEventListener('scroll', resetIdle);
window.addEventListener('mousedown', resetIdle);
window.addEventListener('click', resetIdle);
window.addEventListener('blur', resetIdle);


resetIdle();