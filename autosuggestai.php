<?php
// $errorLog = __DIR__ . '/error_log.txt';
/**
 * Plugin Name: AutoSuggestAI
 * Plugin URI: https://github.com/raymondclowe/AutoSuggestAI
 * Description: Auto suggest text in the block editor using AI
 * Version: v2.4.4
 * Author: Raymond Lowe 
 * Author URI: https://github.com/raymondclowe/
 * Text Domain: AutoSuggestAI
 * License: GPL v2 or later
 */

defined('ABSPATH') or die('No script kiddies please!');

// Where you want to log errors
// error_log("Error message", 3, $errorLog);

// ini_set('display_errors', 1);
// ini_set('display_startup_errors', 1);
// error_reporting(E_ALL);

// error_reporting(E_ALL);
// ini_set('log_errors', 1);
// ini_set('error_log', $errorLog);


function autosuggestai_enqueue_scripts()
{
  wp_enqueue_script('autosuggestai', plugins_url('autosuggestai.js', __FILE__), array(), 'v2.4.4');
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
  register_setting('autosuggestai_options', 'airesturl', array('type' => 'string', 'sanitize_callback' => 'sanitize_url','default' => 'https://api.mistral.ai/v1/chat/completions',));
  register_setting('autosuggestai_options', 'aiapikey', array('type' => 'string', 'sanitize_callback' => 'sanitize_text_field','default' => 'sk-xxxxxxxxxxxxxx',));
  register_setting('autosuggestai_options', 'aiInternalProxy', array('type' => 'boolean', 'sanitize_callback' => 'rest_sanitize_boolean', 'default' => false));
  register_setting('autosuggestai_options', 'AIDelay', array('type' => 'string', 'sanitize_callback' => 'sanitize_text_field','default' => 5,));
  register_setting('autosuggestai_options', 'aimodel', array('type' => 'string', 'sanitize_callback' => 'sanitize_text_field', 'default' => 'mistral-tiny', ) );
  register_setting('autosuggestai_options', 'ainotes', array('type' => 'string', 'sanitize_callback' => 'wp_kses_post'));


  add_settings_section(
    'autosuggestai_main',
    'Main Settings',
    'autosuggestai_section_text',
    'autosuggestai'
  );
  add_settings_field(
    'airesturl',
    'AI REST URL',
    'autosuggestai_airesturl_callback',
    'autosuggestai',
    'autosuggestai_main'
  );
  add_settings_field(
    'aiapikey',
    'API Key',
    'autosuggestai_aiapikey_callback',
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
  add_settings_field(
    'ainotes',
    'AI Notes',
    'autosuggestai_ainotes_callback',
    'autosuggestai',
    'autosuggestai_main'
  );

}


function autosuggestai_section_text()
{
  echo '<p>Configure AutoSuggestAI settings</p>';
}

function autosuggestai_airesturl_callback()
{
  $value = get_option('airesturl');
  echo '<input type="text" id="airesturl" name="airesturl" value="' . esc_attr($value) . '" size="40" /> <a href="https://www.php.net/manual/en/function.esc-attr.php">?</a>';
  echo '<div style="max-width: 500px; margin-top: 5px;"><i>';
  echo 'Note: This must be an OpenAI compatible endpoint, ';
  echo '<a href="#" onclick="document.getElementById(\'airesturl\').value = \'https://api.openai.com/v1/chat/completions\';">OpenAI</a>, ';
  echo '<a href="#" onclick="document.getElementById(\'airesturl\').value = \'https://api.groq.com/openai/v1/chat/completions\';">GroqCloud</a> and ';
  echo '<a href="#" onclick="document.getElementById(\'airesturl\').value = \'https://openrouter.ai/api/v1/chat/completions\';">OpenRouter.AI</a> and ';
  echo '<a href="#" onclick="document.getElementById(\'airesturl\').value = \'https://api.mistral.ai/v1/chat/completions\';">Mistral.AI</a> known to work';
  echo '</i></div>';



}
function autosuggestai_aiapikey_callback()
{
  $value = get_option('aiapikey');
  echo '<input type="text" id="aiapikey" name="aiapikey" value="' . esc_attr($value) . '" size="40" />';
  echo '<div style="max-width: 500px; margin-top: 5px;"><i>';
  echo 'Get your keys here: <a href="https://platform.openai.com/account/api-keys" target="_blank">OpenAI</a>, ';  
  echo '<a href="https://console.groq.com/keys" target="_blank">GroqCloud</a>, ';
  echo '<a href="https://openrouter.ai/keys" target="_blank">OpenRouter.AI</a>, ';
  echo '<a href="https://console.mistral.ai/api-keys/" target="_blank">Mistral.</a> You will need to create and fund an account yourself.';
  echo '</i></div>';
  
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
  echo '<div style="max-width: 500px; margin-top: 5px;">';
  echo ' <a href="#" onclick="document.getElementById(\'AIDelay\').value = 5; return false;">Set to default (5)</a>';
  echo '</div>';
}

function autosuggestai_aimodel_callback()
{
  $value = get_option('aimodel');
  echo '<input type="text" name="aimodel" id="aimodel" value="' . $value . '">';
  echo '<div style="max-width: 500px; margin-top: 5px;">';
  echo '<i>Common models: ';
  echo '<a href="#" onclick="document.getElementById(\'aimodel\').value = \'gpt-3.5-turbo\';">gpt-3.5-turbo</a>, ';
  echo '<a href="#" onclick="document.getElementById(\'aimodel\').value = \'gpt-4o\';">gpt-4o</a>, ';
  echo '<a href="#" onclick="document.getElementById(\'aimodel\').value = \'open-mistral-7b\';">open-mistral-7b</a>, ';
  echo '<a href="#" onclick="document.getElementById(\'aimodel\').value = \'llama-2\';">llama-2</a>. ';
  echo '<p>For a full list, see each provider. </p>';
  echo '<ul>';
  echo '<li>Openrouter.ai: <a href="https://openrouter.ai/docs#models" target="_blank">https://openrouter.ai/docs#models</a> &#x2197;</li>';
  echo '<li>Mistral.ai: <a href="https://docs.mistral.ai/guides/model-selection/" target="_blank">https://docs.mistral.ai/guides/model-selection/</a> &#x2197;</li>';
  echo '<li>GroqCloud: <a href="https://console.groq.com/models" target="_blank">https://console.groq.com/models</a> &#x2197;</li>';
  
  echo '<li>OpenAI: <a href="https://platform.openai.com/docs/models/overview" target="_blank">https://platform.openai.com/docs/models/overview</a> &#x2197;</li>';
  echo '</ul>';

  echo '</i></div>';
}

function autosuggestai_ainotes_callback()
{
  $value = get_option('ainotes');

  // Use wp_editor to create a rich text editor field
  echo '<div style="max-width: 500px;">';
  wp_editor($value, 'ainotes', array('textarea_name' => 'ainotes'));
  echo '</div>';
  echo '<div style="max-width: 500px; margin-top: 5px;">';
  echo '<i>Use the notes field to record keys or other options you might need later.</i>';
  echo '</div>';

}


// Add REST API route
// curl http://localhost:8881/index.php?rest_route=/autosuggestai/v1/config
add_action('rest_api_init', function () {
  register_rest_route('autosuggestai/v1', '/config', array (
    'methods' => 'GET',
    'callback' => 'autosuggestai_get_config',
    'permission_callback' => function ($request) {
      return current_user_can('edit_posts') || $_SERVER['HTTP_HOST'] === 'localhost';
    }
  )
  );
});


// API key callback  

function autosuggestai_get_config()
{
  return array(
    'airesturl' => htmlspecialchars(get_option('airesturl')),
    'aiapikey' => htmlspecialchars(get_option('aiapikey')),
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
    'permission_callback' => function ($request) {
      return  current_user_can('edit_posts');      
    },
  )
  );
});

