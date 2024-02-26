<?php
/**
 * Plugin Name: AutoSuggestAI
 * Description: Auto suggest text in the block editor using AI
 * Version: 0.0
 * Author: Raymond Lowe
 * License: GPL2
 * URL: https://github.com/raymondclowe/AutoSuggestAI
  */

defined( 'ABSPATH' ) or die( 'No script kiddies please!' );

function autosuggestai_enqueue_scripts() {

  wp_enqueue_script( 'autosuggestai', plugins_url( 'autosuggestai.js', __FILE__ ) );

}

add_action( 'enqueue_block_editor_assets', 'autosuggestai_enqueue_scripts' );


?>