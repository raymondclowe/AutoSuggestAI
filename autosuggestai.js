// Version: 1.4

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
// let AIBackEndURL;
// let AIPromptTemplate;

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

Examples: if you are given the text "The cat sat on the ... " then you will reply "mat."

If you are given the text "The rain in Spain falls ... " then you will reply with "mainly on the plain".

If you are given the text "The sun rises in the east ... " then you will reply with "and sets in the west".

If you are given the text "The dog ... " then you will reply with "barks".

If you are given the text "Four score and seven years ago ... " then you will reply with "our forefathers brought for a new nation".

You will return only the suggested extention of the text, without including the original incomplete paragraph.

Here is the title of the piece of writing:
{title}

Here is the preceding paragraphs for context:
{context}

Here is the text to be extended:
>{text}`;

const mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions';


function getSuggestionPromise(title, context, existingText) {
    // return a promise to a fetch to the mistral api
    return new Promise((resolve) => {
        // create the total prompt using the template, the prompt, and the existing text.
        instruction = thePrompt.replace('{title}', title).replace('{context}', context).replace('{text}', existingText.trim() + " ... ");

        messageContent = promptTemplate.replace('{prompt}', instruction)

        console.log('messageContent is' + messageContent);
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
                resolve(data.choices[0].message.content.trim());
            });
    });
}



let idle = false;
let idleTimeout;
let suggestionState = 'active';
let suggestionText;






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

    // Combine current content with the new text
    const newContent = `${currentContent} ${text}`;

    // Update the block's content
    wp.data.dispatch('core/block-editor').updateBlockAttributes(selectedBlock.clientId, {
        content: newContent,
    });


    // Place the selection at the end of the inserted text
    const blockClientId = selectedBlock.clientId;
    if (selectedBlock.name === 'core/paragraph') {
        cursorPosition = newContent.length
        wp.data.dispatch('core/block-editor').selectionChange(blockClientId, "content", cursorPosition, cursorPosition)

    } else {
        console.warn('Cursor adjustment is not supported for this block type.');
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
            const currentBlock = wp.data.select('core/block-editor').getSelectedBlock();

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

function idleNow() {
    idle = true;
    console.log("Inactive")
    if (suggestionState = 'inactive-before-suggestion') { // the user has stopped typing, and we haven't got a suggestion yet
        // get the text of the current wp editor block.
        const currentBlock = wp.data.select('core/block-editor').getSelectedBlock();
        // if the currentBlock is undefined as exist, the cursor must be on the title or 
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
        suggestionState = 'inactive-asked-for-suggestion'
        suggestionTextPromise.then((text) => {
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

            // Get the current selection range
            const selection = window.getSelection();

            // if the selection is just a single cursor, and not a range, then
            // exit as we don't want to mess with the text if the user is highlighting
            if (selection.isCollapsed !== true) {
                return;
            }

            // Get the node and offset where the cursor is located
            let anchorNode = selection.anchorNode;
            let anchorOffset = selection.anchorOffset;

            // No selection, so insert at cursor position
            let textNode = document.createTextNode(" " + suggestionText + " ");
            let italicNode = document.createElement('i');
            italicNode.style.color = 'grey';
            italicNode.appendChild(textNode);
            //             nearestPTag.insertBefore(italicNode, anchorNode);
            nearestPTag.innerHTML = nearestPTag.innerHTML + "<span style='color:grey'><i>" + suggestionText + "</i></span>"
            // wait for a tab
            document.addEventListener('keydown', tabHandler);
        })
    }
}

// set the idle reset function, but if this is the first time this document has loaded
// then set the delay to double.

function resetIdle() {
    clearTimeout(idleTimeout);
    idle = false;
    suggestionState = "active"

    idleTimeout = setTimeout(idleNow, AIDelay * 1000);
}

window.addEventListener('mousemove', resetIdle);
window.addEventListener('scroll', resetIdle);
window.addEventListener('keydown', resetIdle);

resetIdle();