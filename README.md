
AutoSuggestAI is a WordPress plugin that uses Artificial Intelligence to suggest words as you type. This feature can greatly enhance your writing speed and efficiency by predicting and suggesting the next word you might want to type. 

# Installation

[Download the latest release](https://github.com/raymondclowe/AutoSuggestAI/releases/latest/download/AutoSuggestAI.zip) as a ZIP file. You don't have to extract it.
.

On your WP blog to go Admin / Plugins / Add New Plugin and choose Upload Plugin

Select the zip file you just downloaded

Click Install Now

Activate the Plugin

# Set UP

Before you use it you must go to the admin panel and under Settings / AutoSuggestAI you have to set the API key. Choose which platform you want to use.

Mistral platform:

- [Signup for Mistral](https://auth.mistral.ai/ui/registration)

- [Create a Mistral API key](https://console.mistral.ai/api-keys/)

- [Set your Mistral monthly spending limit](https://console.mistral.ai/billing/)

You can also use keys from [OpenRouter.ai](https://openrouter.ai/keys) or [OpenAI.com](https://platform.openai.com/api-keys).

In your wordpress:

- Go to Dashboard / Settings / AutoSuggestAI 

- Set the API key and the 

- Set the delay threshold

- Choose your model. 

Start with the first/cheapest one unti you get the hang of it. It may be fine as it is, but if it is making mistakes or being unhelpful then try a more advanced model.

It costs money, but not that much so make sure you set a suitable budget (like $1 / month) and you will be fine.

- Choose whether to use the Internal Proxy.  When cleared, the default, then your PC directly talks to the AI provider, but when you turn on Internal Proxy then your PC talks only to your WordPress server, and that server will talk to the AI provider. This is useful if you are behind a firewall or if you are using a VPN.

- You can also set the delay threshold in seconds. If you set this too long then it will be unresponsive while you are writing, but setting it too short will mean lots of wasted calls to the paid api.

## Usage

Once installed, the AutoSuggestAI plugin will automatically start suggesting words as you type in paragraphs in the block editor, nowhere else. These suggestions are powered by AI, and should relate to what is before it in the post, but ignore anything after.

Suggested text appear in grey and are not actually part of the post until you press tab.  If you press anything else then the grey suggested words disappear and are discarded.

You only get suggestions when your cursor is at the end of a paragraph, and the last character is a space meaning you have completed a word, or you are at the beginning of a blank paragraph.

### Manual hotkey

If you prefer to manually trigger a suggestion instead of waiting for a timeout then press `Shift-Alt-S`. To use only manual suggestions then set the timeout value to 99999 to avoid
it ever triggering.

### Centralized prompt for extra instructions

The file `prompt_template.txt` contains the main prompt, you can add text to here but it will be overwritten when the plugin is updated.

However in the admin settings page there is a "Style Guide" field and you can use this to give extra instructions.

For example if you add `Your instructions are in English but make your suggestions in French`, or `Always use 8th grade reading level vocabulary` it will work. 

The best way to use this is to keep your responses at the correct level and style as your existing writing. To create a good style guide use any AI of your choice and give it a good article of yours that you like, then ask it to make a style guide from it using this prompt:

> I need you to write a one paragraph "style guide" to how to write so it comes out like this. Reading level, use of pronouns, voice, things like that.


## Bugs

- If you click somewhere else when a grey suggestion is visible it may end up stuck on the screen, and become an invalid block later.

- Sometimes it makes multiple suggestions and you have to clean them up manually

- After tab to accept the text the cursor fails to move to the end of the paragraph and you have to click to get it back

- Up arrow while a suggestion in offered doesn't dismiss the way it should

## Done

 - Add support for other providers, not just Mistral
 

## Todo

- Fix lots of bugs and special cases
- Allow (temp?) changes to settings using a side-bar in the editor
- Add support for other block types
- Integrate with SEO plugins that define keywords


