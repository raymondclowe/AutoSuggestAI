<?php
/**
 * Plugin Name: AutoSuggestAI
 * Description: Auto suggest text in the block editor using AI
 * Version: 1.5
 * Author: Raymond Lowe
 * License: GPL2
 * URL: https://github.com/raymondclowe/AutoSuggestAI
 */

defined('ABSPATH') or die('No script kiddies please!');

function autosuggestai_enqueue_scripts()
{

  wp_enqueue_script('autosuggestai', plugins_url('autosuggestai.js', __FILE__));
  wp_localize_script('autosuggestai', 'autosuggestai', array(
    'api_nonce' => wp_create_nonce('wp_rest'),
  ));

}

add_action('enqueue_block_editor_assets', 'autosuggestai_enqueue_scripts');

add_action('admin_menu', 'autosuggestai_admin_menu');

function autosuggestai_admin_menu()
{

  add_options_page('AutoSuggestAI Settings', 'AutoSuggestAI', 'manage_options', 'autosuggestai', 'autosuggestai_settings_page');

}
function autosuggestai_settings_page()
{

  if (!current_user_can('manage_options')) {
    wp_die('You do not have sufficient permissions to access this page.');
  }

  echo '<div class="wrap">';
  echo '<h1>AutoSuggestAI Settings</h1>';

  echo '<form method="post" action="options.php">';

  settings_fields('autosuggestai_options');
  do_settings_sections('autosuggestai');

  // Added fields
  // add_settings_field('AIDelay', 'AI Delay', 'autosuggestai_delay_callback', 'autosuggestai', 'autosuggestai_section');

  submit_button();

  echo '</form>';
  echo '</div>';

}


add_action('admin_init', 'autosuggestai_admin_init');

function autosuggestai_admin_init()
{
  

  register_setting('autosuggestai_options', 'apikey', array('type' => 'string', 'sanitize_callback' => 'sanitize_text_field','default' => 'sk-YOURAPIKEY',));
  register_setting('autosuggestai_options', 'AIDelay', array('type' => 'string', 'sanitize_callback' => 'sanitize_text_field','default' => 5,));
  // register_setting('autosuggestai_options', 'AIBackEndURL', array('type' => 'string', 'sanitize_callback' => 'sanitize_text_field','default' => 'https://api.mistral.ai/v1/chat/completions',));
  // register_setting('autosuggestai_options', 'AIPromptTemplate', array('type' => 'string', 'sanitize_callback' => 'sanitize_text_field','default' => '<s>[INST] {prompt} [/INST]') );
  // register_setting('autosuggestai_options', 'AIPrompt', array('type' => 'string', 'sanitize_callback' => 'sanitize_text_field','default' => "You are an automated writing assistant who will suggest the next piece of text to write after an example given to you. The suggested text will always be brief, meaningful, sensible, in keeping with the style.

  // Examples: if you are given the text \"The cat sat on the \" then you will reply \"mat.\"
  
  // If you are given the text \"The rain in Spain falls \" then you will reply with \"mainly on the plain\".
  
  // If you are given the text \"The sun rises in the east \" then you will reply with \"and sets in the west\".
  
  // If you are given the text \"The dog \" then you will reply with \"barks\".
  
  // If you are given the text \"Four score and seven years ago \" then you will reply with \" our forefathers brought for a new nation\".
  
  // You will be given the title of the article from which the text comes, to provide you with context, then the incomplete paragraph that needs extending.
  
  // You will return only the extention text, without including the original incomplete paragraph.
  // ") );

  add_settings_section(
    'autosuggestai_main',
    'Main Settings',
    'autosuggestai_section_text',
    'autosuggestai'
  );

  add_settings_field(
    'apikey',
    'API Key',
    'apikey_callback',
    'autosuggestai',
    'autosuggestai_main'
  );

  add_settings_field(
    'AIDelay',
    'AI Delay',
    'aidelay_callback',
    'autosuggestai',
    'autosuggestai_main'
  );

  // add_settings_field(
  //   'AIBackEndURL',
  //   'AI Backend URL',
  //   'AIBackEndURL_callback',
  //   'autosuggestai',
  //   'autosuggestai_main'
  // );

  // add_settings_field(
  //   'AIPromptTemplate',
  //   'AI Prompt Template',
  //   'aiprompttemplate_callback',
  //   'autosuggestai',
  //   'autosuggestai_main'
  // );
  // add_settings_field(
  //   'AIPrompt',
  //   'AI Prompt',
  //   'aiprompt_callback',
  //   'autosuggestai',
  //   'autosuggestai_main'
  // );

}


