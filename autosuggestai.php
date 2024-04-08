<?php
/**
 * Plugin Name: AutoSuggestAI
 * Description: Auto suggest text in the block editor using AI
 * Version: v2.1.1
 * Author: Raymond Lowe
 * License: GPL2
 * URL: https://github.com/raymondclowe/AutoSuggestAI
 */

defined('ABSPATH') or die('No script kiddies please!');

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
    'aimodel' => htmlspecialchars(get_option('aimodel')),
  );
}

// allow REST password authentication even with no ssl (so dev environment works)
// add_filter( 'wp_is_application_passwords_available', '__return_true' );

?>