<?php
$errorLog = __DIR__ . '/error_log.txt';
/**
 * Plugin Name: AutoSuggestAI
 * Description: Auto suggest text in the block editor using AI
 * Version: v2.2.0dev
 * Author: Raymond Lowe
 * License: GPL2
 * URL: https://github.com/raymondclowe/AutoSuggestAI
 */

defined('ABSPATH') or die('No script kiddies please!');

// // Where you want to log errors
// error_log("Error message", 3, $errorLog);

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', $errorLog);


function autosuggestai_enqueue_scripts()
{
  wp_enqueue_script('autosuggestai', plugins_url('autosuggestai.js', __FILE__), array(), 'v2.1.0');
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
  submit_button();
  echo '</form>';
  echo '</div>';
}

add_action('admin_init', 'autosuggestai_admin_init');

function autosuggestai_admin_init()
{
  register_setting('autosuggestai_options', 'apikey', array('type' => 'string', 'sanitize_callback' => 'sanitize_text_field','default' => 'sk-YOURAPIKEY',));
  register_setting('autosuggestai_options', 'aiInternalProxy', array('type' => 'boolean', 'sanitize_callback' => 'rest_sanitize_boolean', 'default' => false));
  register_setting('autosuggestai_options', 'AIDelay', array('type' => 'string', 'sanitize_callback' => 'sanitize_text_field','default' => 5,));
  register_setting('autosuggestai_options', 'aimodel', array('type' => 'string', 'sanitize_callback' => 'sanitize_text_field', 'default' => 'mistral-tiny', ) );
  add_settings_section(
    'autosuggestai_main',
    'Main Settings',
    'autosuggestai_section_text',
    'autosuggestai'
  );
  add_settings_field(
    'apikey',
    'API Key',
    'autosuggestai_apikey_callback',
    'autosuggestai',
    'autosuggestai_main'
  );
  add_settings_field(
    'aiInternalProxy',
    'Use Internal Proxy',
    'autosuggestai_aiInternalProxy_callback',
    'autosuggestai',
    'autosuggestai_main'
  );
  add_settings_field(
    'AIDelay',
    'AI Delay',
    'autosuggestai_aidelay_callback',
    'autosuggestai',
    'autosuggestai_main'
  );
  add_settings_field(
    'aimodel',
    'AI Model Name',
    'autosuggestai_aimodel_callback',
    'autosuggestai', 
    'autosuggestai_main'
  );
}

function autosuggestai_section_text()
{
  echo '<p>Configure AutoSuggestAI settings</p>';
}
function autosuggestai_apikey_callback()
{
  $value = get_option('apikey');
  echo '<input type="text" id="apikey" name="apikey" value="' . esc_attr($value) . '" size="40" />';
}
function autosuggestai_aiInternalProxy_callback()
{
  $value = get_option('aiInternalProxy');
  echo '<input type="checkbox" id="aiInternalProxy" name="aiInternalProxy" value="true" '. checked($value, true, false).'/> <i>Send AI API requests via the wordpress server as a proxy.</i>';
}
function autosuggestai_AIDelay_callback()
{
  $value = get_option('AIDelay');
  echo '<input type="text" id="AIDelay" name="AIDelay" value="' . esc_attr($value) . '" size="40" />';
  echo '<a href="#" onclick="document.getElementById(\'AIDelay\').value = 5; return false;">Set to default (5)</a>';
}

function autosuggestai_aimodel_callback() {
  $value = get_option('aimodel');
  $options = array(
    'open-mistral-7b' => 'Mistral 7B ($0.25/1M tokens Input, $0.25/1M tokens Output)',  
    'open-mixtral-8x7b' => 'Mixtral 8x7B ($0.7/1M tokens Input, $0.7/1M tokens Output)',
    'mistral-small-latest' => 'Mistral Small ($2/1M tokens Input, $6/1M tokens Output)',
    'mistral-medium-latest' => 'Mistral Medium ($2.7/1M tokens Input, $8.1/1M tokens Output)',
    'mistral-large-latest' => 'Mistral Large ($8/1M tokens Input, $24/1M tokens Output)' 
  );
  echo '<select name="aimodel" id="aimodel">';
  foreach ($options as $key => $label) {
    echo '<option value="' . $key . '"';
    if ($key == $value) echo ' selected="selected"';
    echo '>' . $label . '</option>';
  }
  echo '</select>';
}