function autosuggestai_section_text()
{

  echo '<p>Configure AutoSuggestAI settings</p>';

}
function apikey_callback()
{

  $value = get_option('apikey');

  echo '<input type="text" id="apikey" name="apikey" value="' . esc_attr($value) . '" size="40" />';

}

function AIDelay_callback()
{

  $value = get_option('AIDelay');

  echo '<input type="text" id="AIDelay" name="AIDelay" value="' . esc_attr($value) . '" size="40" />';
  echo '<a href="#" onclick="document.getElementById(\'AIDelay\').value = 5; return false;">Set to default (5)</a>';

}

// function AIBackEndURL_callback()
// {

//   $value = get_option('AIBackEndURL');

//   echo '<input type="text" id="AIBackEndURL" name="AIBackEndURL" value="' . esc_attr($value) . '" size="40" />';
//   echo '<a href="#" id="setdefaulackendurl" onclick="document.getElementById(\'AIBackEndURL\').value = \'https://api.mistral.ai/v1/chat/completions\'">Set default to mistral</a>';

// }

// function AIPromptTemplate_callback()
// {

//   $value = get_option('AIPromptTemplate');
//   echo '<input type="text" id="AIPromptTemplate" name="AIPromptTemplate" value="' . esc_attr($value) . '" size="40" /><a href="#" id="setdefaultprompt" onclick="document.getElementById(\'AIPromptTemplate\').value = \'<s>[INST] {prompt} [/INST]\'">set default to mistral</a>';

// }

// function AIPrompt_callback()
// {

//   $value = get_option('AIPrompt');
//   echo '<input type="textarea" id="AIPrompt" name="AIPrompt" value="' . esc_attr($value) . '" size="40" />';

//   echo '<a href="#" id="setdefaultprompt" onclick="document.getElementById(\'AIPrompt\').value = \'You are an automated writing assistant who will suggest the next piece of text to write after an example given to you. The suggested text will always be brief, meaningful, sensible, in keeping with the style.

//   Examples: if you are given the text \"The cat sat on the \" then you will reply \"mat.\"
  
//   If you are given the text \"The rain in Spain falls \" then you will reply with \"mainly on the plain\".
  
//   If you are given the text \"The sun rises in the east \" then you will reply with \"and sets in the west\".
  
//   If you are given the text \"The dog \" then you will reply with \"barks\".
  
//   If you are given the text \"Four score and seven years ago \" then you will reply with \" our forefathers brought for a new nation\".
  
//   You will be given the title of the article from which the text comes, to provide you with context, then the incomplete paragraph that needs extending.
  
//   You will return only the extention text, without including the original incomplete paragraph.
//   \'>set default to mistral</a>';

// }

// Add REST API route
add_action('rest_api_init', function () {
  register_rest_route('autosuggestai/v1', '/apikey', array (
    'methods' => 'GET',
    'callback' => 'autosuggestai_get_api_key',
    'permission_callback' => function ($request) {
      return current_user_can('edit_posts');
    },
  )
  );
});

// API key callback  
function autosuggestai_get_api_key()
{
  return array(
    'apikey' => htmlspecialchars(get_option('apikey')),
    'AIDelay' => htmlspecialchars(get_option('AIDelay')),
    // 'AIBackEndURL' => htmlspecialchars(get_option('AIBackEndURL')),
    // 'AIPromptTemplate' => htmlspecialchars(get_option('AIPromptTemplate')),
    // 'AIPrompt' => htmlspecialchars(get_option('AIPrompt'))
  );
}



// allow REST password authentication even with no ssl (so dev environment works)
// add_filter( 'wp_is_application_passwords_available', '__return_true' );


?>