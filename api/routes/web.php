<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::get('/', fn() => response()->json(['name' => 'WWA API', 'version' => '1.0']));

// Authentification des channels Reverb (privés)
Broadcast::routes(['middleware' => ['auth:sanctum']]);