// Add REST API route
// curl http://localhost:8881/index.php?rest_route=/autosuggestai/v1/apikey
add_action('rest_api_init', function () {
  register_rest_route('autosuggestai/v1', '/apikey', array (
    'methods' => 'GET',
    'callback' => 'autosuggestai_get_api_key',
    // 'permission_callback' => function ($request) {
    //   return current_user_can('edit_posts');
    // },
  )
  );
});

// API key callback  

function autosuggestai_get_api_key()
{
  return array(
    'apikey' => htmlspecialchars(get_option('apikey')),
    'aiInternalProxy' => htmlspecialchars(get_option('aiInternalProxy')),
    'AIDelay' => htmlspecialchars(get_option('AIDelay')),
    'aimodel' => htmlspecialchars(get_option('aimodel')),
  );
}

// Add WP REST API route for getting suggestion text from AI REST endpoint
// curl -X POST http://localhost:8881/index.php?rest_route=/autosuggestai/v1/getsuggestion -H "Content-Type: application/json" -d "{\"title\":\"hello world\",\"context\":\"this is the context\",\"existingText\":\"Tell me about yellow\"}"

add_action('rest_api_init', function () {
  register_rest_route('autosuggestai/v1', '/getsuggestion', array (
    'methods' => 'POST',
    'callback' => 'autosuggestai_get_suggestion',
    // 'permission_callback' => function ($request) {
    //   return  current_user_can('edit_posts');      
    // },
  )
  );
});

function autosuggestai_get_responseText($title, $context, $existingText, $mistralApiUrl, $aimodel, $myApiKey) {

  global $errorLog;
$promptTemplate = "[INST] {prompt} [/INST]"; // <s> only needed for multi turn

$thePrompt = <<<EOD
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

{text}
EOD;

// $abc = `abc`;
// error_log("abc is : " . $abc. "\n", 3, $errorLog);
// error_log("template will be  : " . $promptTemplate . "\n", 3, $errorLog);



  
//   error_log("Starting: autosuggestai_get_responseText\n", 3, $errorLog);
//   error_log("prompt is : " . $promptTemplate. "\n", 3, $errorLog);

  // Create prompt
  $instruction = str_replace('{title}', $title, $thePrompt);
  $instruction = str_replace('{context}', $context, $instruction); 
  $instruction = str_replace('{text}', $existingText . " ...", $instruction);

  $messageContent = str_replace('{prompt}', $instruction, $promptTemplate);

  error_log("Key will be : " . $myApiKey. "\n", 3, $errorLog);
  error_log("Message will be  : " . $messageContent. "\n", 3, $errorLog);
  error_log("instruction will be  : " . $instruction. "\n", 3, $errorLog);

  // $mistralApiUrl = "dummy";
  // Make API request
  $response = wp_remote_post($mistralApiUrl, array(
    'method' => 'POST',
    'timeout' => 45,
    'redirection' => 5,
    'httpversion' => '1.0',
    'blocking' => true,  
    'headers' => array(
      'Authorization' => 'Bearer ' . $myApiKey,
      'Content-Type' => 'application/json',
      'Accept' => 'application/json',
    ),
    'body' => json_encode(array(
      'model' => $aimodel,
      'messages' => array(
        array('role' => 'user', 'content' => $messageContent)  
      ),
      'temperature' => 0.6,
      'max_tokens' => 100,
      'top_p' => 0.9,
      'stream' => false,
      'random_seed' => null
    ))
    )
  );



  if ( is_wp_error( $response ) ) {
    // Handle error
    error_log("is_wp_error \n", 3, $errorLog);
    return false; 
  }

  $data = json_decode(wp_remote_retrieve_body($response), true);
  error_log("Response: " . wp_remote_retrieve_body($response) . "\n", 3, $errorLog);
  $responseText = trim($data['choices'][0]['message']['content']);

  if (strpos($responseText, $existingText) === 0) {
    $responseText = substr($responseText, strlen($existingText));
  }

  return $responseText;

}


// API suggestion callback  
function autosuggestai_get_suggestion()
{  
  // get the posted data
  $data = json_decode(file_get_contents("php://input"));
  $title = $data->title;
  $context = $data->context;
  $existingText = $data->existingText;
  $apikey = get_option('apikey');
  $model = get_option('aimodel');
  $mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions';

  $responseText = autosuggestai_get_responseText($title, $context, $existingText, $mistralApiUrl, $model, $apikey);
  
  
  return  $responseText;
}

// test with curl
// 
// allow REST password authentication even with no ssl (so dev environment works)
add_filter( 'wp_is_application_passwords_available', '__return_true' );

?>