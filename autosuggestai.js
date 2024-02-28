// Version: 0.0

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




let idle = false;
let idleTimeout;
let suggestionState = 'active'

function getSuggestionPromise(existingText) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("Dummy suggestion");
        }, 1000);
    });
}

const tabHandler = (event) => {
    if (suggestionState = 'inactive-got-suggestion') {
        if (event.key === 'Tab') {
            // replace the current block with the suggestion
            // and set the state to active
            suggestionState = 'active'
            const selectedBlock = wp.data.select('core/block-editor').getSelectedBlock();

            wp.data.dispatch('core/block-editor').replaceBlocks(selectedBlock.clientId, selectedBlockText + suggestionText)
        }
    }
    document.removeEventListener('keydown', tabHandler);
}

function idleNow() {
    idle = true;
    console.log("Inactive")
    if (suggestionState = 'inactive-before-suggestion') { // the user has stopped typing, and we haven't got a suggestion yet
        // get the text of the current wp editor block.
        const selectedBlock = wp.data.select('core/block-editor').getSelectedBlock();
        const selectedBlockText = selectedBlock.attributes.content
        const suggestionTextPromise = getSuggestionPromise(selectedBlockText)
        suggestionState = 'inactive-asked-for-suggestion'
        suggestionTextPromise.then((suggestionText) => {
            console.log("Got some suggestion: " + suggestionText)
            suggestionState = 'inactive-got-suggestion'
            // should show the suggestion now and then 
            // add a keyboard handler to look basically any key
            // and it will do tab or non tab
            

            const editorCanvasIiframe = document.getElementsByName('editor-canvas')[0];
            const editorCanvasDoc = editorCanvasIiframe.contentDocument;
            const paragraphs = editorCanvasDoc.getElementsByTagName('p');

            let selectedElement = null
            // Access the paragraphs within the iframe
            for (let i = 0; i < paragraphs.length; i++) {
            console.log(paragraphs[i].textContent);
            // check if the paragraph has the class '.is-selected'
            if (paragraphs[i].classList.contains('is-selected')) {
                selectedElement = paragraphs[i];
                break;
            }
            
}
            nearestPTag = selectedElement.closest('p');
            // insert the suggestion text after the p tag
            // and then add a tab handler
            nearestPTag.innerHTML += '<i style="color: grey;">' + suggestionText + '</i>';

            document.addEventListener('keydown', tabHandler);



 

        })
    }
}


function resetIdle() {
    clearTimeout(idleTimeout);
    idle = false;
    suggestionState = "active"

    idleTimeout = setTimeout(idleNow, 2000);
}

window.addEventListener('mousemove', resetIdle);
window.addEventListener('scroll', resetIdle);
window.addEventListener('keydown', resetIdle);