function autosuggestai_get_responseText($title, $context, $existingText, $mistralApiUrl, $aimodel, $aiapikey) {

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


// error_log("template will be  : " . $promptTemplate . "\n", 3, $errorLog);



  
//   error_log("Starting: autosuggestai_get_responseText\n", 3, $errorLog);
//   error_log("prompt is : " . $promptTemplate. "\n", 3, $errorLog);

  // Create prompt
  $instruction = str_replace('{title}', $title, $thePrompt);
  $instruction = str_replace('{context}', $context, $instruction); 
  $instruction = str_replace('{text}', $existingText . " ...", $instruction);

  $messageContent = str_replace('{prompt}', $instruction, $promptTemplate);

// error_log("Key will be : " . $aiapikey. "\n", 3, $errorLog);
// error_log("Message will be  : " . $messageContent. "\n", 3, $errorLog);
// error_log("instruction will be  : " . $instruction. "\n", 3, $errorLog);

  // $mistralApiUrl = "dummy";
  // Make API request
  $response = wp_remote_post($mistralApiUrl, array(
    'method' => 'POST',
    'timeout' => 45,
    'redirection' => 5,
    'httpversion' => '1.0',
    'blocking' => true,  
    'headers' => array(
      'Authorization' => 'Bearer ' . $aiapikey,
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
      // 'random_seed' => null  // openai doesn't support this field
    ))
    )
  );

  if ( is_wp_error( $response ) ) {  
    $error_code = $response->get_error_code();
    error_log("Error: ". $error_code. "\n", 3, $errorLog);
    $error_message = $response->get_error_message();
    $status_code = $response->get_error_data('http_code');

    // assemble errors into a sensible string and return it
    $error_string = "Error code: ". $error_code. " - ". $error_message. " - Status code: ". $status_code;
    return $error_string;    
  }
  
  $data = json_decode(wp_remote_retrieve_body($response), true);
//  error_log("Response: " . wp_remote_retrieve_body($response) . "\n", 3, $errorLog);
  $responseText = trim($data['choices'][0]['message']['content']);

  if (strpos($responseText, $existingText) === 0) {
    $responseText = substr($responseText, strlen($existingText));
  }

  // error_log("responseText will be : " . $responseText. "\n", 3, $errorLog);

  return array('suggestion' => $responseText);

}


// API suggestion callback  
function autosuggestai_get_suggestion()
{  
  // get the posted data
  $data = json_decode(file_get_contents("php://input"));
  $title = $data->title;
  $context = $data->context;
  $existingText = $data->existingText;
  $aiapikey = get_option('aiapikey');
  $model = get_option('aimodel');
  $aiRestUrl = get_option('airesturl');

  $responseText = autosuggestai_get_responseText($title, $context, $existingText, $aiRestUrl, $model, $aiapikey);
  
  
  return  $responseText;
}

// test with curl
// 
// allow REST password authentication even with no ssl (so dev environment works)
if ( $_SERVER['HTTP_HOST'] === 'localhost' ) {
  add_filter( 'wp_is_application_passwords_available', '__return_true' ); 
}


?>