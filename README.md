
AutoSuggestAI is a WordPress plugin that uses Artificial Intelligence to suggest words as you type. This feature can greatly enhance your writing speed and efficiency by predicting and suggesting the next word you might want to type. 

# Installation

[Download the latest release](https://github.com/raymondclowe/AutoSuggestAI/releases/tag/v2.1.0) as a ZIP file, get the so called "Source code (zip)". You don't have to extract it.
.

On your WP blog to go Admin / Plugins / Add New Plugin and choose Upload Plugin

Select the zip file you just downloaded

Click Install Now

Activate the Plugin

# Set UP

Before you use it you must go to the admin panel and under Settings / AutoSuggestAI you have to set the API key, that will be one from Mistral platform.  

Mistral platform:

- [Signup for Mistral](https://auth.mistral.ai/ui/registration)

- [Create a Mistral API key](https://console.mistral.ai/api-keys/)

- [Set your Mistral monthly spending limit](https://console.mistral.ai/billing/)

In your wordpress:

- Go to Dashboard / Settings / AutoSuggestAI 

- Set the API key and the delay threshold and choose your model. Start with the first/cheapest one unti you get the hang of it. It may be fine as it is, but if it is making mistakes or being unhelpful then try a more advanced model.

It costs money, but not that much so make sure you set a suitable budget (like $1 / month) and you will be fine.

- You can also set the delay threshold in seconds. If you set this too long then it will be unresponsive while you are writing, but setting it too short will mean lots of wasted calls to the paid api.

## Usage

Once installed, the AutoSuggestAI plugin will automatically start suggesting words as you type in paragraphs in the block editor, nowhere else. These suggestions are powered by AI, making them highly accurate and contextually relevant.

Suggested words appear in grey and are not actually part of the post until you press tab.  If you press anything else then the grey suggested words disappear.

You only get suggestions when your cursor is at the end of a paragraph, and the last character is a space meaning you have completed a word, or you are at the beginning of a blank paragraph.

## Bugs

- If you click somewhere else when a grey suggestion is visible it may end up stuck on the screen, and become an invalid block later.

- Sometimes it makes multiple suggestions and you have to clean them up manually

## Todo

- Fix lots of bugs and special cases
- Add support for other providers, not just Mistral
- Allow (temp?) changes to settings using a side-bar in the editor
- Add support for other block types
- Integrate with SEO plugins that define keywords


